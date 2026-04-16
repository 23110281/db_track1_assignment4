import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, User, Lock, Bell, Shield, Trash2,
  Save, Check, Eye, EyeOff, MapPin, AtSign,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { settingsApi, authApi } from '../api';

/* ── styles ── */
const s = {
  page: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '32px 16px 64px',
  },
  heading: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 28,
    fontWeight: 700,
    color: '#1E1B4B',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 15,
    marginBottom: 32,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    padding: '28px 32px',
    marginBottom: 24,
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 18,
    fontWeight: 600,
    color: '#1E1B4B',
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #E5E7EB',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  inputDisabled: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #E5E7EB',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#F3F4F6',
    color: '#9CA3AF',
    cursor: 'not-allowed',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #E5E7EB',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    minHeight: 80,
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 24px',
    background: '#4F46E5',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 24px',
    background: '#E5E7EB',
    color: '#374151',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 24px',
    background: '#DC2626',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  btnOutlineDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 24px',
    background: 'transparent',
    color: '#DC2626',
    border: '2px solid #DC2626',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #F3F4F6',
  },
  toggleLabel: { fontSize: 14, color: '#374151' },
  toggleDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  toast: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#059669',
    color: '#fff',
    padding: '12px 28px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    zIndex: 9999,
  },
  dangerZone: {
    background: '#FEF2F2',
    border: '1.5px solid #FECACA',
    borderRadius: 16,
    padding: '28px 32px',
    marginBottom: 24,
  },
  dangerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 18,
    fontWeight: 600,
    color: '#DC2626',
    marginBottom: 8,
  },
  dangerText: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 20,
    lineHeight: 1.5,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    padding: '32px',
    maxWidth: 420,
    width: '90%',
    boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#DC2626',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 1.6,
    marginBottom: 24,
  },
  modalBtns: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
  },
  passwordWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9CA3AF',
    padding: 0,
    display: 'flex',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 12,
  },
  successText: {
    color: '#059669',
    fontSize: 13,
    marginBottom: 12,
  },
};

/* ── Toggle Switch ── */
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 48, height: 26, borderRadius: 13,
        background: checked ? '#4F46E5' : '#D1D5DB',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute', top: 3, left: checked ? 24 : 3,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
      />
    </button>
  );
}

