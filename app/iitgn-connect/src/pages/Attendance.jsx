import { useState, useEffect, useCallback } from 'react';
import { Flame, Trophy, BookOpen, UtensilsCrossed, CalendarDays } from 'lucide-react';
import { attendanceApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

const PRIMARY = '#4F46E5';

const s = {
  container: { maxWidth: 960, margin: '0 auto', padding: '32px 16px' },
  headerRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 },
  heading: { fontSize: 28, fontWeight: 700, color: '#1E1B4B', margin: 0 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  section: { marginBottom: 40 },
  sectionTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 700, color: '#1E1B4B', marginBottom: 16 },
  card: {
    background: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    border: '1px solid #F3F4F6', marginBottom: 16,
  },
  streakBox: {
    display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
    borderRadius: 12, padding: '20px 28px', color: '#fff', marginBottom: 20,
  },
  streakNum: { fontSize: 48, fontWeight: 800, lineHeight: 1 },
  streakLabel: { fontSize: 14, fontWeight: 500, opacity: 0.9 },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 16 },
  dayLabel: { textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9CA3AF', padding: 4 },
  dayCell: (status) => ({
    width: '100%', aspectRatio: '1', borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 600,
    background: status === 'Present' ? '#D1FAE5' : status === 'Absent' ? '#FEE2E2' : '#F3F4F6',
    color: status === 'Present' ? '#065F46' : status === 'Absent' ? '#991B1B' : '#D1D5DB',
  }),
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: {
    textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600,
    color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5,
    borderBottom: '2px solid #E5E7EB', background: '#F9FAFB',
  },
  td: { padding: '10px 14px', fontSize: 14, color: '#374151', borderBottom: '1px solid #F3F4F6' },
  progressBg: { width: '100%', height: 10, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' },
  progressFill: (pct, color) => ({ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.5s ease' }),
  mealGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 },
  mealCard: {
    background: '#fff', borderRadius: 10, padding: 16,
    border: '1px solid #F3F4F6',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  mealTitle: { fontSize: 14, fontWeight: 700, color: '#1E1B4B', marginBottom: 8 },
  mealStat: { fontSize: 24, fontWeight: 800, color: PRIMARY },
  mealSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  leaderRow: (i) => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
    background: i === 0 ? '#FEF3C7' : '#fff',
    borderBottom: '1px solid #F3F4F6', borderRadius: i === 0 ? 8 : 0,
  }),
  rank: (i) => ({ width: 28, height: 28, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, background: i === 0 ? '#F59E0B' : i === 1 ? '#D1D5DB' : i === 2 ? '#CD7C2F' : '#E5E7EB', color: i < 3 ? '#fff' : '#6B7280' }),
  leaderName: { flex: 1, fontSize: 14, fontWeight: 600, color: '#1E1B4B' },
  leaderStreak: { fontSize: 14, fontWeight: 700, color: PRIMARY },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 },
};

