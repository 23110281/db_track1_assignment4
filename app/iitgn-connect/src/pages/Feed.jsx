import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { postsApi, pollsApi } from '../api';
import PostCard from '../components/PostCard';
import PollCard from '../components/PollCard';
import CreatePost from '../components/CreatePost';
import { Globe, Users } from 'lucide-react';

const styles = {
  container: {
    maxWidth: 680,
    margin: '0 auto',
    padding: '24px 16px',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 16px',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: 'transparent',
    color: '#6b7280',
  },
  tabActive: {
    background: '#4F46E5',
    color: '#fff',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    color: '#9ca3af',
    fontSize: 15,
  },
};

export default function Feed() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('global');
  const [posts, setPosts] = useState([]);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshFeed = useCallback(async () => {
    try {
      setLoading(true);
      const feed = activeTab === 'groups' ? 'groups' : 'global';
      const [postsData, pollsData] = await Promise.all([
        postsApi.getFeed(feed),
        pollsApi.getAll(),
      ]);
      setPosts(postsData || []);
      setPolls(pollsData || []);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    refreshFeed();
  }, [refreshFeed]);

  // Combine posts and polls into a single sorted feed
  const feedItems = (() => {
    const filteredPolls = activeTab === 'groups' ? [] : polls;

    const items = [
      ...posts.map(p => ({ type: 'post', data: p, date: p.CreatedAt })),
      ...filteredPolls.map(p => ({ type: 'poll', data: p, date: p.CreatedAt })),
    ];

    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    return items;
  })();

  const handleNewPost = async (content, imageUrl) => {
    try {
      await postsApi.create(content, null, imageUrl);
      refreshFeed();
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  return (
    <div style={styles.container}>
      {/* Tab Bar */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'global' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('global')}
        >
          <Globe size={16} />
          Global Feed
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'groups' ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab('groups')}
        >
          <Users size={16} />
          My Groups
        </button>
      </div>

      {/* Create Post — only on Global Feed (group posts are made from within the group) */}
      {user && activeTab === 'global' && <CreatePost user={user} onPost={handleNewPost} />}

      {/* Feed Items */}
      {!loading && feedItems.length === 0 ? (
        <div style={styles.emptyState}>
          {activeTab === 'groups'
            ? 'No posts from your groups yet. Join more groups to see content here!'
            : 'No posts yet. Be the first to share something!'
          }
        </div>
      ) : (
        feedItems.map(item => {
          if (item.type === 'post') {
            const post = item.data;
            return (
              <PostCard
                key={`post-${post.PostID}`}
                post={post}
                onPostUpdated={(id, newContent) => {
                  setPosts(prev => prev.map(p => p.PostID === id ? { ...p, Content: newContent } : p));
                }}
                onPostDeleted={(id) => {
                  setPosts(prev => prev.filter(p => p.PostID !== id));
                }}
              />
            );
          } else {
            const poll = item.data;
            return (
              <PollCard
                key={`poll-${poll.PollID}`}
                poll={poll}
                options={poll.options || []}
                creator={poll.creator || null}
              />
            );
          }
        })
      )}
    </div>
  );
}