/* ── Main Settings Page ── */
export default function Settings() {
  const { user, setUser, logout } = useAuth();

  /* Profile form */
  const [profile, setProfile] = useState({
    name: user?.Name || '',
    contact: user?.ContactNumber || '',
    address: user?.Address || '',
    showAddress: user?.ShowAddress || false,
  });

  /* Username change */
  const [usernameForm, setUsernameForm] = useState({
    newUsername: user?.Username || '',
    otpSent: false,
    otp: '',
    loading: false,
    error: '',
    success: '',
    countdown: 0,
  });

  useEffect(() => {
    if (usernameForm.countdown > 0) {
      const t = setTimeout(() => setUsernameForm(p => ({ ...p, countdown: p.countdown - 1 })), 1000);
      return () => clearTimeout(t);
    }
  }, [usernameForm.countdown]);

  /* Password form */
  const [passwords, setPasswords] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [pwError, setPwError] = useState('');

  /* Notification prefs */
  const [notifs, setNotifs] = useState({
    email: true, postLikes: true, comments: true, groupActivity: false, jobAlerts: true,
  });

  /* Privacy prefs */
  const [privacy, setPrivacy] = useState({
    showEmail: true, showContact: false, allowQnA: true,
  });

  /* Load privacy settings from backend */
  useEffect(() => {
    settingsApi.getPrivacy().then(data => {
      setPrivacy({
        showEmail: data.showEmail,
        showContact: data.showContact,
        allowQnA: data.allowQnA,
      });
    }).catch(() => {});
  }, []);

  /* Toast + Delete modal */
  const [toast, setToast] = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  /* ── Profile save ── */
  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      await settingsApi.updateProfile({
        name: profile.name,
        contact: profile.contact,
        address: profile.address,
        showAddress: profile.showAddress,
      });
      setUser(prev => ({
        ...prev,
        Name: profile.name,
        ContactNumber: profile.contact,
        Address: profile.address,
        ShowAddress: profile.showAddress,
      }));
      showToast('Profile updated successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to update profile.');
    }
  };

  /* ── Username change with OTP ── */
  const handleSendUsernameOtp = async () => {
    const uf = usernameForm;
    if (!uf.newUsername.trim() || uf.newUsername.trim() === user?.Username) {
      setUsernameForm(p => ({ ...p, error: 'Enter a new username different from current.' }));
      return;
    }
    if (uf.newUsername.trim().length < 3) {
      setUsernameForm(p => ({ ...p, error: 'Username must be at least 3 characters.' }));
      return;
    }
    setUsernameForm(p => ({ ...p, loading: true, error: '', success: '' }));
    try {
      await authApi.forgotPassword(user.Email.toLowerCase());
      setUsernameForm(p => ({ ...p, otpSent: true, loading: false, countdown: 60 }));
    } catch (err) {
      setUsernameForm(p => ({ ...p, error: err.message, loading: false }));
    }
  };

  const handleChangeUsername = async () => {
    const uf = usernameForm;
    if (!uf.otp.trim()) {
      setUsernameForm(p => ({ ...p, error: 'Enter the OTP sent to your email.' }));
      return;
    }
    setUsernameForm(p => ({ ...p, loading: true, error: '' }));
    try {
      const res = await settingsApi.changeUsername({
        username: uf.newUsername.trim(),
        otp: uf.otp.trim(),
        email: user.Email.toLowerCase(),
      });
      setUser(prev => ({ ...prev, Username: res.username }));
      setUsernameForm(p => ({ ...p, loading: false, otpSent: false, otp: '', success: 'Username changed!', error: '' }));
      showToast('Username changed successfully!');
    } catch (err) {
      setUsernameForm(p => ({ ...p, error: err.message, loading: false }));
    }
  };

  /* ── Password change ── */
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    if (passwords.newPw.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    if (passwords.newPw !== passwords.confirm) { setPwError('New passwords do not match.'); return; }
    try {
      await settingsApi.changePassword({ currentPassword: passwords.current, newPassword: passwords.newPw });
      setPasswords({ current: '', newPw: '', confirm: '' });
      showToast('Password changed successfully!');
    } catch (err) {
      setPwError(err.message || 'Failed to change password.');
    }
  };

  /* ── Delete account ── */
  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    try {
      await settingsApi.deleteAccount();
      logout();
    } catch (err) {
      showToast(err.message || 'Failed to delete account.');
    }
  };

  const pf = (field, val) => setProfile((p) => ({ ...p, [field]: val }));
  const pw = (field, val) => { setPwError(''); setPasswords((p) => ({ ...p, [field]: val })); };

  return (
    <div style={s.page}>
      <h1 style={s.heading}>
        <SettingsIcon size={28} color="#4F46E5" />
        Settings
      </h1>
      <p style={s.subtitle}>Manage your account preferences and privacy.</p>

      {/* ── 1. Profile Settings ── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <User size={20} color="#4F46E5" />
          Profile Settings
        </h2>
        <form onSubmit={handleProfileSave}>
          <div style={s.row}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Full Name</label>
              <input
                style={s.input}
                value={profile.name}
                onChange={(e) => pf('name', e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Email</label>
              <input
                style={s.inputDisabled}
                type="email"
                value={user?.Email || ''}
                disabled
              />
              <p style={s.hint}>Email cannot be changed</p>
            </div>
          </div>
          <div style={s.row}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Contact Number</label>
              <input
                style={s.input}
                value={profile.contact}
                onChange={(e) => pf('contact', e.target.value)}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Address</label>
              <input
                style={s.input}
                value={profile.address}
                onChange={(e) => pf('address', e.target.value)}
                placeholder="e.g. Room 301, Hostel 14, IITGN"
              />
            </div>
          </div>
          <div style={{ ...s.fieldGroup, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Toggle checked={profile.showAddress} onChange={(v) => pf('showAddress', v)} />
            <div>
              <div style={s.toggleLabel}>Show address on profile</div>
              <div style={s.toggleDesc}>Allow others to see your address on your profile page</div>
            </div>
          </div>
          <button type="submit" style={s.btn}>
            <Save size={16} /> Save Changes
          </button>
        </form>
      </div>

      {/* ── 2. Change Username (with OTP) ── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <AtSign size={20} color="#4F46E5" />
          Change Username
        </h2>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
          For security, an OTP will be sent to your email to confirm the change.
        </p>
        <div style={s.fieldGroup}>
          <label style={s.label}>Current Username</label>
          <input style={s.inputDisabled} value={user?.Username || ''} disabled />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>New Username</label>
          <input
            style={s.input}
            value={usernameForm.newUsername}
            onChange={(e) => setUsernameForm(p => ({ ...p, newUsername: e.target.value, error: '', success: '' }))}
            placeholder="Enter new username"
          />
        </div>

        {usernameForm.otpSent && (
          <div style={s.fieldGroup}>
            <label style={s.label}>Enter OTP (sent to {user?.Email})</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                style={{ ...s.input, letterSpacing: 4, fontWeight: 700, textAlign: 'center', maxWidth: 200 }}
                value={usernameForm.otp}
                onChange={(e) => setUsernameForm(p => ({ ...p, otp: e.target.value.replace(/\D/g, '').slice(0, 6), error: '' }))}
                placeholder="6-digit OTP"
                maxLength={6}
              />
              <button
                type="button"
                onClick={handleSendUsernameOtp}
                disabled={usernameForm.countdown > 0}
                style={{
                  ...s.btnSecondary,
                  opacity: usernameForm.countdown > 0 ? 0.5 : 1,
                  cursor: usernameForm.countdown > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {usernameForm.countdown > 0 ? `${usernameForm.countdown}s` : 'Resend'}
              </button>
            </div>
          </div>
        )}

        {usernameForm.error && <p style={s.errorText}>{usernameForm.error}</p>}
        {usernameForm.success && <p style={s.successText}>{usernameForm.success}</p>}

        {!usernameForm.otpSent ? (
          <button
            type="button"
            style={{ ...s.btn, opacity: usernameForm.loading ? 0.7 : 1 }}
            onClick={handleSendUsernameOtp}
            disabled={usernameForm.loading}
          >
            {usernameForm.loading ? 'Sending OTP...' : 'Send OTP to Verify'}
          </button>
        ) : (
          <button
            type="button"
            style={{ ...s.btn, opacity: usernameForm.loading ? 0.7 : 1 }}
            onClick={handleChangeUsername}
            disabled={usernameForm.loading}
          >
            {usernameForm.loading ? 'Changing...' : 'Confirm Username Change'}
          </button>
        )}
      </div>

      {/* ── 3. Account Settings (Password) ── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <Lock size={20} color="#4F46E5" />
          Change Password
        </h2>
        <form onSubmit={handlePasswordChange}>
          {['current', 'newPw', 'confirm'].map((field) => {
            const labels = { current: 'Current Password', newPw: 'New Password', confirm: 'Confirm New Password' };
            return (
              <div style={s.fieldGroup} key={field}>
                <label style={s.label}>{labels[field]}</label>
                <div style={s.passwordWrap}>
                  <input
                    style={s.input}
                    type={showPw[field] ? 'text' : 'password'}
                    value={passwords[field]}
                    onChange={(e) => pw(field, e.target.value)}
                    placeholder={labels[field]}
                  />
                  <button
                    type="button"
                    style={s.eyeBtn}
                    onClick={() => setShowPw((p) => ({ ...p, [field]: !p[field] }))}
                  >
                    {showPw[field] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            );
          })}
          {pwError && <p style={s.errorText}>{pwError}</p>}
          <button type="submit" style={s.btn}>
            <Lock size={16} /> Change Password
          </button>
        </form>
      </div>

      {/* ── 4. Notification Preferences ── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <Bell size={20} color="#4F46E5" />
          Notification Preferences
        </h2>
        {[
          { key: 'email', label: 'Email Notifications', desc: 'Receive email digests and updates' },
          { key: 'postLikes', label: 'Post Likes', desc: 'Get notified when someone likes your post' },
          { key: 'comments', label: 'Comments on Your Posts', desc: 'Get notified when someone comments' },
          { key: 'groupActivity', label: 'Group Activity', desc: 'Updates from groups you belong to' },
          { key: 'jobAlerts', label: 'Job Posting Alerts', desc: 'New job and internship postings' },
        ].map(({ key, label, desc }, i, arr) => (
          <div key={key} style={{ ...s.toggleRow, ...(i === arr.length - 1 ? { borderBottom: 'none' } : {}) }}>
            <div>
              <div style={s.toggleLabel}>{label}</div>
              <div style={s.toggleDesc}>{desc}</div>
            </div>
            <Toggle checked={notifs[key]} onChange={(v) => setNotifs((n) => ({ ...n, [key]: v }))} />
          </div>
        ))}
      </div>

      {/* ── 5. Privacy Settings ── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>
          <Shield size={20} color="#4F46E5" />
          Privacy Settings
        </h2>
        {[
          { key: 'showEmail', label: 'Show Email on Profile', desc: 'Allow others to see your email address' },
          { key: 'showContact', label: 'Show Contact Number on Profile', desc: 'Allow others to see your phone number' },
          { key: 'allowQnA', label: 'Allow Profile Q&A', desc: 'Let others ask questions on your profile' },
        ].map(({ key, label, desc }, i, arr) => (
          <div key={key} style={{ ...s.toggleRow, ...(i === arr.length - 1 ? { borderBottom: 'none' } : {}) }}>
            <div>
              <div style={s.toggleLabel}>{label}</div>
              <div style={s.toggleDesc}>{desc}</div>
            </div>
            <Toggle checked={privacy[key]} onChange={(v) => {
              setPrivacy((p) => ({ ...p, [key]: v }));
              settingsApi.updatePrivacy({ [key]: v }).then(() => {
                showToast('Privacy setting updated!');
              }).catch(() => showToast('Failed to update privacy setting.'));
            }} />
          </div>
        ))}
      </div>

      {/* ── 6. Danger Zone ── */}
      <div style={s.dangerZone}>
        <h2 style={s.dangerTitle}>
          <Trash2 size={20} />
          Danger Zone
        </h2>
        <p style={s.dangerText}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button style={s.btnDanger} onClick={() => setShowDeleteModal(true)}>
          <Trash2 size={16} /> Delete Account
        </button>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={s.toast}>
          <Check size={18} />
          {toast}
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {showDeleteModal && (
        <div style={s.overlay} onClick={() => setShowDeleteModal(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Delete Account?</h3>
            <p style={s.modalText}>
              Are you sure you want to delete your account? All your posts, comments, group memberships,
              and personal data will be permanently removed. This action is irreversible.
            </p>
            <div style={s.modalBtns}>
              <button style={s.btnOutlineDanger} onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button style={s.btnDanger} onClick={handleDeleteAccount}>
                <Trash2 size={16} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
