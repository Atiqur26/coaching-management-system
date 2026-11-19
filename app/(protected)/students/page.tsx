
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Students() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [program, setProgram] = useState('সব');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    let query = supabase()
      .from('students')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (program !== 'সব') {
      query = query.eq('program', program);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      alert('সমস্যা: ' + error.message);
      setRows([]);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [program]);

  const filtered = rows.filter(x =>
    (x.name + ' ' + x.phone + ' ' + x.student_code)
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  async function deactivate(id: string) {
    if (!confirm('এই শিক্ষার্থীকে নিষ্ক্রিয় করবেন?')) return;

    const { error } = await supabase()
      .from('students')
      .update({ active: false })
      .eq('id', id);

    if (error) {
      alert(error.message);
      return;
    }

    load();
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>শিক্ষার্থী তালিকা</h1>
          <div className="muted">
            নাম, মোবাইল বা আইডি দিয়ে খুঁজুন
          </div>
        </div>

        <Link className="btn" href="/students/new">
          ＋ নতুন শিক্ষার্থী
        </Link>
      </div>

      <div className="panel">
        <div className="actions" style={{ marginBottom: 16 }}>
          <input
            placeholder="শিক্ষার্থী খুঁজুন..."
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{
              padding: 10,
              border: '1px solid #d9e1ec',
              borderRadius: 9,
              flex: 1,
              minWidth: 180
            }}
          />

          <select
            value={program}
            onChange={e => setProgram(e.target.value)}
            style={{
              padding: 10,
              border: '1px solid #d9e1ec',
              borderRadius: 9
            }}
          >
            {[
              'সব',
              'Mathematics 1st Year',
              'Mathematics 2nd Year',
              'Honours 1st Year',
              'Honours 2nd Year'
            ].map(x => <option key={x}>{x}</option>)}
          </select>
        </div>

        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>আইডি</th>
                <th>নাম</th>
                <th>মোবাইল</th>
                <th>কোর্স</th>
                <th>Subject</th>
                <th>মাসিক ফি</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>{s.student_code}</td>
                  <td>{s.name}</td>
                  <td>{s.phone || '—'}</td>
                  <td>{s.program}</td>
                  <td>{s.subject_id ? 'নির্বাচিত' : '—'}</td>
                  <td>
                    ৳ {Number(s.monthly_fee || 0).toLocaleString('en-BD')}
                  </td>
                  <td>
                    <button
                      className="btn danger"
                      onClick={() => deactivate(s.id)}
                    >
                      নিষ্ক্রিয়
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && <div className="empty">লোড হচ্ছে...</div>}

          {!loading && !filtered.length && (
            <div className="empty">
              কোনো শিক্ষার্থী পাওয়া যায়নি।
            </div>
          )}
        </div>
      </div>
    </>
  );
}
