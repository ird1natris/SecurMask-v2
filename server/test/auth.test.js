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
import { createLoginEmail } from '../login-email.js';

test('passwordless signup, login, code lifecycle and authenticated file access', async t => {
    const engine = new PGlite();
    const root = await mkdtemp(join(tmpdir(),'securmask-auth-'));
    const query = async (sql,params) => {
        const result = params ? await engine.query(sql,params) : (await engine.exec(sql)).at(-1);
        return {...result,rowCount:result?.affectedRows ?? result?.rows?.length ?? 0};
    };
    const db = {query,connect:async()=>({query,release(){}})};
    await migrate(await db.connect());
    const storage = createStorage(root);
    await storage.init();
    const messages=[];
    const config={production:true,secret:'test-secret-that-is-at-least-32-characters',origin:'https://securmask.test'};
    const processor=process.env.FLASK_TEST_URL ? createProcessor(process.env.FLASK_TEST_URL) : {
        process:async bytes=>bytes.toString(), detect:async()=>({columns:['name','code']}),
        mask:async()=> 'name,code\nXXXXXX,00123\n',
    };
    const app=createApp({db,storage,config,processor,limits:false,sendMail:async m=>messages.push(m)});
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
    const account={email:'alice@example.test'};
    const code=()=>messages.at(-1).text.match(/\b\d{6}\b/)[0];
    assert.equal((await req('/health')).status,200);
    assert.equal((await req('/login',account,{headers:{Origin:'https://evil.test'}})).status,403);
    assert.equal((await req('/login',{email:'invalid'})).status,400);
    assert.equal((await req('/register',account)).status,404);
    assert.equal((await req('/forgot-password',account)).status,404);
    assert.equal((await req('/verifyToken')).status,401);
    assert.equal((await req('/resend-otp',account)).status,401);
    const login=await req('/login',account);
    assert.equal(login.status,200);
    assert.equal((await query('SELECT * FROM users')).rows.length,0);
    assert.match(login.headers.get('set-cookie'),/HttpOnly/);
    assert.match(login.headers.get('set-cookie'),/Secure/);
    assert.match(login.headers.get('set-cookie'),/SameSite=Strict/);
    const challenge=jar.login_challenge,otp=code();
    assert.ok(messages.at(-1).html.includes(otp));
    assert.ok(messages.at(-1).html.includes(config.origin + "/email/securmask-logo.png"));
    assert.notEqual((await query('SELECT otp FROM login_codes')).rows[0].otp,otp);
    assert.equal((await req('/verify-otp-login',{...account,otp},{cookies:false})).status,401);
    assert.equal((await req('/resend-otp',account)).status,429);
    assert.equal((await req('/verify-otp-login',{...account,otp})).status,200);
    const identity=(await req('/verifyToken')).data.decoded.user_id;
    assert.equal((await query('SELECT password FROM users')).rows[0].password,null);
    jar.login_challenge=challenge;
    assert.equal((await req('/verify-otp-login',{...account,otp})).status,400);
    assert.equal((await req('/resend-otp',account)).status,429);
    assert.equal((await req('/file',{fileId:'missing',decryptionKey:'password'})).status,404);

    const form=()=>{const f=new FormData();f.append('file',new Blob(['name,code\nAlice,00123\n'],{type:'text/csv'}),'test.csv');f.append('key','strong-file-key');return f;};
    const detected=await req('/detect_columns',form());
    assert.equal(detected.status,200);
    assert.deepEqual(detected.data.columns,['name','code']);
    const uploaded=await req('/upload',form());
    assert.equal(uploaded.status,200);
    const fileId=uploaded.data.fileId;
    const masked=await req('/mask',{fileId,key:'strong-file-key',columnsToMask:['name']});
    assert.equal(masked.status,200);
    assert.match(masked.data.content,/,00123/);
    assert.ok(!masked.data.content.includes('Alice'));
    assert.equal((await req('/file',{fileId,decryptionKey:'strong-file-key'},{cookies:false})).status,401);
    assert.equal((await req('/mask',{fileId,key:'strong-file-key',columnsToMask:['name']},{cookies:false})).status,401);
    const recovered=await req('/file',{fileId,decryptionKey:'strong-file-key'});
    assert.equal(recovered.status,200);
    assert.equal(recovered.data.content,'name,code\nAlice,00123\n');
    await req('/logout',{});
    assert.equal((await req('/verifyToken')).status,401);

    // Existing accounts sign in without a password and retain ownership.
    await query('UPDATE users SET password=$1',['legacy-password-hash']);
    await req('/login',{email:'ALICE@example.test'});
    const oldCode=code(),oldChallenge=jar.login_challenge;
    await query("UPDATE login_codes SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second'");
    assert.equal((await req('/verify-otp-login',{...account,otp:oldCode})).status,400);
    await query("UPDATE login_codes SET created_at=CURRENT_TIMESTAMP-INTERVAL '2 minutes'");
    assert.equal((await req('/resend-otp',account)).status,200);
    const newCode=code(),newChallenge=jar.login_challenge;
    jar.login_challenge=oldChallenge;
    assert.equal((await req('/verify-otp-login',{...account,otp:oldCode})).status,400);
    jar.login_challenge=newChallenge;
    assert.equal((await req('/verify-otp-login',{...account,otp:newCode})).status,200);
    assert.equal((await req('/verifyToken')).data.decoded.user_id,identity);
    assert.equal((await query('SELECT * FROM users')).rows.length,1);
    assert.equal((await req('/file',{fileId,decryptionKey:'strong-file-key'})).status,200);

    await req('/login',account);
    const validOtp=code(),wrong=validOtp==='123456'?'654321':'123456';
    for(let i=0;i<5;i++)assert.equal((await req('/verify-otp-login',{...account,otp:wrong})).status,400);
    assert.equal((await req('/verify-otp-login',{...account,otp:validOtp})).status,400);
    assert.equal((await query('SELECT attempts FROM login_codes')).rows[0].attempts,5);

});

