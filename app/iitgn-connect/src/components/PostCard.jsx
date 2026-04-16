import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Users, Send, MoreVertical, Pencil, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { postsApi } from '../api';

const styles = {
  card: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    padding: 20,
    marginBottom: 16,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: 16,
    flexShrink: 0,
  },
  authorName: {
    fontWeight: 600,
    fontSize: 15,
    color: '#1a1a2e',
    lineHeight: 1.3,
  },
  meta: {
    fontSize: 13,
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  groupBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: '#EEF2FF',
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 10,
  },
  content: {
    fontSize: 15,
    lineHeight: 1.6,
    color: '#1f2937',
    marginBottom: 16,
    whiteSpace: 'pre-wrap',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    paddingTop: 12,
    borderTop: '1px solid #f3f4f6',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    color: '#6b7280',
    padding: '4px 8px',
    borderRadius: 8,
    transition: 'background 0.15s',
  },
  actionBtnLiked: {
    color: '#EF4444',
  },
  commentSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #f3f4f6',
    background: '#F9FAFB',
    borderRadius: 10,
    padding: 16,
    marginLeft: 8,
    marginRight: 8,
  },
  commentItem: {
    display: 'flex',
    gap: 10,
    marginBottom: 14,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: 12,
    flexShrink: 0,
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
  },
  commentAuthor: {
    fontWeight: 600,
    fontSize: 13,
    color: '#1a1a2e',
  },
  commentTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 8,
  },
  commentContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 1.5,
    marginTop: 2,
  },
  commentInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #e5e7eb',
  },
  commentInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
  },
  sendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 8,
    border: 'none',
    background: '#4F46E5',
    color: '#fff',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  sendBtnDisabled: {
    background: '#c7d2fe',
    cursor: 'default',
  },
  noComments: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    padding: '8px 0',
  },
  dotBtn: (open) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    border: 'none',
    background: open ? '#F3F4F6' : 'transparent',
    color: '#9ca3af',
    cursor: 'pointer',
    flexShrink: 0,
  }),
  dropdownMenu: {
    position: 'absolute',
    right: 0,
    top: 30,
    zIndex: 10,
    background: '#fff',
    borderRadius: 10,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    minWidth: 130,
  },
  dropdownItem: (color) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '9px 14px',
    border: 'none',
    background: '#fff',
    fontSize: 13,
    fontWeight: 500,
    color: color || '#374151',
    cursor: 'pointer',
    textAlign: 'left',
  }),
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0].toUpperCase();
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PostCard({ post, onPostUpdated, onPostDeleted }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const author = post.author;
  const groupName = post.groupName;
  const groupId = post.GroupID;
  const isOwnPost = user && author && user.MemberID === author.MemberID;
  const isAdmin = user?.isAdmin;

  const [liked, setLiked] = useState(post.liked || false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [localComments, setLocalComments] = useState([]);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [newComment, setNewComment] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [lightbox, setLightbox] = useState(false);
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editPostText, setEditPostText] = useState(post.Content || '');
  const [deleted, setDeleted] = useState(false);

  const handleLike = async () => {
    try {
      const res = await postsApi.toggleLike(post.PostID);
      setLiked(res.liked);
      setLikeCount(prev => res.liked ? prev + 1 : prev - 1);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await postsApi.getComments(post.PostID);
      setLocalComments(data || []);
      setCommentCount((data || []).length);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const handleToggleComments = async () => {
    const willShow = !showComments;
    setShowComments(willShow);
    if (willShow) {
      await fetchComments();
    }
  };

  const handleAddComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || !user) return;
    try {
      await postsApi.addComment(post.PostID, trimmed);
      setNewComment('');
      await fetchComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await postsApi.deleteComment(commentId);
      setMenuOpenId(null);
      await fetchComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const startEditComment = (comment) => {
    setEditingId(comment.CommentID);
    setEditText(comment.Content);
    setMenuOpenId(null);
  };

  const handleSaveEdit = async (commentId) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    try {
      await postsApi.updateComment(commentId, trimmed);
      setEditingId(null);
      setEditText('');
      await fetchComments();
    } catch (err) {
      console.error('Failed to update comment:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleEditPost = async () => {
    const trimmed = editPostText.trim();
    if (!trimmed) return;
    try {
      await postsApi.update(post.PostID, trimmed);
      post.Content = trimmed;
      setEditingPost(false);
      if (onPostUpdated) onPostUpdated(post.PostID, trimmed);
    } catch (err) {
      console.error('Failed to edit post:', err);
    }
  };

  const handleDeletePost = async () => {
    try {
      await postsApi.delete(post.PostID);
      setDeleted(true);
      if (onPostDeleted) onPostDeleted(post.PostID);
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const totalComments = commentCount;

  if (deleted) return null;
  if (!author) return null;

  return (
    <div style={styles.card}>
      <div style={{ ...styles.header, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ ...styles.avatar, backgroundColor: author.avatarColor || '#4F46E5' }}>
            {getInitials(author.Name)}
          </div>
          <div>
            <div style={styles.authorName}>{author.Name}</div>
            <div style={styles.meta}>
              <span>{author.MemberType}</span>
              <span>{'·'}</span>
              <span>{formatTime(post.CreatedAt)}</span>
            </div>
          </div>
        </div>
        {(isOwnPost || isAdmin) && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setPostMenuOpen(!postMenuOpen)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: postMenuOpen ? '#F3F4F6' : 'transparent',
                color: '#6b7280', cursor: 'pointer',
              }}
            >
              <MoreVertical size={16} />
            </button>
            {postMenuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 36, zIndex: 10,
                background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                border: '1px solid #e5e7eb', overflow: 'hidden', minWidth: 130,
              }}>
                {isOwnPost && (
                  <button
                    onClick={() => { setEditingPost(true); setEditPostText(post.Content || ''); setPostMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '10px 14px', border: 'none', background: '#fff',
                      fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                )}
                <button
                  onClick={() => { handleDeletePost(); setPostMenuOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '10px 14px', border: 'none', background: '#fff',
                    fontSize: 13, fontWeight: 500, color: '#EF4444', cursor: 'pointer', textAlign: 'left',
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

      {groupName && (
        <div style={{ marginBottom: 12 }}>
          <span
            style={{ ...styles.groupBadge, cursor: 'pointer' }}
            onClick={() => groupId && navigate(`/groups/${groupId}`)}
            title={`Open ${groupName}`}
          >
            <Users size={12} />
            {groupName}
          </span>
        </div>
      )}

      {editingPost ? (
        <div style={{ marginBottom: 12 }}>
          <textarea
            value={editPostText}
            onChange={e => setEditPostText(e.target.value)}
            style={{
              width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid #4F46E5',
              fontSize: 14, outline: 'none', minHeight: 60, resize: 'vertical',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleEditPost}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              <Check size={14} /> Save
            </button>
            <button
              onClick={() => setEditingPost(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                borderRadius: 8, border: '1px solid #d1d5db', background: '#fff',
                color: '#6b7280', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        post.Content && <div style={styles.content}>{post.Content}</div>
      )}

      {post.ImageURL && (
        <div style={{ marginBottom: 12 }}>
          <img
            src={post.ImageURL}
            alt="Post"
            onClick={() => setLightbox(true)}
            style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb', cursor: 'pointer' }}
          />
        </div>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <button
            onClick={() => setLightbox(false)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '50%', width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={22} />
          </button>
          <img
            src={post.ImageURL}
            alt="Post full view"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: 8,
              cursor: 'default',
            }}
          />
        </div>
      )}

      <div style={styles.actions}>
        <button
          onClick={handleLike}
          style={{
            ...styles.actionBtn,
            ...(liked ? styles.actionBtnLiked : {}),
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          <Heart size={18} fill={liked ? '#EF4444' : 'none'} stroke={liked ? '#EF4444' : 'currentColor'} />
          <span style={{ fontWeight: 500 }}>{likeCount}</span>
        </button>

        <button
          onClick={handleToggleComments}
          style={styles.actionBtn}
          onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          <MessageCircle size={18} />
          <span style={{ fontWeight: 500 }}>
            {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
          </span>
        </button>
      </div>

      {showComments && (
        <div style={styles.commentSection}>
          {localComments.length === 0 ? (
            <div style={styles.noComments}>No comments yet. Be the first to comment!</div>
          ) : (
            localComments.map(comment => {
              const commentAuthor = comment.author;
              const isOwn = user && comment.AuthorID === user.MemberID;

              return (
                <div key={comment.CommentID} style={styles.commentItem}>
                  <div
                    style={{
                      ...styles.commentAvatar,
                      backgroundColor: commentAuthor?.avatarColor || '#4F46E5',
                    }}
                  >
                    {getInitials(commentAuthor?.Name)}
                  </div>
                  <div style={styles.commentBody}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={styles.commentAuthor}>
                          {commentAuthor?.Name || 'Unknown'}
                        </span>
                        <span style={styles.commentTime}>{formatTime(comment.CreatedAt)}</span>
                      </div>
                      {(isOwn || isAdmin) && editingId !== comment.CommentID && (
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === comment.CommentID ? null : comment.CommentID)}
                            style={styles.dotBtn(menuOpenId === comment.CommentID)}
                          >
                            <MoreVertical size={14} />
                          </button>
                          {menuOpenId === comment.CommentID && (
                            <div style={styles.dropdownMenu}>
                              {isOwn && (
                                <button
                                  onClick={() => startEditComment(comment)}
                                  style={styles.dropdownItem('#374151')}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                                >
                                  <Pencil size={13} /> Edit
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteComment(comment.CommentID)}
                                style={styles.dropdownItem('#EF4444')}
                                onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {editingId === comment.CommentID ? (
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <input
                          type="text"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(comment.CommentID); if (e.key === 'Escape') setEditingId(null); }}
                          autoFocus
                          style={{
                            flex: 1, padding: '6px 10px', borderRadius: 6,
                            border: '1px solid #d1d5db', fontSize: 13, outline: 'none',
                          }}
                        />
                        <button
                          onClick={() => handleSaveEdit(comment.CommentID)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 30, height: 30, borderRadius: 6, border: 'none',
                            background: '#4F46E5', color: '#fff', cursor: 'pointer',
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 30, height: 30, borderRadius: 6, border: '1px solid #d1d5db',
                            background: '#fff', color: '#6b7280', cursor: 'pointer',
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={styles.commentContent}>{comment.Content}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {user && (
            <div style={styles.commentInputRow}>
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                style={styles.commentInput}
              />
              <button
                onClick={handleAddComment}
                style={{
                  ...styles.sendBtn,
                  ...(newComment.trim() === '' ? styles.sendBtnDisabled : {}),
                }}
                disabled={newComment.trim() === ''}
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
