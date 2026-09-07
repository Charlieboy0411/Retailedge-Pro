import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, User, BookOpen, Award, CheckCircle2, Clock, Calendar, 
  AlertCircle, ShieldCheck, BarChart2, ExternalLink, ChevronRight,
  Check, AlertTriangle, XCircle, ArrowRight
} from 'lucide-react';

export default function Participant360Modal({ 
  isOpen, 
  onClose, 
  participantId, 
  token,
  selectedProjectId = 'all',
  selectedSubProjectId = 'all' 
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizTypeFilter, setQuizTypeFilter] = useState('ALL');

  useEffect(() => {
    if (isOpen && participantId) {
      fetchParticipant360();
    }
  }, [isOpen, participantId, selectedProjectId, selectedSubProjectId]);

  const fetchParticipant360 = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`/api/projects/participant-360/${encodeURIComponent(participantId)}?projectId=${selectedProjectId}&subProjectId=${selectedSubProjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch participant 360:', err);
      const msg = err.response?.data?.error || (err.response?.status === 403 ? 'Forbidden: You do not have permission to view this participant.' : 'Unable to load participant profile.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const profile = data?.profile || {};
  const training = data?.training || {};
  const quiz = data?.quiz || {};
  const certification = data?.certification || {};
  const readinessAudit = data?.readinessAudit || [];
  const learningJourney = data?.learningJourney || [];

  const isOverallEligible = certification.eligibility === 'ELIGIBLE';
  const overallStatusColor = isOverallEligible 
    ? '#10B981' 
    : certification.eligibility === 'PENDING' ? '#F59E0B' : '#EF4444';

  const filteredQuizHistory = (quiz.history || []).filter(h => {
    if (quizTypeFilter === 'ALL') return true;
    return h.type === quizTypeFilter;
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        color: '#0F172A',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '880px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.2rem',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
            }}>
              {profile.name ? profile.name.charAt(0).toUpperCase() : <User size={24} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                  {profile.name || 'Participant 360'}
                </h3>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'rgba(2, 132, 199, 0.1)',
                  color: '#0284C7'
                }}>
                  {profile.employeeId || 'EMP-101'}
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                {profile.designation} • {profile.project} {profile.subproject && `(${profile.subproject})`}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTop: '3px solid #0284C7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Loading Participant 360 intelligence...
            </div>
          ) : error ? (
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: '8px', fontWeight: 600 }}>
              <AlertCircle size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              {error}
            </div>
          ) : (
            <>
              {/* ─── LEVEL 4A: 7-STAGE VISUAL LEARNING JOURNEY ─── */}
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
                  Participant Learning Journey
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflowX: 'auto', gap: '8px', paddingBottom: '4px' }}>
                  {learningJourney.map((step, idx) => {
                    const isCompleted = step.status === 'Completed';
                    const isFailed = step.status === 'Failed';
                    const badgeBg = isCompleted ? '#10B981' : isFailed ? '#EF4444' : '#F59E0B';

                    return (
                      <React.Fragment key={idx}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px', textAlign: 'center' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: badgeBg,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            marginBottom: '6px'
                          }}>
                            {isCompleted ? '✓' : isFailed ? '✕' : '⚠'}
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase' }}>
                            {step.stage}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px', lineHeight: '1.2' }}>
                            {step.detail}
                          </span>
                        </div>
                        {idx < learningJourney.length - 1 && (
                          <div style={{ flex: 1, height: '2px', background: isCompleted ? '#10B981' : '#CBD5E1', minWidth: '20px', marginBottom: '20px' }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* ─── LEVEL 4B: VISIBLY EXPLAINABLE CERTIFICATION READINESS AUDIT ─── */}
              <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{
                  padding: '12px 16px',
                  background: isOverallEligible ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color={overallStatusColor} />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>
                      Certification Readiness Audit
                    </span>
                  </div>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    background: `${overallStatusColor}18`,
                    color: overallStatusColor
                  }}>
                    {isOverallEligible ? 'CERTIFICATION ELIGIBLE' : 'NOT ELIGIBLE'}
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                      <th style={{ padding: '10px 14px' }}>Requirement</th>
                      <th style={{ padding: '10px 14px' }}>Benchmark Threshold</th>
                      <th style={{ padding: '10px 14px' }}>Participant Result</th>
                      <th style={{ padding: '10px 14px' }}>Audit Status</th>
                      <th style={{ padding: '10px 14px' }}>Audit Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readinessAudit.map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>{r.requirement}</td>
                        <td style={{ padding: '10px 14px', color: '#64748B' }}>{r.threshold}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: r.passed ? '#10B981' : '#EF4444' }}>
                          {r.result}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: r.passed ? '#10B98118' : '#EF444418',
                            color: r.passed ? '#10B981' : '#EF4444'
                          }}>
                            {r.passed ? '✓ Eligible' : '✕ Ineligible'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: r.passed ? '#64748B' : '#EF4444', fontWeight: r.passed ? 400 : 600 }}>
                          {r.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ─── LEVEL 4C: TRAINING & ATTENDANCE INTELLIGENCE ─── */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: 800, color: '#0284C7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} /> Training & Attendance Summary
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Assigned</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>{training.sessionsAssigned || 0}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Attended</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px', color: '#10B981' }}>{training.sessionsAttended || 0}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Attendance %</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px', color: '#0284C7' }}>{training.attendancePercentage || '0%'}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Learning Time</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>{training.totalLearningTime || '0m'}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Avg Session Duration</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>{training.averageSessionDuration || '0m'}</div>
                  </div>
                </div>
              </div>

              {/* ─── LEVEL 4D: ASSESSMENT & QUIZ INTELLIGENCE (WITH SOURCE FILTER) ─── */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#F97316', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={16} /> Assessment & Quiz Performance
                  </h4>
                  {/* Source Indicator Filter */}
                  <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '2px', borderRadius: '6px' }}>
                    {['ALL', 'ONLINE', 'OFFLINE'].map(t => (
                      <button
                        key={t}
                        onClick={() => setQuizTypeFilter(t)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: quizTypeFilter === t ? '#0284C7' : 'transparent',
                          color: quizTypeFilter === t ? '#FFFFFF' : '#64748B'
                        }}
                      >
                        {t === 'ALL' ? 'All' : t === 'ONLINE' ? 'Online' : 'Offline'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Assigned</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>{quiz.quizzesAssigned || 0}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Completed</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px', color: '#10B981' }}>{quiz.quizzesCompleted || 0}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Average Score</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px', color: '#8B5CF6' }}>{quiz.averageScore || '0%'}</div>
                  </div>
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Pass Rate</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px', color: '#10B981' }}>{quiz.passRate || '0%'}</div>
                  </div>
                </div>

                {filteredQuizHistory.length > 0 ? (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#64748B' }}>
                          <th style={{ padding: '8px 12px' }}>Assessment Title</th>
                          <th style={{ padding: '8px 12px' }}>Source Format</th>
                          <th style={{ padding: '8px 12px' }}>Score</th>
                          <th style={{ padding: '8px 12px' }}>Status</th>
                          <th style={{ padding: '8px 12px' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredQuizHistory.map((h, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>{h.title}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                                background: h.type === 'ONLINE' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                                color: h.type === 'ONLINE' ? '#2563EB' : '#EA580C'
                              }}>
                                {h.type}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>{h.score}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ color: h.passed ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                                {h.passed ? '✓ Passed' : '✗ Failed'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: '#64748B' }}>{h.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>
                    No quiz attempts found for filter '{quizTypeFilter}'.
                  </div>
                )}
              </div>

              {/* ─── LEVEL 4E: CERTIFICATION STATUS & VERIFICATION ─── */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={16} /> Credential & Certification Status
                </h4>
                <div style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.88rem' }}>
                      <strong>Certificate ID:</strong> <span style={{ fontFamily: 'monospace', color: '#0284C7', fontWeight: 700 }}>{certification.certificateId}</span>
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '0.82rem', color: '#64748B' }}>
                      Status: <strong>{certification.status}</strong> • Issue Date: {certification.issueDate}
                    </div>
                  </div>

                  {certification.certificateId && certification.certificateId !== 'PENDING-ISSUE' && (
                    <a
                      href={`/verify/${certification.certificateId}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: '#0284C7',
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ExternalLink size={14} /> Verify Certificate
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#F8FAFC'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
