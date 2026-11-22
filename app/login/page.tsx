
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkLogin() {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (data.session) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
      }
    }

    checkLogin();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          router.replace('/dashboard');
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }

      router.replace('/dashboard');
      router.refresh();

    } catch (err: any) {
      setError(err?.message || 'লগইন করতে সমস্যা হয়েছে।');
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <main className="loginbg">
        <div className="loginbox">
          <p>অপেক্ষা করুন...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="loginbg">
      <form className="loginbox" onSubmit={submit}>
        <div style={{ fontSize: 34 }}>🎓</div>

        <h1>কোচিং ম্যানেজমেন্ট</h1>

        <p className="muted">অ্যাডমিন লগইন</p>

        {error && (
          <div className="notice">{error}</div>
        )}

        <div className="field" style={{ marginTop: 20 }}>
          <label>ইমেইল</label>

          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label>পাসওয়ার্ড</label>

          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="পাসওয়ার্ড"
          />
        </div>

        <button
          className="btn"
          disabled={busy}
          style={{
            width: '100%',
            justifyContent: 'center',
            marginTop: 22
          }}
        >
          {busy ? 'অপেক্ষা করুন...' : 'লগইন করুন'}
        </button>

        <p className="muted" style={{ fontSize: 12, marginTop: 18 }}>
          Made By Atiqur Rahman 
        </p>
      </form>
    </main>
  );
}
