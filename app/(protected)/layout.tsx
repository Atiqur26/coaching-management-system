
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { ReactNode } from 'react';

const links: [string, string, string][] = [
  ['/dashboard', '▦', 'ড্যাশবোর্ড'],
  ['/students/new', '＋', 'শিক্ষার্থী যোগ'],
  ['/students', '♙', 'শিক্ষার্থী তালিকা'],
  ['/subjects', '∑', 'Honours Subject Management'],
  ['/payments', '৳', 'পেমেন্ট ও আয়'],
  ['/due/add', '＋', 'Add Due'],
  ['/dues', '!', 'বকেয়া তালিকা'],
  ['/sms', '✉', 'SMS পাঠান'],
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !data.session) {
        setAuthorized(false);
        router.replace('/login');
        return;
      }

      setAuthorized(true);
      setChecking(false);
    }

    verifySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (!session || event === 'SIGNED_OUT') {
        setAuthorized(false);
        router.replace('/login');
      } else {
        setAuthorized(true);
        setChecking(false);
      }
    });

    // Browser Back/Forward থেকে পেজে ফিরলে Session যাচাই
    function handlePageShow() {
      verifySession();
    }

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [router]);

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert('Logout হয়নি: ' + error.message);
      setLoggingOut(false);
      return;
    }

    setAuthorized(false);
    window.location.replace('/login');
  }

  if (checking || !authorized) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        অপেক্ষা করুন...
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          🎓 কোচিং ম্যানেজমেন্ট
        </div>

        <nav className="nav">
          {links.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              className={
                path === href || path.startsWith(href + '/')
                  ? 'active'
                  : ''
              }
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div
          style={{
            marginTop: 30,
            padding: '0 12px',
            fontSize: 12,
            color: '#aab9d2',
          }}
        >
          Mathematics • 1st Year • 2nd Year • Honours
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <strong>প্রতিষ্ঠান ব্যবস্থাপনা</strong>

          <button
            className="btn secondary"
            onClick={logout}
            disabled={loggingOut}
          >
            {loggingOut ? 'অপেক্ষা করুন...' : 'লগআউট'}
          </button>
        </header>

        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}
