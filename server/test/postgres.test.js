import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { migrate } from '../migrate.js';

test('migrations rerun without losing records and invalid DDL rolls back', async t => {
    const engine = new PGlite();
    t.after(() => engine.close());
    const client = { query: (sql, params) => params ? engine.query(sql,params) : engine.exec(sql).then(r => r.at(-1)) };
    await migrate(client);
    await engine.query('INSERT INTO users(user_id,"fullName",email,password) VALUES ($1,$2,$3,$4)', [randomUUID(),'Alice','Alice@example.test','hash']);
    await migrate(client);
    assert.equal((await engine.query('SELECT * FROM users')).rows.length,1);
    assert.equal((await engine.query('SELECT * FROM schema_migrations')).rows.length,4);
    await assert.rejects(engine.query('INSERT INTO users(user_id,"fullName",email,password) VALUES ($1,$2,$3,$4)', [randomUUID(),'Alice','alice@example.test','hash']),{code:'23505'});
    const broken = new PGlite();
    t.after(() => broken.close());
    await broken.exec('CREATE TABLE user_files(existing integer)');
    await assert.rejects(migrate({ query: (sql,params) => params ? broken.query(sql,params) : broken.exec(sql).then(r=>r.at(-1)) }),{code:'42P07'});
    assert.equal((await broken.query("SELECT to_regclass('users') AS name")).rows[0].name,null);
});
