'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const programs = [
  'Honours 1st Year',
  'Honours 2nd Year',
  'Mathematics 1st Year',
  'Mathematics 2nd Year'
];

type Subject = {
  id: string;
  program: string;
  name: string;
  subject_code: string | null;
  monthly_fee: number;
  active: boolean;
};

export default function Subjects() {
  const [rows, setRows] = useState<Subject[]>([]);
  const [program, setProgram] = useState(programs[0]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [fee, setFee] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('program')
      .order('name');

    if (error) {
      setMsg(error.message);
      return;
    }

    setRows((data || []) as Subject[]);
  }

  useEffect(() => {
    load();
  }, []);

  function reset() {
    setName('');
    setCode('');
    setFee('');
    setProgram(programs[0]);
    setEditing(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');

    const payload = {
      program,
      name: name.trim(),
      subject_code: code.trim() || null,
      monthly_fee: Number(fee || 0)
    };

    const q = editing
      ? supabase.from('subjects').update(payload).eq('id', editing)
      : supabase.from('subjects').insert(payload);

    const { error } = await q;

    setBusy(false);

    if (error) {
      setMsg(error.message);
    } else {
      setMsg(editing ? 'বিষয় আপডেট হয়েছে।' : 'নতুন বিষয় যোগ হয়েছে।');
      reset();
      load();
    }
  }

  async function addComputer() {
    if (!confirm('চারটি Program-এ Computer Subject যোগ করবেন?')) {
      return;
    }

    setBusy(true);
    setMsg('');

    const { data: existing, error: fetchError } = await supabase
      .from('subjects')
      .select('program, name')
      .in('program', programs)
      .ilike('name', 'Computer');

    if (fetchError) {
      setMsg(fetchError.message);
      setBusy(false);
      return;
    }

    const existingPrograms = new Set(
      (existing || []).map(s => s.program)
    );

    const missing = programs
      .filter(p => !existingPrograms.has(p))
      .map(p => ({
        program: p,
        name: 'Computer',
        subject_code: null,
        monthly_fee: 0,
        active: true
      }));

    if (missing.length === 0) {
      setMsg('সব Program-এ Computer Subject আগে থেকেই আছে।');
      setBusy(false);
      return;
    }

    const { error } = await supabase
      .from('subjects')
      .insert(missing);

    setBusy(false);

    if (error) {
      setMsg('Computer Subject যোগ করা যায়নি: ' + error.message);
      return;
    }

    setMsg(`${missing.length}টি Program-এ Computer Subject যোগ হয়েছে।`);
    await load();
  }

  function edit(s: Subject) {
    setEditing(s.id);
    setProgram(s.program);
    setName(s.name);
    setCode(s.subject_code || '');
    setFee(String(s.monthly_fee || 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function toggle(s: Subject) {
    const { error } = await supabase
      .from('subjects')
      .update({ active: !s.active })
      .eq('id', s.id);

    if (error) {
      setMsg(error.message);
    } else {
      setMsg('Status পরিবর্তন হয়েছে।');
      load();
    }
  }

  async function remove(s: Subject) {
    if (!confirm(`“${s.name}” বিষয়টি মুছে ফেলবেন?`)) {
      return;
    }

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', s.id);

    if (error) {
      setMsg(
        'বিষয়টি মুছতে সমস্যা হয়েছে। শিক্ষার্থীর সঙ্গে যুক্ত থাকলে আগে নিষ্ক্রিয় করুন। ' +
        error.message
      );
    } else {
      setMsg('বিষয় মুছে ফেলা হয়েছে।');
      load();
    }
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Subject Management</h1>
          <div className="muted">
            নতুন বিষয় যোগ, ফি নির্ধারণ, সম্পাদনা ও সক্রিয়/নিষ্ক্রিয় করুন
          </div>
        </div>
      </div>

      <div className="panel section">
        <h2 style={{ fontSize: 19, marginTop: 0 }}>
          Computer Subject
        </h2>

        <p className="muted">
          এক ক্লিকে চারটি Program-এ Computer Subject যোগ করুন।
          আগে থেকে থাকলে পুনরায় যোগ হবে না।
        </p>

        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={addComputer}
        >
          {busy ? 'অপেক্ষা করুন...' : '+ সব Program-এ Computer যোগ করুন'}
        </button>
      </div>

      <form className="panel" onSubmit={save}>
        <h2 style={{ fontSize: 19, marginTop: 0 }}>
          {editing ? 'বিষয় সম্পাদনা' : 'নতুন Subject Add'}
        </h2>

        <div className="formgrid">
          <div className="field">
            <label>Year / Course</label>
            <select
              value={program}
              onChange={e => setProgram(e.target.value)}
            >
              {programs.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Subject Name</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="যেমন: Real Analysis"
            />
          </div>

          <div className="field">
            <label>Subject Code (ঐচ্ছিক)</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Subject code"
            />
          </div>

          <div className="field">
            <label>Monthly Fee (টাকা)</label>
            <input
              type="number"
              min="0"
              value={fee}
              onChange={e => setFee(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        {msg && (
          <div className="notice" style={{ marginTop: 15 }}>
            {msg}
          </div>
        )}

        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn" disabled={busy}>
            {busy
              ? 'সংরক্ষণ হচ্ছে...'
              : editing
                ? 'আপডেট করুন'
                : 'বিষয় যোগ করুন'}
          </button>

          {editing && (
            <button
              type="button"
              className="btn secondary"
              onClick={reset}
            >
              বাতিল
            </button>
          )}
        </div>
      </form>

      <div className="panel section">
        <h2 style={{ fontSize: 19, marginTop: 0 }}>
          Subject List
        </h2>

        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Year / Course</th>
                <th>Subject Name</th>
                <th>Code</th>
                <th>Monthly Fee</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(s => (
                <tr key={s.id}>
                  <td>{s.program}</td>
                  <td>{s.name}</td>
                  <td>{s.subject_code || '—'}</td>
                  <td>
                    ৳ {Number(s.monthly_fee || 0).toLocaleString('en-BD')}
                  </td>
                  <td>
                    <span className={s.active ? 'pill' : 'pill warn'}>
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => edit(s)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => toggle(s)}
                      >
                        {s.active ? 'বন্ধ' : 'চালু'}
                      </button>

                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => remove(s)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!rows.length && (
            <div className="empty">
              এখনো কোনো Subject যোগ করা হয়নি।
            </div>
          )}
        </div>
      </div>
    </>
  );
}
