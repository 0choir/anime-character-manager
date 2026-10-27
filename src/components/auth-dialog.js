'use client';
import { useState,useEffect,useRef } from 'react';
import { requireSupabase } from '@/lib/supabase';
import { Modal,Field } from './ui';

export default function AuthDialog({onClose,recovery=false}) {
  const [mode,setMode]=useState(recovery?'password':'login');const [email,setEmail]=useState('');const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''); const locked=useRef(false);
  useEffect(()=>{
    const {data:{subscription}}=requireSupabase().auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')setMode('password');});
    return ()=>subscription.unsubscribe();
  },[]);
  async function submit(event) {
    event.preventDefault();if(locked.current)return;locked.current=true;setBusy(true);setError('');setMessage('');
    try {
      const client=requireSupabase(); let result;
      const redirect=window.location.origin;
      if(mode==='signup') {
        result=await client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:redirect}});
        if(!result.error)setMessage('確認メールのリンクを開いて登録を完了してください。確認済みの管理者アドレスだけが編集できます。');
      } else if(mode==='reset') {
        result=await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:redirect});
        if(!result.error)setMessage('登録済みのアドレスに再設定メールを送信しました。メール内のリンクを開いてください。');
      } else if(mode==='password') {
        result=await client.auth.updateUser({password});
        if(!result.error){onClose();return;}
      } else {
        result=await client.auth.signInWithPassword({email:email.trim(),password});
        if(!result.error){onClose();return;}
      }
      if(result.error)throw result.error;
    }catch(err){setError(err.message);}finally{locked.current=false;setBusy(false);}
  }
  const names={login:'管理者ログイン',signup:'初回アカウント登録',reset:'パスワードを再設定',password:'新しいパスワードを設定'};
  return <Modal title={names[mode]} onClose={onClose} busy={busy}>
    <form onSubmit={submit} className="stack">
      <p className="muted">管理者として登録されたメールアドレスでログインしてください。初回はアカウント登録とメール確認が必要です。</p>
      <fieldset disabled={busy} className="stack">
        {mode!=='password'?<Field label="メールアドレス"><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></Field>:null}
        {mode!=='reset'?<Field label="パスワード" hint={mode==='login'?'':'12文字以上で設定してください。'}><input type="password" required minLength={mode==='login'?1:12} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/></Field>:null}
      </fieldset>
      {error?<p className="notice error" role="alert">{error}</p>:null}{message?<p className="notice success" role="status">{message}</p>:null}
      <button className="button primary full" disabled={busy}>{busy?'処理しています…':names[mode]}</button>
      {mode!=='password'?<div className="toolbar">{Object.entries(names).filter(([key])=>key!==mode&&key!=='password').map(([key,label])=><button type="button" className="text-button" disabled={busy} key={key} onClick={()=>{setMode(key);setError('');setMessage('');setPassword('');}}>{label}</button>)}</div>:null}
    </form>
  </Modal>;
}

