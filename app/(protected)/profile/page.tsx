
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminProfile() {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  const [passwordOtp, setPasswordOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage(text);
    setMessageType(type);
  }

  // Load Admin Profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        const user = authData.user;

        if (!user) {
          window.location.replace('/login');
          return;
        }

        setUserId(user.id);
        setEmail(user.email || '');

        const { data, error } = await supabase
          .from('admin_profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setName(data.full_name || '');
          setAvatar(data.avatar_url || '');
        } else {
          const defaultName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            'Admin';

          setName(defaultName);

          const { error: insertError } = await supabase
            .from('admin_profiles')
            .insert({
              id: user.id,
              full_name: defaultName,
            });

          if (insertError) throw insertError;
        }
      } catch (error: any) {
        showMessage(
          error.message || 'Profile লোড করা যায়নি।',
          'error'
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  // Save Name and Profile Picture
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();

    if (!userId) return;

    if (!name.trim()) {
      showMessage('Admin-এর নাম লিখুন।', 'error');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      let avatarUrl = avatar;

      // Upload Picture
      if (selectedFile) {
        if (!selectedFile.type.startsWith('image/')) {
          throw new Error('শুধু Image ফাইল Upload করা যাবে।');
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
          throw new Error('ছবির সাইজ সর্বোচ্চ 5 MB হতে পারবে।');
        }

        const extension =
          selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';

        const filePath =
          `${userId}/${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('admin-avatars')
          .upload(filePath, selectedFile, {
            upsert: true,
            contentType: selectedFile.type,
          });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('admin-avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicData.publicUrl;
      }

      // Save Profile
      const { error } = await supabase
        .from('admin_profiles')
        .upsert({
          id: userId,
          full_name: name.trim(),
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setAvatar(avatarUrl);
      setSelectedFile(null);

      window.dispatchEvent(
        new Event('admin-profile-updated')
      );

      showMessage('Admin Profile সফলভাবে আপডেট হয়েছে।', 'success');

    } catch (error: any) {
      showMessage(
        error.message || 'Profile আপডেট করা যায়নি।',
        'error'
      );
    } finally {
      setSaving(false);
    }
  }

  // Send OTP to New Email
  async function sendEmailOtp(e: React.FormEvent) {
    e.preventDefault();

    if (!newEmail.trim()) {
      showMessage('নতুন Email লিখুন।', 'error');
      return;
    }

    if (newEmail.trim().toLowerCase() === email.toLowerCase()) {
      showMessage('নতুন Email বর্তমান Email-এর মতোই।', 'error');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (error) throw error;

      setEmailOtpSent(true);

      showMessage(
        'নতুন Email-এ OTP পাঠানো হয়েছে। Inbox দেখুন।',
        'success'
      );

    } catch (error: any) {
      showMessage(
        error.message || 'OTP পাঠানো যায়নি।',
        'error'
      );
    } finally {
      setSaving(false);
    }
  }

  // Verify New Email OTP
  async function verifyEmailOtp(e: React.FormEvent) {
    e.preventDefault();

    if (!emailOtp.trim()) {
      showMessage('Email OTP লিখুন।', 'error');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: newEmail.trim(),
        token: emailOtp.trim(),
        type: 'email_change',
      });

      if (error) throw error;

      setEmail(newEmail.trim());
      setNewEmail('');
      setEmailOtp('');
      setEmailOtpSent(false);

      showMessage('Login Email সফলভাবে পরিবর্তন হয়েছে।', 'success');

    } catch (error: any) {
      showMessage(
        error.message || 'OTP সঠিক নয় অথবা মেয়াদ শেষ হয়েছে।',
        'error'
      );
    } finally {
      setSaving(false);
    }
  }

  // Send Password Reset OTP to Current Email
  async function sendPasswordOtp(e: React.FormEvent) {
    e.preventDefault();

    if (!email) {
      showMessage('বর্তমান Login Email পাওয়া যায়নি।', 'error');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/profile`,
        }
      );

      if (error) throw error;

      setPasswordOtpSent(true);

      showMessage(
        'আপনার বর্তমান Email-এ Password OTP পাঠানো হয়েছে।',
        'success'
      );

    } catch (error: any) {
      showMessage(
        error.message || 'Password OTP পাঠানো যায়নি।',
        'error'
      );
    } finally {
      setSaving(false);
    }
  }

  // Verify OTP and Change Password
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!passwordOtp.trim()) {
      showMessage('Password OTP লিখুন।', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showMessage('Password কমপক্ষে ৬ অক্ষরের হতে হবে।', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage('দুইটি Password মিলছে না।', 'error');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        email,
        token: passwordOtp.trim(),
        type: 'recovery',
      });

      if (otpError) throw otpError;

      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) throw passwordError;

      setPasswordOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOtpSent(false);

      showMessage('Password সফলভাবে পরিবর্তন হয়েছে।', 'success');

    } catch (error: any) {
      showMessage(
        error.message || 'OTP অথবা Password সঠিক নয়।',
        'error'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        Profile লোড হচ্ছে...
      </div>
    );
  }

  return (
    <div>
      <div className="pagehead">
        <div>
          <h1>Admin Profile Management</h1>
          <div className="muted">
            Admin-এর ব্যক্তিগত তথ্য ও Account Security
          </div>
        </div>

        <Link href="/dashboard" className="btn secondary">
          ← Dashboard
        </Link>
      </div>

      {message && (
        <div
          className="notice"
          style={{
            marginBottom: 18,
            padding: 12,
            borderRadius: 8,
            background: messageType === 'success' ? '#dcfce7' : '#fee2e2',
            color: messageType === 'success' ? '#166534' : '#991b1b',
          }}
        >
          {message}
        </div>
      )}

      {/* Profile Information */}
      <form className="panel section" onSubmit={saveProfile}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>
          Admin Profile
        </h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          {selectedFile ? (
            <img
              src={URL.createObjectURL(selectedFile)}
              alt="Selected Profile"
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          ) : avatar ? (
            <img
              src={avatar}
              alt="Admin"
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 42,
              }}
            >
              👤
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Profile Picture
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={e =>
                setSelectedFile(e.target.files?.[0] || null)
              }
            />

            <p className="muted" style={{ fontSize: 12 }}>
              সর্বোচ্চ 5 MB Image Upload করতে পারবেন।
            </p>
          </div>
        </div>

        <div className="field">
          <label>Admin Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Admin-এর নাম"
            required
          />
        </div>

        <button
          type="submit"
          className="btn"
          disabled={saving}
          style={{ marginTop: 18 }}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {/* Email Change */}
      <div className="panel section">
        <h2 style={{ fontSize: 20, marginTop: 0 }}>
          Login Email পরিবর্তন
        </h2>

        <div className="field">
          <label>বর্তমান Login Email</label>
          <input
            type="email"
            value={email}
            readOnly
          />
        </div>

        {!emailOtpSent ? (
          <form onSubmit={sendEmailOtp}>
            <div className="field" style={{ marginTop: 15 }}>
              <label>নতুন Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="নতুন Email লিখুন"
                required
              />
            </div>

            <button
              type="submit"
              className="btn"
              disabled={saving}
              style={{ marginTop: 15 }}
            >
              {saving ? 'OTP পাঠানো হচ্ছে...' : 'Send Email OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyEmailOtp}>
            <p className="muted">
              {newEmail} ঠিকানায় পাঠানো OTP লিখুন।
            </p>

            <div className="field">
              <label>Email OTP</label>
              <input
                type="text"
                value={emailOtp}
                onChange={e => setEmailOtp(e.target.value)}
                placeholder="OTP লিখুন"
                required
              />
            </div>

            <button
              type="submit"
              className="btn"
              disabled={saving}
              style={{ marginTop: 15 }}
            >
              {saving ? 'যাচাই হচ্ছে...' : 'Verify OTP & Change Email'}
            </button>

            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setEmailOtpSent(false);
                setEmailOtp('');
              }}
              style={{ marginTop: 10, marginLeft: 10 }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Password Change */}
      <div className="panel section">
        <h2 style={{ fontSize: 20, marginTop: 0 }}>
          Password পরিবর্তন
        </h2>

        <div className="field">
          <label>OTP পাঠানো হবে এই Email-এ</label>
          <input
            type="email"
            value={email}
            readOnly
          />
        </div>

        {!passwordOtpSent ? (
          <button
            type="button"
            className="btn"
            onClick={sendPasswordOtp}
            disabled={saving}
            style={{ marginTop: 15 }}
          >
            {saving ? 'OTP পাঠানো হচ্ছে...' : 'Send Password OTP'}
          </button>
        ) : (
          <form onSubmit={changePassword}>
            <div className="field" style={{ marginTop: 15 }}>
              <label>Email OTP</label>
              <input
                type="text"
                value={passwordOtp}
                onChange={e => setPasswordOtp(e.target.value)}
                placeholder="Email OTP লিখুন"
                required
              />
            </div>

            <div className="field" style={{ marginTop: 15 }}>
              <label>নতুন Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="নতুন Password"
                minLength={6}
                required
              />
            </div>

            <div className="field" style={{ marginTop: 15 }}>
              <label>নতুন Password আবার লিখুন</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="btn"
              disabled={saving}
              style={{ marginTop: 15 }}
            >
              {saving ? 'পরিবর্তন হচ্ছে...' : 'Verify OTP & Change Password'}
            </button>

            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setPasswordOtpSent(false);
                setPasswordOtp('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              style={{ marginTop: 10, marginLeft: 10 }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
