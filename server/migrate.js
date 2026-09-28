import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import db from './db.js';

export async function migrate(client, directory = new URL('./migrations/', import.meta.url)) {
    const files = (await readdir(directory)).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
    if (files.length === 0) throw new Error('No SQL migrations found');
    await client.query('BEGIN');
    try {
        // Serialize simultaneous deployments on the same database.
        await client.query('SELECT pg_advisory_xact_lock(73628104)');
        await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
            version text PRIMARY KEY,
            applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        for (const file of files) {
            const version = file.slice(0, -4);
            const { rows } = await client.query(
                'SELECT version FROM schema_migrations WHERE version = $1', [version]
            );
            if (rows.length === 0) {
                const sql = await readFile(new URL(file, directory), 'utf8');
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [version]);
            }
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    let client;
    try {
        client = await db.connect();
        await migrate(client);
        console.log('PostgreSQL schema is up to date.');
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exitCode = 1;
    } finally {
        client?.release();
        await db.end();
    }
}
