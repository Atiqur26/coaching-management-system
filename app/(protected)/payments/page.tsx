
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Payments() {
  const [students, setStudents] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);

  const [student, setStudent] = useState('');
  const [dueMonth, setDueMonth] = useState('');
  const [paymentDate, setPaymentDate] = useState(() =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date())
  );

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [note, setNote] = useState('');

  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<any[]>([]);
  const [printPending, setPrintPending] = useState(false);

  async function load() {
    const [studentRes, paymentRes, dueRes] = await Promise.all([
      supabase.from('students')
        .select('id,name,student_code,program,monthly_fee')
        .eq('active', true)
        .order('name'),

      supabase.from('payments')
        .select('*,students(name,student_code)')
        .order('paid_at', { ascending: false }),

      supabase.from('student_dues')
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

    const validIds = (paymentRes.data || []).map((p: any) => p.id);
    setSelectedPaymentIds(prev => prev.filter(id => validIds.includes(id)));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (receipt && printPending) {
      setPrintPending(false);
      window.print();
    }
  }, [receipt, printPending]);

  function formatMoney(value: number) {
    return Number(value || 0).toLocaleString('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatMonth(month: string) {
    if (!month) return '—';

    const [year, mon] = String(month).slice(0, 7).split('-');

    const names = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল',
      'মে', 'জুন', 'জুলাই', 'আগস্ট',
      'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];

    return `${names[Number(mon) - 1] || mon} ${year}`;
  }

  function formatDate(value: string) {
    if (!value) return '—';

    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = dateOnly
      ? new Date(value + 'T12:00:00')
      : new Date(value);

    return date.toLocaleDateString('bn-BD', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  function formatTime(value: string) {
    if (!value) return '—';

    return new Date(value).toLocaleTimeString('bn-BD', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  const selectedStudent = students.find(s => s.id === student);

  const studentDues = useMemo(() => {
    if (!student) return [];

    return dues
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
          id: d.id,
          month,
          total,
          paid,
          remaining: Math.max(0, total - paid)
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [student, dues, rows]);

  // শিক্ষার্থী পরিবর্তন হলে প্রথম বকেয়া মাস নির্বাচন
  useEffect(() => {
    if (!student) {
      setDueMonth('');
      return;
    }

    const firstDue = studentDues.find(d => d.remaining > 0);

    setDueMonth(prev => {
      const stillDue = studentDues.some(
        d => d.month === prev && d.remaining > 0
      );

      return stillDue ? prev : (firstDue?.month || '');
    });
  }, [student, studentDues]);

  const totalOriginal = studentDues.reduce((sum, d) => sum + d.total, 0);
  const totalPaid = studentDues.reduce((sum, d) => sum + d.paid, 0);
  const totalDue = studentDues.reduce((sum, d) => sum + d.remaining, 0);

  // নির্বাচিত মাস থেকে পরবর্তী মাস পর্যন্ত বকেয়া
  const payableDues = studentDues.filter(
    d => dueMonth && d.month >= dueMonth && d.remaining > 0
  );

  const selectedTotalDue = payableDues.reduce(
    (sum, d) => sum + d.remaining, 0
  );

  const allSelected =
    rows.length > 0 &&
    rows.every(p => selectedPaymentIds.includes(p.id));

  function togglePayment(id: any) {
    setSelectedPaymentIds(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  }

  function toggleSelectAll() {
    setSelectedPaymentIds(
      allSelected ? [] : rows.map(p => p.id)
    );
  }

  async function deleteSelectedPayments() {
    if (!selectedPaymentIds.length) {
      setMsg('প্রথমে Payment নির্বাচন করুন।');
      return;
    }

    if (!window.confirm(
      `আপনি কি ${selectedPaymentIds.length} টি Payment মুছে ফেলতে চান?`
    )) return;

    setDeleting(true);
    setMsg('');

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .in('id', selectedPaymentIds);

      if (error) {
        setMsg('Payment Delete হয়নি: ' + error.message);
        return;
      }

      setSelectedPaymentIds([]);
      setReceipt(null);
      await load();
      setMsg('নির্বাচিত Payment Delete হয়েছে।');

    } catch (err: any) {
      setMsg(err?.message || 'Payment Delete করতে সমস্যা হয়েছে।');
    } finally {
      setDeleting(false);
    }
  }

  async function pay() {
    setMsg('');

    if (!student) {
      setMsg('প্রথমে শিক্ষার্থী নির্বাচন করুন।');
      return;
    }

    if (!dueMonth) {
      setMsg('Due Month Name নির্বাচন করুন।');
      return;
    }

    if (!paymentDate) {
      setMsg('Payment Date নির্বাচন করুন।');
      return;
    }

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      setMsg('সঠিক টাকার পরিমাণ লিখুন।');
      return;
    }

    if (paymentAmount > selectedTotalDue) {
      setMsg('জমার পরিমাণ নির্বাচিত মাস ও পরবর্তী মাসগুলোর মোট বকেয়ার চেয়ে বেশি হতে পারবে না।');
      return;
    }

    if (selectedTotalDue <= 0) {
      setMsg('নির্বাচিত মাস থেকে কোনো বকেয়া পাওয়া যায়নি।');
      return;
    }

    setBusy(true);

    try {
      const previousDue = totalDue;
      let remainingPayment = paymentAmount;
      const paidAt = new Date().toISOString();
      const allocations: any[] = [];

      // নির্বাচিত মাস থেকে পরবর্তী মাসে বকেয়া সমন্বয়
      for (const d of payableDues) {
        if (remainingPayment <= 0) break;

        const allocated = Math.min(remainingPayment, d.remaining);

        allocations.push({
          student_id: student,
          amount: allocated,
          fee_month: d.month + '-01',
          due_month_name: formatMonth(d.month),
          payment_date: paymentDate,
          method,
          note: note || null,
          paid_at: paidAt
        });

        remainingPayment -= allocated;
      }

      if (!allocations.length) {
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

      const remainingDue = Math.max(0, previousDue - paymentAmount);

      const adjustedMonths = studentDues
        .map(d => {
          const allocated = allocations
            .filter(a => String(a.fee_month).slice(0, 7) === d.month)
            .reduce((sum, a) => sum + Number(a.amount || 0), 0);

          return {
            month: d.month,
            todayPaid: allocated,
            total: d.total,
            paidBefore: d.paid,
            remaining: Math.max(0, d.remaining - allocated)
          };
        })
        .filter(d => d.todayPaid > 0);

      setReceipt({
        id: data?.[0]?.id,
        students: data?.[0]?.students || selectedStudent,
        amount: paymentAmount,
        totalDueBefore: previousDue,
        totalDueAfter: remainingDue,
        method,
        note,
        paid_at: data?.[0]?.paid_at || paidAt,
        payment_date: paymentDate,
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

  function downloadSinglePaymentPDF(p: any) {
    const month = String(p.fee_month || '').slice(0, 7);
    const paymentAmount = Number(p.amount || 0);

    setReceipt({
      id: p.id,
      students: p.students,
      amount: paymentAmount,
      totalDueBefore: null,
      totalDueAfter: null,
      method: p.method || 'Cash',
      note: p.note || '',
      paid_at: p.paid_at,
      payment_date: p.payment_date,
      adjustedMonths: [
        {
          month,
          todayPaid: paymentAmount
        }
      ]
    });

    setPrintPending(true);
  }

  return (
    <div>
      <style jsx global>{`
        .payment-checkbox {
          appearance: auto !important;
          -webkit-appearance: checkbox !important;
          width: 20px !important;
          height: 20px !important;
          cursor: pointer !important;
          accent-color: #2563eb;
        }

        .payment-select-cell {
          text-align: center !important;
          width: 110px;
          min-width: 110px;
        }

        .receipt-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 7px;
          font-size: 12px;
        }

        .receipt-table th,
        .receipt-table td {
          border: 1px solid #777;
          padding: 6px;
          text-align: center;
        }

        .receipt-table th {
          background: #eee;
        }

        .receipt-summary {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin: 10px 0;
        }

        .receipt-summary > div {
          border: 1px solid #999;
          padding: 7px;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

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
            box-sizing: border-box !important;
            padding: 5mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
          }

          #payment-receipt h2 {
            font-size: 20px !important;
            margin: 0 0 4px !important;
          }

          #payment-receipt h3 {
            font-size: 13px !important;
            margin: 6px 0 4px !important;
          }

          #payment-receipt p {
            margin: 3px 0 !important;
          }

          #payment-receipt .receipt-summary {
            gap: 6px !important;
            margin: 8px 0 !important;
          }

          #payment-receipt .receipt-summary > div {
            padding: 6px !important;
          }

          #payment-receipt .receipt-table {
            margin-top: 5px !important;
            font-size: 10px !important;
          }

          #payment-receipt .receipt-table th,
          #payment-receipt .receipt-table td {
            padding: 4px !important;
          }

          #payment-receipt .no-print,
          .no-print {
            display: none !important;
          }

          #payment-receipt .signature-area {
            margin-top: 18px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="pagehead no-print">
        <div>
          <h1>Payment Management</h1>
          <p className="muted">শিক্ষার্থীর বকেয়া অনুযায়ী টাকা জমা নিন</p>
        </div>
      </div>

      <div className="grid no-print">
        <div className="card">
          <div className="stat-label">মোট বকেয়া</div>
          <div className="stat-value">৳ {formatMoney(totalDue)}</div>
        </div>

        <div className="card">
          <div className="stat-label">মোট নির্ধারিত বকেয়া</div>
          <div className="stat-value">৳ {formatMoney(totalOriginal)}</div>
        </div>

        <div className="card">
          <div className="stat-label">আগে জমা</div>
          <div className="stat-value">৳ {formatMoney(totalPaid)}</div>
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
              onChange={e => {
                setStudent(e.target.value);
                setDueMonth('');
                setReceipt(null);
                setMsg('');
              }}
            >
              <option value="">শিক্ষার্থী নির্বাচন করুন</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.student_code ? `(${s.student_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Due Month Name</label>
            <select
              className="input"
              value={dueMonth}
              onChange={e => setDueMonth(e.target.value)}
              disabled={!student}
            >
              <option value="">বকেয়ার মাস নির্বাচন করুন</option>
              {studentDues
                .filter(d => d.remaining > 0)
                .map(d => (
                  <option key={d.id} value={d.month}>
                    {formatMonth(d.month)} — বকেয়া ৳ {formatMoney(d.remaining)}
                  </option>
                ))}
            </select>
          </div>

          <div className="field">
            <label>Payment Date</label>
            <input
              type="date"
              className="input"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label>জমার পরিমাণ</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="টাকার পরিমাণ লিখুন"
            />
          </div>

          <div className="field">
            <label>পেমেন্ট পদ্ধতি</label>
            <select
              className="input"
              value={method}
              onChange={e => setMethod(e.target.value)}
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
              onChange={e => setNote(e.target.value)}
              placeholder="প্রয়োজনীয় নোট"
            />
          </div>
        </div>

        {student && dueMonth && (
          <div className="notice">
            নির্বাচিত মাস থেকে পরবর্তী মাসগুলোর মোট বকেয়া:
            {' '}
            <strong>৳ {formatMoney(selectedTotalDue)}</strong>
          </div>
        )}

        {msg && <div className="notice">{msg}</div>}

        <button className="btn" onClick={pay} disabled={busy}>
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
                {studentDues.map(d => (
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

      {/* Money Receipt */}
      {receipt && (
        <div className="panel section" id="payment-receipt">
          <div style={{ textAlign: 'center' }}>
            <h2>MONEY RECEIPT</h2>
            <h3>কোচিং সেন্টার</h3>
            <p>টাকা জমার রসিদ</p>
          </div>

          <hr />

          <p><strong>রসিদ নং:</strong> {receipt.id || 'N/A'}</p>
          <p><strong>শিক্ষার্থীর নাম:</strong> {receipt.students?.name || ''}</p>
          <p><strong>শিক্ষার্থী আইডি:</strong> {receipt.students?.student_code || ''}</p>
          <p><strong>জমার তারিখ:</strong> {formatDate(receipt.payment_date || receipt.paid_at)}</p>
          <p><strong>জমার সময়:</strong> {formatTime(receipt.paid_at)}</p>
          <p><strong>পেমেন্ট পদ্ধতি:</strong> {receipt.method}</p>

          <div className="receipt-summary">
            {receipt.totalDueBefore !== null && (
              <div>
                <strong>জমার আগে মোট বকেয়া</strong>
                <h3>৳ {formatMoney(receipt.totalDueBefore)}</h3>
              </div>
            )}

            <div>
              <strong>আজ মোট জমা</strong>
              <h3>৳ {formatMoney(receipt.amount)}</h3>
            </div>

            {receipt.totalDueAfter !== null && (
              <div>
                <strong>জমার পরে অবশিষ্ট বকেয়া</strong>
                <h3>৳ {formatMoney(receipt.totalDueAfter)}</h3>
              </div>
            )}
          </div>

          <h3>যে মাসগুলোর টাকা জমা হয়েছে</h3>

          <table className="receipt-table">
            <thead>
              <tr>
                <th>ক্রমিক</th>
                <th>জমার মাস</th>
                <th>জমার পরিমাণ</th>
              </tr>
            </thead>

            <tbody>
              {receipt.adjustedMonths.map((d: any, i: number) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{formatMonth(d.month)}</td>
                  <td>৳ {formatMoney(d.todayPaid)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {receipt.note && (
            <p style={{ marginTop: 10 }}>
              <strong>নোট:</strong> {receipt.note}
            </p>
          )}

          <div
            className="signature-area"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 35,
              paddingRight: 20
            }}
          >
            <div style={{ textAlign: 'center', minWidth: 180 }}>
              <div
                style={{
                  fontFamily: 'cursive',
                  fontSize: 34,
                  fontWeight: 'bold',
                  fontStyle: 'italic',
                  color: '#000',
                  marginBottom: 5
                }}
              >
                Atiq
              </div>

              <div style={{
                borderTop: '1px solid #000',
                paddingTop: 7
              }}>
                <strong>Authorized Signature</strong>
                <p style={{ margin: '4px 0 0' }}>Atiq</p>
              </div>
            </div>
          </div>

          <div className="no-print" style={{ marginTop: 20 }}>
            <button className="btn" onClick={downloadPDF}>
              PDF / Print Download
            </button>
          </div>
        </div>
      )}

      {/* Payment List */}
      <div className="panel section no-print">
        <h2>পেমেন্ট তালিকা</h2>

        {msg && <div className="notice">{msg}</div>}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 15
        }}>
          <div>
            মোট Payment: <strong>{rows.length}</strong>
            {' | '}
            নির্বাচিত: <strong>{selectedPaymentIds.length}</strong>
          </div>

          <button
            type="button"
            onClick={deleteSelectedPayments}
            disabled={deleting || selectedPaymentIds.length === 0}
            style={{
              background: selectedPaymentIds.length > 0 ? '#dc2626' : '#999',
              color: 'white',
              border: 0,
              padding: '10px 16px',
              borderRadius: 6,
              cursor: selectedPaymentIds.length > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            {deleting
              ? 'Deleting...'
              : `Delete Selected (${selectedPaymentIds.length})`}
          </button>
        </div>

        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th className="payment-select-cell">
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <input
                      type="checkbox"
                      className="payment-checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      disabled={rows.length === 0}
                    />
                    <span>Select All</span>
                  </label>
                </th>

                <th>শিক্ষার্থী</th>
                <th>Due Month Name</th>
                <th>Payment Date</th>
                <th>সময়</th>
                <th>টাকা</th>
                <th>পদ্ধতি</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(p => (
                <tr key={p.id}>
                  <td className="payment-select-cell">
                    <input
                      type="checkbox"
                      className="payment-checkbox"
                      checked={selectedPaymentIds.includes(p.id)}
                      onChange={() => togglePayment(p.id)}
                    />
                  </td>

                  <td>
                    {p.students?.name || 'N/A'}
                    <span className="muted">
                      {' '}
                      {p.students?.student_code || ''}
                    </span>
                  </td>

                  <td>
                    <strong>
                      {p.due_month_name || formatMonth(p.fee_month)}
                    </strong>
                  </td>

                  <td>{formatDate(p.payment_date || p.paid_at)}</td>

                  <td>{formatTime(p.paid_at)}</td>

                  <td>৳ {formatMoney(Number(p.amount || 0))}</td>

                  <td>{p.method || ''}</td>

                  <td>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => downloadSinglePaymentPDF(p)}
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
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
