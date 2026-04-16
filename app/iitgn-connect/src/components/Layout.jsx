import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div style={styles.wrapper}>
      <Navbar />
      <div style={styles.body}>
        <Sidebar />
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: '#F3F4F6',
  },
  body: {
    display: 'flex',
    paddingTop: 60,
  },
  content: {
    flex: 1,
    marginLeft: 250,
    padding: 24,
    minHeight: 'calc(100vh - 60px)',
    overflow: 'hidden',
  },
};
