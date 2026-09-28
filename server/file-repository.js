import { randomUUID } from 'node:crypto';

export const notFound = () => Object.assign(new Error('File not found.'), { status: 404 });
const validId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function createFileRepository(db, storage) {
    async function transaction(action) {
        const client = await db.connect();
        const written = [];
        let committing = false;
        try {
            await client.query('BEGIN');
            const result = await action(client, written);
            committing = true;
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            // An interrupted COMMIT may have succeeded. Keep bytes in that case.
            if (!committing) {
                for (const key of written) await storage.remove(key).catch(() => {});
            }
            throw error;
        } finally { client.release(); }
    }
    async function owned(client, fileId, userId, lock = false) {
        if (!validId(fileId) || !validId(userId)) throw notFound();
        const { rows } = await client.query(
            'SELECT * FROM user_files WHERE file_id = $1 AND user_id = $2' + (lock ? ' FOR UPDATE' : ''), [fileId, userId]
        );
        if (!rows.length) throw notFound();
        return rows[0];
    }
    async function queue(client, key) {
        if (key) await client.query('INSERT INTO file_cleanup(path) VALUES ($1) ON CONFLICT DO NOTHING', [key]);
    }
    const repository = {
        async create(userId, name, data, iv) {
            return transaction(async (client, written) => {
                const owner = await client.query('SELECT user_id FROM users WHERE user_id = $1 FOR UPDATE', [userId]);
                if (!owner.rows.length) throw notFound();
                const { rows } = await client.query(
                    `SELECT COUNT(*)::integer AS count FROM user_files WHERE user_id = $1
                     AND created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'`, [userId]
                );
                if (rows[0].count >= 5) throw Object.assign(new Error('You can only upload up to 5 files per day'), { status: 400 });
                const key = await storage.put(data);
                written.push(key);
                const fileId = randomUUID();
                await client.query(
                    'INSERT INTO user_files(file_id, user_id, file_name, file_path, iv) VALUES ($1, $2, $3, $4, $5)',
                    [fileId, userId, name, key, iv]
                );
                return fileId;
            });
        },
        async read(fileId, userId) {
            return transaction(async client => {
                const row = await owned(client, fileId, userId, true);
                const bytes = row.file_path ? await storage.read(row.file_path) : row.file_data;
                if (bytes == null) throw new Error('Original file content is missing');
                return { ...row, file_data: Buffer.from(bytes) };
            });
        },
        async saveMasked(fileId, userId, content) {
            await transaction(async (client, written) => {
                const row = await owned(client, fileId, userId, true);
                const key = await storage.put(content);
                written.push(key);
                await client.query(
                    'UPDATE user_files SET masked_path = $1, masked_data = NULL WHERE file_id = $2 AND user_id = $3',
                    [key, fileId, userId]
                );
                await queue(client, row.masked_path);
            });
            await repository.cleanup();
        },
        async signature(fileId, userId) { return owned(db, fileId, userId); },
        async saveSignature(fileId, userId, signature, randomNumber) {
            if (!validId(fileId) || !validId(userId)) throw notFound();
            const result = await db.query(
                'UPDATE user_files SET digital_signature = $1, random_number = $2 WHERE file_id = $3 AND user_id = $4',
                [signature, randomNumber, fileId, userId]
            );
            if (!result.rowCount) throw notFound();
        },
        async remove(fileId, userId) {
            await transaction(async client => {
                const row = await owned(client, fileId, userId, true);
                await queue(client, row.file_path);
                await queue(client, row.masked_path);
                await client.query('DELETE FROM user_files WHERE file_id = $1 AND user_id = $2', [fileId, userId]);
            });
            await repository.cleanup();
        },
        async cleanup() {
            // Retry failed physical deletions at startup or on the next write.
            try {
                const { rows } = await db.query('SELECT path FROM file_cleanup ORDER BY created_at LIMIT 100');
                for (const row of rows) {
                    await storage.remove(row.path);
                    await db.query('DELETE FROM file_cleanup WHERE path = $1', [row.path]);
                }
            } catch (error) {
                console.error('File cleanup pending:', error.code || error.name);
            }
        },
        async migrateLegacy() {
            let moved = 0;
            while (true) {
                const changed = await transaction(async (client, written) => {
                    const { rows } = await client.query(
                        `SELECT * FROM user_files WHERE file_data IS NOT NULL OR masked_data IS NOT NULL
                         ORDER BY file_id LIMIT 1 FOR UPDATE`
                    );
                    if (!rows.length) return false;
                    const row = rows[0];
                    let original = row.file_path;
                    let masked = row.masked_path;
                    for (const [field, existing] of [['file_data', original], ['masked_data', masked]]) {
                        if (row[field] == null) continue;
                        if (existing) {
                            const bytes = await storage.read(existing);
                            if (!bytes.equals(Buffer.from(row[field]))) throw new Error('Volume copy differs from legacy content');
                        } else {
                            const key = await storage.put(Buffer.from(row[field]));
                            written.push(key);
                            if (field === 'file_data') original = key;
                            else masked = key;
                        }
                    }
                    await client.query(
                        `UPDATE user_files SET file_path = $1, masked_path = $2,
                         file_data = NULL, masked_data = NULL WHERE file_id = $3`, [original, masked, row.file_id]
                    );
                    return true;
                });
                if (!changed) return moved;
                moved++;
            }
        },
    };
    return repository;
}
