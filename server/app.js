import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { createAuth, run } from './auth.js';
import { createFileRepository } from './file-repository.js';
import { createFileRouter, createProcessor } from './file-routes.js';

export function createApp({ db, storage, config, sendMail, processor = createProcessor(), verifyCaptcha, limits = true }) {
    const app = express();
    app.disable('x-powered-by');
    // API is private, reached through one trusted web proxy which replaces X-Forwarded-For.
    app.set('trust proxy', 1);
    app.use((req, res, next) => {
        res.set('Cache-Control','no-store');
        res.set('X-Content-Type-Options','nosniff');
        const origin = req.get('Origin');
        if (!['GET','HEAD','OPTIONS'].includes(req.method) &&
            ((origin && origin !== config.origin) || (config.production && !origin))) {
            return res.status(403).json({ Error: 'Request origin is not allowed.' });
        }
        next();
    });
    app.use(cors({ origin: config.origin, credentials: true }));
    app.use(express.json({ limit: '12mb' }));
    app.use(cookieParser());
    const auth = createAuth({ db, config, sendMail, limits });
    const repository = createFileRepository(db,storage);
    app.get('/health', run(async (req,res) => {
        await db.query('SELECT 1');
        await storage.check();
        res.json({ status: 'ok', service: 'classifile-api' });
    }));
    app.use(auth.router);
    app.post('/verify-captcha', auth.authenticate, auth.limiter(20), run(async (req,res) => {
        const value = req.body.captchaValue;
        if (typeof value !== 'string' || value.length > 4096) return res.status(400).json({ success: false });
        const valid = verifyCaptcha ? await verifyCaptcha(value) : await (async () => {
            const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
                method: 'POST',
                body: new URLSearchParams({ secret: config.captchaSecret, response: value }),
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) return false;
            const result = await response.json();
            return result.success === true && result.hostname === new URL(config.origin).hostname;
        })();
        if (!valid) return res.status(400).json({ success: false });
        const proof = jwt.sign({ purpose: 'captcha', user_id: req.user.user_id }, config.secret, { expiresIn: '2m', algorithm: 'HS256' });
        res.cookie('captcha_pass',proof,{ ...auth.cookie, maxAge: 120000 }).json({ success: true });
    }));
    app.use(['/mask','/file'], auth.authenticate, (req,res,next) => {
        try {
            const proof = jwt.verify(req.cookies.captcha_pass,config.secret,{ algorithms:['HS256'] });
            if (proof.purpose !== 'captcha' || proof.user_id !== req.user.user_id) throw new Error();
            res.clearCookie('captcha_pass',auth.cookie);
            next();
        } catch { res.status(403).json({ message: 'Please complete the CAPTCHA again.' }); }
    });
    app.use(['/upload','/detect_columns','/mask','/file','/generate-signature','/verify-signature'], auth.limiter(60));
    app.use(createFileRouter({ repository, authenticate: auth.authenticate, processor, secret: config.secret }));
    app.post('/send-feedback', auth.authenticate, auth.limiter(3), run(async (req,res) => {
        const { value, error } = Joi.object({
            name: Joi.string().trim().max(100).required(),
            message: Joi.string().trim().max(2000).required(),
        }).validate(req.body,{ stripUnknown: true });
        if (error) return res.status(400).json({ error: 'Enter a name and a message of up to 2,000 characters.' });
        await sendMail({ to: req.user.email, subject: 'Classifile feedback received',
            text: 'Hello ' + value.name + ',\n\nWe received your feedback:\n\n' + value.message + '\n\nClassifile' });
        res.json({ message: 'Feedback received.' });
    }));
    app.use((req,res) => res.status(404).json({ Error: 'Endpoint not found.' }));
    app.use((error,req,res,next) => {
        const status = error.status || (error.type === 'entity.too.large' ? 413 : 500);
        if (status >= 500) console.error('API request failed:', error.code || error.name);
        res.status(status).json({ Error: status < 500 ? error.message : 'Request failed. Please try again.' });
    });
    return app;
}
