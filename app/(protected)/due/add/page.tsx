'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddDue() {
  const [students, setStudents] = useState<any[]>([]);
  const [student, setStudent] = useState('');
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('id,name,student_code,program')
      .eq('active', true)
      .order('name');

    if (error) {
      setMsg(error.message);
      return;
    }

    setStudents(data || []);
  }

  useEffect(() => {
    loadStudents();
  }, []);

  const selectedStudent = students.find(
    s => s.id === student
  );

  async function saveDue(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');

    const dueAmount = Number(amount);

    if (!student) {
      setMsg('শিক্ষার্থী নির্বাচন করুন।');
      return;
    }

    if (!month) {
      setMsg('বকেয়ার মাস নির্বাচন করুন।');
      return;
    }

    if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
      setMsg('সঠিক বকেয়ার টাকা লিখুন।');
      return;
    }

    setBusy(true);

    const { error } = await supabase()
      .from('student_dues')
      .insert({
        student_id: student,
        due_month: month + '-01',
        amount: dueAmount,
        note: note
      });

    setBusy(false);

    if (error) {
      if (error.code === '23505') {
        setMsg('এই শিক্ষার্থীর এই মাসের Due আগে থেকেই যোগ করা আছে।');
      } else {
        setMsg(error.message);
      }
      return;
    }

    setMsg('Due সফলভাবে সংরক্ষণ হয়েছে।');
    setAmount('');
    setNote('');
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Add Due</h1>
          <div className="muted">
            শিক্ষার্থীর মাস অনুযায়ী বকেয়া টাকা যোগ করুন।
          </div>
        </div>
      </div>

      <div className="panel section">
        <h2 style={{ fontSize: 19, marginTop: 0 }}>
          নতুন বকেয়া যোগ
        </h2>

        <form onSubmit={saveDue}>
          <div className="formgrid">

            <div className="field">
              <label>শিক্ষার্থী নির্বাচন</label>
              <select
                required
                value={student}
                onChange={e => setStudent(e.target.value)}
              >
                <option value="">
                  শিক্ষার্থী নির্বাচন করুন
                </option>

                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.student_code}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>বকেয়ার মাস</label>
              <input
                type="month"
                required
                value={month}
                onChange={e => setMonth(e.target.value)}
              />
            </div>

            {selectedStudent && (
              <div className="field full">
                <div className="panel">
                  <h3>শিক্ষার্থীর তথ্য</h3>
                  <p>নাম: {selectedStudent.name}</p>
                  <p>Student ID: {selectedStudent.student_code}</p>
                  <p>কোর্স: {selectedStudent.program}</p>
                </div>
              </div>
            )}

            <div className="field">
              <label>বকেয়ার পরিমাণ (টাকা)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="যেমন: 1000"
              />
            </div>

            <div className="field full">
              <label>বিবরণ / নোট</label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="বকেয়ার বিবরণ লিখুন"
              />
            </div>

          </div>

          {msg && (
            <div className="notice" style={{ marginTop: 15 }}>
              {msg}
            </div>
          )}

          <button
            className="btn"
            disabled={busy}
            style={{ marginTop: 16 }}
          >
            {busy ? 'সংরক্ষণ হচ্ছে...' : 'Save Due'}
          </button>
        </form>
      </div>
    </>
  );
}
