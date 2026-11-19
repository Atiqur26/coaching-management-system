'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Student = {
  id: string;
  name: string;
  student_code: string | null;
  program: string | null;
};

export default function AddDuePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    const { data, error } = await supabase()
      .from('students')
      .select('id,name,student_code,program')
      .eq('active', true)
      .order('name');

    if (error) {
      setError(error.message);
      return;
    }

    setStudents(data || []);
  }

  async function saveDue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setError('');

    const dueAmount = Number(amount);

    if (!studentId) {
      setError('শিক্ষার্থী নির্বাচন করুন।');
      return;
    }

    if (!month) {
      setError('বকেয়ার মাস নির্বাচন করুন।');
      return;
    }

    if (!Number.isFinite(dueAmount) || dueAmount <= 0) {
      setError('সঠিক বকেয়ার টাকা লিখুন।');
      return;
    }

    setLoading(true);

    const { error } = await supabase()
      .from('student_dues')
      .insert({
        student_id: studentId,
        due_month: `${month}-01`,
        amount: dueAmount,
        note: note.trim() || null
      });

    setLoading(false);

    if (error) {
      if (error.code === '23505') {
        setError('এই শিক্ষার্থীর এই মাসের Due আগে থেকেই আছে।');
      } else {
        setError(error.message);
      }
      return;
    }

    setMessage('Due সফলভাবে সংরক্ষণ হয়েছে।');
    setAmount('');
    setNote('');
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow p-5">
        <h1 className="text-2xl font-bold mb-2">
          Add Due
        </h1>

        <p className="text-gray-500 mb-6">
          শিক্ষার্থীর মাস অনুযায়ী বকেয়া টাকা যোগ করুন।
        </p>

        {message && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={saveDue} className="space-y-5">
          <div>
            <label className="block font-medium mb-2">
              শিক্ষার্থী নির্বাচন
            </label>

            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full border rounded-lg p-3"
              required
            >
              <option value="">শিক্ষার্থী নির্বাচন করুন</option>

              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.student_code || 'No ID'} 
                  {s.program ? ` (${s.program})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-2">
              বকেয়ার মাস
            </label>

            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              বকেয়ার পরিমাণ (টাকা)
            </label>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="যেমন: 1000"
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              বিবরণ (ঐচ্ছিক)
            </label>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="বকেয়ার কারণ লিখুন"
              className="w-full border rounded-lg p-3"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg p-3 disabled:opacity-50"
          >
            {loading ? 'সংরক্ষণ হচ্ছে...' : 'Save Due'}
          </button>
        </form>
      </div>
    </div>
  );
}

