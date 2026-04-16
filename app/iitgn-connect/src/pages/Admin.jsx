import { useState, useEffect } from 'react';
import { ShieldCheck, Users, FileText, MessageSquare, BarChart3, Trash2, Edit3, AlertTriangle } from 'lucide-react';
import { adminApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

const PRIMARY = '#4F46E5';

const typeBadge = {
  Admin: { bg: '#FEF2F2', color: '#DC2626' },
  Student: { bg: '#EEF2FF', color: '#4F46E5' },
  Professor: { bg: '#ECFEFF', color: '#0891B2' },
  Alumni: { bg: '#F0FDF4', color: '#65A30D' },
  Organization: { bg: '#F5F3FF', color: '#7C3AED' },
};

const mockAuditLog = [
  { id: 1, action: 'LOGIN', user: 'laksh_jain', details: 'Successful login', timestamp: '2026-03-16T08:30:00' },
  { id: 2, action: 'CREATE', user: 'laksh_jain', details: 'Created post #9', timestamp: '2026-03-16T09:00:00' },
  { id: 3, action: 'UPDATE', user: 'prof_yogesh', details: 'Updated course CS432 schedule', timestamp: '2026-03-16T09:15:00' },
  { id: 4, action: 'DELETE', user: 'admin_user', details: 'Deleted spam post #15', timestamp: '2026-03-16T09:30:00' },
  { id: 5, action: 'LOGIN', user: 'alumni_rahul', details: 'Successful login', timestamp: '2026-03-16T10:00:00' },
  { id: 6, action: 'CREATE', user: 'alumni_rahul', details: 'Created job posting #5', timestamp: '2026-03-16T10:05:00' },
  { id: 7, action: 'UPDATE', user: 'admin_user', details: 'Changed role for member #3', timestamp: '2026-03-16T10:30:00' },
  { id: 8, action: 'LOGIN', user: 'parthiv_p', details: 'Successful login', timestamp: '2026-03-16T11:00:00' },
];

const s = {
  container: { maxWidth: 1080, margin: '0 auto', padding: '32px 16px' },
  headerRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  heading: { fontSize: 28, fontWeight: 700, color: '#1E1B4B', margin: 0 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  denied: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: 400, gap: 16,
  },
  deniedText: { fontSize: 20, fontWeight: 700, color: '#991B1B' },
  deniedSub: { fontSize: 14, color: '#6B7280' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 },
  statCard: (color) => ({
    background: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    border: '1px solid #F3F4F6', borderLeft: `4px solid ${color}`,
  }),
  statNum: { fontSize: 36, fontWeight: 800, color: '#1E1B4B', margin: 0 },
  statLabel: { fontSize: 13, color: '#6B7280', fontWeight: 500, marginTop: 4 },
  section: { marginBottom: 36 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#1E1B4B', marginBottom: 14 },
  card: {
    background: '#fff', borderRadius: 12, overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    border: '1px solid #F3F4F6',
  },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: {
    textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600,
    color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5,
    borderBottom: '2px solid #E5E7EB', background: '#F9FAFB',
  },
  td: { padding: '10px 14px', fontSize: 14, color: '#374151', borderBottom: '1px solid #F3F4F6' },
  badge: (type) => {
    const b = typeBadge[type] || { bg: '#F3F4F6', color: '#6B7280' };
    return { display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: b.bg, color: b.color };
  },
  btnDanger: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 6, border: 'none',
    background: '#FEE2E2', color: '#DC2626', fontWeight: 600,
    fontSize: 12, cursor: 'pointer',
  },
  btnEdit: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 6, border: 'none',
    background: '#EEF2FF', color: PRIMARY, fontWeight: 600,
    fontSize: 12, cursor: 'pointer', marginRight: 6,
  },
  auditAction: (action) => {
    const colors = { LOGIN: '#059669', CREATE: '#4F46E5', UPDATE: '#D97706', DELETE: '#DC2626' };
    return {
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      background: (colors[action] || '#6B7280') + '18',
      color: colors[action] || '#6B7280',
    };
  },
};

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const [memberList, setMemberList] = useState([]);
  const [groupList, setGroupList] = useState([]);
  const [stats, setStats] = useState({ totalMembers: 0, totalPosts: 0, totalGroups: 0, totalPolls: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getStats(), adminApi.getMembers(), adminApi.getGroups()])
      .then(([statsData, membersData, groupsData]) => {
        setStats(statsData);
        setMemberList(membersData);
        setGroupList(groupsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!isAdmin) {
    return (
      <div style={s.container}>
        <div style={s.denied}>
          <AlertTriangle size={48} color="#DC2626" />
          <div style={s.deniedText}>Access Denied</div>
          <div style={s.deniedSub}>You do not have admin privileges to view this page.</div>
        </div>
      </div>
    );
  }

  const handleDeleteMember = (id) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      adminApi.deleteMember(id)
        .then(() => setMemberList(prev => prev.filter(m => m.MemberID !== id)))
        .catch(console.error);
    }
  };

  const handleEditRole = (id) => {
    const newType = window.prompt('Enter new member type (Student, Professor, Alumni, Organization):');
    if (newType && ['Student', 'Professor', 'Alumni', 'Organization'].includes(newType)) {
      adminApi.updateMember(id, { memberType: newType })
        .then(() => setMemberList(prev => prev.map(m => m.MemberID === id ? { ...m, MemberType: newType } : m)))
        .catch(console.error);
    }
  };

  const handleDeleteGroup = (id) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      adminApi.deleteGroup(id)
        .then(() => setGroupList(prev => prev.filter(g => g.GroupID !== id)))
        .catch(console.error);
    }
  };

  const formatDate = (dt) => new Date(dt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={s.container}>
      <div style={s.headerRow}>
        <ShieldCheck size={28} color={PRIMARY} />
        <div>
          <h1 style={s.heading}>Admin Dashboard</h1>
          <p style={s.subtitle}>Manage IITGN Connect platform</p>
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsGrid}>
        <div style={s.statCard(PRIMARY)}>
          <Users size={20} color={PRIMARY} />
          <div style={s.statNum}>{stats.totalMembers}</div>
          <div style={s.statLabel}>Total Members</div>
        </div>
        <div style={s.statCard('#059669')}>
          <FileText size={20} color="#059669" />
          <div style={s.statNum}>{stats.totalPosts}</div>
          <div style={s.statLabel}>Total Posts</div>
        </div>
        <div style={s.statCard('#D97706')}>
          <MessageSquare size={20} color="#D97706" />
          <div style={s.statNum}>{stats.totalGroups}</div>
          <div style={s.statLabel}>Total Groups</div>
        </div>
        <div style={s.statCard('#7C3AED')}>
          <BarChart3 size={20} color="#7C3AED" />
          <div style={s.statNum}>{stats.totalPolls}</div>
          <div style={s.statLabel}>Total Polls</div>
        </div>
      </div>

      {/* Member Management */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Member Management</h2>
        <div style={s.card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>ID</th>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Username</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Created</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {memberList.map(m => (
                  <tr key={m.MemberID}>
                    <td style={s.td}>{m.MemberID}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{m.Name}</td>
                    <td style={s.td}>@{m.Username}</td>
                    <td style={{ ...s.td, fontSize: 13 }}>{m.Email}</td>
                    <td style={s.td}><span style={s.badge(m.isAdmin ? 'Admin' : m.MemberType)}>{m.isAdmin ? 'Admin' : m.MemberType}</span></td>
                    <td style={{ ...s.td, fontSize: 13 }}>{m.CreatedAt}</td>
                    <td style={s.td}>
                      <button style={s.btnEdit} onClick={() => handleEditRole(m.MemberID)}>
                        <Edit3 size={12} /> Edit
                      </button>
                      {m.MemberID !== user?.MemberID && (
                        <button style={s.btnDanger} onClick={() => handleDeleteMember(m.MemberID)}>
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Group Management */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Group Management</h2>
        <div style={s.card}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>ID</th>
                <th style={s.th}>Name</th>
                <th style={s.th}>Description</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupList.map(g => (
                <tr key={g.GroupID}>
                  <td style={s.td}>{g.GroupID}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{g.Name}</td>
                  <td style={{ ...s.td, fontSize: 13, color: '#6B7280' }}>{g.Description}</td>
                  <td style={s.td}>
                    <button style={s.btnDanger} onClick={() => handleDeleteGroup(g.GroupID)}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Audit Log</h2>
        <div style={s.card}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Timestamp</th>
                <th style={s.th}>Action</th>
                <th style={s.th}>User</th>
                <th style={s.th}>Details</th>
              </tr>
            </thead>
            <tbody>
              {mockAuditLog.map(entry => (
                <tr key={entry.id}>
                  <td style={{ ...s.td, fontSize: 13, whiteSpace: 'nowrap' }}>{formatDate(entry.timestamp)}</td>
                  <td style={s.td}><span style={s.auditAction(entry.action)}>{entry.action}</span></td>
                  <td style={{ ...s.td, fontWeight: 600 }}>@{entry.user}</td>
                  <td style={{ ...s.td, color: '#6B7280', fontSize: 13 }}>{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
