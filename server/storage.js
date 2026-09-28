import 'dotenv/config';
import { mkdir, readFile, writeFile, rename, unlink, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

export function createStorage(root) {
    root = resolve(root);
    const path = key => {
        if (!/^[0-9a-f-]{36}\.bin$/.test(key)) throw new Error('Invalid storage key');
        return join(root, key);
    };
    return {
        root,
        async init() {
            await mkdir(root, { recursive: true, mode: 0o700 });
            await access(root, constants.W_OK | constants.R_OK);
        },
        async put(bytes) {
            const key = randomUUID() + '.bin';
            const target = path(key);
            const temporary = target + '.tmp';
            try {
                await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 });
                await rename(temporary, target);
                return key;
            } catch (error) {
                await unlink(temporary).catch(() => {});
                throw error;
            }
        },
        read: key => readFile(path(key)),
        async remove(key) {
            try { await unlink(path(key)); }
            catch (error) { if (error.code !== 'ENOENT') throw error; }
        },
    };
}
export function configuredStorage() {
    const mount = process.env.UPLOAD_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH;
    if (!mount && process.env.NODE_ENV === 'production') {
        throw new Error('Set UPLOAD_DIR to the persistent volume mount path in production');
    }
    return createStorage(mount || fileURLToPath(new URL('./uploads/', import.meta.url)));
}
