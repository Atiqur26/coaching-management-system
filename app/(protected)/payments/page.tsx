'use client';

import { useEffect, useState } from 'react';
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
  const [receiptAllocations, setReceiptAllocations] = useState<any[]>([]);

  async function load() {
    const db = supabase();

    const [
      { data: s, error: se },
      { data: p, error: pe },
      { data: d, error: de }
    ] = await Promise.all([
      db.from('students')
        .select('id,name,student_code,program,monthly_fee')
        .eq('active', true)
        .order('name'),

      db.from('payments')
        .select('*,students(name,student_code)')
        .order('paid_at', { ascending: false }),

      db.from('student_dues')
        .select('*')
        .order('due_month', { ascending: true })
    ]);

    if (se || pe || de) {
      setMsg(
        se?.message || pe?.message || de?.message ||
        'তথ্য লোড হয়নি'
      );
      return;
    }

    setStudents(s || []);
    setRows(p || []);
    setDues(d || []);
  }

  useEffect(() => {
    load();
  }, []);

  const selectedStudent = students.find(s => s.id === student);

  // শিক্ষার্থীর সব মাসের বকেয়া হিসাব
  const studentDues = dues
    .filter(d => d.student_id === student)
    .map(d => {
      const month = String(d.due_month).slice(0, 7);

      const paid = rows
        .filter(p =>
          p.student_id === student &&
          String(p.fee_month).slice(0, 7) === month
        )
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const total = Number(d.amount || 0);

      return {
        ...d,
        month,
        total,
        paid,
        remaining: Math.max(0, total - paid)
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  const totalDue = studentDues.reduce(
    (sum, d) => sum + d.remaining, 0
  );

  const totalOriginal = studentDues.reduce(
    (sum, d) => sum + d.total, 0
  );

  const totalPaid = studentDues.reduce(
    (sum, d) => sum + d.paid, 0
  );

  const income = rows.reduce(
    (sum, p) => sum + Number(p.amount || 0), 0
  );

  const currentMonth = new Date().toISOString().slice(0, 7);

  const thisMonth = rows.filter(p =>
    p.paid_at?.slice(0, 7) === currentMonth
  ).reduce((sum, p) => sum + Number(p.amount || 0), 0);

  async function pay(e: React.FormEvent) {
    e.preventDefault();

    setMsg('');
    setReceipt(null);
    setReceiptAllocations([]);

    const paymentAmount = Number(amount);

    if (!student) {
      setMsg('শিক্ষার্থী নির্বাচন করুন।');
      return;
    }

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setMsg('সঠিক টাকার পরিমাণ লিখুন।');
      return;
    }

    if (paymentAmount > totalDue) {
      setMsg('মোট বকেয়ার চেয়ে বেশি টাকা জমা দেওয়া যাবে না।');
      return;
    }

    // পেমেন্টের আগের বকেয়া সংরক্ষণ
    const previousDue = totalDue;

    // পুরোনো মাসের বকেয়া আগে সমন্বয় হবে
    let remainingPayment = paymentAmount;
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
        note
      });

      remainingPayment -= allocated;
    }

    if (!allocations.length) {
      setMsg('কোনো বকেয়া পাওয়া যায়নি।');
      return;
    }

    setBusy(true);

    const { data, error } = await supabase()
      .from('payments')
      .insert(allocations)
      .select('*,students(name,student_code)');

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    // পেমেন্টের পর অবশিষ্ট বকেয়া
    const remainingDue = Math.max(
      0,
      previousDue - paymentAmount
    );

    setReceipt({
      id: data?.[0]?.id,
      students: data?.[0]?.students,
      amount: paymentAmount,
      totalDueBefore: previousDue,
      totalDueAfter: remainingDue,
      method,
      note,
      paid_at: data?.[0]?.paid_at || new Date().toISOString()
    });

    setReceiptAllocations(
      allocations.map(a => ({
        month: String(a.fee_month).slice(0, 7),
        amount: a.amount
      }))
    );

    setAmount('');
    setNote('');
    setMsg('পেমেন্ট সফলভাবে সংরক্ষণ হয়েছে।');

    await load();
  }

  function downloadPDF() {
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #payment-receipt,
          #payment-receipt * {
            visibility: visible !important;
          }

          #payment-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 25px;
            background: white;
            color: black;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="pagehead no-print">
        <div>
          <h1>পেমেন্ট ও মাসিক আয়</h1>
          <div className="muted">
            মাসভিত্তিক বকেয়া ও পেমেন্ট ব্যবস্থাপনা
          </div>
        </div>
      </div>

      <div className="grid no-print">
        <div className="card">
          <div className="stat-label">সর্বমোট আদায়</div>
          <div className="stat-value">
            ৳ {income.toLocaleString('en-BD')}
          </div>
        </div>

        <div className="card">
          <div className="stat-label">চলতি মাসের আয়</div>
          <div className="stat-value">
            ৳ {thisMonth.toLocaleString('en-BD')}
          </div>
        </div>
      </div>

      <form className="panel section no-print" onSubmit={pay}>
        <h2 style={{ fontSize: 19, marginTop: 0 }}>
          নতুন পেমেন্ট যোগ
        </h2>

        <div className="formgrid">
          <div className="field">
            <label>শিক্ষার্থী নির্বাচন</label>
            <select
              required
              value={student}
              onChange={e => {
                setStudent(e.target.value);
                setAmount('');
                setReceipt(null);
                setReceiptAllocations([]);
                setMsg('');
              }}
            >
              <option value="">শিক্ষার্থী নির্বাচন করুন</option>

              {students.map(s => (
                <option value={s.id} key={s.id}>
                  {s.name} — {s.student_code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedStudent && (
          <>
            <div className="panel" style={{ marginTop: 15 }}>
              <h3>শিক্ষার্থীর তথ্য</h3>

              <p>নাম: {selectedStudent.name}</p>
              <p>Student ID: {selectedStudent.student_code}</p>
              <p>কোর্স: {selectedStudent.program}</p>

              <div className="grid">
                <div className="card">
                  <div className="stat-label">
                    মোট বকেয়া
                  </div>
                  <div
                    className="stat-value"
                    style={{ color: '#dc2626' }}
                  >
                    ৳ {totalOriginal.toLocaleString('en-BD')}
                  </div>
                </div>

                <div className="card">
                  <div className="stat-label">
                    মোট জমা
                  </div>
                  <div className="stat-value">
                    ৳ {totalPaid.toLocaleString('en-BD')}
                  </div>
                </div>

                <div className="card">
                  <div className="stat-label">
                    বর্তমান অবশিষ্ট
                  </div>
                  <div
                    className="stat-value"
                    style={{ color: '#dc2626' }}
                  >
                    ৳ {totalDue.toLocaleString('en-BD')}
                  </div>
                </div>
              </div>
            </div>

            <div className="panel section">
              <h3>মাসভিত্তিক বকেয়ার তালিকা</h3>

              <div className="tablewrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>মাস</th>
                      <th>মোট বকেয়া</th>
                      <th>জমা</th>
                      <th>অবশিষ্ট</th>
                      <th>অবস্থা</th>
                    </tr>
                  </thead>

                  <tbody>
                    {studentDues.map(d => (
                      <tr key={d.id}>
                        <td>{d.month}</td>
                        <td>
                          ৳ {d.total.toLocaleString('en-BD')}
                        </td>
                        <td>
                          ৳ {d.paid.toLocaleString('en-BD')}
                        </td>
                        <td>
                          ৳ {d.remaining.toLocaleString('en-BD')}
                        </td>
                        <td>
                          {d.remaining === 0
                            ? 'Paid'
                            : d.paid > 0
                              ? 'Partial Paid'
                              : 'Due'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!studentDues.length && (
                  <div className="empty">
                    এই শিক্ষার্থীর কোনো Add Due পাওয়া যায়নি।
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="formgrid" style={{ marginTop: 15 }}>
          <div className="field">
            <label>জমার পরিমাণ (টাকা)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={totalDue}
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="টাকার পরিমাণ লিখুন"
              disabled={!student || totalDue <= 0}
            />
          </div>

          <div className="field">
            <label>পেমেন্ট পদ্ধতি</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
            >
              <option>Cash</option>
              <option>bKash</option>
              <option>Nagad</option>
              <option>Bank</option>
              <option>Rocket</option>
            </select>
          </div>

          <div className="field full">
            <label>নোট / ট্রানজেকশন আইডি</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>

        {msg && (
          <div className="notice">{msg}</div>
        )}

        <button
          className="btn"
          disabled={
            busy ||
            !student ||
            totalDue <= 0 ||
            !amount ||
            Number(amount) <= 0 ||
            Number(amount) > totalDue
          }
          style={{ marginTop: 16 }}
        >
          {busy ? 'সংরক্ষণ হচ্ছে...' : 'পেমেন্ট সংরক্ষণ'}
        </button>
      </form>

      {receipt && (
        <div className="panel section" id="payment-receipt">
          <div style={{ textAlign: 'center' }}>
            <h2>COACHING MANAGEMENT</h2>
            <h3>মানি রিসিট / MONEY RECEIPT</h3>
            <p>পেমেন্ট রসিদ</p>
          </div>

          <hr />

          <p>
            <b>Receipt No:</b> {receipt.id}
          </p>

          <p>
            <b>শিক্ষার্থীর নাম:</b> {receipt.students?.name}
          </p>

          <p>
            <b>Student ID:</b> {receipt.students?.student_code}
          </p>

          <p>
            <b>জমার তারিখ:</b>{' '}
            {new Date(receipt.paid_at).toLocaleDateString('bn-BD')}
          </p>

          <p>
            <b>পেমেন্ট পদ্ধতি:</b> {receipt.method}
          </p>

          <hr />

          <h3>বকেয়া ও পেমেন্টের হিসাব</h3>

          <p>
            <b>পেমেন্টের আগের মোট বকেয়া:</b>
            {' '}৳ {Number(receipt.totalDueBefore).toLocaleString('en-BD')}
          </p>

          <p>
            <b>আজ জমা:</b>
            {' '}৳ {Number(receipt.amount).toLocaleString('en-BD')}
          </p>

          <h3 style={{ color: '#dc2626' }}>
            পেমেন্টের পর মোট বকেয়া:
            {' '}৳ {Number(receipt.totalDueAfter).toLocaleString('en-BD')}
          </h3>

          <hr />

          <h3>যে মাসগুলোর বকেয়া সমন্বয় হয়েছে</h3>

          {receiptAllocations.map((a, i) => (
            <p key={i}>
              {a.month}: ৳ {Number(a.amount).toLocaleString('en-BD')}
            </p>
          ))}

          <p>
            <b>নোট:</b> {receipt.note || '—'}
          </p>

          <hr />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 55
          }}>
            <span>শিক্ষার্থীর স্বাক্ষর</span>
            <span>কর্তৃপক্ষের স্বাক্ষর</span>
          </div>

          <div className="no-print" style={{ marginTop: 20 }}>
            <button
              type="button"
              className="btn"
              onClick={downloadPDF}
            >
              PDF Download / Print
            </button>
          </div>
        </div>
      )}

      <div className="panel section no-print">
        <h2 style={{ fontSize: 19, marginTop: 0 }}>
          পেমেন্ট তালিকা
        </h2>

        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>শিক্ষার্থী</th>
                <th>ফি মাস</th>
                <th>তারিখ</th>
                <th>পদ্ধতি</th>
                <th>পরিমাণ</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(p => (
                <tr key={p.id}>
                  <td>{p.students?.name}</td>
                  <td>{String(p.fee_month).slice(0, 7)}</td>
                  <td>
                    {p.paid_at
                      ? new Date(p.paid_at).toLocaleDateString('bn-BD')
                      : '—'}
                  </td>
                  <td>{p.method}</td>
                  <td>
                    ৳ {Number(p.amount).toLocaleString('en-BD')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!rows.length && (
            <div className="empty">
              কোনো পেমেন্ট নেই।
            </div>
          )}
        </div>
      </div>
    </>
  );
}