export default function Attendance() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const sid = user?.MemberID || 1;

  const [classStreak, setClassStreak] = useState(0);
  const [messStreak, setMessStreak] = useState(0);
  const [classRecords, setClassRecords] = useState([]);
  const [courseBreakdown, setCourseBreakdown] = useState([]);
  const [mealStats, setMealStats] = useState([]);
  const [classLeaders, setClassLeaders] = useState([]);
  const [messLeaders, setMessLeaders] = useState([]);

  // Calendar for current month
  const year = 2026;
  const month = 2; // March (0-indexed)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const fetchData = useCallback(async () => {
    try {
      const apiMonth = month + 1; // API expects 1-indexed month
      const [classData, messData, streaks, leaderboard] = await Promise.all([
        attendanceApi.getClass(sid, apiMonth, year),
        attendanceApi.getMess(sid, apiMonth, year),
        attendanceApi.getStreaks(sid),
        attendanceApi.getLeaderboard(),
      ]);

      setClassRecords(classData.records || []);
      setCourseBreakdown((classData.courseBreakdown || []).map(cb => ({
        course: { CourseCode: cb.CourseCode, CourseName: cb.CourseName, CourseID: cb.CourseCode },
        present: cb.present,
        total: cb.total,
        pct: cb.total > 0 ? Math.round((cb.present / cb.total) * 100) : 0,
      })));

      const mealBreakdown = messData.mealBreakdown || {};
      const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
      setMealStats(mealTypes.map(meal => {
        const info = mealBreakdown[meal] || { eaten: 0, missed: 0 };
        const total = info.eaten + info.missed;
        const pct = total > 0 ? Math.round((info.eaten / total) * 100) : 0;
        return { meal, eaten: info.eaten, missed: info.missed, total, pct };
      }));

      setClassStreak(streaks.classStreak || 0);
      setMessStreak(streaks.messStreak || 0);

      const lb = leaderboard || [];
      const sortedClass = [...lb].sort((a, b) => b.classStreak - a.classStreak).slice(0, 5);
      const sortedMess = [...lb].sort((a, b) => b.messStreak - a.messStreak).slice(0, 5);
      setClassLeaders(sortedClass);
      setMessLeaders(sortedMess);
    } catch (err) { console.error('Failed to fetch attendance data:', err); }
  }, [sid]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dayStatusMap = {};
  classRecords.forEach(r => {
    const day = parseInt(r.RecordDate.split('-')[2]);
    if (!dayStatusMap[day] || r.Status === 'Absent') dayStatusMap[day] = r.Status;
  });

  const mealColors = { Breakfast: '#F59E0B', Lunch: '#059669', Dinner: '#7C3AED' };

  return (
    <div style={s.container}>
      <div style={s.headerRow}>
        <CalendarDays size={28} color={PRIMARY} />
        <div>
          <h1 style={s.heading}>Attendance Streaks</h1>
          <p style={s.subtitle}>Track your class and mess attendance</p>
        </div>
      </div>

      {/* Class Attendance (hidden for admin) */}
      {!isAdmin && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}><BookOpen size={20} color={PRIMARY} /> Class Attendance</h2>
          <div style={s.streakBox}>
            <span style={{ fontSize: 40 }}>&#128293;</span>
            <div>
              <div style={s.streakNum}>{classStreak}</div>
              <div style={s.streakLabel}>Day Class Streak</div>
            </div>
          </div>

          <div style={s.card}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1E1B4B', marginBottom: 12 }}>March 2026</h3>
            <div style={s.calGrid}>
              {dayNames.map(d => <div key={d} style={s.dayLabel}>{d}</div>)}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={'e' + i} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const status = day <= 20 ? (dayStatusMap[day] || 'none') : 'none';
                return (
                  <div key={day} style={s.dayCell(status)}>
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Course</th>
                  <th style={s.th}>Code</th>
                  <th style={s.th}>Present / Total</th>
                  <th style={s.th}>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {courseBreakdown.map((cb, idx) => (
                  <tr key={cb.course?.CourseID || idx}>
                    <td style={s.td}>{cb.course?.CourseName}</td>
                    <td style={s.td}>{cb.course?.CourseCode}</td>
                    <td style={s.td}>{cb.present} / {cb.total}</td>
                    <td style={{ ...s.td, width: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={s.progressBg}>
                          <div style={s.progressFill(cb.pct, cb.pct >= 75 ? '#059669' : '#DC2626')} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: cb.pct >= 75 ? '#059669' : '#DC2626' }}>{cb.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mess Attendance (hidden for admin) */}
      {!isAdmin && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}><UtensilsCrossed size={20} color={PRIMARY} /> Mess Attendance</h2>
          <div style={s.streakBox}>
            <span style={{ fontSize: 40 }}>&#128293;</span>
            <div>
              <div style={s.streakNum}>{messStreak}</div>
              <div style={s.streakLabel}>Meal Streak</div>
            </div>
          </div>

          <div style={s.mealGrid}>
            {mealStats.map(ms => (
              <div key={ms.meal} style={s.mealCard}>
                <div style={s.mealTitle}>{ms.meal}</div>
                <div style={s.mealStat}>{ms.eaten}<span style={{ fontSize: 14, fontWeight: 500, color: '#9CA3AF' }}> / {ms.total}</span></div>
                <div style={s.mealSub}>{ms.missed} missed</div>
                <div style={{ ...s.progressBg, marginTop: 10 }}>
                  <div style={s.progressFill(ms.pct, mealColors[ms.meal])} />
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: mealColors[ms.meal], marginTop: 4 }}>{ms.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboards */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}><Trophy size={20} color="#F59E0B" /> Leaderboards</h2>
        <div style={s.twoCol}>
          <div style={s.card}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E1B4B', marginBottom: 12 }}>Top Class Streaks</h3>
            {classLeaders.map((l, i) => (
              <div key={l.MemberID} style={s.leaderRow(i)}>
                <div style={s.rank(i)}>{i + 1}</div>
                <span style={s.leaderName}>{l.Name}</span>
                <span style={s.leaderStreak}>{l.classStreak} days</span>
              </div>
            ))}
          </div>
          <div style={s.card}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E1B4B', marginBottom: 12 }}>Top Mess Streaks</h3>
            {messLeaders.map((l, i) => (
              <div key={l.MemberID} style={s.leaderRow(i)}>
                <div style={s.rank(i)}>{i + 1}</div>
                <span style={s.leaderName}>{l.Name}</span>
                <span style={s.leaderStreak}>{l.messStreak} meals</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
