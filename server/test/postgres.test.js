import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { migrate } from '../migrate.js';

const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');
// Exercise the actual route SQL, so regressions in placeholders and aliases fail.
const statements = [...source.matchAll(/(['"`])(\s*(?:SELECT|INSERT INTO|UPDATE|DELETE FROM)\b[\s\S]*?)\1/g)]
    .map(match => match[2].trim().replace(/\s+/g, ' '));
const sql = (prefix) => {
    const statement = statements.find(value => value.startsWith(prefix));
    assert.ok(statement, 'Missing route query: ' + prefix);
    return statement;
};

async function database(t) {
    const engine = new PGlite();
    t.after(() => engine.close());
    // pg supports multi-statement SQL; PGlite exposes it through exec().
    const client = { query: (text, params) => params
        ? engine.query(text, params)
        : engine.exec(text).then(results => results.at(-1)) };
    await migrate(client);
    await engine.exec("SET TIME ZONE 'UTC'");
    return { engine, client };
}

async function user(engine, email = 'Alice@Example.test') {
    const id = randomUUID();
    await engine.query(sql('INSERT INTO users'), [id, 'Alice', email, 'test-password-hash']);
    return id;
}

test('migration can rerun without losing records; failure rolls back partial DDL', async t => {
    const { engine, client } = await database(t);
    await user(engine);
    await migrate(client);
    assert.equal((await engine.query('SELECT * FROM users')).rows.length, 1);
    assert.equal((await engine.query('SELECT * FROM schema_migrations')).rows.length, 2);

    const broken = new PGlite();
    t.after(() => broken.close());
    await broken.exec('CREATE TABLE user_files (existing integer)');
    const brokenClient = { query: (text, params) => params
        ? broken.query(text, params)
        : broken.exec(text).then(results => results.at(-1)) };
    await assert.rejects(migrate(brokenClient), { code: '42P07' });
    assert.equal((await broken.query("SELECT to_regclass('users') AS name")).rows[0].name, null);
    assert.equal((await broken.query("SELECT to_regclass('schema_migrations') AS name")).rows[0].name, null);
});

test('accounts retain case-insensitive email matching and parameter safety', async t => {
    const { engine } = await database(t);
    await user(engine);
    const found = await engine.query(sql('SELECT * FROM users'), ['ALICE@example.test']);
    assert.equal(found.rows[0].fullName, 'Alice');
    await assert.rejects(user(engine, 'alice@example.test'), { code: '23505' });
    assert.equal((await engine.query(sql('SELECT * FROM users'), ["' OR 1=1 --"])).rows.length, 0);
    assert.equal((await engine.query(sql('UPDATE users'), ['new-hash', 'alice@example.test'])).affectedRows, 1);
    assert.equal((await engine.query(sql('SELECT password'), ['Alice@example.test'])).rows[0].password, 'new-hash');
    assert.equal((await engine.query(sql('UPDATE users'), ['new-hash', 'missing@example.test'])).affectedRows, 0);
});

test('OTP and reset timestamps round-trip across offsets and support updates/deletion', async t => {
    const { engine } = await database(t);
    const id = await user(engine);
    const created = new Date('2026-09-28T11:00:00+08:00');
    const expires = new Date('2026-09-28T11:05:00+08:00');
    await engine.query(sql('INSERT INTO mfa_otps'), [id, 'Alice@example.test', 'otp-hash', created, expires]);
    let rows = (await engine.query(sql('SELECT * FROM mfa_otps'), ['ALICE@example.test'])).rows;
    assert.equal(rows[0].expires_at.toISOString(), expires.toISOString());
    await engine.query(sql('UPDATE mfa_otps'), ['replacement-hash', expires, created, 'alice@example.test']);
    rows = (await engine.query(sql('SELECT * FROM mfa_otps'), ['alice@example.test'])).rows;
    assert.equal(rows[0].otp, 'replacement-hash');
    await engine.query(sql('INSERT INTO password_resets'), ['Alice@example.test', 'reset-hash', expires]);
    const reset = (await engine.query(sql('SELECT * FROM password_resets'), ['alice@example.test'])).rows[0];
    assert.equal(reset.otp, 'reset-hash');
    assert.equal(reset.expires_at.toISOString(), expires.toISOString());
    await engine.query(sql('DELETE FROM password_resets'), ['ALICE@example.test']);
    await engine.query(sql('DELETE FROM mfa_otps'), [id]);
    assert.equal((await engine.query(sql('SELECT * FROM password_resets'), ['alice@example.test'])).rows.length, 0);
    assert.equal((await engine.query(sql('SELECT * FROM mfa_otps'), ['alice@example.test'])).rows.length, 0);
});

