import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Eye, EyeOff, GraduationCap, AlertCircle, Info } from 'lucide-react';

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
    maxWidth: '420px',
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
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.8rem',
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
    padding: '0.7rem 0.9rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '0.6rem',
    fontSize: '0.95rem',
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
    marginTop: '0.5rem',
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
  hintBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    padding: '0.7rem 0.9rem',
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '0.6rem',
    color: '#0369a1',
    fontSize: '0.78rem',
    lineHeight: '1.5',
    width: '100%',
    boxSizing: 'border-box',
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
};

export default function Login() {
  const savedCreds = JSON.parse(localStorage.getItem('savedCredentials') || 'null');
  const [username, setUsername] = useState(savedCreds?.username || '');
  const [password, setPassword] = useState(savedCreds?.password || '');
  const [rememberMe, setRememberMe] = useState(!!savedCreds);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (result.success) {
        if (rememberMe) {
          localStorage.setItem('savedCredentials', JSON.stringify({ username: username.trim(), password }));
        } else {
          localStorage.removeItem('savedCredentials');
        }
        navigate('/');
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    ...styles.input,
    ...(focusedField === field ? styles.inputFocus : {}),
  });

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img src="/logo.png" alt="IITGN Connect" style={styles.logoIcon} />
          <span style={styles.logoText}>IITGN Connect</span>
        </div>
        <p style={styles.subtitle}>Sign in to your campus community</p>

        <form style={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Username or Email</label>
            <input
              type="text"
              placeholder="e.g. laksh_jain or name@iitgn.ac.in"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle('username')}
              autoComplete="username"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle('password'), paddingRight: '2.5rem' }}
                autoComplete="current-password"
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
              <label htmlFor="rememberMe" style={{ fontSize: '0.85rem', color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                Remember me
              </label>
            </div>
            <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            style={{
              ...styles.submitBtn,
              ...(loading ? styles.submitBtnDisabled : {}),
            }}
            disabled={loading}
          >
            <LogIn size={18} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div style={styles.hintBox}>
            <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong>Demo credentials</strong><br />
              Users: <code>laksh_jain</code>, <code>prof_yogesh</code>, <code>alumni_rahul</code>, <code>admin_user</code><br />
              Password: <code>password123</code>
            </div>
          </div>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
