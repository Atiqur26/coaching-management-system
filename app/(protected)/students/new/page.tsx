
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const programs = [
  'Mathematics 1st Year',
  'Mathematics 2nd Year',
  'Honours 1st Year',
  'Honours 2nd Year'
];

export default function NewStudent() {
  const [f, setF] = useState({
    name: '',
    phone: '',
    guardian_name: '',
    guardian_phone: '',
    program: programs[0],
    subject_id: '',
    monthly_fee: '0',
    join_date: new Date().toISOString().slice(0, 10),
    address: ''
  });

  const [subjects, setSubjects] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  function change(k: string, v: string) {
    setF(p => ({ ...p, [k]: v }));
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('subjects')
        .select('id,name,monthly_fee')
        .eq('program', f.program)
        .eq('active', true)
        .order('name');

      setSubjects(data || []);
      setSelected([]);
      setF(p => ({ ...p, subject_id: '' }));
    })();
  }, [f.program]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');

    const chosen = subjects.filter(x => selected.includes(x.id));

    const { data, error } = await supabase()
      .from('students')
      .insert({
        ...f,
        subject_id: selected[0] || null,
        monthly_fee: Number(f.monthly_fee || 0),
        student_code: 'STU-' + Date.now().toString().slice(-8)
      })
      .select('id')
      .single();

    if (error) {
      setBusy(false);
      setMsg(error.message);
      return;
    }

    if (selected.length) {
      const { error: enrollError } = await supabase()
        .from('student_subjects')
        .insert(
          chosen.map(x => ({
            student_id: data.id,
            subject_id: x.id,
            monthly_fee: Number(x.monthly_fee || 0)
          }))
        );

      if (enrollError) {
        setBusy(false);
        setMsg('শিক্ষার্থী তৈরি হয়েছে, কিন্তু Subject enrollment সম্পূর্ণ হয়নি: ' + enrollError.message);
        return;
      }
    }

    setBusy(false);
    setMsg('শিক্ষার্থী ও নির্বাচিত বিষয়গুলো সফলভাবে সংরক্ষণ হয়েছে।');
    setSelected([]);

    setF({
      name: '',
      phone: '',
      guardian_name: '',
      guardian_phone: '',
      program: programs[0],
      subject_id: '',
      monthly_fee: '0',
      join_date: new Date().toISOString().slice(0, 10),
      address: ''
    });
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>নতুন শিক্ষার্থী যোগ</h1>
          <div className="muted">
            শিক্ষার্থীর তথ্য, কোর্স, একাধিক বিষয় ও মাসিক ফি
          </div>
        </div>
      </div>

      <form className="panel" onSubmit={submit}>
        <div className="formgrid">
          {[
            ['name', 'শিক্ষার্থীর নাম', 'text'],
            ['phone', 'শিক্ষার্থীর মোবাইল', 'tel'],
            ['guardian_name', 'অভিভাবকের নাম', 'text'],
            ['guardian_phone', 'অভিভাবকের মোবাইল', 'tel']
          ].map(([k, l, t]) => (
            <div className="field" key={k}>
              <label>{l}</label>
              <input
                type={t}
                required={k === 'name'}
                value={(f as any)[k]}
                onChange={e => change(k, e.target.value)}
              />
            </div>
          ))}

          <div className="field">
            <label>কোর্স / বর্ষ</label>
            <select
              value={f.program}
              onChange={e => change('program', e.target.value)}
            >
              {programs.map(x => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>ভর্তির তারিখ</label>
            <input
              type="date"
              value={f.join_date}
              onChange={e => change('join_date', e.target.value)}
            />
          </div>

          <div className="field full">
            <label>Subject নির্বাচন করুন (একাধিক নির্বাচন করা যাবে)</label>

            <div className="subjectchecks">
              {subjects.map(x => (
                <label className="subjectcheck" key={x.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(x.id)}
                    onChange={e =>
                      setSelected(old =>
                        e.target.checked
                          ? [...old, x.id]
                          : old.filter(id => id !== x.id)
                      )
                    }
                  />
                  <span>
                    {x.name}
                    <small>
                      ৳ {Number(x.monthly_fee || 0).toLocaleString('en-BD')}/মাস
                    </small>
                  </span>
                </label>
              ))}
            </div>

            {!subjects.length && (
              <small className="muted">
                এই কোর্সে বিষয় নেই। Subject Management থেকে যোগ করুন।
              </small>
            )}
          </div>

          <div className="field">
            <label>মোট মাসিক ফি (নিজে লিখুন)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={f.monthly_fee}
              onChange={e => change('monthly_fee', e.target.value)}
              placeholder="মাসিক ফি লিখুন"
              required
            />
          </div>

          <div className="field full">
            <label>ঠিকানা</label>
            <textarea
              rows={2}
              value={f.address}
              onChange={e => change('address', e.target.value)}
            />
          </div>
        </div>

        {msg && <div className="notice">{msg}</div>}

        <button
          className="btn"
          disabled={busy || !f.name.trim()}
          style={{ marginTop: 20 }}
        >
          {busy ? 'সংরক্ষণ হচ্ছে...' : 'শিক্ষার্থী সংরক্ষণ'}
        </button>
      </form>
    </>
  );
}
