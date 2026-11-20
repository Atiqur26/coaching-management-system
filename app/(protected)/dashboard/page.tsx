'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Stats = {
  students: number;
  income: number;
  month: number;
  due: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    students: 0,
    income: 0,
    month: 0,
    due: 0
  });

  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const [
        { count },
        { data: students },
        { data: payments },
        { data: recentPayments }
      ] = await Promise.all([
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('active', true),

        supabase
          .from('students')
          .select('id, monthly_fee')
          .eq('active', true),

        supabase
          .from('payments')
          .select('student_id, amount, paid_at, fee_month'),

        supabase
          .from('payments')
          .select('id, amount, paid_at, students(name, student_code)')
          .order('paid_at', { ascending: false })
          .limit(6)
      ]);

      const paymentRows = payments || [];
      const studentRows = students || [];

      const income = paymentRows.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      );

      const monthKey = new Date().toISOString().slice(0, 7);

      const month = paymentRows
        .filter(p => p.paid_at?.slice(0, 7) === monthKey)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const paidByStudent = new Map<string, number>();

      paymentRows
        .filter(p => p.fee_month?.slice(0, 7) === monthKey)
        .forEach(p => {
          paidByStudent.set(
            p.student_id,
            (paidByStudent.get(p.student_id) || 0) +
              Number(p.amount || 0)
          );
        });

      const due = studentRows.reduce((sum, student) => {
        return (
          sum +
          Math.max(
            0,
            Number(student.monthly_fee || 0) -
              (paidByStudent.get(student.id) || 0)
          )
        );
      }, 0);

      setStats({
        students: count || 0,
        income,
        month,
        due
      });

      setRecent(recentPayments || []);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  const maxValue = Math.max(
    stats.income,
    stats.month,
    stats.due,
    1
  );

  const chartData = [
    { label: 'মোট আদায়', value: stats.income },
    { label: 'এই মাসের Payment', value: stats.month },
    { label: 'চলতি মাসের Due', value: stats.due }
  ];

  const money = (value: number) =>
    value.toLocaleString('en-BD');

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>ড্যাশবোর্ড</h1>
          <div className="muted">
            আপনার কোচিং প্রতিষ্ঠানের সার্বিক হিসাব
          </div>
        </div>

        <Link className="btn" href="/students/new">
          ＋ শিক্ষার্থী যোগ
        </Link>
      </div>

      {loading ? (
        <div className="card">ড্যাশবোর্ড লোড হচ্ছে...</div>
      ) : (
        <>
          <div className="grid">
            <div className="card">
              <div className="stat-label">সক্রিয় শিক্ষার্থী</div>
              <div className="stat-value">
                {stats.students}
              </div>
            </div>

            <div className="card">
              <div className="stat-label">মোট আদায়</div>
              <div className="stat-value">
                ৳ {money(stats.income)}
              </div>
            </div>

            <div className="card">
              <div className="stat-label">এই মাসের আয়</div>
              <div className="stat-value">
                ৳ {money(stats.month)}
              </div>
            </div>

            <div className="card">
              <div className="stat-label">চলতি মাসের বকেয়া</div>
              <div className="stat-value">
                ৳ {money(stats.due)}
              </div>
            </div>
          </div>

          {/* Income, Payment and Due Bar Chart */}
          <div className="panel section">
            <h2 style={{ fontSize: 19, marginBottom: 20 }}>
              আয়, Payment ও Due চার্ট
            </h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                gap: 20,
                minHeight: 250,
                padding: '20px 10px',
                borderBottom: '1px solid #ddd'
              }}
            >
              {chartData.map((item, index) => {
                const colors = ['#2563eb', '#16a34a', '#ea580c'];

                const height =
                  (item.value / maxValue) * 180;

                return (
                  <div
                    key={item.label}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: 230,
                      gap: 8
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>
                      ৳ {money(item.value)}
                    </strong>

                    <div
                      style={{
                        width: '65%',
                        maxWidth: 100,
                        height: Math.max(height, 4),
                        background: colors[index],
                        borderRadius: '7px 7px 0 0',
                        transition: 'height 0.3s'
                      }}
                    />

                    <span
                      style={{
                        fontSize: 12,
                        textAlign: 'center'
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="panel section">
            <div className="pagehead">
              <h2 style={{ fontSize: 19, margin: 0 }}>
                সাম্প্রতিক পেমেন্ট
              </h2>

              <Link
                href="/payments"
                className="btn secondary"
              >
                সব পেমেন্ট
              </Link>
            </div>

            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>শিক্ষার্থী</th>
                    <th>তারিখ</th>
                    <th>পরিমাণ</th>
                  </tr>
                </thead>

                <tbody>
                  {recent.map(p => (
                    <tr key={p.id}>
                      <td>
                        {p.students?.name || '—'}
                        <span className="muted">
                          {' '}
                          {p.students?.student_code || ''}
                        </span>
                      </td>

                      <td>
                        {p.paid_at
                          ? new Date(p.paid_at).toLocaleDateString('bn-BD')
                          : '—'}
                      </td>

                      <td>
                        ৳ {money(Number(p.amount || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!recent.length && (
                <div className="empty">
                  এখনো কোনো পেমেন্ট নেই।
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
