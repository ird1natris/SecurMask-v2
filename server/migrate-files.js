import db from './db.js';
import { configuredStorage } from './storage.js';
import { createFileRepository } from './file-repository.js';
try {
    const storage = configuredStorage();
    await storage.init();
    const repository = createFileRepository(db, storage);
    const count = await repository.migrateLegacy();
    await repository.cleanup();
    console.log('Moved legacy files to volume:', count);
} catch (error) {
    console.error('File migration failed:', error.message);
    process.exitCode = 1;
} finally { await db.end(); }
