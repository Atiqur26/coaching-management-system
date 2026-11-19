'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Payments() {
  const [students, setStudents] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [student, setStudent] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [method, setMethod] = useState('Cash');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  async function load() {
    const db = supabase();

    const [
      { data: s, error: studentError },
      { data: p, error: paymentError },
      { data: d, error: dueError }
    ] = await Promise.all([
      db.from('students')
        .select('id,name,student_code,monthly_fee,program')
        .eq('active', true)
        .order('name'),

      db.from('payments')
        .select('*,students(name,student_code)')
        .order('paid_at', { ascending: false }),

      db.from('student_dues')
        .select('*')
    ]);

    if (studentError || paymentError || dueError) {
      setMsg(
        studentError?.message ||
        paymentError?.message ||
        dueError?.message ||
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

  const monthlyFee = Number(selectedStudent?.monthly_fee || 0);

  // Add Due থেকে যোগ করা টাকা
  const manualDue = dues
    .filter(d =>
      d.student_id === student &&
      String(d.due_month).slice(0, 7) === month
    )
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  // এই মাসে আগে জমা দেওয়া টাকা
  const monthPayments = rows.filter(p =>
    p.student_id === student &&
    String(p.fee_month).slice(0, 7) === month
  );

  const paid = monthPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0), 0
  );

  // মাসিক ফি + Add Due - আগের জমা
  const totalFee = monthlyFee + manualDue;
  const due = Math.max(0, totalFee - paid);

  const income = rows.reduce(
    (sum, p) => sum + Number(p.amount || 0), 0
  );

  const thisMonth = rows.filter(p =>
    p.paid_at?.slice(0, 7) === new Date().toISOString().slice(0, 7)
  ).reduce((sum, p) => sum + Number(p.amount || 0), 0);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');

    const paymentAmount = Number(amount);

    if (!student) {
      setMsg('শিক্ষার্থী নির্বাচন করুন।');
      return;
    }

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setMsg('সঠিক টাকার পরিমাণ লিখুন।');
      return;
    }

    if (paymentAmount > due) {
      setMsg('মোট বকেয়ার চেয়ে বেশি টাকা জমা দেওয়া যাবে না।');
      return;
    }

    setBusy(true);

    const { data, error } = await supabase()
      .from('payments')
      .insert({
        student_id: student,
        amount: paymentAmount,
        fee_month: month + '-01',
        method,
        note
      })
      .select('*,students(name,student_code)')
      .single();

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setReceipt(data);
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
            মাসভিত্তিক বকেয়া, Add Due ও ফি আদায়
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
                setMsg('');
              }}
            >
              <option value="">শিক্ষার্থী নির্বাচন</option>
              {students.map(s => (
                <option value={s.id} key={s.id}>
                  {s.name} — {s.student_code}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>বকেয়া মাস নির্বাচন</label>
            <input
              type="month"
              required
              value={month}
              onChange={e => {
                setMonth(e.target.value);
                setAmount('');
                setReceipt(null);
                setMsg('');
              }}
            />
          </div>
        </div>

        {selectedStudent && (
          <div className="panel" style={{ marginTop: 15 }}>
            <h3>মাসিক হিসাব</h3>

            <p>শিক্ষার্থী: {selectedStudent.name}</p>
            <p>নির্বাচিত মাস: {month}</p>
            <p>
              মাসিক ফি: ৳ {monthlyFee.toLocaleString('en-BD')}
            </p>
            <p>
              Add Due: ৳ {manualDue.toLocaleString('en-BD')}
            </p>
            <p>
              মোট ফি ও অতিরিক্ত বকেয়া: ৳ {totalFee.toLocaleString('en-BD')}
            </p>
            <p>
              আগে জমা: ৳ {paid.toLocaleString('en-BD')}
            </p>

            <h3 style={{ color: '#dc2626' }}>
              বর্তমান বকেয়া: ৳ {due.toLocaleString('en-BD')}
            </h3>

            {due === 0 && (
              <p>এই মাসের সম্পূর্ণ টাকা পরিশোধ হয়েছে।</p>
            )}
          </div>
        )}

        <div className="formgrid" style={{ marginTop: 15 }}>
          <div className="field">
            <label>জমার পরিমাণ (টাকা)</label>
            <input
              type="number"
              min="1"
              max={due}
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="টাকার পরিমাণ লিখুন"
              disabled={!student || due <= 0}
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

        {msg && <div className="notice">{msg}</div>}

        <button
          className="btn"
          disabled={busy || !student || due <= 0}
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

          <p><b>Receipt No:</b> {receipt.id}</p>
          <p><b>শিক্ষার্থীর নাম:</b> {receipt.students?.name}</p>
          <p><b>Student ID:</b> {receipt.students?.student_code}</p>
          <p><b>ফি মাস:</b> {String(receipt.fee_month).slice(0, 7)}</p>
          <p>
            <b>জমার তারিখ:</b>{' '}
            {new Date(receipt.paid_at || Date.now()).toLocaleDateString('bn-BD')}
          </p>
          <p><b>পেমেন্ট পদ্ধতি:</b> {receipt.method}</p>
          <p>
            <b>জমার পরিমাণ:</b> ৳ {Number(receipt.amount).toLocaleString('en-BD')}
          </p>
          <p><b>নোট:</b> {receipt.note || '—'}</p>

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
            <div className="empty">কোনো পেমেন্ট নেই।</div>
          )}
        </div>
      </div>
    </>
  );
}
