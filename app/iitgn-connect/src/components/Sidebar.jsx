import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  UserCircle,
  Users,
  Briefcase,
  BarChart3,
  Flame,
  Contact,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'My Profile', path: '/profile', icon: UserCircle },
  { label: 'Groups', path: '/groups', icon: Users },
  { label: 'Jobs', path: '/jobs', icon: Briefcase },
  { label: 'Polls', path: '/polls', icon: BarChart3 },
  { label: 'Attendance Streaks', path: '/attendance', icon: Flame },
  { label: 'Members', path: '/members', icon: Contact },
];

const roleBadgeColors = {
  Admin: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  Student: { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' },
  Professor: { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
  Alumni: { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
  Organization: { bg: '#FDF4FF', text: '#A855F7', border: '#E9D5FF' },
};

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const memberType = user?.MemberType || 'Student';
  const displayRole = user?.role === 'Admin' ? 'Admin' : memberType;
  const badge = roleBadgeColors[displayRole] || roleBadgeColors.Student;

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/profile') return location.pathname.startsWith('/profile');
    return location.pathname.startsWith(path);
  };

  return (
    <aside style={styles.sidebar}>
      {/* User Card */}
      <div style={styles.userCard}>
        <div
          style={{
            ...styles.avatar,
            backgroundColor: user?.avatarColor || '#4F46E5',
          }}
        >
          {getInitials(user?.Name)}
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userName}>{user?.Name}</div>
          <div
            style={{
              ...styles.roleBadge,
              backgroundColor: badge.bg,
              color: badge.text,
              border: `1px solid ${badge.border}`,
            }}
          >
            {displayRole}
          </div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Navigation Links */}
      <nav style={styles.nav}>
        {navItems.filter(item => {
          // Hide Jobs for Professors and Organizations
          if (item.path === '/jobs' && (memberType === 'Professor' || memberType === 'Organization')) return false;
          if (item.path === '/attendance' && (memberType === 'Alumni' || memberType === 'Professor')) return false;
          return true;
        }).map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const dest = item.path === '/profile' ? `/profile/${user?.MemberID}` : item.path;
          return (
            <div
              key={item.path}
              style={{
                ...styles.navItem,
                backgroundColor: active ? '#EEF2FF' : 'transparent',
                color: active ? '#4F46E5' : '#4B5563',
                fontWeight: active ? 600 : 400,
              }}
              onClick={() => navigate(dest)}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'transparent';
              }}
              role="button"
              tabIndex={0}
            >
              <Icon size={20} color={active ? '#4F46E5' : '#9CA3AF'} />
              <span>{item.label}</span>
            </div>
          );
        })}

        {user?.role === 'Admin' && (
          <>
            <div style={styles.divider} />
            <div
              style={{
                ...styles.navItem,
                backgroundColor: isActive('/admin') ? '#EEF2FF' : 'transparent',
                color: isActive('/admin') ? '#4F46E5' : '#4B5563',
                fontWeight: isActive('/admin') ? 600 : 400,
              }}
              onClick={() => navigate('/admin')}
              onMouseEnter={(e) => {
                if (!isActive('/admin')) e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                if (!isActive('/admin')) e.currentTarget.style.backgroundColor = 'transparent';
              }}
              role="button"
              tabIndex={0}
            >
              <ShieldCheck size={20} color={isActive('/admin') ? '#4F46E5' : '#9CA3AF'} />
              <span>Admin Dashboard</span>
            </div>
            <div
              style={{
                ...styles.navItem,
                backgroundColor: isActive('/query-console') ? '#EEF2FF' : 'transparent',
                color: isActive('/query-console') ? '#4F46E5' : '#4B5563',
                fontWeight: isActive('/query-console') ? 600 : 400,
              }}
              onClick={() => navigate('/query-console')}
              onMouseEnter={(e) => {
                if (!isActive('/query-console')) e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                if (!isActive('/query-console')) e.currentTarget.style.backgroundColor = 'transparent';
              }}
              role="button"
              tabIndex={0}
            >
              <Terminal size={20} color={isActive('/query-console') ? '#4F46E5' : '#9CA3AF'} />
              <span>SQL Console</span>
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div style={styles.footer}>
        <span style={styles.footerText}>IITGN Connect v1.0</span>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 250,
    minWidth: 250,
    height: 'calc(100vh - 60px)',
    backgroundColor: '#F9FAFB',
    borderRight: '1px solid #E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 60,
    left: 0,
    overflowY: 'auto',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '20px 16px 12px',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: 15,
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1F2937',
  },
  roleBadge: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 20,
    width: 'fit-content',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    margin: '8px 16px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '4px 8px',
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'background-color 0.15s',
    userSelect: 'none',
  },
  footer: {
    padding: '12px 16px',
    borderTop: '1px solid #E5E7EB',
  },
  footerText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
};
