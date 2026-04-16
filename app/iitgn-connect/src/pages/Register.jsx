import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UserPlus,
  Eye,
  EyeOff,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { authApi } from '../api';

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 50%, #6366f1 100%)',
    padding: '1rem',
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  card: {
    background: '#ffffff',
    borderRadius: '1.25rem',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
    width: '100%',
    maxWidth: '480px',
    padding: '2.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  logoIcon: {
    width: 48,
    height: 48,
    objectFit: 'contain',
  },
  logoText: {
    fontSize: '1.6rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #1e3a5f, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '2rem',
    textAlign: 'center',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
  },
  row: {
    display: 'flex',
    gap: '1rem',
    width: '100%',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    flex: 1,
  },
  label: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: '#334155',
    letterSpacing: '0.3px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '0.65rem 0.85rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '0.6rem',
    fontSize: '0.9rem',
    color: '#1e293b',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    background: '#f8fafc',
  },
  inputFocus: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)',
    background: '#ffffff',
  },
  select: {
    width: '100%',
    padding: '0.65rem 2.2rem 0.65rem 0.85rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '0.6rem',
    fontSize: '0.9rem',
    color: '#1e293b',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    background: '#f8fafc',
    appearance: 'none',
    cursor: 'pointer',
  },
  selectWrapper: {
    position: 'relative',
    width: '100%',
  },
  selectChevron: {
    position: 'absolute',
    right: '0.7rem',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: '#94a3b8',
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.7rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    display: 'flex',
    padding: '0.25rem',
  },
  submitBtn: {
    width: '100%',
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '0.6rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'opacity 0.2s, transform 0.1s',
    marginTop: '0.25rem',
  },
  submitBtnDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 0.9rem',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '0.6rem',
    color: '#dc2626',
    fontSize: '0.85rem',
    width: '100%',
    boxSizing: 'border-box',
  },
  successToast: {
    position: 'fixed',
    top: '1.5rem',
    right: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.9rem 1.2rem',
    background: '#ffffff',
    border: '1px solid #bbf7d0',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
    color: '#15803d',
    fontSize: '0.9rem',
    fontWeight: '500',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease-out',
  },
  footer: {
    marginTop: '1.5rem',
    fontSize: '0.875rem',
    color: '#64748b',
    textAlign: 'center',
  },
  link: {
    color: '#3b82f6',
    fontWeight: '600',
    textDecoration: 'none',
  },
  sectionLabel: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginTop: '0.4rem',
    paddingBottom: '0.25rem',
    borderBottom: '1px solid #e2e8f0',
  },
};

const MEMBER_TYPES = ['Student', 'Professor', 'Alumni', 'Organization'];

const PROGRAMMES = ['BTech', 'MTech', 'MSc', 'MA', 'PhD'];
const BRANCHES = [
  'Computer Science',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Materials Science',
  'Humanities & Social Sciences',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Cognitive Science',
];
const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Materials Engineering',
  'Humanities & Social Sciences',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biological Engineering',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => currentYear - i);

