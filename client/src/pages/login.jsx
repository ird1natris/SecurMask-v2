import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import { logo, loginimage, Vector } from '../assets';

export default function Login({ onLoginSuccess }) {
  const [email,setEmail]=useState('');
  const [sentTo,setSentTo]=useState('');
  const [otp,setOtp]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [cooldown,setCooldown]=useState(0);
  useEffect(()=>{
    if(!cooldown)return;
    const timer=setTimeout(()=>setCooldown(cooldown-1),1000);
    return ()=>clearTimeout(timer);
  },[cooldown]);
  const send=async(resend=false)=>{
    setBusy(true);setError('');
    try{
      const address=resend?sentTo:email.trim().toLowerCase();
      await axios.post(apiUrl(resend?'/resend-otp':'/login'),{email:address},{withCredentials:true});
      setSentTo(address);setOtp('');setCooldown(60);
    }catch(err){setError(err.response?.data?.Error||'Unable to send a code. Please try again.');}
    finally{setBusy(false);}
  };
  const submit=async event=>{
    event.preventDefault();
    if(!sentTo)return send();
    setBusy(true);setError('');
    try{
      await axios.post(apiUrl('/verify-otp-login'),{email:sentTo,otp},{withCredentials:true});
      await onLoginSuccess();
    }catch(err){setError(err.response?.data?.Error||'Unable to sign in. Please try again.');}
    finally{setBusy(false);}
  };
  return <section className="bg-login flex items-center justify-center h-screen w-full overflow-auto px-6"
    style={{backgroundImage:'url('+Vector+')',backgroundSize:'cover',backgroundPosition:'center'}}>
    <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-5 sm:mx-12">
      <img src={logo} className="w-[175px] h-auto" alt="Classifile" />
      <h1 className="text-3xl text-white font-semibold">{sentTo?'Check your email':'Welcome to Classifile'}</h1>
      <p className="text-slate-300">{sentTo?'Enter the six-digit code sent to '+sentTo+'. It expires in five minutes.':'Sign in or create an account with a code sent to your email.'}</p>
      {sentTo?<div>
        <label htmlFor="code" className="block text-white mb-2">Sign-in code</label>
        <input id="code" autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
          value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} required
          className="w-full px-3 py-4 rounded-md text-center text-2xl tracking-widest" />
      </div>:<div>
        <label htmlFor="email" className="block text-white mb-2">Email address</label>
        <input id="email" type="email" autoComplete="email" maxLength={255} value={email}
          onChange={e=>setEmail(e.target.value)} required className="w-full px-3 py-4 rounded-md" />
      </div>}
      {error&&<p role="alert" className="text-red-300">{error}</p>}
      <button disabled={busy} className="w-full py-4 bg-[#875eff] text-white rounded-lg disabled:opacity-50">
        {busy?'Please wait…':sentTo?'Verify and sign in':'Send sign-in code'}
      </button>
      {sentTo&&<div className="flex justify-between gap-4 text-sm text-slate-200">
        <button type="button" disabled={busy||cooldown>0} onClick={()=>send(true)} className="disabled:opacity-50">
          {cooldown?'Resend in '+cooldown+'s':'Resend code'}
        </button>
        <button type="button" disabled={busy} onClick={()=>{setSentTo('');setOtp('');setError('');}}>Use another email</button>
      </div>}
      <p className="text-slate-400 text-sm">Your file encryption key is separate from your sign-in code. Keep it safe to recover your files.</p>
    </form>
    <img src={loginimage} alt="" className="hidden lg:block max-h-[80vh] max-w-[45%] object-contain" />
  </section>;
}
