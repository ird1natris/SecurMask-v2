import { createLoginEmail } from './login-email.js';
import express from 'express';
import jwt from 'jsonwebtoken';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';

export const run = handler => (req,res,next) => Promise.resolve(handler(req,res,next)).catch(next);
const fail = (message,status=400) => Object.assign(new Error(message),{status});
const emailRule = Joi.string().trim().lowercase().email({tlds:{allow:false}}).max(255).required();
function validate(body,withCode=false) {
    const schema = {email:emailRule};
    if(withCode) schema.otp=Joi.string().pattern(/^\d{6}$/).required();
    const {value,error}=Joi.object(schema).validate(body,{stripUnknown:true});
    if(error) throw fail(error.details[0].message);
    return value;
}
async function transaction(db,action) {
    const client=await db.connect();
    try {await client.query('BEGIN');const result=await action(client);await client.query('COMMIT');return result;}
    catch(error){await client.query('ROLLBACK');throw error;}
    finally{client.release();}
}
export function createAuth({db,config,sendMail,limits=true}) {
    const router=express.Router();
    const cookie={httpOnly:true,secure:config.production,sameSite:'strict',path:'/'};
    const limiter=max=>limits?rateLimit({windowMs:15*60*1000,limit:max,standardHeaders:'draft-7',legacyHeaders:false,
        message:{Error:'Too many attempts. Please try again later.'}}):(req,res,next)=>next();
    const hash=(email,code)=>createHmac('sha256',config.secret).update('magic-login:'+email+':'+code).digest('hex');
    const readToken=value=>jwt.verify(value,config.secret,{algorithms:['HS256']});
    const authenticate=run(async(req,res,next)=>{
        let decoded;
        try{decoded=readToken(req.cookies.token);}catch{throw fail('Please log in.',401);}
        if(decoded.purpose!=='session')throw fail('Please log in.',401);
        const {rows}=await db.query('SELECT user_id,email,session_version FROM users WHERE user_id=$1',[decoded.user_id]);
        if(!rows.length||rows[0].session_version!==decoded.version)throw fail('Please log in again.',401);
        req.user=rows[0];next();
    });
    function challenge(req,email) {
        let value;
        try{value=readToken(req.cookies.login_challenge);}catch{throw fail('Please request a new login code.',401);}
        if(value.purpose!=='magic-login'||value.email!==email)throw fail('Invalid login challenge.',401);
        return value;
    }
    async function issue(req,res,resend=false) {
        const {email}=validate(req.body);
        const prior=resend?challenge(req,email):null;
        const code=String(randomInt(100000,1000000)), challengeId=randomUUID(), otp=hash(email,code);
        const expires=new Date(Date.now()+300000);
        // Atomic upsert/conditional update enforces cooldown across concurrent requests.
        const result=resend?await db.query(
            "UPDATE login_codes SET otp=$1,challenge_id=$2,expires_at=$3,created_at=CURRENT_TIMESTAMP,attempts=0 WHERE email=$4 AND challenge_id=$5 AND created_at<=CURRENT_TIMESTAMP-INTERVAL '60 seconds' RETURNING email",
            [otp,challengeId,expires,email,prior.challenge_id]
        ):await db.query(
            "INSERT INTO login_codes(email,otp,challenge_id,expires_at) VALUES ($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET otp=EXCLUDED.otp,challenge_id=EXCLUDED.challenge_id,expires_at=EXCLUDED.expires_at,created_at=CURRENT_TIMESTAMP,attempts=0 WHERE login_codes.created_at<=CURRENT_TIMESTAMP-INTERVAL '60 seconds' RETURNING email",
            [email,otp,challengeId,expires]
        );
        if(!result.rows.length)throw fail(resend?'Please wait a minute or request a new login code.':'Please wait a minute before requesting another code.',429);
        try{
            await sendMail({to:email,...createLoginEmail({code,origin:config.origin})});
        }catch{
            await db.query('DELETE FROM login_codes WHERE email=$1 AND challenge_id=$2',[email,challengeId]);
            throw fail('Unable to send your sign-in code. Please try again.',503);
        }
        const value=jwt.sign({purpose:'magic-login',email,challenge_id:challengeId},config.secret,{expiresIn:'5m',algorithm:'HS256'});
        res.cookie('login_challenge',value,{...cookie,maxAge:300000});
        res.json({Status:'Success',Message:'Check your email for your sign-in code.'});
    }
    router.post('/login',limiter(10),run((req,res)=>issue(req,res)));
    router.post('/resend-otp',limiter(5),run((req,res)=>issue(req,res,true)));
    router.post('/verify-otp-login',limiter(20),run(async(req,res)=>{
        const {email,otp}=validate(req.body,true);
        const value=challenge(req,email);
        const outcome=await transaction(db,async client=>{
            const {rows}=await client.query('SELECT * FROM login_codes WHERE email=$1 FOR UPDATE',[email]);
            const row=rows[0];
            if(!row||row.challenge_id!==value.challenge_id||row.attempts>=5||new Date(row.expires_at).getTime()<=Date.now())
                return {error:'Invalid or expired sign-in code.'};
            const actual=Buffer.from(hash(email,otp)),expected=Buffer.from(row.otp);
            if(actual.length!==expected.length||!timingSafeEqual(actual,expected)){
                await client.query('UPDATE login_codes SET attempts=attempts+1 WHERE email=$1',[email]);
                return {error:'Invalid or expired sign-in code.'};
            }
            // Create accounts only after mailbox ownership has been verified.
            await client.query('INSERT INTO users(user_id,"fullName",email) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',[randomUUID(),email.split('@')[0],email]);
            const user=await client.query('SELECT user_id,session_version FROM users WHERE lower(email)=lower($1)',[email]);
            await client.query('DELETE FROM login_codes WHERE email=$1',[email]);
            return {user:user.rows[0]};
        });
        if(outcome.error)throw fail(outcome.error);
        const session=jwt.sign({purpose:'session',user_id:outcome.user.user_id,version:outcome.user.session_version},config.secret,{expiresIn:'1h',algorithm:'HS256'});
        res.clearCookie('login_challenge',cookie);
        res.cookie('token',session,{...cookie,maxAge:3600000}).json({Status:'Login successful.'});
    }));
    router.get('/verifyToken',authenticate,(req,res)=>res.json({Status:'Success',decoded:{user_id:req.user.user_id,email:req.user.email}}));
    router.get('/homepage',authenticate,(req,res)=>res.json({message:'Welcome to SecurMask',user:req.user}));
    router.post('/logout',(req,res)=>{
        for(const name of ['token','login_challenge'])res.clearCookie(name,cookie);
        res.json({Status:'Logged out successfully.'});
    });
    return {router,authenticate,cookie,limiter};
}
