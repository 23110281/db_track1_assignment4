import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Search, Mail, ArrowRight } from 'lucide-react';
import { membersApi } from '../api';

const PRIMARY = '#4F46E5';

const typeBadgeColors = {
  Student: { bg: '#EEF2FF', color: '#4F46E5' },
  Professor: { bg: '#ECFEFF', color: '#0891B2' },
  Alumni: { bg: '#F0FDF4', color: '#65A30D' },
  Organization: { bg: '#F5F3FF', color: '#7C3AED' },
};

const filterTabs = ['All', 'Students', 'Professors', 'Alumni', 'Organizations'];
const filterMap = { Students: 'Student', Professors: 'Professor', Alumni: 'Alumni', Organizations: 'Organization' };

const s = {
  container: { maxWidth: 1080, margin: '0 auto', padding: '32px 16px' },
  headerRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  heading: { fontSize: 28, fontWeight: 700, color: '#1E1B4B', margin: 0 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  controls: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#fff', border: '1px solid #D1D5DB', borderRadius: 10,
    padding: '8px 14px', flex: '1 1 280px', maxWidth: 400,
  },
  searchInput: {
    border: 'none', outline: 'none', fontSize: 14, flex: 1,
    background: 'transparent', color: '#1E1B4B',
  },
  tabs: { display: 'flex', gap: 0, flexWrap: 'wrap' },
  tab: (active) => ({
    padding: '7px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
    borderRadius: 8, border: 'none',
    background: active ? PRIMARY : '#F3F4F6',
    color: active ? '#fff' : '#6B7280',
    transition: 'all 0.2s', marginRight: 6, marginBottom: 4,
  }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  card: {
    background: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    border: '1px solid #F3F4F6', cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  },
  avatar: (color) => ({
    width: 64, height: 64, borderRadius: 99,
    background: color || PRIMARY,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 12,
  }),
  name: { fontSize: 16, fontWeight: 700, color: '#1E1B4B', margin: '0 0 2px' },
  username: { fontSize: 13, color: '#9CA3AF', marginBottom: 8 },
  badge: (type) => {
    const b = typeBadgeColors[type] || { bg: '#F3F4F6', color: '#6B7280' };
    return {
      display: 'inline-block', padding: '3px 12px', borderRadius: 99,
      fontSize: 12, fontWeight: 600, background: b.bg, color: b.color, marginBottom: 10,
    };
  },
  email: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280' },
  viewBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    marginTop: 12, fontSize: 13, fontWeight: 600, color: PRIMARY,
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  },
  empty: { textAlign: 'center', padding: 60, color: '#9CA3AF', fontSize: 15 },
  count: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
};

export default function Members() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [filter, setFilter] = useState('All');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const type = filterMap[filter] || 'All';
      const data = await membersApi.getAll(search, type);
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  // Sync search state when URL query param changes (from navbar search)
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q && q !== search) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchMembers]);

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={s.container}>
      <div style={s.headerRow}>
        <Users size={28} color={PRIMARY} />
        <div>
          <h1 style={s.heading}>Member Directory</h1>
          <p style={s.subtitle}>Browse and connect with IITGN community members</p>
        </div>
      </div>

      <div style={s.controls}>
        <div style={s.searchBox}>
          <Search size={16} color="#9CA3AF" />
          <input
            style={s.searchInput}
            placeholder="Search by name or username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={s.tabs}>
          {filterTabs.map(tab => (
            <button key={tab} style={s.tab(filter === tab)} onClick={() => setFilter(tab)}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={s.count}>{members.length} member{members.length !== 1 ? 's' : ''} found</div>

      {loading ? (
        <div style={s.empty}>Loading members...</div>
      ) : members.length === 0 ? (
        <div style={s.empty}>No members found matching your search.</div>
      ) : (
        <div style={s.grid}>
          {members.map(m => (
            <div
              key={m.MemberID}
              style={s.card}
              onClick={() => navigate(`/profile/${m.MemberID}`)}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)'; }}
            >
              <div style={s.avatar(m.avatarColor)}>
                {getInitials(m.Name)}
              </div>
              <h3 style={s.name}>{m.Name}</h3>
              <div style={s.username}>@{m.Username}</div>
              <span style={s.badge(m.MemberType)}>{m.MemberType}</span>
              <div style={s.email}>
                <Mail size={13} />
                {m.Email}
              </div>
              <button style={s.viewBtn}>
                View Profile <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
