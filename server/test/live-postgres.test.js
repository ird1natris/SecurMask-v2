import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { migrate } from '../migrate.js';
import { createStorage } from '../storage.js';
import { createFileRepository } from '../file-repository.js';

test('live PostgreSQL migrations, binary values and volume repository', {skip: !process.env.TEST_DATABASE_URL}, async t => {
    const schema='test_'+randomUUID().replaceAll('-','');
    const admin=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
    await admin.query('CREATE SCHEMA '+schema);
    const db=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,options:'-c search_path='+schema+' -c timezone=UTC'});
    const root=await mkdtemp(join(tmpdir(),'securmask-pg-'));
    t.after(async()=>{await db.end();await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.end();await rm(root,{recursive:true,force:true});});
    const client=await db.connect();
    try {await migrate(client);await migrate(client);} finally {client.release();}
    const id=randomUUID();
    await db.query('INSERT INTO users(user_id,"fullName",email,password) VALUES ($1,$2,$3,$4)',[id,'Test','test@example.test','hash']);
    const storage=createStorage(root);await storage.init();
    const repository=createFileRepository(db,storage);
    const bytes=randomBytes(256),iv=randomBytes(16);
    const file=await repository.create(id,'test.csv',bytes,iv);
    const row=await repository.read(file,id);
    assert.deepEqual(row.file_data,bytes);assert.deepEqual(row.iv,iv);assert.equal(row.content_format,'raw_csv');
    await repository.remove(file,id);
    assert.equal((await db.query('SELECT * FROM user_files')).rowCount,0);
});