function SelectField({ label, value, onChange, options, placeholder, focused, onFocus, onBlur, name }) {
  return (
    <div style={styles.inputGroup}>
      <label style={styles.label}>{label}</label>
      <div style={styles.selectWrapper}>
        <select
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          name={name}
          style={{
            ...styles.select,
            ...(focused ? styles.inputFocus : {}),
            color: value ? '#1e293b' : '#94a3b8',
          }}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((opt) => (
            <option key={typeof opt === 'object' ? opt.value : opt} value={typeof opt === 'object' ? opt.value : opt}>
              {typeof opt === 'object' ? opt.label : opt}
            </option>
          ))}
        </select>
        <span style={styles.selectChevron}>
          <ChevronDown size={16} />
        </span>
      </div>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    memberType: '',
    // Student fields
    programme: '',
    branch: '',
    joiningYear: '',
    // Professor fields
    department: '',
    designation: '',
    // Alumni fields
    alumniBranch: '',
    graduationYear: '',
    currentCompany: '',
    // Organization fields
    orgDescription: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    const email = form.email.trim().toLowerCase();
    if (!email) { setOtpError('Email is required'); return; }
    if (!email.endsWith('@iitgn.ac.in')) { setOtpError('Only @iitgn.ac.in emails are allowed'); return; }

    setOtpLoading(true);
    setOtpError('');
    try {
      await authApi.sendOtp(email);
      setOtpSent(true);
      setOtpCountdown(60);
      setOtpError('');
    } catch (err) {
      setOtpError(err.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) { setOtpError('Please enter the OTP'); return; }

    setOtpLoading(true);
    setOtpError('');
    try {
      await authApi.verifyOtp(form.email.trim().toLowerCase(), otpCode.trim());
      setEmailVerified(true);
      setOtpError('');
    } catch (err) {
      setOtpError(err.message || 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (name === 'email') {
      setEmailVerified(false);
      setOtpSent(false);
      setOtpCode('');
      setOtpError('');
    }
  };

  const inputStyle = (field) => ({
    ...styles.input,
    ...(focusedField === field ? styles.inputFocus : {}),
  });

  const validate = () => {
    if (!form.name.trim()) return 'Full name is required.';
    if (!form.username.trim()) return 'Username is required.';
    if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim()))
      return 'Username can only contain letters, numbers, and underscores.';
    if (!form.email.trim()) return 'Email is required.';
    if (!form.email.trim().endsWith('@iitgn.ac.in'))
      return 'Email must be an @iitgn.ac.in address.';
    if (!emailVerified) return 'Please verify your email first.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (!form.memberType) return 'Please select a member type.';

    if (form.memberType === 'Student') {
      if (!form.programme) return 'Programme is required for students.';
      if (!form.branch) return 'Branch is required for students.';
      if (!form.joiningYear) return 'Joining year is required for students.';
    }
    if (form.memberType === 'Professor') {
      if (!form.department) return 'Department is required for professors.';
    }
    if (form.memberType === 'Alumni') {
      if (!form.alumniBranch) return 'Branch is required for alumni.';
      if (!form.graduationYear) return 'Graduation year is required for alumni.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const regData = {
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        memberType: form.memberType,
      };
      if (form.memberType === 'Student') {
        regData.programme = form.programme;
        regData.branch = form.branch;
        regData.joiningYear = form.joiningYear;
      } else if (form.memberType === 'Professor') {
        regData.department = form.department;
        regData.designation = form.designation;
      } else if (form.memberType === 'Alumni') {
        regData.branch = form.alumniBranch;
        regData.graduationYear = form.graduationYear;
        regData.currentOrganization = form.currentCompany;
      } else if (form.memberType === 'Organization') {
        regData.orgDescription = form.orgDescription;
      }
      await authApi.register(regData);

      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderConditionalFields = () => {
    switch (form.memberType) {
      case 'Student':
        return (
          <>
            <div style={styles.sectionLabel}>Student Details</div>
            <div style={styles.row}>
              <SelectField
                label="Programme"
                value={form.programme}
                onChange={handleChange}
                options={PROGRAMMES}
                placeholder="Select programme"
                focused={focusedField === 'programme'}
                onFocus={() => setFocusedField('programme')}
                onBlur={() => setFocusedField(null)}
                name="programme"
              />
              <SelectField
                label="Joining Year"
                value={form.joiningYear}
                onChange={handleChange}
                options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                placeholder="Year"
                focused={focusedField === 'joiningYear'}
                onFocus={() => setFocusedField('joiningYear')}
                onBlur={() => setFocusedField(null)}
                name="joiningYear"
              />
            </div>
            <SelectField
              label="Branch"
              value={form.branch}
              onChange={handleChange}
              options={BRANCHES}
              placeholder="Select branch"
              focused={focusedField === 'branch'}
              onFocus={() => setFocusedField('branch')}
              onBlur={() => setFocusedField(null)}
              name="branch"
            />
          </>
        );

      case 'Professor':
        return (
          <>
            <div style={styles.sectionLabel}>Professor Details</div>
            <SelectField
              label="Department"
              value={form.department}
              onChange={handleChange}
              options={DEPARTMENTS}
              placeholder="Select department"
              focused={focusedField === 'department'}
              onFocus={() => setFocusedField('department')}
              onBlur={() => setFocusedField(null)}
              name="department"
            />
            <div style={styles.inputGroup}>
              <label style={styles.label}>Designation (optional)</label>
              <input
                type="text"
                name="designation"
                placeholder="e.g. Associate Professor"
                value={form.designation}
                onChange={handleChange}
                onFocus={() => setFocusedField('designation')}
                onBlur={() => setFocusedField(null)}
                style={inputStyle('designation')}
              />
            </div>
          </>
        );

      case 'Alumni':
        return (
          <>
            <div style={styles.sectionLabel}>Alumni Details</div>
            <div style={styles.row}>
              <SelectField
                label="Branch"
                value={form.alumniBranch}
                onChange={handleChange}
                options={BRANCHES}
                placeholder="Select branch"
                focused={focusedField === 'alumniBranch'}
                onFocus={() => setFocusedField('alumniBranch')}
                onBlur={() => setFocusedField(null)}
                name="alumniBranch"
              />
              <SelectField
                label="Graduation Year"
                value={form.graduationYear}
                onChange={handleChange}
                options={Array.from({ length: 20 }, (_, i) => {
                  const y = currentYear - i;
                  return { value: String(y), label: String(y) };
                })}
                placeholder="Year"
                focused={focusedField === 'graduationYear'}
                onFocus={() => setFocusedField('graduationYear')}
                onBlur={() => setFocusedField(null)}
                name="graduationYear"
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Current Company (optional)</label>
              <input
                type="text"
                name="currentCompany"
                placeholder="e.g. Google"
                value={form.currentCompany}
                onChange={handleChange}
                onFocus={() => setFocusedField('currentCompany')}
                onBlur={() => setFocusedField(null)}
                style={inputStyle('currentCompany')}
              />
            </div>
          </>
        );

      case 'Organization':
        return (
          <>
            <div style={styles.sectionLabel}>Organization Details</div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                name="orgDescription"
                placeholder="Briefly describe the organization..."
                value={form.orgDescription}
                onChange={handleChange}
                onFocus={() => setFocusedField('orgDescription')}
                onBlur={() => setFocusedField(null)}
                rows={3}
                style={{
                  ...inputStyle('orgDescription'),
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.wrapper}>
      {showToast && (
        <div style={styles.successToast}>
          <CheckCircle2 size={20} color="#16a34a" />
          Registration successful! Redirecting to login...
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img src="/logo.png" alt="IITGN Connect" style={styles.logoIcon} />
          <span style={styles.logoText}>IITGN Connect</span>
        </div>
        <p style={styles.subtitle}>Join the campus community</p>

        <form style={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Username */}
          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Laksh Jain"
                value={form.name}
                onChange={handleChange}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                style={inputStyle('name')}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                name="username"
                placeholder="laksh_jain"
                value={form.username}
                onChange={handleChange}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                style={inputStyle('username')}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Email with OTP Verification */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="email"
                  name="email"
                  placeholder="yourname@iitgn.ac.in"
                  value={form.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputStyle('email'),
                    ...(emailVerified ? { borderColor: '#16a34a', boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.15)' } : {}),
                  }}
                  autoComplete="email"
                  disabled={emailVerified}
                />
                {emailVerified && (
                  <span style={{
                    position: 'absolute',
                    right: '0.6rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <CheckCircle2 size={18} color="#16a34a" />
                  </span>
                )}
              </div>
              {!emailVerified && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || otpCountdown > 0}
                  style={{
                    padding: '0.55rem 1rem',
                    background: (otpLoading || otpCountdown > 0)
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #4F46E5, #6366f1)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '2rem',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    cursor: (otpLoading || otpCountdown > 0) ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Shield size={14} />
                  {otpLoading ? 'Sending...' : otpCountdown > 0 ? `Resend in ${otpCountdown}s` : otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              )}
            </div>

            {emailVerified && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginTop: '0.35rem',
                padding: '0.3rem 0.7rem',
                background: '#f0fdf4',
                borderRadius: '2rem',
                width: 'fit-content',
                border: '1px solid #bbf7d0',
              }}>
                <CheckCircle2 size={14} color="#16a34a" />
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#15803d' }}>Verified</span>
              </div>
            )}

            {otpSent && !emailVerified && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(val);
                  }}
                  style={{
                    ...styles.input,
                    ...(focusedField === 'otp' ? styles.inputFocus : {}),
                    flex: 1,
                    textAlign: 'center',
                    letterSpacing: '0.5rem',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                  }}
                  onFocus={() => setFocusedField('otp')}
                  onBlur={() => setFocusedField(null)}
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpLoading}
                  style={{
                    padding: '0.55rem 1rem',
                    background: otpLoading
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #4F46E5, #6366f1)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '2rem',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    cursor: otpLoading ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {otpLoading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            )}

            {otpError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                marginTop: '0.35rem',
                color: '#dc2626',
                fontSize: '0.8rem',
              }}>
                <AlertCircle size={14} />
                <span>{otpError}</span>
              </div>
            )}
          </div>

          {/* Email warning */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.75rem', background: '#FEF3C7',
            border: '1px solid #FDE68A', borderRadius: '0.5rem',
            fontSize: '0.78rem', color: '#92400E',
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>Your email address cannot be changed after registration.</span>
          </div>

          {/* Password */}
          <div style={styles.row}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  style={{ ...inputStyle('password'), paddingRight: '2.5rem' }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={handleChange}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                style={inputStyle('confirmPassword')}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Member Type */}
          <SelectField
            label="Member Type"
            value={form.memberType}
            onChange={handleChange}
            options={MEMBER_TYPES}
            placeholder="Select your role"
            focused={focusedField === 'memberType'}
            onFocus={() => setFocusedField('memberType')}
            onBlur={() => setFocusedField(null)}
            name="memberType"
          />

          {/* Conditional Fields */}
          {renderConditionalFields()}

          <button
            type="submit"
            style={{
              ...styles.submitBtn,
              ...((loading || !emailVerified) ? styles.submitBtnDisabled : {}),
            }}
            disabled={loading || !emailVerified}
          >
            <UserPlus size={18} />
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
