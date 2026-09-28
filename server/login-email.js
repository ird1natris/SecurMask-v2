// Inline styles and presentation tables keep the code readable in email clients.
export function createLoginEmail({ code, origin }) {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new Error('Invalid sign-in code');
    const site = new URL(origin);
    if (!['https:', 'http:'].includes(site.protocol)) throw new Error('Invalid app origin');
    const logo = new URL('/email/securmask-logo.png', site.origin).href.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    return {
        subject: 'Your SecurMask sign-in code',
        text: 'Your SecurMask sign-in code is ' + code + '.\n\nEnter it in the browser where you started signing in. It expires in 5 minutes and can only be used once.\n\nDo not share this code. If you did not request it, ignore this email.\n\nSecurMask\nShare the data. Keep the details private.',
        html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Your SecurMask sign-in code</title>
<style>@media only screen and (max-width:480px){.outer{padding:24px 12px!important}.content{padding:28px 24px!important}.code{font-size:32px!important;letter-spacing:6px!important}}</style>
</head><body style="margin:0;padding:0;background-color:#131135;color:#EEEDED;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Your one-time sign-in code is ready. Valid for 5 minutes.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#131135"><tr><td class="outer" align="center" style="padding:48px 16px;">
<!--[if mso]><table role="presentation" width="560" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 8px 28px;"><img src="${logo}" width="224" alt="SecurMask" style="display:block;width:224px;max-width:100%;height:auto;border:0;color:#00f6ff;font-size:28px;font-weight:bold;"></td></tr>
<tr><td bgcolor="#1F1E23" style="background-color:#1F1E23;border:1px solid #39344e;border-radius:20px;overflow:hidden;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td height="4" bgcolor="#875eff" style="height:4px;background-color:#875eff;background-image:linear-gradient(90deg,#00f6ff,#875eff);font-size:0;line-height:4px;">&nbsp;</td></tr>
<tr><td class="content" style="padding:40px;">
<p style="margin:0 0 18px;color:#00f6ff;font-size:11px;line-height:18px;font-weight:bold;letter-spacing:2px;">SIGN-IN VERIFICATION</p>
<h1 style="margin:0 0 14px;color:#ffffff;font-size:30px;line-height:38px;letter-spacing:-1px;">Your sign-in code.</h1>
<p style="margin:0 0 28px;color:#cbd5e1;font-size:15px;line-height:24px;">One more step to your workspace. Enter this code in the browser where you started signing in.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#f4f2ff" style="padding:24px 8px;background-color:#f4f2ff;border-radius:12px;">
<p style="margin:0 0 10px;color:#554579;font-size:10px;line-height:16px;font-weight:bold;letter-spacing:2px;">YOUR ONE-TIME CODE</p>
<p class="code" style="margin:0;color:#201b45;font-family:Consolas,'Courier New',monospace;font-size:40px;line-height:50px;font-weight:bold;letter-spacing:8px;white-space:nowrap;">${code}</p>
</td></tr></table>
<p style="margin:16px 0 28px;text-align:center;color:#c4b5fd;font-size:12px;line-height:20px;">Expires in <strong>5 minutes</strong> &middot; One-time use</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-top:1px solid #39344e;padding-top:24px;">
<p style="margin:0 0 8px;color:#EEEDED;font-size:13px;line-height:21px;font-weight:bold;">Keep this code to yourself.</p>
<p style="margin:0;color:#a8afbf;font-size:13px;line-height:21px;">If you didn&rsquo;t request this email, you can safely ignore it.</p>
</td></tr></table></td></tr></table></td></tr>
<tr><td style="padding:24px 8px 0;"><p style="margin:0;color:#b8b4ce;font-size:12px;line-height:20px;">Share the data. Keep the details private.</p><p style="margin:6px 0 0;color:#b8b4ce;font-size:11px;line-height:18px;">SecurMask &middot; Account access</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`
    };
}
