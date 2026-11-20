
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type DueRow = {
  id: number;
  student_id: string;
  due_month: string;
  amount: number;
  note?: string | null;
  students?: {
    name: string;
    student_code?: string;
    program?: string;
  } | null;
};

type PaymentRow = {
  student_id: string;
  fee_month: string;
  amount: number;
};

export default function DuesPage() {
  const [dues, setDues] = useState<DueRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);

    const [dueResult, paymentResult] = await Promise.all([
      supabase
        .from('student_dues')
        .select('*, students(name, student_code, program)')
        .order('due_month', { ascending: true }),

      supabase
        .from('payments')
        .select('student_id, fee_month, amount')
    ]);

    if (dueResult.error) {
      alert('Due List লোড করা যায়নি: ' + dueResult.error.message);
      setLoading(false);
      return;
    }

    if (paymentResult.error) {
      alert('Payment লোড করা যায়নি: ' + paymentResult.error.message);
      setLoading(false);
      return;
    }

    setDues(dueResult.data || []);
    setPayments(paymentResult.data || []);
    setSelectedIds([]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function formatMonth(month: string) {
    const [year, mon] = month.slice(0, 7).split('-');
    const date = new Date(Number(year), Number(mon) - 1, 1);

    return date.toLocaleDateString('bn-BD', {
      month: 'long',
      year: 'numeric'
    });
  }

  function getPaid(studentId: string, month: string) {
    return payments
      .filter(
        p =>
          p.student_id === studentId &&
          String(p.fee_month).slice(0, 7) === month.slice(0, 7)
      )
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }

  const dueList = useMemo(() => {
    return dues
      .map(d => {
        const paid = getPaid(d.student_id, d.due_month);
        const total = Number(d.amount || 0);
        const remaining = Math.max(0, total - paid);

        return {
          ...d,
          paid,
          total,
          remaining
        };
      })
      .filter(d => d.remaining > 0)
      .filter(d => {
        const name = d.students?.name || '';
        const code = d.students?.student_code || '';

        return (
          name.toLowerCase().includes(search.toLowerCase()) ||
          code.toLowerCase().includes(search.toLowerCase())
        );
      })
      .filter(d =>
        selectedMonth === 'all'
          ? true
          : d.due_month.slice(0, 7) === selectedMonth
      );
  }, [dues, payments, search, selectedMonth]);

  const months = useMemo(() => {
    return [...new Set(
      dues.map(d => d.due_month.slice(0, 7))
    )].sort();
  }, [dues]);

  const groupedDues = useMemo(() => {
    const groups: Record<string, typeof dueList> = {};

    dueList.forEach(d => {
      if (!groups[d.student_id]) {
        groups[d.student_id] = [];
      }

      groups[d.student_id].push(d);
    });

    return Object.values(groups);
  }, [dueList]);

  const totalDue = dueList.reduce(
    (sum, d) => sum + d.remaining,
    0
  );

  const allSelected =
    dueList.length > 0 &&
    dueList.every(d => selectedIds.includes(d.id));

  function toggleOne(id: number) {
    setSelectedIds(old =>
      old.includes(id)
        ? old.filter(x => x !== id)
        : [...old, id]
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(old =>
        old.filter(id => !dueList.some(d => d.id === id))
      );
    } else {
      setSelectedIds(old => [
        ...new Set([...old, ...dueList.map(d => d.id)])
      ]);
    }
  }

  async function deleteSelected() {
    if (!selectedIds.length) {
      alert('প্রথমে বকেয়া নির্বাচন করুন।');
      return;
    }

    const confirmed = confirm(
      `আপনি কি নির্বাচিত ${selectedIds.length}টি বকেয়া রেকর্ড মুছে ফেলতে চান?`
    );

    if (!confirmed) return;

    setDeleting(true);

    const { error } = await supabase
      .from('student_dues')
      .delete()
      .in('id', selectedIds);

    setDeleting(false);

    if (error) {
      alert('Delete করা যায়নি: ' + error.message);
      return;
    }

    alert('নির্বাচিত বকেয়া সফলভাবে Delete হয়েছে।');
    setSelectedIds([]);
    await loadData();
  }

  const money = (amount: number) =>
    amount.toLocaleString('en-US', {
      maximumFractionDigits: 2
    });

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <h1>শিক্ষার্থীদের বকেয়া তালিকা</h1>

        <button onClick={loadData} style={buttonStyle}>
          Refresh
        </button>
      </div>

      <div
        style={{
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          borderRadius: 8,
          padding: 16,
          margin: '15px 0'
        }}
      >
        <div>সর্বমোট অবশিষ্ট বকেয়া</div>
        <h2 style={{ margin: '8px 0', color: '#c2410c' }}>
          ৳ {money(totalDue)}
        </h2>
        <div>বকেয়া মাসের সংখ্যা: {dueList.length}</div>
        <div>বকেয়া শিক্ষার্থী: {groupedDues.length} জন</div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 15
        }}
      >
        <input
          type="text"
          placeholder="শিক্ষার্থীর নাম অথবা আইডি দিয়ে খুঁজুন"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 350,
            padding: 12,
            border: '1px solid #ccc',
            borderRadius: 6
          }}
        />

        <select
          value={selectedMonth}
          onChange={e => {
            setSelectedMonth(e.target.value);
            setSelectedIds([]);
          }}
          style={{
            padding: 12,
            border: '1px solid #ccc',
            borderRadius: 6
          }}
        >
          <option value="all">সকল মাস</option>
          {months.map(month => (
            <option key={month} value={month}>
              {formatMonth(month)}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 15,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 18
        }}
      >
        <label style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={!dueList.length}
            style={{ width: 19, height: 19 }}
          />
          সব নির্বাচন করুন
        </label>

        <span>
          নির্বাচিত: {selectedIds.length}টি
        </span>

        <button
          onClick={deleteSelected}
          disabled={!selectedIds.length || deleting}
          style={{
            ...buttonStyle,
            background: selectedIds.length ? '#dc2626' : '#9ca3af',
            cursor: selectedIds.length ? 'pointer' : 'not-allowed'
          }}
        >
          {deleting ? 'Delete হচ্ছে...' : 'Delete Selected'}
        </button>
      </div>

      {loading ? (
        <p>লোড হচ্ছে...</p>
      ) : groupedDues.length === 0 ? (
        <div
          style={{
            padding: 25,
            background: '#f0fdf4',
            borderRadius: 8,
            textAlign: 'center'
          }}
        >
          কোনো বকেয়া পাওয়া যায়নি।
        </div>
      ) : (
        groupedDues.map((studentDues, index) => {
          const student = studentDues[0].students;

          const studentTotal = studentDues.reduce(
            (sum, d) => sum + d.remaining,
            0
          );

          return (
            <div
              key={studentDues[0].student_id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 8,
                marginBottom: 20,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  background: '#f3f4f6',
                  padding: 14
                }}
              >
                <h3 style={{ margin: '0 0 5px' }}>
                  {index + 1}. {student?.name || 'নাম পাওয়া যায়নি'}
                </h3>

                <div>
                  আইডি: {student?.student_code || '-'}
                  {' | '}
                  কোর্স: {student?.program || '-'}
                </div>

                <strong style={{ color: '#dc2626' }}>
                  মোট বকেয়া: ৳ {money(studentTotal)}
                </strong>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    minWidth: 650
                  }}
                >
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      <th style={cellStyle}>Select</th>
                      <th style={cellStyle}>ক্রমিক</th>
                      <th style={cellStyle}>বকেয়া মাস</th>
                      <th style={cellStyle}>মোট টাকা</th>
                      <th style={cellStyle}>জমা</th>
                      <th style={cellStyle}>অবশিষ্ট বকেয়া</th>
                    </tr>
                  </thead>

                  <tbody>
                    {studentDues.map((d, i) => (
                      <tr key={d.id}>
                        <td style={cellStyle}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(d.id)}
                            onChange={() => toggleOne(d.id)}
                            style={{ width: 19, height: 19 }}
                          />
                        </td>

                        <td style={cellStyle}>{i + 1}</td>

                        <td style={cellStyle}>
                          <strong>{formatMonth(d.due_month)}</strong>
                        </td>

                        <td style={cellStyle}>
                          ৳ {money(d.total)}
                        </td>

                        <td style={cellStyle}>
                          ৳ {money(d.paid)}
                        </td>

                        <td
                          style={{
                            ...cellStyle,
                            color: '#dc2626',
                            fontWeight: 'bold'
                          }}
                        >
                          ৳ {money(d.remaining)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 18px',
  background: '#2563eb',
  color: 'white',
  border: 0,
  borderRadius: 6,
  cursor: 'pointer'
};

const cellStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: 10,
  textAlign: 'center'
};
