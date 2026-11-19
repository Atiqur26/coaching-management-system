
'use client';

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

  async function logout() {
    await supabase().auth.signOut();
    window.location.href = '/login';
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
          >
            লগআউট
          </button>
        </header>

        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}
