import nodemailer from 'nodemailer';
export function createMailer(env = process.env, request = fetch) {
    const provider = env.EMAIL_PROVIDER || (env.NODE_ENV === 'production' ? 'resend' : 'smtp');
    const from = env.EMAIL_FROM || env.EMAIL_USER;
    if (!from) throw new Error('EMAIL_FROM is required');
    if (provider === 'resend') {
        if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required');
        return async ({ to, subject, text }) => {
            const response = await request('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ from, to: [to], subject, text }),
                signal: AbortSignal.timeout(15000),
            });
            if (!response.ok) throw new Error('Email delivery failed (' + response.status + ')');
        };
    }
    if (provider !== 'smtp') throw new Error('EMAIL_PROVIDER must be resend or smtp');
    if (!env.EMAIL_USER || !env.EMAIL_PASS) throw new Error('SMTP requires EMAIL_USER and EMAIL_PASS');
    const transport = nodemailer.createTransport({
        service: env.EMAIL_SERVICE || 'gmail',
        auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
        connectionTimeout: 15000, socketTimeout: 20000,
    });
    return ({ to, subject, text }) => transport.sendMail({ from, to, subject, text });
}
