import 'dotenv/config';
export function loadConfig(env = process.env) {
    const production = env.NODE_ENV === 'production';
    const secret = env.SECRET_KEY;
    if (!secret || secret.length < 32) throw new Error('SECRET_KEY must contain at least 32 characters');
    const origin = new URL(env.APP_ORIGIN || (production ? '' : 'http://localhost:5173')).origin;
    if (production && !origin.startsWith('https://')) throw new Error('APP_ORIGIN must use HTTPS in production');
    if (production && (!env.FLASK_URL || !env.PROCESSOR_SECRET || env.PROCESSOR_SECRET.length < 32)) {
        throw new Error('Set FLASK_URL and a PROCESSOR_SECRET of at least 32 characters');
    }
    if (!env.RECAPTCHA_SECRET_KEY) throw new Error('RECAPTCHA_SECRET_KEY is required');
    return { production, secret, origin, captchaSecret: env.RECAPTCHA_SECRET_KEY,
        port: Number(env.PORT || 8081), host: env.HOST || '::' };
}
