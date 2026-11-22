
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

type MonthData = {
  month: string;
  due: number;
  paid: number;
  remaining: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    students: 0,
    income: 0,
    month: 0,
    due: 0
  });

  const [recent, setRecent] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  const money = (value: number) =>
    value.toLocaleString('en-BD');

  const getMonthKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const monthName = (value: string) => {
    if (!value) return '—';

    const [year, month] = value.slice(0, 7).split('-');

    const date = new Date(Number(year), Number(month) - 1, 1);

    return date.toLocaleDateString('bn-BD', {
      month: 'long',
      year: 'numeric'
    });
  };

  const dateFormat = (value: string) => {
    if (!value) return '—';

    return new Date(value).toLocaleDateString('bn-BD', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const timeFormat = (value: string) => {
    if (!value) return '—';

    return new Date(value).toLocaleTimeString('bn-BD', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      try {
        const [
          { count, error: studentCountError },
          { data: payments, error: paymentError },
          { data: recentPayments, error: recentError },
          { data: dues, error: dueError }
        ] = await Promise.all([
          supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('active', true),

          supabase
            .from('payments')
            .select('student_id, amount, paid_at, fee_month'),

          supabase
            .from('payments')
            .select('id, student_id, amount, paid_at, fee_month, students(name, student_code)')
            .order('paid_at', { ascending: false })
            .limit(10),

          supabase
            .from('student_dues')
            .select('student_id, due_month, amount')
        ]);

        if (studentCountError) throw studentCountError;
        if (paymentError) throw paymentError;
        if (recentError) throw recentError;
        if (dueError) throw dueError;

        const paymentRows = payments || [];
        const dueRows = dues || [];

        // মোট আদায়
        const income = paymentRows.reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0
        );

        const currentMonth = getMonthKey(new Date());

        // মাস অনুযায়ী Payment
        const paidByMonth = new Map<string, number>();

        paymentRows.forEach(p => {
          if (!p.fee_month) return;

          const key = String(p.fee_month).slice(0, 7);

          paidByMonth.set(
            key,
            (paidByMonth.get(key) || 0) +
              Number(p.amount || 0)
          );
        });

        // Add Due থেকে মাস অনুযায়ী বকেয়া
        const dueByMonth = new Map<string, number>();

        dueRows.forEach(d => {
          if (!d.due_month) return;

          const key = String(d.due_month).slice(0, 7);

          dueByMonth.set(
            key,
            (dueByMonth.get(key) || 0) +
              Number(d.amount || 0)
          );
        });

        // চলতি ফি মাসের Payment
        const month = paidByMonth.get(currentMonth) || 0;

        // চলতি ফি মাসের Due
        const currentDue = Math.max(
          0,
          (dueByMonth.get(currentMonth) || 0) - month
        );

        // প্রতিটি মাসের Due ও Payment সমন্বয়
        const allMonths = Array.from(
          new Set([
            ...dueByMonth.keys(),
            ...paidByMonth.keys()
          ])
        ).sort();

        const monthList: MonthData[] = allMonths
          .map(key => {
            const dueAmount = dueByMonth.get(key) || 0;
            const paidAmount = paidByMonth.get(key) || 0;

            return {
              month: key,
              due: dueAmount,
              paid: paidAmount,
              remaining: Math.max(0, dueAmount - paidAmount)
            };
          })
          .filter(item => item.due > 0 || item.paid > 0)
          .reverse();

        setStats({
          students: count || 0,
          income,
          month,
          due: currentDue
        });

        setMonthlyData(monthList);
        setRecent(recentPayments || []);

      } catch (error: any) {
        console.error('Dashboard error:', error);
      } finally {
        setLoading(false);
      }
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
    { label: 'চলতি ফি মাসের Payment', value: stats.month },
    { label: 'চলতি ফি মাসের Due', value: stats.due }
  ];

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
          {/* Statistics */}
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
              <div className="stat-label">চলতি ফি মাসের আয়</div>
              <div className="stat-value">
                ৳ {money(stats.month)}
              </div>
            </div>

            <div className="card">
              <div className="stat-label">চলতি ফি মাসের বকেয়া</div>
              <div className="stat-value">
                ৳ {money(stats.due)}
              </div>
            </div>
          </div>

          {/* Chart */}
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

                const height = (item.value / maxValue) * 180;

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

                    <span style={{
                      fontSize: 12,
                      textAlign: 'center'
                    }}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month Wise Payment and Due */}
          <div className="panel section">
            <h2 style={{ fontSize: 19, marginTop: 0 }}>
              মাসভিত্তিক Payment ও Due তালিকা
            </h2>

            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>মাস</th>
                    <th>মোট Due</th>
                    <th>জমা</th>
                    <th>অবশিষ্ট বকেয়া</th>
                  </tr>
                </thead>

                <tbody>
                  {monthlyData.map(item => (
                    <tr key={item.month}>
                      <td>
                        <strong>{monthName(item.month)}</strong>
                      </td>

                      <td>৳ {money(item.due)}</td>

                      <td style={{ color: '#16a34a' }}>
                        ৳ {money(item.paid)}
                      </td>

                      <td style={{
                        color: item.remaining > 0 ? '#dc2626' : '#16a34a',
                        fontWeight: 'bold'
                      }}>
                        ৳ {money(item.remaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!monthlyData.length && (
                <div className="empty">
                  এখনো কোনো মাসের Due বা Payment পাওয়া যায়নি।
                </div>
              )}
            </div>

            <div style={{ marginTop: 15 }}>
              <Link href="/dues" className="btn secondary">
                বিস্তারিত Due তালিকা
              </Link>
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
                    <th>যে মাসের Payment</th>
                    <th>জমার তারিখ</th>
                    <th>সময়</th>
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
                        <strong>
                          {monthName(p.fee_month)}
                        </strong>
                      </td>

                      <td>
                        {dateFormat(p.paid_at)}
                      </td>

                      <td>
                        {timeFormat(p.paid_at)}
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