test('Resend adapter uses HTTPS and never returns provider secrets on failure',async()=>{
    let call;
    const env={NODE_ENV:'production',EMAIL_PROVIDER:'resend',EMAIL_FROM:'SecurMask <hello@example.test>',RESEND_API_KEY:'test-key'};
    const mail=createMailer(env,async(url,init)=>{call={url,init};return {ok:true};});
    await mail({to:'alice@example.test',subject:'Test',text:'code',html:'<p>code</p>'});
    assert.equal(call.url,'https://api.resend.com/emails');
    assert.deepEqual(JSON.parse(call.init.body).to,['alice@example.test']);
    assert.equal(JSON.parse(call.init.body).html,'<p>code</p>');
    assert.equal(JSON.parse(call.init.body).text,'code');
    await mail({to:'alice@example.test',subject:'Feedback',text:'Text only'});
    assert.equal(JSON.parse(call.init.body).html,undefined);
    const bad=createMailer(env,async()=>({ok:false,status:403}));
    await assert.rejects(bad({to:'alice@example.test',subject:'test',text:'code'}),/403/);
});


test('sign-in email keeps the code in its body and rejects unsafe template input',()=>{
    const message=createLoginEmail({code:'123456',origin:'https://securmask.test/path'});
    assert.match(message.text,/123456/);
    assert.match(message.html,/>123456<\/p>/);
    assert.ok(!message.subject.includes('123456'));
    assert.ok(!message.html.match(/(?:src|href)="[^"]*123456/));
    assert.match(message.html,/https:\/\/securmask.test\/email\/securmask-logo.png/);
    assert.throws(()=>createLoginEmail({code:'<img>',origin:'https://securmask.test'}),/Invalid sign-in code/);
    assert.throws(()=>createLoginEmail({code:'123456',origin:'javascript:alert(1)'}),/Invalid app origin/);
});
