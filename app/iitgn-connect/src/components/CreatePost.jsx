import { useState, useRef } from 'react';
import { Send, Image, X } from 'lucide-react';
import { uploadFile } from '../api';

const styles = {
  card: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    padding: 20,
    marginBottom: 16,
  },
  wrapper: {
    display: 'flex',
    gap: 14,
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
  inputArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  textarea: {
    width: '100%',
    minHeight: 80,
    padding: '12px 14px',
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    fontSize: 15,
    lineHeight: 1.5,
    color: '#1f2937',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    color: '#6b7280',
    padding: '6px 10px',
    borderRadius: 8,
  },
  postBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 20px',
    background: '#4F46E5',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  postBtnDisabled: {
    background: '#a5b4fc',
    cursor: 'not-allowed',
  },
  previewContainer: {
    position: 'relative',
    display: 'inline-block',
    marginTop: 4,
  },
  previewImg: {
    maxWidth: '100%',
    maxHeight: 200,
    borderRadius: 10,
    objectFit: 'cover',
    border: '1.5px solid #e5e7eb',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  uploadingBar: {
    height: 3,
    background: '#4F46E5',
    borderRadius: 2,
    animation: 'pulse 1s ease-in-out infinite',
  },
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0].toUpperCase();
}

export default function CreatePost({ user, onPost }) {
  const [content, setContent] = useState('');
  const [focused, setFocused] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async () => {
    if (!content.trim() && !imageFile) return;
    setUploading(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        const uploadResult = await uploadFile(imageFile);
        imageUrl = uploadResult.url;
      }
      await onPost(content.trim(), imageUrl);
      setContent('');
      removeImage();
    } catch (err) {
      console.error('Post failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handlePost();
    }
  };

  const isEmpty = !content.trim() && !imageFile;

  return (
    <div style={styles.card}>
      <div style={styles.wrapper}>
        <div style={{ ...styles.avatar, backgroundColor: user?.avatarColor || '#4F46E5' }}>
          {getInitials(user?.Name)}
        </div>
        <div style={styles.inputArea}>
          <textarea
            style={{
              ...styles.textarea,
              borderColor: focused ? '#4F46E5' : '#e5e7eb',
            }}
            placeholder="What's on your mind?"
            value={content}
            onChange={e => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
          />
          {imagePreview && (
            <div style={styles.previewContainer}>
              <img src={imagePreview} alt="Preview" style={styles.previewImg} />
              <button style={styles.removeBtn} onClick={removeImage} title="Remove photo">
                <X size={14} />
              </button>
            </div>
          )}
          {uploading && (
            <div style={{ height: 3, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
              <div style={styles.uploadingBar} />
            </div>
          )}
          <div style={styles.bottomRow}>
            <button
              style={styles.attachBtn}
              onClick={handlePhotoClick}
              onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              <Image size={18} />
              Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              onClick={handlePost}
              disabled={isEmpty || uploading}
              style={{
                ...styles.postBtn,
                ...((isEmpty || uploading) ? styles.postBtnDisabled : {}),
              }}
              onMouseEnter={e => {
                if (!isEmpty && !uploading) e.currentTarget.style.background = '#4338CA';
              }}
              onMouseLeave={e => {
                if (!isEmpty && !uploading) e.currentTarget.style.background = '#4F46E5';
              }}
            >
              <Send size={16} />
              {uploading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
