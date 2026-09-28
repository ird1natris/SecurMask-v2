import db from './db.js';
import { loadConfig } from './config.js';
import { createMailer } from './mail.js';
import { configuredStorage } from './storage.js';
import { createApp } from './app.js';

const config = loadConfig();
const storage = configuredStorage();
await storage.init();
const app = createApp({ db, storage, config, sendMail: createMailer() });
const server = app.listen(config.port, config.host, () => console.log('Classifile API listening on port ' + config.port));
for (const signal of ['SIGTERM','SIGINT']) {
    process.once(signal, () => {
        const deadline = setTimeout(() => process.exit(1), 10000).unref();
        server.close(async () => { await db.end(); clearTimeout(deadline); process.exit(0); });
    });
}
