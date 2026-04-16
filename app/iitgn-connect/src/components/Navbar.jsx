import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.navbar}>
      {/* Logo */}
      <div style={styles.logoSection} onClick={() => navigate('/')} role="button" tabIndex={0}>
        <img src="/logo.png" alt="IITGN Connect" style={styles.logoIcon} />
        <span style={styles.logoText}>IITGN Connect</span>
      </div>

      {/* Search */}
      <div style={styles.searchWrapper}>
        <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search people, groups, posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              navigate(`/members?q=${encodeURIComponent(searchQuery.trim())}`);
              setSearchQuery('');
            }
          }}
          style={styles.searchInput}
        />
      </div>

      {/* User Menu */}
      <div style={styles.userSection} ref={dropdownRef}>
        <div
          style={styles.avatarButton}
          onClick={() => setDropdownOpen((prev) => !prev)}
          role="button"
          tabIndex={0}
        >
          <div
            style={{
              ...styles.avatar,
              backgroundColor: user?.avatarColor || '#4F46E5',
            }}
          >
            {getInitials(user?.Name)}
          </div>
          <span style={styles.userName}>{user?.Name?.split(' ')[0]}</span>
          <ChevronDown size={16} color="#6B7280" />
        </div>

        {dropdownOpen && (
          <div style={styles.dropdown}>
            <div style={styles.dropdownHeader}>
              <div
                style={{
                  ...styles.avatar,
                  backgroundColor: user?.avatarColor || '#4F46E5',
                  width: 36,
                  height: 36,
                  fontSize: 14,
                }}
              >
                {getInitials(user?.Name)}
              </div>
              <div>
                <div style={styles.dropdownName}>{user?.Name}</div>
                <div style={styles.dropdownEmail}>{user?.Email}</div>
              </div>
            </div>
            <div style={styles.dropdownDivider} />
            <div
              style={styles.dropdownItem}
              onClick={() => { navigate(`/profile/${user?.MemberID}`); setDropdownOpen(false); }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <User size={16} color="#6B7280" />
              <span>Profile</span>
            </div>
            <div
              style={styles.dropdownItem}
              onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Settings size={16} color="#6B7280" />
              <span>Settings</span>
            </div>
            <div style={styles.dropdownDivider} />
            <div
              style={{ ...styles.dropdownItem, color: '#DC2626' }}
              onClick={handleLogout}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <LogOut size={16} color="#DC2626" />
              <span>Logout</span>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    padding: '0 24px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    userSelect: 'none',
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    objectFit: 'contain',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  searchWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: 480,
    margin: '0 32px',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    height: 40,
    padding: '0 16px 0 40px',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#F9FAFB',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  userSection: {
    position: 'relative',
  },
  avatarButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 10,
    transition: 'background-color 0.15s',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: 13,
    flexShrink: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 260,
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    padding: '8px 0',
    zIndex: 200,
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1F2937',
  },
  dropdownEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    margin: '4px 0',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: 14,
    color: '#374151',
    transition: 'background-color 0.15s',
  },
};
