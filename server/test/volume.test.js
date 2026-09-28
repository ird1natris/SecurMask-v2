import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { createStorage } from '../storage.js';
import { createFileRepository } from '../file-repository.js';
import { createFileRouter } from '../file-routes.js';
import { migrate } from '../migrate.js';

async function fixture(t) {
    const root = await mkdtemp(join(tmpdir(), 'securmask-test-'));
    const engine = new PGlite();
    t.after(async () => { await engine.close(); await rm(root, { recursive: true, force: true }); });
    const query = async (sql, values) => {
        const result = values ? await engine.query(sql, values) : (await engine.exec(sql)).at(-1);
        return { ...result, rowCount: result?.affectedRows ?? result?.rows?.length ?? 0 };
    };
    const db = { query, connect: async () => ({ query, release() {} }) };
    await migrate(await db.connect());
    await query("SET TIME ZONE 'UTC'");
    const user = randomUUID(), other = randomUUID();
    for (const id of [user, other]) await query(
        'INSERT INTO users(user_id, "fullName", email, password) VALUES ($1, $2, $3, $4)',
        [id, 'Test', id + '@example.test', 'hash']
    );
    const storage = createStorage(root);
    await storage.init();
    return { root, engine, db, user, other, storage, repository: createFileRepository(db, storage) };
}

test('volume bytes survive recreation, ownership is enforced, replacements and deletion clean up', async t => {
    const f = await fixture(t);
    const bytes = randomBytes(256), iv = randomBytes(16);
    const id = await f.repository.create(f.user, '../../outside.csv', bytes, iv);
    const row = (await f.db.query('SELECT * FROM user_files')).rows[0];
    assert.equal(row.file_data, null);
    assert.match(row.file_path, /^[a-f0-9-]+\.bin$/);
    assert.deepEqual(await f.storage.read(row.file_path), bytes);
    const reopened = createFileRepository(f.db, createStorage(f.root));
    assert.deepEqual((await reopened.read(id, f.user)).file_data, bytes);
    await assert.rejects(reopened.read(id, f.other), { status: 404 });
    await assert.rejects(reopened.remove(id, f.other), { status: 404 });
    await assert.rejects(reopened.saveMasked(id, f.other, bytes), { status: 404 });
    await assert.rejects(reopened.saveSignature(id, f.other, 'x', 'y'), { status: 404 });
    assert.throws(() => f.storage.read('../outside'), /Invalid storage key/);
    await reopened.saveMasked(id, f.user, Buffer.from('masked'));
    await reopened.saveMasked(id, f.user, Buffer.from('replacement'));
    assert.equal((await readdir(f.root)).length, 2);
    const updated = (await f.db.query('SELECT * FROM user_files')).rows[0];
    assert.equal(updated.masked_data, null);
    assert.equal((await f.storage.read(updated.masked_path)).toString(), 'replacement');
    await reopened.remove(id, f.user);
    assert.deepEqual(await readdir(f.root), []);
    assert.equal((await f.db.query('SELECT * FROM user_files')).rows.length, 0);
});

test('legacy migration preserves bytes, supports fallback reads, and is repeatable', async t => {
    const f = await fixture(t);
    const id = randomUUID(), bytes = randomBytes(50), masked = Buffer.from('masked');
    await f.db.query(
        'INSERT INTO user_files(file_id,user_id,file_data,masked_data,iv) VALUES ($1,$2,$3,$4,$5)',
        [id, f.user, bytes, masked, randomBytes(16)]
    );
    assert.deepEqual((await f.repository.read(id, f.user)).file_data, bytes);
    assert.equal(await f.repository.migrateLegacy(), 1);
    assert.equal(await f.repository.migrateLegacy(), 0);
    const row = (await f.db.query('SELECT * FROM user_files')).rows[0];
    assert.equal(row.file_data, null);
    assert.equal(row.masked_data, null);
    assert.deepEqual(await f.storage.read(row.file_path), bytes);
    assert.deepEqual(await f.storage.read(row.masked_path), masked);
});

