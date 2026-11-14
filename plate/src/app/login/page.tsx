'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Wordmark } from '@/components/Logo';
import { DEMO, STATIC } from '@/lib/demo/mode';

export default function LoginPage() {
  if (DEMO && typeof window !== 'undefined') window.location.replace('/today');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  // Without middleware (Cloudflare Pages build), skip the form if a session already exists.
  useEffect(() => {
    if (STATIC) supabase().auth.getUser().then(({ data }) => { if (data.user) window.location.replace('/today'); });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg({});
    const sb = supabase();
    if (mode === 'password') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { setMsg({ err: error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message }); setBusy(false); return; }
      window.location.href = '/today';
    } else {
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: STATIC ? `${location.origin}/today` : `${location.origin}/auth/callback` } });
      setMsg(error ? { err: error.message } : { ok: 'Check your email for a sign-in link.' });
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="card" onSubmit={submit} aria-label="Sign in">
        <Wordmark />
        <div>
          <h1>Sign in</h1>
          <p className="muted small">This is a private diary. Only invited accounts can sign in.</p>
        </div>
        <div className="seg" role="group" aria-label="Sign-in method">
          <button type="button" aria-pressed={mode === 'password'} onClick={() => setMode('password')}>Password</button>
          <button type="button" aria-pressed={mode === 'link'} onClick={() => setMode('link')}>Email link</button>
        </div>
        <label className="field">Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode === 'password' && (
          <label className="field">Password
            <input type="password" autoComplete="current-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        )}
        {msg.err && <p className="err" role="alert">{msg.err}</p>}
        {msg.ok && <p className="ok" role="status">{msg.ok}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : mode === 'password' ? 'Sign in' : 'Send link'}</button>
      </form>
    </div>
  );
}
