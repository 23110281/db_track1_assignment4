import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Users, Shield, UserCog, User, ArrowLeft, Calendar, Lock, Check, X, Clock,
  MoreVertical, Edit3, Trash2, LogOut, UserX, ShieldCheck,
} from 'lucide-react';
import { groupsApi, postsApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';

/* ── helpers ── */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0].toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const roleIcon = {
  Admin: Shield,
  Moderator: UserCog,
  Member: User,
};
const roleBadgeColor = {
  Admin: { bg: '#FEF3C7', text: '#D97706' },
  Moderator: { bg: '#EDE9FE', text: '#7C3AED' },
  Member: { bg: '#F3F4F6', text: '#6b7280' },
};

/* ── styles ── */
const s = {
  page: { maxWidth: 800, margin: '0 auto' },
  backLink: {
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14,
    color: '#4F46E5', textDecoration: 'none', fontWeight: 600, marginBottom: 16,
  },
  headerCard: {
    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    borderRadius: 16, padding: 32, color: '#fff', marginBottom: 24,
    position: 'relative', overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.07,
    backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)',
    backgroundSize: '60px 60px',
  },
  headerContent: { position: 'relative', zIndex: 1 },
  headerTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  groupName: { fontSize: 28, fontWeight: 800, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  restrictedBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'rgba(255,255,255,0.2)', padding: '4px 10px',
    borderRadius: 8, fontSize: 12, fontWeight: 600,
  },
  groupDesc: { fontSize: 15, opacity: 0.9, lineHeight: 1.6, marginBottom: 20 },
  headerMeta: {
    display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', fontSize: 14, opacity: 0.9,
  },
  headerMetaItem: { display: 'flex', alignItems: 'center', gap: 6 },
  section: {
    background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: 24, marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 16px',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  memberRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
    borderBottom: '1px solid #f3f4f6', position: 'relative',
  },
  memberAvatar: {
    width: 38, height: 38, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#fff',
    fontWeight: 700, fontSize: 14, flexShrink: 0,
  },
  memberName: { fontSize: 14, fontWeight: 600, color: '#111827', textDecoration: 'none' },
  memberUsername: { fontSize: 12, color: '#9ca3af' },
  roleBadge: {
    marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
  },
  empty: { fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: 24 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' },
  // Pending requests
  pendingCard: {
    background: '#FEF3C7', border: '1.5px solid #FCD34D', borderRadius: 16,
    padding: 20, marginBottom: 24,
  },
  pendingTitle: {
    fontSize: 16, fontWeight: 700, color: '#92400E', margin: '0 0 14px',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  pendingRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #FDE68A',
  },
  pendingActions: { marginLeft: 'auto', display: 'flex', gap: 8 },
  approveBtn: {
    padding: '6px 14px', background: '#059669', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4,
  },
  rejectBtn: {
    padding: '6px 14px', background: '#DC2626', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4,
  },
  // 3-dot menu
  menuBtn: {
    background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
    padding: 6, cursor: 'pointer', color: '#fff', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  menuBtnDark: {
    background: 'transparent', border: 'none', padding: 4, cursor: 'pointer',
    color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6,
  },
  dropdown: {
    position: 'absolute', top: '100%', right: 0, background: '#fff',
    borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    padding: 6, zIndex: 100, minWidth: 180, marginTop: 4,
  },
  dropdownItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    fontSize: 13, fontWeight: 500, color: '#374151', border: 'none',
    background: 'none', width: '100%', cursor: 'pointer', borderRadius: 8,
    textAlign: 'left',
  },
  dropdownDanger: { color: '#DC2626' },
  // Edit modal
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 16, padding: 32, width: 460,
    maxWidth: '90vw', position: 'relative',
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

export default function GroupDetail() {
  const { groupId } = useParams();
  const gid = Number(groupId);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupPosts, setGroupPosts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Menu states
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [memberMenuOpen, setMemberMenuOpen] = useState(null); // MemberID or null
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '', isRestricted: false });
  const [saving, setSaving] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      const data = await groupsApi.getOne(gid);
      setGroup(data);
      setGroupMembers(
        (data.members || []).sort((a, b) => {
          const order = { Admin: 0, Moderator: 1, Member: 2 };
          return (order[a.Role] ?? 2) - (order[b.Role] ?? 2);
        })
      );
    } catch (err) {
      console.error('Failed to fetch group:', err);
      setNotFound(true);
    }
  }, [gid]);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await groupsApi.getPosts(gid);
      setGroupPosts(data);
    } catch (err) {
      console.error('Failed to fetch group posts:', err);
    }
  }, [gid]);

  const fetchPending = useCallback(async () => {
    try {
      const data = await groupsApi.getPending(gid);
      setPendingRequests(data);
    } catch {
      setPendingRequests([]);
    }
  }, [gid]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchGroup(), fetchPosts(), fetchPending()]);
      setLoading(false);
    }
    load();
  }, [fetchGroup, fetchPosts, fetchPending]);

  // Close menus on outside click
  useEffect(() => {
    const handler = () => { setGroupMenuOpen(false); setMemberMenuOpen(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const isAdmin = currentUser && group && group.AdminID === currentUser.MemberID;
  const isMember = group?.isMember;

  const handleApprove = async (memberId) => {
    await groupsApi.approve(gid, memberId);
    await Promise.all([fetchGroup(), fetchPending()]);
  };

  const handleReject = async (memberId) => {
    await groupsApi.reject(gid, memberId);
    await fetchPending();
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    await groupsApi.leave(gid);
    navigate('/groups');
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? This cannot be undone.')) return;
    await groupsApi.delete(gid);
    navigate('/groups');
  };

  const openEditModal = () => {
    setEditData({
      name: group.Name,
      description: group.Description || '',
      isRestricted: group.IsRestricted,
    });
    setEditModalOpen(true);
    setGroupMenuOpen(false);
  };

  const handleEditGroup = async (e) => {
    e.preventDefault();
    if (!editData.name.trim()) return;
    setSaving(true);
    try {
      await groupsApi.update(gid, editData);
      setEditModalOpen(false);
      await fetchGroup();
    } catch (err) {
      console.error('Failed to update group:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleKickMember = async (memberId, name) => {
    if (!confirm(`Remove ${name} from this group?`)) return;
    await groupsApi.kick(gid, memberId);
    await fetchGroup();
    setMemberMenuOpen(null);
  };

  const handleMakeAdmin = async (memberId, name) => {
    if (!confirm(`Transfer admin role to ${name}? You will become a regular member.`)) return;
    await groupsApi.makeAdmin(gid, memberId);
    await fetchGroup();
    setMemberMenuOpen(null);
  };

  if (loading) {
    return (
      <div style={s.page}>
        <Link to="/groups" style={s.backLink}><ArrowLeft size={16} /> Back to Groups</Link>
        <div style={s.section}><p style={s.empty}>Loading...</p></div>
      </div>
    );
  }

  if (notFound || !group) {
    return (
      <div style={s.page}>
        <Link to="/groups" style={s.backLink}><ArrowLeft size={16} /> Back to Groups</Link>
        <div style={s.section}><p style={s.empty}>Group not found.</p></div>
      </div>
    );
  }

  const handleNewPost = async (content, imageUrl) => {
    await postsApi.create(content, gid, imageUrl);
    await fetchPosts();
  };

  return (
    <div style={s.page}>
      <Link to="/groups" style={s.backLink}><ArrowLeft size={16} /> Back to Groups</Link>

      {/* Group Header */}
      <div style={s.headerCard}>
        <div style={s.headerPattern} />
        <div style={s.headerContent}>
          <div style={s.headerTopRow}>
            <h1 style={s.groupName}>
              {group.Name}
              {group.IsRestricted && (
                <span style={s.restrictedBadge}><Lock size={12} /> Restricted</span>
              )}
            </h1>
            {/* 3-dot menu for group actions */}
            {isMember && (
              <div style={{ position: 'relative' }}>
                <button
                  style={s.menuBtn}
                  onClick={e => { e.stopPropagation(); setGroupMenuOpen(!groupMenuOpen); }}
                >
                  <MoreVertical size={20} />
                </button>
                {groupMenuOpen && (
                  <div style={s.dropdown} onClick={e => e.stopPropagation()}>
                    {isAdmin && (
                      <button
                        style={s.dropdownItem}
                        onClick={openEditModal}
                        onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <Edit3 size={15} /> Edit Group
                      </button>
                    )}
                    <button
                      style={{ ...s.dropdownItem, ...s.dropdownDanger }}
                      onClick={handleLeaveGroup}
                      onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <LogOut size={15} /> Leave Group
                    </button>
                    {isAdmin && (
                      <button
                        style={{ ...s.dropdownItem, ...s.dropdownDanger }}
                        onClick={handleDeleteGroup}
                        onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <Trash2 size={15} /> Delete Group
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <p style={s.groupDesc}>{group.Description}</p>
          <div style={s.headerMeta}>
            <div style={s.headerMetaItem}>
              <Users size={16} />
              {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}
            </div>
            {group.AdminName && (
              <div style={s.headerMetaItem}>
                <Shield size={16} /> Admin: {group.AdminName}
              </div>
            )}
            <div style={s.headerMetaItem}>
              <Calendar size={16} /> Created {formatDate(group.CreatedAt || '2025-01-01')}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Requests (admin only) */}
      {isAdmin && pendingRequests.length > 0 && (
        <div style={s.pendingCard}>
          <h3 style={s.pendingTitle}>
            <Clock size={18} /> Pending Join Requests ({pendingRequests.length})
          </h3>
          {pendingRequests.map(req => (
            <div key={req.MemberID} style={s.pendingRow}>
              <div style={{ ...s.memberAvatar, backgroundColor: req.avatarColor || '#4F46E5' }}>
                {getInitials(req.Name)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#92400E' }}>{req.Name}</div>
                <div style={{ fontSize: 12, color: '#B45309' }}>@{req.Username} · {req.MemberType}</div>
              </div>
              <div style={s.pendingActions}>
                <button style={s.approveBtn} onClick={() => handleApprove(req.MemberID)}>
                  <Check size={13} /> Approve
                </button>
                <button style={s.rejectBtn} onClick={() => handleReject(req.MemberID)}>
                  <X size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div style={s.twoCol}>
        {/* Feed Column */}
        <div>
          {isMember && <CreatePost user={currentUser} onPost={handleNewPost} />}

          {!isMember && (
            <div style={s.section}>
              <p style={s.empty}>
                {group.isPending
                  ? 'Your join request is pending admin approval.'
                  : 'Join this group to see posts and participate.'}
              </p>
            </div>
          )}

          {isMember && groupPosts.length === 0 && (
            <div style={s.section}>
              <p style={s.empty}>No posts in this group yet. Be the first to post!</p>
            </div>
          )}

          {isMember && groupPosts.map(post => (
            <PostCard
              key={post.PostID}
              post={post}
              onPostUpdated={(id, newContent) => {
                setGroupPosts(prev => prev.map(p => p.PostID === id ? { ...p, Content: newContent } : p));
              }}
              onPostDeleted={(id) => {
                setGroupPosts(prev => prev.filter(p => p.PostID !== id));
              }}
            />
          ))}
        </div>

        {/* Members Sidebar */}
        <div style={s.section}>
          <h3 style={s.sectionTitle}>
            <Users size={18} color="#4F46E5" /> Members
          </h3>
          {groupMembers.map((member) => {
            const RoleIcon = roleIcon[member.Role] || User;
            const colors = roleBadgeColor[member.Role] || roleBadgeColor.Member;
            const isCurrentUser = currentUser && member.MemberID === currentUser.MemberID;
            const showMemberMenu = isAdmin && !isCurrentUser;

            return (
              <div key={member.MemberID} style={s.memberRow}>
                <div style={{ ...s.memberAvatar, backgroundColor: member.avatarColor || '#4F46E5' }}>
                  {getInitials(member.Name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/profile/${member.MemberID}`} style={s.memberName}>
                    {member.Name}
                  </Link>
                  <div style={s.memberUsername}>@{member.Username}</div>
                </div>
                <span style={{ ...s.roleBadge, background: colors.bg, color: colors.text }}>
                  <RoleIcon size={12} />
                  {member.Role}
                </span>
                {/* 3-dot menu for member actions (admin only, not on self) */}
                {showMemberMenu && (
                  <div style={{ position: 'relative' }}>
                    <button
                      style={s.menuBtnDark}
                      onClick={e => {
                        e.stopPropagation();
                        setMemberMenuOpen(memberMenuOpen === member.MemberID ? null : member.MemberID);
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {memberMenuOpen === member.MemberID && (
                      <div
                        style={{ ...s.dropdown, right: 0, top: '100%' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          style={s.dropdownItem}
                          onClick={() => handleMakeAdmin(member.MemberID, member.Name)}
                          onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <ShieldCheck size={15} color="#D97706" /> Make Admin
                        </button>
                        <button
                          style={{ ...s.dropdownItem, ...s.dropdownDanger }}
                          onClick={() => handleKickMember(member.MemberID, member.Name)}
                          onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <UserX size={15} /> Kick Out
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {groupMembers.length === 0 && (
            <p style={s.empty}>No members yet.</p>
          )}
        </div>
      </div>

      {/* Edit Group Modal */}
      {editModalOpen && (
        <div style={s.overlay} onClick={() => setEditModalOpen(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <button style={s.modalClose} onClick={() => setEditModalOpen(false)}>
              <X size={20} />
            </button>
            <h2 style={s.modalTitle}>
              <Edit3 size={20} color="#4F46E5" /> Edit Group
            </h2>
            <form onSubmit={handleEditGroup}>
              <div style={s.formGroup}>
                <label style={s.label}>Group Name *</label>
                <input
                  style={s.input}
                  value={editData.name}
                  onChange={e => setEditData({ ...editData, name: e.target.value })}
                  required
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Description</label>
                <textarea
                  style={s.textarea}
                  value={editData.description}
                  onChange={e => setEditData({ ...editData, description: e.target.value })}
                />
              </div>
              <div style={s.formGroup}>
                <label
                  style={s.checkboxRow}
                  onClick={() => setEditData({ ...editData, isRestricted: !editData.isRestricted })}
                >
                  <input
                    type="checkbox"
                    checked={editData.isRestricted}
                    onChange={() => {}}
                    style={{ width: 18, height: 18, accentColor: '#4F46E5' }}
                  />
                  <div>
                    <div style={s.checkboxLabel}>
                      <Lock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Restricted Group
                    </div>
                    <div style={s.checkboxHint}>Members will need your approval before joining</div>
                  </div>
                </label>
              </div>
              <button
                type="submit"
                style={{ ...s.submitBtn, opacity: saving ? 0.7 : 1 }}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