test('failed metadata writes remove new bytes; failed physical deletion stays queued for retry', async t => {
    const f = await fixture(t);
    const failingDb = {
        ...f.db,
        connect: async () => {
            const client = await f.db.connect();
            return { ...client, query: (sql, values) => {
                if (sql.startsWith('INSERT INTO user_files')) throw new Error('injected database failure');
                return client.query(sql, values);
            } };
        },
    };
    await assert.rejects(createFileRepository(failingDb, f.storage).create(f.user, 'file.csv', Buffer.from('x'), randomBytes(16)));
    assert.deepEqual(await readdir(f.root), []);
    const id = await f.repository.create(f.user, 'file.csv', Buffer.from('x'), randomBytes(16));
    const failingStorage = { ...f.storage, remove: async () => { throw Object.assign(new Error('busy'), { code: 'EBUSY' }); } };
    await createFileRepository(f.db, failingStorage).remove(id, f.user);
    assert.equal((await f.db.query('SELECT * FROM user_files')).rows.length, 0);
    assert.equal((await f.db.query('SELECT * FROM file_cleanup')).rows.length, 1);
    await f.repository.cleanup();
    assert.equal((await f.db.query('SELECT * FROM file_cleanup')).rows.length, 0);
    assert.deepEqual(await readdir(f.root), []);
});

test('storage failure preserves legacy data and daily upload limits still apply', async t => {
    const f = await fixture(t);
    const id = randomUUID(), bytes = Buffer.from('legacy');
    await f.db.query('INSERT INTO user_files(file_id,user_id,file_data) VALUES ($1,$2,$3)', [id,f.user,bytes]);
    const failing = createFileRepository(f.db, { ...f.storage, put: async () => { throw new Error('disk full'); } });
    await assert.rejects(failing.migrateLegacy(), /disk full/);
    assert.deepEqual(Buffer.from((await f.db.query('SELECT file_data FROM user_files')).rows[0].file_data), bytes);
    for (let n = 0; n < 4; n++) await f.repository.create(f.user, 'file.csv', bytes, randomBytes(16));
    await assert.rejects(f.repository.create(f.user, 'file.csv', bytes, randomBytes(16)), { status: 400 });
    await f.db.query("UPDATE user_files SET created_at = CURRENT_DATE - INTERVAL '1 day'");
    await f.repository.create(f.user, 'file.csv', bytes, randomBytes(16));
});

