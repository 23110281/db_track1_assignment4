import { useState } from 'react';
import { BarChart3, Clock, CheckCircle2 } from 'lucide-react';

const styles = {
  card: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    padding: 20,
    marginBottom: 16,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: '#FEF3C7',
    color: '#B45309',
    fontSize: 12,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 10,
    marginBottom: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0,
  },
  creatorName: {
    fontWeight: 600,
    fontSize: 14,
    color: '#1a1a2e',
  },
  creatorMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  question: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: 16,
    lineHeight: 1.4,
  },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '10px 14px',
    marginBottom: 8,
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    color: '#374151',
    transition: 'all 0.15s',
    position: 'relative',
    overflow: 'hidden',
    textAlign: 'left',
  },
  optionSelected: {
    borderColor: '#4F46E5',
    background: '#EEF2FF',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '2px solid #d1d5db',
    marginRight: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#4F46E5',
  },
  voteBtn: {
    width: '100%',
    padding: '10px 0',
    marginTop: 8,
    background: '#4F46E5',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  voteBtnDisabled: {
    background: '#a5b4fc',
    cursor: 'not-allowed',
  },
  resultRow: {
    marginBottom: 10,
  },
  resultLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    marginBottom: 4,
    color: '#374151',
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    background: '#f3f4f6',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    background: '#4F46E5',
    transition: 'width 0.4s ease',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTop: '1px solid #f3f4f6',
    fontSize: 13,
    color: '#6b7280',
  },
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0].toUpperCase();
}

function formatExpiry(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  if (date < now) return 'Poll ended';
  const diffMs = date - now;
  const diffHrs = Math.floor(diffMs / 3600000);
  if (diffHrs < 24) return `Ends in ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  return `Ends in ${diffDays}d`;
}

export default function PollCard({ poll, options, creator }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteData, setVoteData] = useState(options);

  const totalVotes = voteData.reduce((sum, o) => sum + o.votes, 0);
  const isExpired = new Date(poll.ExpiresAt) < new Date();

  const handleVote = () => {
    if (selectedOption === null || hasVoted) return;
    setVoteData(prev =>
      prev.map(o =>
        o.OptionID === selectedOption ? { ...o, votes: o.votes + 1 } : o
      )
    );
    setHasVoted(true);
  };

  const showResults = hasVoted || isExpired;

  return (
    <div style={styles.card}>
      <div style={styles.badge}>
        <BarChart3 size={13} />
        Poll
      </div>

      {creator && (
        <div style={styles.header}>
          <div style={{ ...styles.avatar, backgroundColor: creator.avatarColor || '#4F46E5' }}>
            {getInitials(creator.Name)}
          </div>
          <div>
            <div style={styles.creatorName}>{creator.Name}</div>
            <div style={styles.creatorMeta}>{creator.MemberType}</div>
          </div>
        </div>
      )}

      <div style={styles.question}>{poll.Question}</div>

      {!showResults ? (
        <>
          {voteData.map(option => {
            const isSelected = selectedOption === option.OptionID;
            return (
              <button
                key={option.OptionID}
                onClick={() => setSelectedOption(option.OptionID)}
                style={{
                  ...styles.optionBtn,
                  ...(isSelected ? styles.optionSelected : {}),
                }}
              >
                <div
                  style={{
                    ...styles.radioOuter,
                    borderColor: isSelected ? '#4F46E5' : '#d1d5db',
                  }}
                >
                  {isSelected && <div style={styles.radioInner} />}
                </div>
                {option.OptionText}
              </button>
            );
          })}
          <button
            onClick={handleVote}
            disabled={selectedOption === null}
            style={{
              ...styles.voteBtn,
              ...(selectedOption === null ? styles.voteBtnDisabled : {}),
            }}
            onMouseEnter={e => {
              if (selectedOption !== null) e.currentTarget.style.background = '#4338CA';
            }}
            onMouseLeave={e => {
              if (selectedOption !== null) e.currentTarget.style.background = '#4F46E5';
            }}
          >
            Vote
          </button>
        </>
      ) : (
        <>
          {voteData.map(option => {
            const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            const isWinner = option.votes === Math.max(...voteData.map(o => o.votes));
            const isMyVote = option.OptionID === selectedOption;
            return (
              <div key={option.OptionID} style={styles.resultRow}>
                <div style={styles.resultLabel}>
                  <span style={{ fontWeight: isWinner ? 600 : 400 }}>
                    {option.OptionText}
                    {isMyVote && (
                      <CheckCircle2
                        size={14}
                        style={{ marginLeft: 6, verticalAlign: 'middle', color: '#4F46E5' }}
                      />
                    )}
                  </span>
                  <span style={{ fontWeight: 600, color: isWinner ? '#4F46E5' : '#6b7280' }}>
                    {pct}%
                  </span>
                </div>
                <div style={styles.barBg}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${pct}%`,
                      background: isWinner ? '#4F46E5' : '#a5b4fc',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </>
      )}

      <div style={styles.footer}>
        <span>{totalVotes + (hasVoted ? 1 : 0)} votes</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={14} />
          {formatExpiry(poll.ExpiresAt)}
        </span>
      </div>
    </div>
  );
}
