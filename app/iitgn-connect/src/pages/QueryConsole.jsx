import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminApi } from '../api';
import { Play, Clock, AlertTriangle, Database } from 'lucide-react';

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0d1117',
    color: '#c9d1d9',
    padding: 32,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#e6edf3',
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: '#8b949e',
    marginTop: 4,
  },
  editorContainer: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: '#1c2128',
    borderBottom: '1px solid #30363d',
  },
  editorLabel: {
    fontSize: 13,
    color: '#8b949e',
    fontWeight: 600,
  },
  textarea: {
    width: '100%',
    minHeight: 180,
    padding: 16,
    background: '#0d1117',
    color: '#c9d1d9',
    border: 'none',
    outline: 'none',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: 14,
    lineHeight: 1.6,
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  runBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 24px',
    background: '#4F46E5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    transition: 'background 0.15s',
  },
  runBtnDisabled: {
    background: '#363b44',
    color: '#6b7280',
    cursor: 'default',
  },
  resultContainer: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 20,
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: '#1c2128',
    borderBottom: '1px solid #30363d',
  },
  resultLabel: {
    fontSize: 13,
    color: '#8b949e',
    fontWeight: 600,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    background: '#1c2128',
    color: '#8b949e',
    fontWeight: 600,
    borderBottom: '1px solid #30363d',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '8px 14px',
    borderBottom: '1px solid #21262d',
    color: '#c9d1d9',
    maxWidth: 300,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  errorBox: {
    padding: 16,
    background: '#1c1214',
    border: '1px solid #f8514966',
    borderRadius: 8,
    color: '#f85149',
    fontSize: 14,
    marginTop: 20,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  successBox: {
    padding: 16,
    background: '#0d1117',
    color: '#3fb950',
    fontSize: 14,
    fontWeight: 600,
  },
  historyContainer: {
    marginTop: 28,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#8b949e',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  historyItem: {
    padding: '8px 14px',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 6,
    marginBottom: 6,
    cursor: 'pointer',
    fontSize: 13,
    color: '#8b949e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'border-color 0.15s',
  },
};

export default function QueryConsole() {
  const { user } = useAuth();
  const [sql, setSql] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  if (!user?.isAdmin) {
    return (
      <div style={styles.page}>
        <div style={{ textAlign: 'center', paddingTop: 100, color: '#f85149' }}>
          <AlertTriangle size={48} style={{ marginBottom: 16 }} />
          <h2>Access Denied</h2>
          <p>You need admin privileges to access the SQL Console.</p>
        </div>
      </div>
    );
  }

  const handleRun = async () => {
    const trimmed = sql.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await adminApi.runQuery(trimmed);
      setResult(data);
      setHistory(prev => {
        const updated = [trimmed, ...prev.filter(q => q !== trimmed)];
        return updated.slice(0, 10);
      });
    } catch (err) {
      setError(err.message || 'Query execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Database size={28} color="#4F46E5" />
        <div>
          <h1 style={styles.title}>SQL Query Console</h1>
          <div style={styles.subtitle}>Execute raw SQL queries against the database</div>
        </div>
      </div>

      <div style={styles.editorContainer}>
        <div style={styles.editorHeader}>
          <span style={styles.editorLabel}>SQL QUERY</span>
          <span style={{ fontSize: 12, color: '#484f58' }}>Ctrl+Enter to run</span>
        </div>
        <textarea
          value={sql}
          onChange={e => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SELECT * FROM Member LIMIT 10;"
          style={styles.textarea}
          spellCheck={false}
        />
      </div>

      <button
        onClick={handleRun}
        disabled={!sql.trim() || loading}
        style={{
          ...styles.runBtn,
          ...(!sql.trim() || loading ? styles.runBtnDisabled : {}),
        }}
      >
        <Play size={16} />
        {loading ? 'Running...' : 'Run Query'}
      </button>

      {error && (
        <div style={styles.errorBox}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {result && result.type === 'select' && (
        <div style={styles.resultContainer}>
          <div style={styles.resultHeader}>
            <span style={styles.resultLabel}>RESULTS</span>
            <span style={{ fontSize: 12, color: '#484f58' }}>{result.rowCount} row{result.rowCount !== 1 ? 's' : ''} returned</span>
          </div>
          {result.rows.length === 0 ? (
            <div style={styles.successBox}>Query executed successfully. No rows returned.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {Object.keys(result.rows[0]).map(col => (
                      <th key={col} style={styles.th}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#0d1117' : '#161b22' }}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} style={styles.td}>{val === null ? 'NULL' : String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {result && result.type === 'modify' && (
        <div style={styles.resultContainer}>
          <div style={styles.resultHeader}>
            <span style={styles.resultLabel}>RESULT</span>
          </div>
          <div style={styles.successBox}>
            Query executed successfully. {result.affectedRows} row{result.affectedRows !== 1 ? 's' : ''} affected.
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div style={styles.historyContainer}>
          <div style={styles.historyTitle}>
            <Clock size={14} />
            Query History
          </div>
          {history.map((q, i) => (
            <div
              key={i}
              style={styles.historyItem}
              onClick={() => setSql(q)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; }}
              title={q}
            >
              {q}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
