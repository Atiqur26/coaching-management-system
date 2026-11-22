
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [adminName, setAdminName] = useState('Admin');
  const [adminAvatar, setAdminAvatar] = useState('');

  const [greeting, setGreeting] = useState('Good Morning');
  const [greetingColor, setGreetingColor] = useState('#eab308');

  // সময় অনুযায়ী Greeting ও Color
  function updateGreeting() {
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        hour: 'numeric',
        hour12: false,
      }).format(new Date())
    );

    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning');
      setGreetingColor('#eab308');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon');
      setGreetingColor('#16a34a');
    } else if (hour >= 17) {
      setGreeting('Good Evening');
      setGreetingColor('#2563eb');
    } else {
      setGreeting('Good Night');
      setGreetingColor('#9333ea');
    }
  }

  // Admin Profile Load
  async function loadAdminProfile(userId: string, user: any) {
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('full_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Admin profile error:', error);
      return;
    }

    if (data) {
      setAdminName(data.full_name || 'Admin');
      setAdminAvatar(data.avatar_url || '');
      return;
    }

    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      'Admin';

    const { error: insertError } = await supabase
      .from('admin_profiles')
      .insert({
        id: userId,
        full_name: name,
      });

    if (insertError) {
      console.error('Profile create error:', insertError);
    }

    setAdminName(name);
  }

  // Session Verification
  useEffect(() => {
    let active = true;

    async function verifySession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      if (error || !data.session) {
        setAuthorized(false);
        setChecking(false);
        window.location.replace('/login');
        return;
      }

      setAuthorized(true);

      await loadAdminProfile(
        data.session.user.id,
        data.session.user
      );

      if (!active) return;

      setChecking(false);
    }

    verifySession();

    function handlePageShow() {
      verifySession();
    }

    // Profile পেজ থেকে নাম/ছবি পরিবর্তন হলে Header Update
    function handleProfileUpdate() {
      verifySession();
    }

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener(
      'admin-profile-updated',
      handleProfileUpdate
    );

    return () => {
      active = false;
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener(
        'admin-profile-updated',
        handleProfileUpdate
      );
    };
  }, []);

  // প্রতি মিনিটে Greeting Update
  useEffect(() => {
    updateGreeting();

    const timer = window.setInterval(() => {
      updateGreeting();
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  // Logout
  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert('Logout হয়নি: ' + error.message);
      setLoggingOut(false);
      return;
    }

    window.location.replace('/login');
  }

  if (checking || !authorized) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
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

          {/* বাম পাশে Greeting */}
          <strong
            style={{
              color: greetingColor,
              fontSize: 19,
              fontWeight: 700,
              transition: 'color 0.3s',
            }}
          >
            {greeting}!
          </strong>

          {/* ডান পাশে Admin Picture ও Name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Link
              href="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              {adminAvatar ? (
                <img
                  src={adminAvatar}
                  alt="Admin Profile"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #2563eb',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                  }}
                >
                  👤
                </div>
              )}

              <strong style={{ fontSize: 14 }}>
                {adminName}
              </strong>
            </Link>

            <button
              className="btn secondary"
              onClick={logout}
              disabled={loggingOut}
            >
              {loggingOut ? 'অপেক্ষা করুন...' : 'লগআউট'}
            </button>
          </div>
        </header>

        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}
