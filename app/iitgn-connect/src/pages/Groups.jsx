import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Check, Search, Shield, Plus, Lock, Clock, X } from 'lucide-react';
import { groupsApi } from '../api';

/* ── styles ── */
const s = {
  page: { maxWidth: 900, margin: '0 auto' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: { fontSize: 26, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#fff',
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    padding: '8px 14px',
    width: 240,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: 14,
    color: '#374151',
    flex: 1,
    background: 'transparent',
    fontFamily: 'inherit',
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 18px',
    background: '#4F46E5',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    transition: 'box-shadow 0.2s, transform 0.2s',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
  },
  cardHover: {
    boxShadow: '0 4px 16px rgba(79,70,229,0.13)',
    transform: 'translateY(-2px)',
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    marginBottom: 14,
    flexShrink: 0,
  },
  groupNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  groupName: {
    fontSize: 17,
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.3,
  },
  restrictedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    background: '#FEF3C7',
    color: '#D97706',
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 6,
    flexShrink: 0,
  },
  groupDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 1.5,
    marginBottom: 16,
    flex: 1,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 'auto',
  },
  memberCount: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#6b7280',
    fontWeight: 500,
  },
  adminTag: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  joinBtn: {
    padding: '8px 20px',
    borderRadius: 10,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.15s',
    marginTop: 14,
  },
  joinBtnDefault: { background: '#4F46E5', color: '#fff' },
  joinBtnJoined: { background: '#D1FAE5', color: '#059669', cursor: 'default' },
  joinBtnPending: { background: '#FEF3C7', color: '#D97706', cursor: 'default' },
  empty: { fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: 40 },
  // Modal
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 16, padding: 32,
    width: 460, maxWidth: '90vw', position: 'relative',
  },
  modalTitle: {
    fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 20px',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  modalClose: {
    position: 'absolute', top: 16, right: 16, background: 'none',
    border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4,
  },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
    borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
    borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    resize: 'vertical', minHeight: 80, boxSizing: 'border-box',
  },
  checkboxRow: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    background: '#F9FAFB', borderRadius: 10, cursor: 'pointer',
  },
  checkboxLabel: { fontSize: 14, fontWeight: 500, color: '#374151' },
  checkboxHint: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  submitBtn: {
    width: '100%', padding: '12px', background: '#4F46E5', color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', marginTop: 8,
  },
};

export default function Groups() {
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', isRestricted: false });
  const [creating, setCreating] = useState(false);

  const fetchGroups = useCallback(async (search = '') => {
    try {
      const data = await groupsApi.getAll(search);
      setGroups(data);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchGroups(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchGroups]);

  const handleJoinLeave = async (e, groupId, isMember, isPending) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending) return;
    try {
      if (isMember) {
        await groupsApi.leave(groupId);
      } else {
        await groupsApi.join(groupId);
      }
      await fetchGroups(searchTerm);
    } catch (err) {
      console.error('Failed to join/leave group:', err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;
    setCreating(true);
    try {
      await groupsApi.create(newGroup);
      setShowModal(false);
      setNewGroup({ name: '', description: '', isRestricted: false });
      await fetchGroups(searchTerm);
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>
          <Users size={24} color="#4F46E5" /> Campus Groups
        </h1>
        <div style={s.headerRight}>
          <div style={s.searchWrap}>
            <Search size={16} color="#9ca3af" />
            <input
              style={s.searchInput}
              placeholder="Search groups..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button style={s.createBtn} onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Group
          </button>
        </div>
      </div>

      {loading ? (
        <p style={s.empty}>Loading groups...</p>
      ) : groups.length === 0 ? (
        <p style={s.empty}>No groups found.</p>
      ) : (
        <div style={s.grid}>
          {groups.map(group => {
            const count = group.memberCount || 0;
            const joined = group.isMember;
            const pending = group.isPending;

            return (
              <Link
                key={group.GroupID}
                to={`/groups/${group.GroupID}`}
                style={{
                  ...s.card,
                  ...(hoveredCard === group.GroupID ? s.cardHover : {}),
                }}
                onMouseEnter={() => setHoveredCard(group.GroupID)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={s.groupIcon}>
                  <Users size={22} />
                </div>
                <div style={s.groupNameRow}>
                  <div style={s.groupName}>{group.Name}</div>
                  {group.IsRestricted && (
                    <span style={s.restrictedBadge}>
                      <Lock size={10} /> Restricted
                    </span>
                  )}
                </div>
                <div style={s.groupDesc}>{group.Description}</div>

                <div style={s.metaRow}>
                  <div style={s.memberCount}>
                    <Users size={14} />
                    {count} member{count !== 1 ? 's' : ''}
                  </div>
                  {group.AdminName && (
                    <div style={s.adminTag}>
                      <Shield size={12} />
                      {group.AdminName.split(' ')[0]}
                    </div>
                  )}
                </div>

                <button
                  style={{
                    ...s.joinBtn,
                    ...(joined ? s.joinBtnJoined : pending ? s.joinBtnPending : s.joinBtnDefault),
                  }}
                  onClick={(e) => handleJoinLeave(e, group.GroupID, joined, pending)}
                  onMouseEnter={e => {
                    if (!joined && !pending) e.currentTarget.style.background = '#4338CA';
                  }}
                  onMouseLeave={e => {
                    if (!joined && !pending) e.currentTarget.style.background = '#4F46E5';
                  }}
                >
                  {joined ? (
                    <><Check size={14} /> Joined</>
                  ) : pending ? (
                    <><Clock size={14} /> Pending Approval</>
                  ) : (
                    <><UserPlus size={14} /> Join Group</>
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <button style={s.modalClose} onClick={() => setShowModal(false)}>
              <X size={20} />
            </button>
            <h2 style={s.modalTitle}>
              <Plus size={20} color="#4F46E5" /> Create New Group
            </h2>
            <form onSubmit={handleCreateGroup}>
              <div style={s.formGroup}>
                <label style={s.label}>Group Name *</label>
                <input
                  style={s.input}
                  placeholder="e.g. CS432 Study Group"
                  value={newGroup.name}
                  onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                  required
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Description</label>
                <textarea
                  style={s.textarea}
                  placeholder="What is this group about?"
                  value={newGroup.description}
                  onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                />
              </div>
              <div style={s.formGroup}>
                <label
                  style={s.checkboxRow}
                  onClick={() => setNewGroup({ ...newGroup, isRestricted: !newGroup.isRestricted })}
                >
                  <input
                    type="checkbox"
                    checked={newGroup.isRestricted}
                    onChange={() => {}}
                    style={{ width: 18, height: 18, accentColor: '#4F46E5' }}
                  />
                  <div>
                    <div style={s.checkboxLabel}>
                      <Lock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Restricted Group
                    </div>
                    <div style={s.checkboxHint}>
                      Members will need your approval before joining
                    </div>
                  </div>
                </label>
              </div>
              <button
                type="submit"
                style={{ ...s.submitBtn, opacity: creating ? 0.7 : 1 }}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
