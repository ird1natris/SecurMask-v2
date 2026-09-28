import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';

export const run = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const emailRule = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(255).required();
const passwordRule = Joi.string().min(8).max(72).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]+$/).required();
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
function validate(schema, body) {
    const { value, error } = Joi.object(schema).validate(body, { stripUnknown: true });
    if (error) throw fail(error.details[0].message);
    return value;
}
async function transaction(db, action) {
    const client = await db.connect();
    try { await client.query('BEGIN'); const result = await action(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
}
export function createAuth({ db, config, sendMail, limits = true }) {
    const router = express.Router();
    const cookie = { httpOnly: true, secure: config.production, sameSite: 'strict', path: '/' };
    const limiter = max => limits ? rateLimit({ windowMs: 15 * 60 * 1000, limit: max, standardHeaders: 'draft-7', legacyHeaders: false,
        message: { Error: 'Too many attempts. Please try again later.' } }) : (req, res, next) => next();
    const otpHash = (email, purpose, code) => createHmac('sha256', config.secret).update(purpose + ':' + email.toLowerCase() + ':' + code).digest('hex');
    const token = payload => jwt.sign(payload, config.secret, { expiresIn: '5m', algorithm: 'HS256' });
    const readToken = value => jwt.verify(value, config.secret, { algorithms: ['HS256'] });
    const authenticate = run(async (req, res, next) => {
        let decoded;
        try { decoded = readToken(req.cookies.token); } catch { throw fail('Please log in.', 401); }
        if (decoded.purpose !== 'session') throw fail('Please log in.', 401);
        const { rows } = await db.query('SELECT user_id, email, session_version FROM users WHERE user_id = $1', [decoded.user_id]);
        if (!rows.length || rows[0].session_version !== decoded.version) throw fail('Please log in again.', 401);
        req.user = rows[0]; next();
    });
    const challenge = (req, email) => {
        let value;
        try { value = readToken(req.cookies.login_challenge); } catch { throw fail('Please enter your email and password again.', 401); }
        if (value.purpose !== 'login' || value.email !== email) throw fail('Invalid login challenge.', 401);
        return value;
    };
    async function issue(email, purpose, userId, challengeId, resending = false) {
        const code = String(randomInt(100000, 1000000));
        const hash = otpHash(email, purpose, code);
        const expires = new Date(Date.now() + 5 * 60 * 1000);
        const table = purpose === 'login' ? 'mfa_otps' : 'password_resets';
        await transaction(db, async client => {
            await client.query('SELECT user_id FROM users WHERE lower(email) = lower($1) FOR UPDATE', [email]);
            const { rows } = await client.query('SELECT * FROM ' + table + ' WHERE lower(email) = lower($1)', [email]);
            if (resending && (!rows.length || rows[0].challenge_id !== challengeId)) throw fail('Please log in again.',401);
            if (rows.length && Date.now() - new Date(rows[0].created_at).getTime() < 60000) throw fail('Please wait a minute before requesting another code.', 429);
            await client.query('DELETE FROM ' + table + ' WHERE lower(email) = lower($1)', [email]);
            if (purpose === 'login') {
                await client.query('INSERT INTO mfa_otps(user_id,email,otp,expires_at,challenge_id) VALUES ($1,$2,$3,$4,$5)', [userId,email,hash,expires,challengeId]);
            } else {
                await client.query('INSERT INTO password_resets(email,otp,expires_at) VALUES ($1,$2,$3)', [email,hash,expires]);
            }
        });
        try {
            await sendMail({ to: email, subject: purpose === 'login' ? 'Classifile login code' : 'Classifile password reset',
                text: 'Your Classifile verification code is ' + code + '. It expires in 5 minutes. Do not share this code.' });
        } catch {
            await db.query('DELETE FROM ' + table + ' WHERE lower(email) = lower($1) AND otp = $2', [email,hash]);
            throw fail('Unable to send verification email. Please try again.', 503);
        }
    }
    async function check(client, email, code, purpose, challengeId) {
        const table = purpose === 'login' ? 'mfa_otps' : 'password_resets';
        const { rows } = await client.query('SELECT * FROM ' + table + ' WHERE lower(email) = lower($1) FOR UPDATE', [email]);
        const row = rows[0];
        if (!row || row.attempts >= 5 || new Date(row.expires_at).getTime() <= Date.now() ||
            (purpose === 'login' && row.challenge_id !== challengeId)) return { error: 'Invalid or expired verification code.' };
        const expected = Buffer.from(row.otp);
        const actual = Buffer.from(otpHash(email, purpose, code));
        if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
            await client.query('UPDATE ' + table + ' SET attempts = attempts + 1 WHERE id = $1', [row.id]);
            return { error: 'Invalid or expired verification code.' };
        }
        return { row, table };
    }
    router.post('/register', limiter(10), run(async (req, res) => {
        const value = validate({ fullName: Joi.string().trim().min(3).max(255).required(), email: emailRule, password: passwordRule }, req.body);
        const password = await bcrypt.hash(value.password, 12);
        try {
            await db.query('INSERT INTO users(user_id,"fullName",email,password) VALUES ($1,$2,$3,$4)', [randomUUID(),value.fullName,value.email,password]);
        } catch (error) {
            if (error.code === '23505') return res.status(400).json('Email already in use');
            throw error;
        }
        res.status(201).json('User registered successfully');
    }));
    router.post('/login', limiter(15), run(async (req, res) => {
        const { email, password } = validate({ email: emailRule, password: Joi.string().max(72).required() }, req.body);
        const { rows } = await db.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
        if (!rows.length || !await bcrypt.compare(password, rows[0].password)) throw fail('Invalid email or password.');
        const id = randomUUID();
        await issue(email, 'login', rows[0].user_id, id);
        res.cookie('login_challenge', token({ purpose: 'login', email, user_id: rows[0].user_id, challenge_id: id }), { ...cookie, maxAge: 300000 });
        res.json({ Status: 'Success', Message: 'OTP sent to your email. Please verify.' });
    }));
    router.post('/resend-otp', limiter(5), run(async (req, res) => {
        const { email } = validate({ email: emailRule }, req.body);
        const value = challenge(req, email);
        // A consumed challenge must not be able to create another login code.
        const { rows } = await db.query('SELECT id FROM mfa_otps WHERE challenge_id = $1', [value.challenge_id]);
        if (!rows.length) throw fail('Please log in again.', 401);
        await issue(email, 'login', value.user_id, value.challenge_id, true);
        res.json({ Status: 'Success', Message: 'OTP sent to your email. Please verify.' });
    }));
    router.post('/verify-otp-login', limiter(20), run(async (req, res) => {
        const { email, otp } = validate({ email: emailRule, otp: Joi.string().pattern(/^\d{6}$/).required() }, req.body);
        const value = challenge(req, email);
        const outcome = await transaction(db, async client => {
            const user = await client.query('SELECT session_version FROM users WHERE user_id = $1 FOR UPDATE', [value.user_id]);
            const result = await check(client,email,otp,'login',value.challenge_id);
            result.version = user.rows[0]?.session_version;
            if (result.error) return result;
            await client.query('DELETE FROM mfa_otps WHERE id = $1', [result.row.id]);
            return result;
        });
        if (outcome.error) throw fail(outcome.error);
        const session = jwt.sign({ purpose: 'session', user_id: outcome.row.user_id, version: outcome.version }, config.secret, { expiresIn: '1h', algorithm: 'HS256' });
        res.clearCookie('login_challenge', cookie);
        res.cookie('token', session, { ...cookie, maxAge: 3600000 }).json({ Status: 'Login successful.' });
    }));
    router.post('/forgot-password', limiter(5), run(async (req, res) => {
        const { email } = validate({ email: emailRule }, req.body);
        const { rows } = await db.query('SELECT user_id FROM users WHERE lower(email) = lower($1)', [email]);
        if (rows.length) await issue(email,'reset');
        res.json({ Status: 'If that account exists, a verification code has been sent.' });
    }));
    router.post('/verify-otp', limiter(20), run(async (req, res) => {
        const { email, otp } = validate({ email: emailRule, otp: Joi.string().pattern(/^\d{6}$/).required() }, req.body);
        const result = await transaction(db, client => check(client,email,otp,'reset'));
        if (result.error) throw fail(result.error);
        res.json({ Status: 'OTP verified successfully.' });
    }));
    router.post('/reset-password', limiter(10), run(async (req, res) => {
        const { email, otp, newPassword } = validate({ email: emailRule, otp: Joi.string().pattern(/^\d{6}$/).required(), newPassword: passwordRule }, req.body);
        const hash = await bcrypt.hash(newPassword, 12);
        const result = await transaction(db, async client => {
            // Same lock order as issue() avoids deadlocks during concurrent resend/reset.
            const { rows } = await client.query('SELECT * FROM users WHERE lower(email) = lower($1) FOR UPDATE', [email]);
            const checked = await check(client,email,otp,'reset');
            if (checked.error || !rows.length) return { error: 'Invalid or expired verification code.' };
            if (await bcrypt.compare(newPassword,rows[0].password)) return { error: 'Choose a different password.' };
            await client.query('UPDATE users SET password = $1, session_version = session_version + 1 WHERE user_id = $2', [hash,rows[0].user_id]);
            await client.query('DELETE FROM password_resets WHERE id = $1', [checked.row.id]);
            await client.query('DELETE FROM mfa_otps WHERE user_id = $1', [rows[0].user_id]);
            return {};
        });
        if (result.error) throw fail(result.error);
        res.clearCookie('token',cookie).json({ success: true, message: 'Password updated successfully.' });
    }));
    router.get('/verifyToken', authenticate, (req,res) => res.json({ Status: 'Success', decoded: { user_id: req.user.user_id, email: req.user.email } }));
    router.get('/homepage', authenticate, (req,res) => res.json({ message: 'Welcome to Classifile', user: req.user }));
    router.post('/logout', (req,res) => {
        for (const name of ['token','login_challenge','captcha_pass']) res.clearCookie(name,cookie);
        res.json({ Status: 'Logged out successfully.' });
    });
    return { router, authenticate, cookie, limiter };
}
