import { pathToFileURL } from 'node:url';
import db from './db.js';
import { migrate } from './migrate.js';
import { configuredStorage } from './storage.js';
import { createFileRepository } from './file-repository.js';

export async function prepareApi({ database, storage, start }) {
    const client = await database.connect();
    try {
        await migrate(client);
    } finally {
        client.release();
    }
    await storage.init();
    const repository = createFileRepository(database, storage);
    const moved = await repository.migrateLegacy();
    await repository.cleanup();
    console.log('Migrations complete; legacy files moved:', moved);
    await start();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        await prepareApi({
            database: db,
            storage: configuredStorage(),
            start: () => import('./server.js'),
        });
    } catch (error) {
        console.error('API startup aborted:', error.message);
        process.exitCode = 1;
        await db.end();
    }
}
