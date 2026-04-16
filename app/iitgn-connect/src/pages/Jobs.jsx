import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, ExternalLink, UserCheck, Clock, Building2, Send,
  Plus, X, Check, Link as LinkIcon, MoreVertical, Pencil, Trash2,
} from 'lucide-react';
import { jobsApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

const styles = {
  container: { maxWidth: 960, margin: '0 auto', padding: '32px 16px' },
  heading: { fontSize: 28, fontWeight: 700, color: '#1E1B4B', margin: 0 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  tabs: { display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #E5E7EB' },
  tab: (active) => ({
    padding: '10px 24px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    color: active ? '#4F46E5' : '#6B7280',
    borderBottom: active ? '2px solid #4F46E5' : '2px solid transparent',
    marginBottom: -2,
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: active ? '#4F46E5' : 'transparent',
  }),
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    border: '1px solid #F3F4F6',
  },
  cardTitle: { fontSize: 18, fontWeight: 700, color: '#1E1B4B', margin: 0 },
  company: { display: 'flex', alignItems: 'center', gap: 6, color: '#4F46E5', fontWeight: 600, fontSize: 14, marginTop: 4 },
  description: { fontSize: 14, color: '#4B5563', lineHeight: 1.6, margin: '12px 0' },
  meta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9CA3AF' },
  metaRow: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' },
  alumni: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#65A30D', fontWeight: 500 },
  btnRow: { display: 'flex', gap: 10, marginTop: 16 },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 18px', borderRadius: 8, border: 'none',
    background: '#4F46E5', color: '#fff', fontWeight: 600,
    fontSize: 13, cursor: 'pointer', textDecoration: 'none',
  },
  btnOutline: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 18px', borderRadius: 8,
    border: '2px solid #4F46E5', background: '#fff',
    color: '#4F46E5', fontWeight: 600, fontSize: 13, cursor: 'pointer',
  },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  th: {
    textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600,
    color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5,
    borderBottom: '2px solid #E5E7EB', background: '#F9FAFB',
  },
  td: { padding: '12px 16px', fontSize: 14, color: '#374151', borderBottom: '1px solid #F3F4F6' },
  badge: (status) => {
    const map = { Pending: { bg: '#FEF3C7', color: '#92400E' }, Approved: { bg: '#D1FAE5', color: '#065F46' }, Rejected: { bg: '#FEE2E2', color: '#991B1B' } };
    const s = map[status] || map.Pending;
    return { display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color };
  },
  actionBtn: (color) => ({
    padding: '5px 12px', borderRadius: 6, border: 'none',
    background: color, color: '#fff', fontWeight: 600,
    fontSize: 12, cursor: 'pointer', marginRight: 6,
  }),
  empty: { textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 14 },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #d1d5db', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', minHeight: 80, resize: 'vertical',
    fontFamily: 'inherit',
  },
  formLabel: { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' },
  formGroup: { marginBottom: 14 },
};

