import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
  BookOpen, Award, CheckCircle2, Clock, Play, ArrowRight, 
  ExternalLink, AlertTriangle, TrendingUp, Radio, FileText, 
  Sparkles, Calendar, ChevronRight, RefreshCw, CheckCircle,
  Video, Eye, ShieldCheck, Zap
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from './ui/PageHeader';
import KpiCard from './ui/KpiCard';
import StatusBadge from './ui/StatusBadge';
import EmptyState from './ui/EmptyState';
import LoadingSkeleton from './ui/LoadingSkeleton';
import CertificateViewer from './CertificateViewer';

export default function EmployeeDashboard() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [trainings, setTrainings] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCertId, setSelectedCertId] = useState(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  const fetchEmployeeData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setSyncing(true);

      const headers = { Authorization: `Bearer ${token}` };
      const [trRes, certRes, qzRes] = await Promise.all([
        axios.get('/api/trainings', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/certificates', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/quizzes', { headers }).catch(() => ({ data: [] }))
      ]);

      setTrainings(Array.isArray(trRes.data) ? trRes.data : []);
      setCertificates(Array.isArray(certRes.data) ? certRes.data : []);
      setQuizzes(Array.isArray(qzRes.data) ? qzRes.data : []);
    } catch (err) {
      console.error('Failed to load employee learning data', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchEmployeeData(false);
    }
  }, [token]);

  // Derived real metrics
  const totalAssigned = trainings.length;
  const completedTrainings = trainings.filter(t => t.completed);
  const completedCount = completedTrainings.length;
  const inProgressTrainings = trainings.filter(t => !t.completed);
  const progressPct = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;
  
  // Real cert metrics
  const primaryCert = certificates.length > 0 ? certificates[0] : null;
  const avgAssessmentScore = primaryCert?.assessmentScore != null ? `${primaryCert.assessmentScore}%` : '—';
  const attendanceRate = primaryCert?.attendancePercentage != null ? `${primaryCert.attendancePercentage}%` : '—';
  const certificatesEarned = certificates.length;
  
  // Active / continue item
  const continueItem = inProgressTrainings.length > 0 ? inProgressTrainings[0] : null;

  // Attention Items
  const attentionItems = [];
  if (continueItem) {
    attentionItems.push({
      type: 'amber',
      title: 'Training Module Incomplete',
      desc: `Continue "${continueItem.title}" to advance your curriculum progress.`,
      actionText: 'Resume Module',
      action: () => navigate('/trainings')
    });
  }
  if (quizzes.length > 0) {
    attentionItems.push({
      type: 'blue',
      title: 'Assessment Available',
      desc: `"${quizzes[0].title}" is ready for testing. Test your capability retention now.`,
      actionText: 'Take Assessment',
      action: () => navigate('/join')
    });
  }
  if (certificatesEarned > 0) {
    attentionItems.push({
      type: 'green',
      title: 'Verified Credential Issued',
      desc: `Certificate #${primaryCert?.certificate_id || 'ID'} is verified and ready for download.`,
      actionText: 'View Credential',
      action: () => {
        if (primaryCert) {
          setSelectedCertId(primaryCert.id);
          setIsCertModalOpen(true);
        }
      }
    });
  }

  const handleOpenCertificate = (cert) => {
    setSelectedCertId(cert.id);
    setIsCertModalOpen(true);
  };

  if (loading) {
    return (
      <div className="employee-workspace-page" style={{ padding: '24px 32px 56px', background: 'var(--re-bg, #F6F8FC)' }}>
        <LoadingSkeleton type="kpi" count={4} />
        <div style={{ marginTop: '24px' }}>
          <LoadingSkeleton type="table" count={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="employee-workspace-page employee-dashboard-page" style={{
      minHeight: '100%',
      background: 'var(--re-bg, #F6F8FC)',
      padding: '24px 32px 56px',
      color: 'var(--re-text, #0F172A)'
    }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ─── 1. PAGE HEADER ─── */}
        <PageHeader
          eyebrow="MY LEARNING"
          badge={user?.name ? `Welcome back, ${user.name}` : undefined}
          title="Learning & Performance"
          subtitle="Stay on top of your training, assessments and professional development."
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                id="employee-sync-btn"
                onClick={() => fetchEmployeeData(true)}
                disabled={syncing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
                  transition: 'background 0.15s ease'
                }}
              >
                <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none', color: '#64748B' }} />
                <span>{syncing ? 'Syncing...' : 'Sync'}</span>
              </button>
            </div>
          }
        />

        {/* ─── 2. KPI AREA (PERSONAL WORKSPACE METRICS) ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px'
        }}>
          <KpiCard
            title="Assigned Training"
            value={totalAssigned}
            subtitle={totalAssigned > 0 ? `${completedCount} Completed` : 'No modules assigned'}
            status="info"
            icon={<BookOpen size={20} />}
          />
          <KpiCard
            title="Completed Training"
            value={completedCount}
            subtitle={`${totalAssigned - completedCount} in progress`}
            status={completedCount > 0 ? 'success' : 'neutral'}
            icon={<CheckCircle2 size={20} />}
          />
          <KpiCard
            title="Training Progress"
            value={`${progressPct}%`}
            subtitle="Curriculum completion"
            status={progressPct >= 75 ? 'success' : progressPct >= 50 ? 'warning' : 'neutral'}
            icon={<TrendingUp size={20} />}
          />
          <KpiCard
            title="Attendance"
            value={attendanceRate}
            subtitle="Session attendance rate"
            status={primaryCert?.attendancePercentage >= 80 ? 'success' : 'neutral'}
            icon={<Clock size={20} />}
          />
          <KpiCard
            title="Assessment Average"
            value={avgAssessmentScore}
            subtitle="Score across assessments"
            status={primaryCert?.assessmentScore >= 70 ? 'success' : 'neutral'}
            icon={<Sparkles size={20} />}
          />
          <KpiCard
            title="Quiz Completion"
            value={quizzes.length > 0 ? quizzes.length : '—'}
            subtitle="Available assessments"
            status="info"
            icon={<FileText size={20} />}
          />
          <KpiCard
            title="Certificates Earned"
            value={certificatesEarned}
            subtitle={certificatesEarned > 0 ? 'Verified credentials' : 'No credentials yet'}
            status={certificatesEarned > 0 ? 'success' : 'neutral'}
            icon={<Award size={20} />}
          />
        </div>

        {/* ─── 3. CONTINUE LEARNING PROMINENT ACTION CARD ─── */}
        <div style={{
          background: 'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)',
          borderRadius: '12px',
          padding: '24px 28px',
          color: '#FFFFFF',
          boxShadow: 'var(--re-shadow-md, 0 4px 6px -1px rgba(15, 23, 42, 0.08))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ maxWidth: '680px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '10px' }}>
                <Zap size={13} />
                CONTINUE LEARNING
              </div>
              {continueItem ? (
                <>
                  <h2 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                    {continueItem.title}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#E2E8F0', lineHeight: 1.5 }}>
                    {continueItem.description || 'Continue your curriculum module to meet compliance and capability requirements.'}
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    You're all caught up!
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#E2E8F0', lineHeight: 1.5 }}>
                    No incomplete training requires your attention. Keep up the high standard!
                  </p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {continueItem ? (
                <button
                  id="employee-continue-training-btn"
                  onClick={() => navigate('/trainings')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 22px',
                    background: '#FFFFFF',
                    color: '#1E40AF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                  }}
                >
                  <Play size={16} fill="#1E40AF" />
                  <span>Continue Training</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/trainings')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    background: 'rgba(255,255,255,0.15)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <BookOpen size={16} />
                  <span>Review Modules</span>
                </button>
              )}
            </div>
          </div>

          {continueItem && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600 }}>
                <span>Program: {continueItem.Project?.name || 'General Curriculum'}</span>
                <span>Type: {continueItem.type || 'Video'} • Duration: {continueItem.duration || 'Self-paced'}</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── 4. WHAT NEEDS MY ATTENTION ─── */}
        <div style={{
          background: 'var(--re-surface, #FFFFFF)',
          borderRadius: '12px',
          border: '1px solid var(--re-border, #E2E8F0)',
          padding: '20px 24px',
          boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertTriangle size={18} color="#F59E0B" />
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
              What Needs My Attention
            </h3>
          </div>

          {attentionItems.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
              {attentionItems.map((item, idx) => {
                const borderColors = {
                  amber: '#F59E0B',
                  blue: '#2563EB',
                  green: '#10B981',
                  red: '#EF4444'
                };
                const bgColors = {
                  amber: '#FFFBEB',
                  blue: '#EFF6FF',
                  green: '#F0FDF4',
                  red: '#FEF2F2'
                };
                return (
                  <div key={idx} style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    background: bgColors[item.type] || '#F8FAFC',
                    border: `1px solid ${borderColors[item.type]}33`,
                    borderLeft: `4px solid ${borderColors[item.type]}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                        {item.desc}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={item.action}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#0F172A',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        <span>{item.actionText}</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '8px', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
              You're all caught up! There are no outstanding learning actions.
            </div>
          )}
        </div>

        {/* ─── 5. TWO-COLUMN WORKSPACE: MY LEARNING & ASSESSMENTS ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>

          {/* Section: My Learning */}
          <div style={{
            background: 'var(--re-surface, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid var(--re-border, #E2E8F0)',
            padding: '20px 24px',
            boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                  My Learning Modules
                </h3>
              </div>
              <button
                onClick={() => navigate('/trainings')}
                style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                View All ({trainings.length}) <ChevronRight size={14} />
              </button>
            </div>

            {trainings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {trainings.slice(0, 4).map(tr => (
                  <div key={tr.id} style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    transition: 'border-color 0.15s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: tr.completed ? '#F0FDF4' : '#EFF6FF',
                        color: tr.completed ? '#10B981' : '#2563EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {tr.completed ? <CheckCircle2 size={18} /> : <Video size={18} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tr.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <span>{tr.Project?.name || 'General'}</span>
                          <span>•</span>
                          <span>{tr.duration || 'Self-paced'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <StatusBadge status={tr.completed ? 'completed' : 'in_progress'} />
                      <button
                        onClick={() => navigate('/trainings')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: tr.completed ? '#F8FAFC' : '#EFF6FF',
                          border: `1px solid ${tr.completed ? '#E2E8F0' : '#BFDBFE'}`,
                          color: tr.completed ? '#475569' : '#1E40AF',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {tr.completed ? 'Review' : 'Start'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No training assigned yet"
                message="Your assigned learning programs will appear here."
              />
            )}
          </div>

          {/* Section: My Assessments */}
          <div style={{
            background: 'var(--re-surface, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid var(--re-border, #E2E8F0)',
            padding: '20px 24px',
            boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#8B5CF6" />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                  My Assessments
                </h3>
              </div>
              <button
                onClick={() => navigate('/join')}
                style={{ background: 'none', border: 'none', color: '#8B5CF6', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Join Arena <ChevronRight size={14} />
              </button>
            </div>

            {quizzes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {quizzes.slice(0, 4).map(qz => (
                  <div key={qz.id} style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px'
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {qz.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span>{qz.config?.category || 'Retail Excellence'}</span>
                        <span>•</span>
                        <span>Pass mark: {qz.config?.passing_score || 70}%</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <button
                        onClick={() => navigate('/join')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          background: '#8B5CF6',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Start Quiz
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No assessments pending"
                message="You have no upcoming quizzes scheduled."
              />
            )}
          </div>

        </div>

        {/* ─── 6. PERFORMANCE & CREDENTIALS ROW ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>

          {/* Personal Performance & Trend */}
          <div style={{
            background: 'var(--re-surface, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid var(--re-border, #E2E8F0)',
            padding: '20px 24px',
            boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#10B981" />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                My Performance &amp; Evaluation
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Assessment Score</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {avgAssessmentScore}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600, marginTop: '2px' }}>
                  Target: ≥70%
                </div>
              </div>

              <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Attendance Record</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                  {attendanceRate}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600, marginTop: '2px' }}>
                  Target: ≥80%
                </div>
              </div>

              <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Certification Status</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: certificatesEarned > 0 ? '#10B981' : '#64748B', marginTop: '4px' }}>
                  {certificatesEarned > 0 ? 'Eligible' : 'In Progress'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                  {certificatesEarned} Issued
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.82rem', color: '#64748B' }}>
              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Performance Trend</div>
              {primaryCert ? (
                <div>
                  Latest certified performance recorded at <strong>{primaryCert.assessmentScore}%</strong> on {new Date(primaryCert.issueDate).toLocaleDateString()}. Continuing learning sessions to maintain capability benchmark.
                </div>
              ) : (
                <div>Performance trend will appear as you complete more assessments.</div>
              )}
            </div>
          </div>

          {/* Section: My Credentials */}
          <div style={{
            background: 'var(--re-surface, #FFFFFF)',
            borderRadius: '12px',
            border: '1px solid var(--re-border, #E2E8F0)',
            padding: '20px 24px',
            boxShadow: 'var(--re-shadow-sm, 0 1px 2px 0 rgba(15, 23, 42, 0.05))',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="#06B6D4" />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0F172A' }}>
                  My Credentials
                </h3>
              </div>
              <button
                onClick={() => navigate('/certificates')}
                style={{ background: 'none', border: 'none', color: '#06B6D4', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Vault ({certificates.length}) <ChevronRight size={14} />
              </button>
            </div>

            {certificates.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {certificates.map(cert => (
                  <div key={cert.id} style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px'
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>
                        {cert.Project?.name || 'RetailEdge Capability Certificate'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span>ID: {cert.certificate_id}</span>
                        <span>•</span>
                        <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#065F46',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}>
                        {cert.status || 'ISSUED'}
                      </span>
                      <button
                        id="employee-view-cert-btn"
                        onClick={() => handleOpenCertificate(cert)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: '#F0FDFA',
                          border: '1px solid #99F6E4',
                          color: '#0D9488',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Eye size={13} /> View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No credentials yet"
                message="Certificates earned through eligible programs will appear here."
              />
            )}

            {/* Live Arena lightweight shortcut */}
            <div style={{
              marginTop: 'auto',
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#FFF7ED',
              border: '1px solid #FFEDD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={16} color="#EA580C" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9A3412' }}>
                  Live Quiz Arena
                </span>
              </div>
              <button
                onClick={() => navigate('/join')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  background: '#EA580C',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Join Live Session
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ─── CERTIFICATE VIEWER MODAL ─── */}
      {isCertModalOpen && selectedCertId && (
        <CertificateViewer
          isOpen={isCertModalOpen}
          onClose={() => {
            setIsCertModalOpen(false);
            setSelectedCertId(null);
          }}
          certificateId={selectedCertId}
          token={token}
        />
      )}
    </div>
  );
}
