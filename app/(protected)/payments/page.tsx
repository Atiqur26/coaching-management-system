'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Payments() {
  const [students, setStudents] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);

  const [student, setStudent] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [note, setNote] = useState('');

  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  async function load() {
    const [studentRes, paymentRes, dueRes] = await Promise.all([
      supabase
        .from('students')
        .select('id,name,student_code,program,monthly_fee')
        .eq('active', true)
        .order('name'),

      supabase
        .from('payments')
        .select('*,students(name,student_code)')
        .order('paid_at', { ascending: false }),

      supabase
        .from('student_dues')
        .select('*')
        .order('due_month', { ascending: true })
    ]);

    if (studentRes.error) {
      setMsg('শিক্ষার্থীর তথ্য লোড হয়নি: ' + studentRes.error.message);
      return;
    }

    if (paymentRes.error) {
      setMsg('পেমেন্ট লোড হয়নি: ' + paymentRes.error.message);
      return;
    }

    if (dueRes.error) {
      setMsg('বকেয়ার তথ্য লোড হয়নি: ' + dueRes.error.message);
      return;
    }

    setStudents(studentRes.data || []);
    setRows(paymentRes.data || []);
    setDues(dueRes.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  function formatMoney(value: number) {
    return Number(value || 0).toLocaleString('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatMonth(month: string) {
    const [year, mon] = month.split('-');

    const names = [
      'জানুয়ারি',
      'ফেব্রুয়ারি',
      'মার্চ',
      'এপ্রিল',
      'মে',
      'জুন',
      'জুলাই',
      'আগস্ট',
      'সেপ্টেম্বর',
      'অক্টোবর',
      'নভেম্বর',
      'ডিসেম্বর'
    ];

    return `${names[Number(mon) - 1] || mon} ${year}`;
  }

  const selectedStudent = students.find((s) => s.id === student);

  // নির্বাচিত শিক্ষার্থীর মাসভিত্তিক বকেয়া
  const studentDues = useMemo(() => {
    if (!student) return [];

    return dues
      .filter((d) => d.student_id === student)
      .map((d) => {
        const month = String(d.due_month).slice(0, 7);

        const paid = rows
          .filter(
            (p) =>
              p.student_id === student &&
              String(p.fee_month).slice(0, 7) === month
          )
          .reduce(
            (sum, p) => sum + Number(p.amount || 0),
            0
          );

        const total = Number(d.amount || 0);

        return {
          id: d.id,
          month,
          total,
          paid,
          remaining: Math.max(0, total - paid)
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [student, dues, rows]);

  const totalOriginal = studentDues.reduce(
    (sum, d) => sum + d.total,
    0
  );

  const totalPaid = studentDues.reduce(
    (sum, d) => sum + d.paid,
    0
  );

  const totalDue = studentDues.reduce(
    (sum, d) => sum + d.remaining,
    0
  );

  // টাকা জমা
  async function pay() {
    setMsg('');

    if (!student) {
      setMsg('প্রথমে শিক্ষার্থী নির্বাচন করুন।');
      return;
    }

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      setMsg('সঠিক টাকার পরিমাণ লিখুন।');
      return;
    }

    if (paymentAmount > totalDue) {
      setMsg('জমার পরিমাণ মোট বকেয়ার চেয়ে বেশি হতে পারবে না।');
      return;
    }

    if (totalDue <= 0) {
      setMsg('এই শিক্ষার্থীর কোনো বকেয়া নেই।');
      return;
    }

    setBusy(true);

    try {
      const previousDue = totalDue;
      let remainingPayment = paymentAmount;

      // পুরোনো মাসের বকেয়া আগে সমন্বয়
      const allocations: any[] = [];

      for (const d of studentDues) {
        if (remainingPayment <= 0) break;
        if (d.remaining <= 0) continue;

        const allocated = Math.min(
          remainingPayment,
          d.remaining
        );

        allocations.push({
          student_id: student,
          amount: allocated,
          fee_month: d.month + '-01',
          method,
          note: note || null,
          paid_at: new Date().toISOString()
        });

        remainingPayment -= allocated;
      }

      if (allocations.length === 0) {
        setMsg('কোনো বকেয়া সমন্বয় করা যায়নি।');
        return;
      }

      const { data, error } = await supabase
        .from('payments')
        .insert(allocations)
        .select('*,students(name,student_code)');

      if (error) {
        setMsg('পেমেন্ট সংরক্ষণ হয়নি: ' + error.message);
        return;
      }

      const remainingDue = Math.max(
        0,
        previousDue - paymentAmount
      );

      // Add Due-তে থাকা সব মাসের তালিকা
      const allDueMonths = studentDues.map((d) => ({
        month: d.month,
        total: d.total,
        paidBefore: d.paid,
        remainingBefore: d.remaining
      }));

      // আজ যেসব মাসে টাকা সমন্বয় হয়েছে শুধু সেই মাস
      const adjustedMonths = studentDues
        .map((d) => {
          const allocated = allocations
            .filter(
              (a) =>
                String(a.fee_month).slice(0, 7) === d.month
            )
            .reduce(
              (sum, a) => sum + Number(a.amount || 0),
              0
            );

          return {
            month: d.month,
            todayPaid: allocated,
            total: d.total,
            paidBefore: d.paid,
            remaining: Math.max(0, d.remaining - allocated)
          };
        })
        .filter((d) => d.todayPaid > 0);

      setReceipt({
        id: data?.[0]?.id,
        students: data?.[0]?.students || selectedStudent,
        amount: paymentAmount,
        totalDueBefore: previousDue,
        totalDueAfter: remainingDue,
        method,
        note,
        paid_at: data?.[0]?.paid_at || new Date().toISOString(),
        allDueMonths,
        adjustedMonths
      });

      setAmount('');
      setNote('');
      setMsg('পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে।');

      await load();

    } catch (err: any) {
      setMsg(err?.message || 'একটি সমস্যা হয়েছে।');
    } finally {
      setBusy(false);
    }
  }

  function downloadPDF() {
    window.print();
  }

  return (
    <div>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #payment-receipt,
          #payment-receipt * {
            visibility: visible !important;
          }

          #payment-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 20px !important;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 15mm;
          }
        }

        .receipt-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }

        .receipt-table th,
        .receipt-table td {
          border: 1px solid #777;
          padding: 8px;
          text-align: center;
        }

        .receipt-table th {
          background: #eee;
        }

        .receipt-summary {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin: 18px 0;
        }

        .receipt-summary > div {
          border: 1px solid #999;
          padding: 10px;
        }

        @media print {
          .receipt-table th {
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="pagehead no-print">
        <div>
          <h1>Payment Management</h1>
          <p className="muted">
            শিক্ষার্থীর বকেয়া অনুযায়ী টাকা জমা নিন
          </p>
        </div>
      </div>

      <div className="grid no-print">
        <div className="card">
          <div className="stat-label">মোট বকেয়া</div>
          <div className="stat-value">
            ৳ {formatMoney(totalDue)}
          </div>
        </div>

        <div className="card">
          <div className="stat-label">মোট নির্ধারিত বকেয়া</div>
          <div className="stat-value">
            ৳ {formatMoney(totalOriginal)}
          </div>
        </div>

        <div className="card">
          <div className="stat-label">আগে জমা</div>
          <div className="stat-value">
            ৳ {formatMoney(totalPaid)}
          </div>
        </div>
      </div>

      <div className="panel section no-print">
        <h2>নতুন পেমেন্ট</h2>

        <div className="formgrid">
          <div className="field">
            <label>শিক্ষার্থী নির্বাচন করুন</label>
            <select
              className="input"
              value={student}
              onChange={(e) => {
                setStudent(e.target.value);
                setReceipt(null);
                setMsg('');
              }}
            >
              <option value="">শিক্ষার্থী নির্বাচন করুন</option>

              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.student_code ? `(${s.student_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>জমার পরিমাণ</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="টাকার পরিমাণ লিখুন"
            />
          </div>

          <div className="field">
            <label>পেমেন্ট পদ্ধতি</label>
            <select
              className="input"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Bkash">Bkash</option>
              <option value="Nagad">Nagad</option>
              <option value="Bank">Bank</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="field">
            <label>নোট</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="প্রয়োজনীয় নোট"
            />
          </div>
        </div>

        {msg && <div className="notice">{msg}</div>}

        <button
          className="btn"
          onClick={pay}
          disabled={busy}
        >
          {busy ? 'অপেক্ষা করুন...' : 'টাকা জমা দিন'}
        </button>
      </div>

      {student && (
        <div className="panel section no-print">
          <h2>মাসভিত্তিক বকেয়ার তালিকা</h2>

          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th>মাস</th>
                  <th>মোট বকেয়া</th>
                  <th>আগে জমা</th>
                  <th>অবশিষ্ট</th>
                </tr>
              </thead>

              <tbody>
                {studentDues.map((d) => (
                  <tr key={d.id}>
                    <td>{formatMonth(d.month)}</td>
                    <td>৳ {formatMoney(d.total)}</td>
                    <td>৳ {formatMoney(d.paid)}</td>
                    <td>৳ {formatMoney(d.remaining)}</td>
                  </tr>
                ))}

                {studentDues.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty">
                      এই শিক্ষার্থীর কোনো Add Due পাওয়া যায়নি।
                    </td>
                  </tr>
                )}
              </tbody>

              {studentDues.length > 0 && (
                <tfoot>
                  <tr>
                    <th>সর্বমোট</th>
                    <th>৳ {formatMoney(totalOriginal)}</th>
                    <th>৳ {formatMoney(totalPaid)}</th>
                    <th>৳ {formatMoney(totalDue)}</th>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {receipt && (
        <div className="panel section" id="payment-receipt">

          <div style={{ textAlign: 'center' }}>
            <h2>PAYMENT RECEIPT</h2>
            <h3>কোচিং সেন্টার</h3>
            <p>টাকা জমার রসিদ</p>
          </div>

          <hr />

          <p>
            <strong>রসিদ নং:</strong> {receipt.id || 'N/A'}
          </p>

          <p>
            <strong>শিক্ষার্থীর নাম:</strong>{' '}
            {receipt.students?.name || ''}
          </p>

          <p>
            <strong>শিক্ষার্থী আইডি:</strong>{' '}
            {receipt.students?.student_code || ''}
          </p>

          <p>
            <strong>তারিখ:</strong>{' '}
            {new Date(receipt.paid_at).toLocaleString('en-BD')}
          </p>

          <p>
            <strong>পেমেন্ট পদ্ধতি:</strong> {receipt.method}
          </p>

          <div className="receipt-summary">
            <div>
              <strong>জমার আগে মোট বকেয়া</strong>
              <h3>৳ {formatMoney(receipt.totalDueBefore)}</h3>
            </div>

            <div>
              <strong>আজ জমা</strong>
              <h3>৳ {formatMoney(receipt.amount)}</h3>
            </div>

            <div>
              <strong>জমার পরে অবশিষ্ট বকেয়া</strong>
              <h3>৳ {formatMoney(receipt.totalDueAfter)}</h3>
            </div>

            <div>
              <strong>পেমেন্ট পদ্ধতি</strong>
              <h3>{receipt.method}</h3>
            </div>
          </div>

          {/* সব Add Due মাসের তালিকা */}
          <h3>১। যে মাসগুলোর বকেয়া দেওয়া হয়েছে</h3>

          <table className="receipt-table">
            <thead>
              <tr>
                <th>ক্রমিক</th>
                <th>মাস</th>
                <th>মোট বকেয়া</th>
              </tr>
            </thead>

            <tbody>
              {receipt.allDueMonths.map((d: any, i: number) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{formatMonth(d.month)}</td>
                  <td>৳ {formatMoney(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* আজ যে মাসগুলোতে টাকা সমন্বয় হয়েছে */}
          <h3 style={{ marginTop: 25 }}>
            ২। যে মাসগুলোর বকেয়া সমন্বয় হয়েছে
          </h3>

          <table className="receipt-table">
            <thead>
              <tr>
                <th>ক্রমিক</th>
                <th>মাস</th>
                <th>আজ জমা</th>
                <th>অবশিষ্ট বকেয়া</th>
              </tr>
            </thead>

           <tbody>
  {receipt.adjustedMonths.map((d: any, i: number) => (
    <tr key={i}>
      <td>{formatMonth(d.month)}</td>
      <td>৳ {formatMoney(d.todayPaid)}</td>
      <td>৳ {formatMoney(d.remaining)}</td>
    </tr>
  ))}
</tbody>
          </table>

          {receipt.note && (
            <p style={{ marginTop: 15 }}>
              <strong>নোট:</strong> {receipt.note}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 65,
              gap: 30
            }}
          >
            <div style={{ textAlign: 'center' }}>
              ______________________
              <p>শিক্ষার্থীর স্বাক্ষর</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              ______________________
              <p>কর্তৃপক্ষের স্বাক্ষর</p>
            </div>
          </div>

          <div className="no-print" style={{ marginTop: 20 }}>
            <button className="btn" onClick={downloadPDF}>
              PDF / Print Download
            </button>
          </div>
        </div>
      )}

      <div className="panel section no-print">
        <h2>সাম্প্রতিক পেমেন্ট</h2>

        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>তারিখ</th>
                <th>শিক্ষার্থী</th>
                <th>মাস</th>
                <th>টাকা</th>
                <th>পদ্ধতি</th>
              </tr>
            </thead>

            <tbody>
              {rows.slice(0, 20).map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.paid_at
                      ? new Date(p.paid_at).toLocaleDateString('en-BD')
                      : ''}
                  </td>
                  <td>{p.students?.name || 'N/A'}</td>
                  <td>{String(p.fee_month || '').slice(0, 7)}</td>
                  <td>৳ {formatMoney(Number(p.amount || 0))}</td>
                  <td>{p.method || ''}</td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    এখনো কোনো পেমেন্ট নেই।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