export default function Jobs() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('postings');
  const [localJobs, setLocalJobs] = useState([]);
  const [refRequests, setRefRequests] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [jobForm, setJobForm] = useState({ title: '', company: '', description: '', link: '' });
  const [jobMenuOpenId, setJobMenuOpenId] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [editJobForm, setEditJobForm] = useState({ title: '', company: '', description: '', link: '' });

  const isAlumni = user?.MemberType === 'Alumni';
  const isStudent = user?.MemberType === 'Student';
  const isAdmin = user?.isAdmin;
  const [sentReferrals, setSentReferrals] = useState({}); // { alumniId: true }

  const fetchJobs = useCallback(async () => {
    try {
      const data = await jobsApi.getAll();
      setLocalJobs(data);
    } catch (err) { console.error('Failed to fetch jobs:', err); }
  }, []);

  const fetchReferrals = useCallback(async () => {
    try {
      const data = await jobsApi.getReferrals();
      setRefRequests(data);
      // Track which referrals the student has already sent (by alumni ID)
      if (isStudent && user) {
        const sent = {};
        data.filter(r => r.StudentID === user.MemberID).forEach(r => {
          sent[`${r.TargetAlumniID}`] = true;
        });
        setSentReferrals(sent);
      }
    } catch (err) { console.error('Failed to fetch referrals:', err); }
  }, [isStudent, user]);

  useEffect(() => { fetchJobs(); fetchReferrals(); }, [fetchJobs, fetchReferrals]);

  const myReferrals = refRequests.filter(r => r.StudentID === user?.MemberID);
  const incomingReferrals = isAlumni ? refRequests.filter(r => r.TargetAlumniID === user?.MemberID) : [];
  const myPostedJobs = isAlumni ? localJobs.filter(j => j.AlumniID === user?.MemberID) : [];

  const handleReferralAction = async (requestId, newStatus) => {
    try {
      await jobsApi.updateReferral(requestId, newStatus);
      await fetchReferrals();
    } catch (err) { console.error('Failed to update referral:', err); }
  };

  const handlePostJob = async () => {
    const { title, company, description, link } = jobForm;
    if (!title.trim() || !company.trim() || !description.trim()) return;
    try {
      await jobsApi.create({ title: title.trim(), company: company.trim(), description: description.trim(), applicationLink: link.trim() || '#' });
      setJobForm({ title: '', company: '', description: '', link: '' });
      setShowPostForm(false);
      await fetchJobs();
    } catch (err) { console.error('Failed to create job:', err); }
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await jobsApi.delete(jobId);
      setJobMenuOpenId(null);
      await fetchJobs();
    } catch (err) { console.error('Failed to delete job:', err); }
  };

  const startEditJob = (job) => {
    setEditingJobId(job.JobID);
    setEditJobForm({ title: job.Title, company: job.Company, description: job.Description, link: job.ApplicationLink || '' });
    setJobMenuOpenId(null);
  };

  const handleSaveEditJob = async (jobId) => {
    const { title, company, description, link } = editJobForm;
    if (!title.trim() || !company.trim() || !description.trim()) return;
    try {
      await jobsApi.update(jobId, { title: title.trim(), company: company.trim(), description: description.trim(), applicationLink: link.trim() || '#' });
      setEditingJobId(null);
      await fetchJobs();
    } catch (err) { console.error('Failed to update job:', err); }
  };

  const formatDate = (dt) => {
    const d = new Date(dt);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <Briefcase size={28} color="#4F46E5" />
          <div>
            <h1 style={styles.heading}>Jobs & Referrals</h1>
            <p style={styles.subtitle}>Opportunities posted by IITGN alumni</p>
          </div>
        </div>
        {isAlumni && activeTab === 'postings' && !showPostForm && (
          <button onClick={() => setShowPostForm(true)} style={styles.btnPrimary}>
            <Plus size={14} /> Post a Job
          </button>
        )}
      </div>

      <div style={styles.tabs}>
        <button style={styles.tab(activeTab === 'postings')} onClick={() => setActiveTab('postings')}>
          Job Postings
        </button>
        {(isAlumni || isStudent) && !isAdmin && (
          <button style={styles.tab(activeTab === 'referrals')} onClick={() => setActiveTab('referrals')}>
            {isAlumni ? 'Referral Requests' : 'My Referrals'}
          </button>
        )}
        {isAlumni && (
          <button style={styles.tab(activeTab === 'myJobs')} onClick={() => setActiveTab('myJobs')}>
            My Posted Jobs
          </button>
        )}
      </div>

      {/* ── Job Postings Tab ── */}
      {activeTab === 'postings' && (
        <div>
          {/* Post Job Form (Alumni only) */}
          {isAlumni && showPostForm && (
            <div style={{ ...styles.card, border: '2px solid #4F46E5', marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#4F46E5', marginBottom: 16 }}>Post a New Job</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Job Title *</label>
                  <input
                    type="text"
                    placeholder="e.g., Software Engineer - L4"
                    value={jobForm.title}
                    onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Company *</label>
                  <input
                    type="text"
                    placeholder="e.g., Google"
                    value={jobForm.company}
                    onChange={e => setJobForm(f => ({ ...f, company: e.target.value }))}
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description *</label>
                <textarea
                  placeholder="Describe the role, requirements, and any other details..."
                  value={jobForm.description}
                  onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))}
                  style={styles.textarea}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Application Link</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={jobForm.link}
                  onChange={e => setJobForm(f => ({ ...f, link: e.target.value }))}
                  style={styles.input}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handlePostJob}
                  disabled={!jobForm.title.trim() || !jobForm.company.trim() || !jobForm.description.trim()}
                  style={{
                    ...styles.btnPrimary,
                    opacity: jobForm.title.trim() && jobForm.company.trim() && jobForm.description.trim() ? 1 : 0.5,
                    cursor: jobForm.title.trim() && jobForm.company.trim() && jobForm.description.trim() ? 'pointer' : 'default',
                  }}
                >
                  <Check size={14} /> Publish Job
                </button>
                <button
                  onClick={() => { setShowPostForm(false); setJobForm({ title: '', company: '', description: '', link: '' }); }}
                  style={styles.btnOutline}
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          )}

          {localJobs.map(job => {
            const isOwnJob = isAlumni && job.AlumniID === user?.MemberID;
            const isEditing = editingJobId === job.JobID;

            if (isEditing) {
              return (
                <div key={job.JobID} style={{ ...styles.card, border: '2px solid #4F46E5' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#4F46E5', marginBottom: 16 }}>Edit Job</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Job Title *</label>
                      <input type="text" value={editJobForm.title} onChange={e => setEditJobForm(f => ({ ...f, title: e.target.value }))} style={styles.input} />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Company *</label>
                      <input type="text" value={editJobForm.company} onChange={e => setEditJobForm(f => ({ ...f, company: e.target.value }))} style={styles.input} />
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Description *</label>
                    <textarea value={editJobForm.description} onChange={e => setEditJobForm(f => ({ ...f, description: e.target.value }))} style={styles.textarea} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Application Link</label>
                    <input type="text" value={editJobForm.link} onChange={e => setEditJobForm(f => ({ ...f, link: e.target.value }))} style={styles.input} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleSaveEditJob(job.JobID)} style={styles.btnPrimary}>
                      <Check size={14} /> Save Changes
                    </button>
                    <button onClick={() => setEditingJobId(null)} style={styles.btnOutline}>
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={job.JobID} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={styles.cardTitle}>{job.Title}</h3>
                    <div style={styles.company}>
                      <Building2 size={14} />
                      {job.Company}
                    </div>
                  </div>
                  {(isOwnJob || isAdmin) && (
                    <div style={{ position: 'relative', flexShrink: 0, marginLeft: 12 }}>
                      <button
                        onClick={() => setJobMenuOpenId(jobMenuOpenId === job.JobID ? null : job.JobID)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 32, height: 32, borderRadius: 8, border: 'none',
                          background: jobMenuOpenId === job.JobID ? '#F3F4F6' : 'transparent',
                          color: '#6b7280', cursor: 'pointer',
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {jobMenuOpenId === job.JobID && (
                        <div style={{
                          position: 'absolute', right: 0, top: 36, zIndex: 10,
                          background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                          border: '1px solid #e5e7eb', overflow: 'hidden', minWidth: 140,
                        }}>
                          {isOwnJob && (
                            <button
                              onClick={() => startEditJob(job)}
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
                            onClick={() => handleDeleteJob(job.JobID)}
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
                <p style={styles.description}>{job.Description}</p>
                <div style={styles.metaRow}>
                  <span style={styles.meta}>
                    <Clock size={13} />
                    {formatDate(job.PostedAt)}
                  </span>
                  {job.AlumniName && (
                    <span style={styles.alumni}>
                      <UserCheck size={13} />
                      Posted by {job.AlumniName}
                    </span>
                  )}
                </div>
                <div style={styles.btnRow}>
                  {!isAdmin && (
                    <a href={job.ApplicationLink} target="_blank" rel="noopener noreferrer" style={styles.btnPrimary}>
                      <ExternalLink size={14} />
                      Apply
                    </a>
                  )}
                  {isStudent && !isAdmin && job.AlumniID && (
                    sentReferrals[`${job.AlumniID}`] ? (
                      <button
                        style={{ ...styles.btnOutline, borderColor: '#059669', color: '#059669', cursor: 'default', opacity: 0.8 }}
                        disabled
                      >
                        <Check size={14} />
                        Referral Sent!
                      </button>
                    ) : (
                      <button
                        style={styles.btnOutline}
                        onClick={async () => {
                          try {
                            await jobsApi.createReferral({
                              targetAlumniId: job.AlumniID,
                              targetCompany: job.Company,
                              targetRole: job.Title,
                            });
                            setSentReferrals(prev => ({ ...prev, [`${job.AlumniID}`]: true }));
                          } catch (err) {
                            console.error('Failed to send referral:', err);
                          }
                        }}
                      >
                        <Send size={14} />
                        Request Referral
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Referrals Tab ── */}
      {activeTab === 'referrals' && (
        <div>
          {isAlumni ? (
            /* Alumni view: incoming referral requests */
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1E1B4B', marginBottom: 16 }}>
                Incoming Referral Requests
              </h2>
              {incomingReferrals.length === 0 ? (
                <p style={styles.empty}>No referral requests received yet.</p>
              ) : (
                <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Student</th>
                        <th style={styles.th}>Company</th>
                        <th style={styles.th}>Role</th>
                        <th style={styles.th}>Requested</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomingReferrals.map(r => {
                        return (
                          <tr key={r.RequestID}>
                            <td style={styles.td}>{r.StudentName || 'Unknown'}</td>
                            <td style={styles.td}>{r.TargetCompany}</td>
                            <td style={styles.td}>{r.TargetRole}</td>
                            <td style={styles.td}>{formatDate(r.RequestedAt)}</td>
                            <td style={styles.td}><span style={styles.badge(r.Status)}>{r.Status}</span></td>
                            <td style={styles.td}>
                              {r.Status === 'Pending' ? (
                                <>
                                  <button style={styles.actionBtn('#059669')} onClick={() => handleReferralAction(r.RequestID, 'Approved')}>Accept</button>
                                  <button style={styles.actionBtn('#DC2626')} onClick={() => handleReferralAction(r.RequestID, 'Rejected')}>Reject</button>
                                </>
                              ) : (
                                <span style={{ fontSize: 13, color: '#9CA3AF' }}>--</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            /* Student view: my outgoing referral requests */
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1E1B4B', marginBottom: 16 }}>My Referral Requests</h2>
              {myReferrals.length === 0 ? (
                <p style={styles.empty}>You haven't made any referral requests yet.</p>
              ) : (
                <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Company</th>
                        <th style={styles.th}>Role</th>
                        <th style={styles.th}>Alumni</th>
                        <th style={styles.th}>Requested</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myReferrals.map(r => {
                        return (
                          <tr key={r.RequestID}>
                            <td style={styles.td}>{r.TargetCompany}</td>
                            <td style={styles.td}>{r.TargetRole}</td>
                            <td style={styles.td}>{r.AlumniName || 'Unknown'}</td>
                            <td style={styles.td}>{formatDate(r.RequestedAt)}</td>
                            <td style={styles.td}><span style={styles.badge(r.Status)}>{r.Status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── My Posted Jobs Tab (Alumni only) ── */}
      {activeTab === 'myJobs' && isAlumni && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1E1B4B', marginBottom: 16 }}>My Posted Jobs</h2>
          {myPostedJobs.length === 0 ? (
            <p style={styles.empty}>You haven't posted any jobs yet.</p>
          ) : (
            myPostedJobs.map(job => {
              const isEditing = editingJobId === job.JobID;

              if (isEditing) {
                return (
                  <div key={job.JobID} style={{ ...styles.card, border: '2px solid #4F46E5' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#4F46E5', marginBottom: 16 }}>Edit Job</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Job Title *</label>
                        <input type="text" value={editJobForm.title} onChange={e => setEditJobForm(f => ({ ...f, title: e.target.value }))} style={styles.input} />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Company *</label>
                        <input type="text" value={editJobForm.company} onChange={e => setEditJobForm(f => ({ ...f, company: e.target.value }))} style={styles.input} />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Description *</label>
                      <textarea value={editJobForm.description} onChange={e => setEditJobForm(f => ({ ...f, description: e.target.value }))} style={styles.textarea} />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Application Link</label>
                      <input type="text" value={editJobForm.link} onChange={e => setEditJobForm(f => ({ ...f, link: e.target.value }))} style={styles.input} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleSaveEditJob(job.JobID)} style={styles.btnPrimary}>
                        <Check size={14} /> Save Changes
                      </button>
                      <button onClick={() => setEditingJobId(null)} style={styles.btnOutline}>
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
              <div key={job.JobID} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={styles.cardTitle}>{job.Title}</h3>
                    <div style={styles.company}>
                      <Building2 size={14} />
                      {job.Company}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={styles.meta}>
                      <Clock size={13} />
                      {formatDate(job.PostedAt)}
                    </span>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setJobMenuOpenId(jobMenuOpenId === job.JobID ? null : job.JobID)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 32, height: 32, borderRadius: 8, border: 'none',
                          background: jobMenuOpenId === job.JobID ? '#F3F4F6' : 'transparent',
                          color: '#6b7280', cursor: 'pointer',
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {jobMenuOpenId === job.JobID && (
                        <div style={{
                          position: 'absolute', right: 0, top: 36, zIndex: 10,
                          background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                          border: '1px solid #e5e7eb', overflow: 'hidden', minWidth: 140,
                        }}>
                          <button
                            onClick={() => startEditJob(job)}
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
                          <button
                            onClick={() => handleDeleteJob(job.JobID)}
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
                  </div>
                </div>
                <p style={styles.description}>{job.Description}</p>
                {job.ApplicationLink && job.ApplicationLink !== '#' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4F46E5' }}>
                    <LinkIcon size={13} />
                    <a href={job.ApplicationLink} target="_blank" rel="noopener noreferrer" style={{ color: '#4F46E5' }}>
                      {job.ApplicationLink}
                    </a>
                  </div>
                )}
                {/* Show referral requests for this job */}
                {(() => {
                  const jobRefs = refRequests.filter(r => r.TargetAlumniID === user.MemberID && r.TargetCompany === job.Company);
                  if (jobRefs.length === 0) return null;
                  return (
                    <div style={{ marginTop: 14, padding: 12, background: '#F9FAFB', borderRadius: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: 8 }}>
                        Referral Requests ({jobRefs.length})
                      </div>
                      {jobRefs.map(r => {
                        return (
                          <div key={r.RequestID} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 0', borderBottom: '1px solid #E5E7EB',
                          }}>
                            <div style={{ fontSize: 14, color: '#374151' }}>
                              {r.StudentName || 'Unknown'} — {r.TargetRole}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={styles.badge(r.Status)}>{r.Status}</span>
                              {r.Status === 'Pending' && (
                                <>
                                  <button style={styles.actionBtn('#059669')} onClick={() => handleReferralAction(r.RequestID, 'Approved')}>Accept</button>
                                  <button style={styles.actionBtn('#DC2626')} onClick={() => handleReferralAction(r.RequestID, 'Rejected')}>Reject</button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            );
            })
          )}
        </div>
      )}
    </div>
  );
}
