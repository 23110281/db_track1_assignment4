import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Mail, Phone, Calendar, GraduationCap, Building2, Briefcase, BadgeCheck,
  BookOpen, Home, ThumbsUp, ThumbsDown, User, Users, Clock, Award,
  Plus, Pencil, Trash2, X, Check, MoreVertical,
} from 'lucide-react';
import { profileApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

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

const badgeColors = {
  Student: { bg: '#EEF2FF', text: '#4F46E5' },
  Professor: { bg: '#FEF3C7', text: '#D97706' },
  Alumni: { bg: '#D1FAE5', text: '#059669' },
  Organization: { bg: '#FCE7F3', text: '#DB2777' },
};

/* ── styles ── */
const s = {
  page: { maxWidth: 800, margin: '0 auto' },
  banner: {
    height: 180,
    borderRadius: '16px 16px 0 0',
    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #A855F7 100%)',
    position: 'relative',
  },
  card: {
    background: '#fff',
    borderRadius: '0 0 16px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    padding: '0 32px 32px',
    marginBottom: 24,
    position: 'relative',
  },
  avatarWrap: {
    position: 'absolute',
    top: -52,
    left: 32,
    width: 104,
    height: 104,
    borderRadius: '50%',
    border: '4px solid #fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 800,
    fontSize: 36,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  nameRow: {
    paddingTop: 64,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  name: { fontSize: 26, fontWeight: 700, color: '#111827', margin: 0 },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
  },
  username: { fontSize: 15, color: '#6b7280', marginTop: 2 },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 16,
    marginTop: 20,
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
    color: '#374151',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: '#EEF2FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4F46E5',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  section: {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    padding: 24,
    marginBottom: 24,
  },
  claimCard: {
    background: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  claimQ: { fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 6 },
  claimA: { fontSize: 14, color: '#6b7280', marginBottom: 12, fontStyle: 'italic' },
  voteRow: { display: 'flex', alignItems: 'center', gap: 16 },
  voteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 8,
    border: '1.5px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    transition: 'all 0.15s',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    color: '#059669',
    fontSize: 13,
    fontWeight: 600,
  },
  empty: { fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: 24 },
  subtypeCard: {
    background: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  subtypeTitle: { fontSize: 14, fontWeight: 700, color: '#4F46E5', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
};

export default function Profile() {
  const { memberId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const id = memberId ? Number(memberId) : user?.MemberID;
  const isOwnProfile = user && id === user.MemberID;

  const [profile, setProfile] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editResponse, setEditResponse] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([profileApi.get(id), profileApi.getClaims(id)])
      .then(([profileData, claimsData]) => {
        setProfile(profileData);
        setClaims(claimsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.section}>
          <p style={s.empty}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={s.page}>
        <div style={s.section}>
          <p style={s.empty}>Member not found.</p>
        </div>
      </div>
    );
  }

  const colors = badgeColors[profile.MemberType] || badgeColors.Student;

  const handleCreateClaim = () => {
    const q = newQuestion.trim();
    const r = newResponse.trim();
    if (!q || !r) return;
    profileApi.createClaim(id, { questionText: q, userResponse: r })
      .then(() => profileApi.getClaims(id))
      .then(claimsData => setClaims(claimsData))
      .catch(console.error);
    setNewQuestion('');
    setNewResponse('');
    setShowCreateForm(false);
  };

  const handleDeleteClaim = (claimId) => {
    profileApi.deleteClaim(claimId)
      .then(() => setClaims(prev => prev.filter(c => c.ClaimID !== claimId)))
      .catch(console.error);
  };

  const startEdit = (claim) => {
    setEditingId(claim.ClaimID);
    setEditQuestion(claim.QuestionText);
    setEditResponse(claim.UserResponse);
  };

  const handleSaveEdit = (claimId) => {
    const q = editQuestion.trim();
    const r = editResponse.trim();
    if (!q || !r) return;
    profileApi.updateClaim(claimId, { questionText: q, userResponse: r })
      .then(() => {
        setClaims(prev => prev.map(c =>
          c.ClaimID === claimId ? { ...c, QuestionText: q, UserResponse: r } : c
        ));
        setEditingId(null);
      })
      .catch(console.error);
  };

  const handleVote = (claimId, isAgree) => {
    profileApi.voteClaim(claimId, isAgree)
      .then(() => profileApi.getClaims(id))
      .then(claimsData => setClaims(claimsData))
      .catch(console.error);
  };

  // Recent posts from profile
  const memberPosts = (profile.posts || [])
    .slice()
    .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));

  return (
    <div style={s.page}>
      {/* Banner + Profile Header Card */}
      <div style={s.banner}>
        <div style={{
          position: 'absolute', bottom: 16, right: 24,
          fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500,
        }}>
          IITGN Connect
        </div>
      </div>
      <div style={s.card}>
        <div style={{ ...s.avatarWrap, backgroundColor: profile.avatarColor || '#4F46E5' }}>
          {getInitials(profile.Name)}
        </div>

        <div style={s.nameRow}>
          <h1 style={s.name}>{profile.Name}</h1>
          <span style={{ ...s.badge, background: colors.bg, color: colors.text }}>
            {profile.MemberType}
          </span>
          {profile.MemberType === 'Alumni' && profile.Verified && (
            <span style={s.verifiedBadge}>
              <BadgeCheck size={16} /> Verified
            </span>
          )}
        </div>
        <div style={s.username}>@{profile.Username}</div>

        {/* Basic info grid */}
        <div style={s.infoGrid}>
          {profile.Email && (
            <div style={s.infoItem}>
              <div style={s.iconWrap}><Mail size={16} /></div>
              <span>{profile.Email}</span>
            </div>
          )}
          {profile.ContactNumber && (
            <div style={s.infoItem}>
              <div style={s.iconWrap}><Phone size={16} /></div>
              <span>{profile.ContactNumber}</span>
            </div>
          )}
          <div style={s.infoItem}>
            <div style={s.iconWrap}><Calendar size={16} /></div>
            <span>Joined {formatDate(profile.CreatedAt)}</span>
          </div>
          {profile.ShowAddress && profile.Address && (
            <div style={s.infoItem}>
              <div style={s.iconWrap}><Home size={16} /></div>
              <span>{profile.Address}</span>
            </div>
          )}
        </div>

        {/* Subtype-specific info */}
        {profile.MemberType === 'Student' && (
          <div style={s.subtypeCard}>
            <div style={s.subtypeTitle}>Student Details</div>
            <div style={s.infoGrid}>
              <div style={s.infoItem}>
                <div style={s.iconWrap}><GraduationCap size={16} /></div>
                <span>{profile.Programme} - {profile.Branch}</span>
              </div>
              <div style={s.infoItem}>
                <div style={s.iconWrap}><BookOpen size={16} /></div>
                <span>Year {profile.CurrentYear}</span>
              </div>
              <div style={s.infoItem}>
                <div style={s.iconWrap}><Home size={16} /></div>
                <span>{profile.MessAssignment}</span>
              </div>
            </div>
          </div>
        )}

        {profile.MemberType === 'Professor' && (
          <div style={s.subtypeCard}>
            <div style={s.subtypeTitle}>Faculty Details</div>
            <div style={s.infoGrid}>
              <div style={s.infoItem}>
                <div style={s.iconWrap}><Award size={16} /></div>
                <span>{profile.Designation}</span>
              </div>
              <div style={s.infoItem}>
                <div style={s.iconWrap}><Building2 size={16} /></div>
                <span>{profile.Department}</span>
              </div>
              <div style={s.infoItem}>
                <div style={s.iconWrap}><Calendar size={16} /></div>
                <span>Since {formatDate(profile.JoiningDate)}</span>
              </div>
            </div>
          </div>
        )}

        {profile.MemberType === 'Alumni' && (
          <div style={s.subtypeCard}>
            <div style={s.subtypeTitle}>Alumni Details</div>
            <div style={s.infoGrid}>
              <div style={s.infoItem}>
                <div style={s.iconWrap}><Briefcase size={16} /></div>
                <span>{profile.CurrentOrganization}</span>
              </div>
              <div style={s.infoItem}>
                <div style={s.iconWrap}><GraduationCap size={16} /></div>
                <span>Class of {profile.GraduationYear}</span>
              </div>
              {profile.Verified && (
                <div style={s.infoItem}>
                  <div style={{ ...s.iconWrap, background: '#D1FAE5', color: '#059669' }}>
                    <BadgeCheck size={16} />
                  </div>
                  <span style={{ color: '#059669', fontWeight: 600 }}>Verified Alumni</span>
                </div>
              )}
            </div>
          </div>
        )}

        {profile.MemberType === 'Organization' && (
          <div style={s.subtypeCard}>
            <div style={s.subtypeTitle}>Organization Details</div>
            <div style={s.infoGrid}>
              <div style={s.infoItem}>
                <div style={s.iconWrap}><Building2 size={16} /></div>
                <span>{profile.OrgType}</span>
              </div>
              <div style={s.infoItem}>
                <div style={s.iconWrap}><Calendar size={16} /></div>
                <span>Founded {formatDate(profile.FoundationDate)}</span>
              </div>
              <div style={s.infoItem}>
                <div style={s.iconWrap}><Mail size={16} /></div>
                <span>{profile.ContactEmail}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile QnA Section */}
      {(profile.AllowQnA !== false || isOwnProfile) && (claims.length > 0 || isOwnProfile) && (
        <div style={s.section}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ ...s.sectionTitle, margin: 0 }}>
              <User size={20} /> Profile Q&A
            </h2>
            {isOwnProfile && !showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 10, border: 'none',
                  background: '#4F46E5', color: '#fff', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                <Plus size={14} /> Add Question
              </button>
            )}
          </div>

          {/* Create form */}
          {isOwnProfile && showCreateForm && (
            <div style={{ ...s.claimCard, border: '2px solid #4F46E5', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#4F46E5', marginBottom: 10 }}>New Q&A</div>
              <input
                type="text"
                placeholder="Question (e.g., Is Laksh the best coder?)"
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #d1d5db', fontSize: 14, marginBottom: 10,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <input
                type="text"
                placeholder="Your response"
                value={newResponse}
                onChange={e => setNewResponse(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #d1d5db', fontSize: 14, marginBottom: 12,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleCreateClaim}
                  disabled={!newQuestion.trim() || !newResponse.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8, border: 'none',
                    background: newQuestion.trim() && newResponse.trim() ? '#4F46E5' : '#c7d2fe',
                    color: '#fff', cursor: newQuestion.trim() && newResponse.trim() ? 'pointer' : 'default',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  <Check size={14} /> Save
                </button>
                <button
                  onClick={() => { setShowCreateForm(false); setNewQuestion(''); setNewResponse(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db',
                    background: '#fff', color: '#6b7280', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          )}

          {claims.length === 0 && !showCreateForm && (
            <p style={s.empty}>No Q&A yet. {isOwnProfile ? 'Add one above!' : ''}</p>
          )}

          {claims.map(claim => {
            const isEditing = editingId === claim.ClaimID;

            return (
              <div key={claim.ClaimID} style={s.claimCard}>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editQuestion}
                      onChange={e => setEditQuestion(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: '1px solid #d1d5db', fontSize: 14, marginBottom: 10,
                        outline: 'none', boxSizing: 'border-box', fontWeight: 600,
                      }}
                    />
                    <input
                      type="text"
                      value={editResponse}
                      onChange={e => setEditResponse(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: '1px solid #d1d5db', fontSize: 14, marginBottom: 12,
                        outline: 'none', boxSizing: 'border-box', fontStyle: 'italic',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleSaveEdit(claim.ClaimID)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 14px', borderRadius: 8, border: 'none',
                          background: '#4F46E5', color: '#fff', cursor: 'pointer',
                          fontSize: 13, fontWeight: 600,
                        }}
                      >
                        <Check size={14} /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db',
                          background: '#fff', color: '#6b7280', cursor: 'pointer',
                          fontSize: 13, fontWeight: 600,
                        }}
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={s.claimQ}>{claim.QuestionText}</div>
                        <div style={s.claimA}>"{claim.UserResponse}"</div>
                      </div>
                      {isOwnProfile && (
                        <div style={{ position: 'relative', flexShrink: 0, marginLeft: 12 }}>
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === claim.ClaimID ? null : claim.ClaimID)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 32, height: 32, borderRadius: 8, border: 'none',
                              background: menuOpenId === claim.ClaimID ? '#F3F4F6' : 'transparent',
                              color: '#6b7280', cursor: 'pointer',
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {menuOpenId === claim.ClaimID && (
                            <div style={{
                              position: 'absolute', right: 0, top: 36, zIndex: 10,
                              background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                              border: '1px solid #e5e7eb', overflow: 'hidden', minWidth: 140,
                            }}>
                              <button
                                onClick={() => { startEdit(claim); setMenuOpenId(null); }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                  padding: '10px 14px', border: 'none', background: '#fff',
                                  fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              <button
                                onClick={() => { handleDeleteClaim(claim.ClaimID); setMenuOpenId(null); }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                  padding: '10px 14px', border: 'none', background: '#fff',
                                  fontSize: 13, fontWeight: 500, color: '#EF4444', cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={s.voteRow}>
                      <button
                        style={{
                          ...s.voteBtn,
                          ...(claim.userVote === true ? { background: '#D1FAE5', borderColor: '#059669', color: '#059669' } : {}),
                        }}
                        onClick={() => handleVote(claim.ClaimID, true)}
                        onMouseEnter={e => { if (claim.userVote !== true) e.currentTarget.style.borderColor = '#059669'; }}
                        onMouseLeave={e => { if (claim.userVote !== true) e.currentTarget.style.borderColor = '#e5e7eb'; }}
                      >
                        <ThumbsUp size={14} />
                        Agree ({claim.agreeCount})
                      </button>
                      <button
                        style={{
                          ...s.voteBtn,
                          ...(claim.userVote === false ? { background: '#FEE2E2', borderColor: '#DC2626', color: '#DC2626' } : {}),
                        }}
                        onClick={() => handleVote(claim.ClaimID, false)}
                        onMouseEnter={e => { if (claim.userVote !== false) e.currentTarget.style.borderColor = '#DC2626'; }}
                        onMouseLeave={e => { if (claim.userVote !== false) e.currentTarget.style.borderColor = '#e5e7eb'; }}
                      >
                        <ThumbsDown size={14} />
                        Disagree ({claim.disagreeCount})
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Posts */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>
          <Clock size={20} /> Recent Posts
        </h2>
        {memberPosts.length === 0 ? (
          <p style={s.empty}>No posts yet.</p>
        ) : (
          memberPosts.map(post => (
            <div
              key={post.PostID}
              onClick={() => post.GroupID ? navigate(`/groups/${post.GroupID}`) : navigate('/')}
              style={{ ...s.claimCard, marginBottom: 12, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; }}
            >
              <div style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>{post.Content}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#9ca3af' }}>
                <span>{formatDate(post.CreatedAt)}</span>
                {post.GroupName && <span>in <strong>{post.GroupName}</strong></span>}
                <span><ThumbsUp size={12} /> {post.likes ?? 0}</span>
                <span>{post.commentCount ?? 0} comments</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