test('HTTP upload, mask, recovery, signatures and deletion use volume storage and reject unauthorized access', async t => {
    const f = await fixture(t);
    const app = express();
    app.use(express.json());
    app.use(createFileRouter({
        repository: f.repository, secret: 'test-only-secret', maxBytes: 1024,
        authenticate(req, res, next) {
            if (!req.headers['x-user']) return res.status(401).json({ message: 'Login required' });
            req.user = { user_id: req.headers['x-user'] }; next();
        },
        processor: {
            process: async bytes => bytes.toString(),
            mask: async () => 'name\nHidden\n',
            recover: async bytes => bytes.toString(),
        },
    }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const base = 'http://127.0.0.1:' + server.address().port;
    async function request(path, body, user = f.user, method = 'POST') {
        return fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(user ? { 'x-user': user } : {}) }, body: JSON.stringify(body) });
    }
    for (const path of ['/upload','/mask','/file','/generate-signature','/verify-signature']) {
        assert.equal((await request(path, {}, null)).status, 401);
    }
    assert.equal((await request('/deleteFile', {}, null, 'DELETE')).status, 401);
    async function upload(name, data) {
        const form = new FormData();
        form.append('file', new Blob([data]), name);
        form.append('key', 'test-key-123');
        return fetch(base + '/upload', { method: 'POST', headers: { 'x-user': f.user }, body: form });
    }
    assert.equal((await upload('test.exe', 'bad')).status, 400);
    assert.equal((await upload('test.csv', 'x'.repeat(1025))).status, 413);
    const response = await upload('test.csv', 'name\nAlice\n');
    assert.equal(response.status, 200);
    const { fileId } = await response.json();
    const row = (await f.db.query('SELECT * FROM user_files')).rows[0];
    assert.equal(row.file_data, null);
    assert.notEqual((await f.storage.read(row.file_path)).toString(), 'name\nAlice\n');
    assert.equal((await request('/file', { fileId, decryptionKey: 'test-key-123' }, f.other)).status, 404);
    assert.equal((await request('/file', { fileId, decryptionKey: 'wrong-key' })).status, 400);
    const recovered = await request('/file', { fileId, decryptionKey: 'test-key-123' });
    assert.equal((await recovered.json()).content, 'name\nAlice\n');
    assert.equal((await request('/mask', { fileId, key: 'test-key-123', columnsToMask: [] })).status, 200);
    const signed = await request('/generate-signature', { fileId, fileContent: 'name\nHidden\n' });
    const { signature } = await signed.json();
    assert.equal((await request('/verify-signature', { fileId, fileContent: 'name\nHidden\n', signature })).status, 200);
    assert.equal((await request('/verify-signature', { fileId, fileContent: 'tampered', signature })).status, 400);
    assert.equal((await request('/deleteFile', { id: fileId }, f.other, 'DELETE')).status, 404);
    assert.equal((await request('/deleteFile', { id: fileId }, f.user, 'DELETE')).status, 200);
    assert.deepEqual(await readdir(f.root), []);
});

test('API startup migrates before serving, skips completed work and stops on storage failure', async t => {
    const { prepareApi } = await import('../start-api.js');
    const f = await fixture(t);
    await f.db.query('INSERT INTO user_files(file_id,user_id,file_data) VALUES ($1,$2,$3)',
        [randomUUID(), f.user, Buffer.from('legacy')]);
    let started = 0;
    const start = async () => {
        const row = (await f.db.query('SELECT * FROM user_files')).rows[0];
        assert.equal(row.file_data, null);
        assert.equal((await f.storage.read(row.file_path)).toString(), 'legacy');
        started++;
    };
    await prepareApi({ database: f.db, storage: f.storage, start });
    await prepareApi({ database: f.db, storage: f.storage, start });
    assert.equal(started, 2);
    await assert.rejects(prepareApi({
        database: f.db,
        storage: { ...f.storage, init: async () => { throw new Error('mount unavailable'); } },
        start,
    }), /mount unavailable/);
    assert.equal(started, 2);
    const failing = {
        connect: async () => ({ query: async () => { throw new Error('schema failure'); }, release() {} }),
    };
    await assert.rejects(prepareApi({ database: failing, storage: f.storage, start }), /schema failure/);
    assert.equal(started, 2);
});

test('migration discovery applies new numbered SQL files once and rolls back a failing batch', async t => {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { pathToFileURL } = await import('node:url');
    const f = await fixture(t);
    const directory = join(f.root, 'migrations');
    await mkdir(directory);
    const url = pathToFileURL(directory + '/');
    await writeFile(join(directory, '003_probe.sql'), 'CREATE TABLE probe (id integer PRIMARY KEY);');
    await migrate(await f.db.connect(), url);
    await writeFile(join(directory, '005_fail.sql'), 'INVALID SQL;');
    await writeFile(join(directory, '004_seed.sql'), 'INSERT INTO probe VALUES (1);');
    await assert.rejects(migrate(await f.db.connect(), url));
    assert.equal((await f.db.query('SELECT * FROM probe')).rows.length, 0);
    await writeFile(join(directory, '005_fail.sql'), 'INSERT INTO probe VALUES (2);');
    await migrate(await f.db.connect(), url);
    await migrate(await f.db.connect(), url);
    assert.deepEqual((await f.db.query('SELECT id FROM probe ORDER BY id')).rows.map(row => row.id), [1, 2]);
});
