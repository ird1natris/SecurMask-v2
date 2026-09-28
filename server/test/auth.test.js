import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../app.js';
import { createStorage } from '../storage.js';
import { createProcessor } from '../file-routes.js';
import { migrate } from '../migrate.js';
import { createMailer } from '../mail.js';

test('authentication, OTP lifecycle, reset invalidation and origin enforcement', async t => {
    const engine = new PGlite();
    const root = await mkdtemp(join(tmpdir(),'classifile-auth-'));
    const query = async (sql,params) => {
        const result = params ? await engine.query(sql,params) : (await engine.exec(sql)).at(-1);
        return {...result,rowCount:result?.affectedRows ?? result?.rows?.length ?? 0};
    };
    const db = {query,connect:async()=>({query,release(){}})};
    await migrate(await db.connect());
    const storage = createStorage(root);
    await storage.init();
    const messages=[];
    const config={production:true,secret:'test-secret-that-is-at-least-32-characters',origin:'https://classifile.test'};
    const processor=process.env.FLASK_TEST_URL ? createProcessor(process.env.FLASK_TEST_URL) : {
        process:async bytes=>bytes.toString(), detect:async()=>({columns:['name','code']}),
        mask:async()=> 'name,code\nXXXXXX,00123\n',
    };
    const app=createApp({db,storage,config,processor,limits:false,sendMail:async m=>messages.push(m),verifyCaptcha:async v=>v==='valid'});
    const server=app.listen(0,'127.0.0.1');
    await new Promise(r=>server.once('listening',r));
    t.after(async()=>{await new Promise(r=>server.close(r));await engine.close();await rm(root,{recursive:true,force:true});});
    const base='http://127.0.0.1:'+server.address().port;
    const jar={};
    async function req(path,body,options={}) {
        const headers={Origin:config.origin,...options.headers};
        if(options.cookies!==false)headers.Cookie=Object.entries(jar).map(([k,v])=>k+'='+v).join('; ');
        const init={method:body===undefined?'GET':'POST',headers};
        if(body!==undefined){init.body=body instanceof FormData?body:JSON.stringify(body);if(!(body instanceof FormData))headers['Content-Type']='application/json';}
        const res=await fetch(base+path,init);
        for(const cookie of res.headers.getSetCookie()){
            const [name,value]=cookie.split(';')[0].split('=');
            if(value)jar[name]=value;else delete jar[name];
        }
        return {status:res.status,data:await res.json(),headers:res.headers};
    }
    const account={fullName:'Alice Test',email:'alice@example.test',password:'Password123!'};
    const code=()=>messages.at(-1).text.match(/\b\d{6}\b/)[0];
    assert.equal((await req('/health')).status,200);
    assert.equal((await req('/register',account,{headers:{Origin:'https://evil.test'}})).status,403);
    assert.equal((await req('/register',account)).status,201);
    assert.equal((await req('/register',{...account,email:'ALICE@example.test'})).status,400);
    assert.equal((await req('/verifyToken')).status,401);
    assert.equal((await req('/resend-otp',{email:account.email})).status,401);
    const login=await req('/login',account);
    assert.equal(login.status,200);
    assert.match(login.headers.get('set-cookie'),/HttpOnly/);
    assert.match(login.headers.get('set-cookie'),/Secure/);
    assert.match(login.headers.get('set-cookie'),/SameSite=Strict/);
    const challenge=jar.login_challenge, otp=code();
    assert.equal((await req('/verify-otp-login',{email:account.email,otp},{cookies:false})).status,401);
    assert.equal((await req('/resend-otp',{email:account.email})).status,429);
    assert.equal((await req('/verify-otp-login',{email:account.email,otp})).status,200);
    const oldSession=jar.token;
    assert.equal((await req('/verifyToken')).status,200);
    jar.login_challenge=challenge;
    assert.equal((await req('/verify-otp-login',{email:account.email,otp})).status,400);
    assert.equal((await req('/resend-otp',{email:account.email})).status,401);
    assert.equal((await req('/file',{fileId:'missing',decryptionKey:'password'})).status,403);
    assert.equal((await req('/verify-captcha',{captchaValue:'invalid'})).status,400);

    const form=()=>{const f=new FormData();f.append('file',new Blob(['name,code\nAlice,00123\n'],{type:'text/csv'}),'test.csv');f.append('key','strong-file-key');return f;};
    const detected=await req('/detect_columns',form());
    assert.equal(detected.status,200);
    assert.deepEqual(detected.data.columns,['name','code']);
    const uploaded=await req('/upload',form());
    assert.equal(uploaded.status,200);
    const fileId=uploaded.data.fileId;
    assert.equal((await req('/verify-captcha',{captchaValue:'valid'})).status,200);
    const masked=await req('/mask',{fileId,key:'strong-file-key',columnsToMask:['name']});
    assert.equal(masked.status,200);
    assert.match(masked.data.content,/,00123/);
    assert.ok(!masked.data.content.includes('Alice'));
    assert.equal((await req('/file',{fileId,decryptionKey:'strong-file-key'})).status,403);
    await req('/verify-captcha',{captchaValue:'valid'});
    const recovered=await req('/file',{fileId,decryptionKey:'strong-file-key'});
    assert.equal(recovered.status,200);
    assert.equal(recovered.data.content,'name,code\nAlice,00123\n');

    await req('/forgot-password',{email:account.email});
    const resetCode=code();
    await query("UPDATE password_resets SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 second'");
    assert.equal((await req('/reset-password',{email:account.email,otp:resetCode,newPassword:'NewPassword123!'})).status,400);
    await query("UPDATE password_resets SET created_at = CURRENT_TIMESTAMP - INTERVAL '2 minutes'");
    await req('/forgot-password',{email:account.email});
    const nextCode=code();
    assert.equal((await req('/reset-password',{email:account.email,otp:nextCode,newPassword:'NewPassword123!'})).status,200);
    jar.token=oldSession;
    assert.equal((await req('/verifyToken')).status,401);
    assert.equal((await req('/reset-password',{email:account.email,otp:nextCode,newPassword:'AnotherPassword123!'})).status,400);

    await req('/login',{email:account.email,password:'NewPassword123!'});
    const validOtp=code(), wrong=validOtp==='123456'?'654321':'123456';
    for(let i=0;i<5;i++)assert.equal((await req('/verify-otp-login',{email:account.email,otp:wrong})).status,400);
    assert.equal((await req('/verify-otp-login',{email:account.email,otp:validOtp})).status,400);
    assert.equal((await query('SELECT attempts FROM mfa_otps')).rows[0].attempts,5);
});

test('Resend adapter uses HTTPS and never returns provider secrets on failure',async()=>{
    let call;
    const env={NODE_ENV:'production',EMAIL_PROVIDER:'resend',EMAIL_FROM:'Classifile <hello@example.test>',RESEND_API_KEY:'test-key'};
    const mail=createMailer(env,async(url,init)=>{call={url,init};return {ok:true};});
    await mail({to:'alice@example.test',subject:'Test',text:'code'});
    assert.equal(call.url,'https://api.resend.com/emails');
    assert.deepEqual(JSON.parse(call.init.body).to,['alice@example.test']);
    const bad=createMailer(env,async()=>({ok:false,status:403}));
    await assert.rejects(bad({to:'alice@example.test',subject:'test',text:'code'}),/403/);
});
