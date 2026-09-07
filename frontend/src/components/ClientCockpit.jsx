import React, { useState, useEffect, useContext } from 'react';
import { 
  Briefcase, 
  Calendar, 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  Search, 
  Filter, 
  ExternalLink, 
  FileText, 
  ShieldCheck, 
  Clock, 
  X,
  ChevronRight,
  Sparkles,
  BarChart3,
  Percent
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function ClientCockpit() {
  const { token, user } = useContext(AuthContext);

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [metrics, setMetrics] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  // Participant 360 Modal States
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [participant360Data, setParticipant360Data] = useState(null);
  const [loading360, setLoading360] = useState(false);
  const [error360, setError360] = useState(null);

  const authToken = token || localStorage.getItem('jwt');

  // Fetch authorized projects on mount
  useEffect(() => {
    if (authToken) {
      fetchProjects();
    }
  }, [authToken]);

  // Fetch metrics & participants whenever selected project changes
  useEffect(() => {
    if (authToken) {
      fetchCockpitData();
    }
  }, [selectedProjectId, authToken]);

  const fetchProjects = async () => {
    const t = token || localStorage.getItem('jwt');
    if (!t) return;
    try {
      const res = await axios.get('/api/client/projects', {
        headers: { Authorization: `Bearer ${t}` }
      });
      setProjects(res.data || []);
    } catch (err) {
      console.error('Failed to fetch client projects:', err);
    }
  };

  const fetchCockpitData = async (silent = false) => {
    const t = token || localStorage.getItem('jwt');
    if (!t) return;
    if (!silent) setLoading(true);
    else setSyncing(true);
    setError(null);

    try {
      const [metricsRes, participantsRes] = await Promise.all([
        axios.get(`/api/client/cockpit?projectId=${selectedProjectId}`, {
          headers: { Authorization: `Bearer ${t}` }
        }),
        axios.get(`/api/client/participants?projectId=${selectedProjectId}&search=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${t}` }
        })
      ]);

      setMetrics(metricsRes.data);
      setParticipants(participantsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch cockpit data:', err);
      setError(err.response?.data?.error || 'Failed to load cockpit metrics.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
  };

  const executeSearch = async () => {
    const t = token || localStorage.getItem('jwt');
    if (!t) return;
    try {
      const res = await axios.get(`/api/client/participants?projectId=${selectedProjectId}&search=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      setParticipants(res.data || []);
    } catch (err) {
      console.error('Failed to search participants:', err);
    }
  };

  const openParticipant360 = async (participantId) => {
    const t = token || localStorage.getItem('jwt');
    if (!t) return;
    setSelectedParticipantId(participantId);
    setLoading360(true);
    setError360(null);
    setParticipant360Data(null);

    try {
      const res = await axios.get(`/api/projects/participant-360/${participantId}`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      setParticipant360Data(res.data);
    } catch (err) {
      console.error('Participant 360 error:', err);
      setError360(err.response?.data?.error || 'Failed to load participant profile.');
    } finally {
      setLoading360(false);
    }
  };

  const closeParticipant360 = () => {
    setSelectedParticipantId(null);
    setParticipant360Data(null);
    setError360(null);
  };

  return (
    <div className="client-cockpit" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', color: '#F8FAFC' }}>
      
      {/* ─── COCKPIT HEADER ─── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(51, 65, 85, 0.8)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '28px',
        boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
                color: '#FFFFFF',
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '4px 10px',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}>
                CLIENT PERFORMANCE COCKPIT
              </span>
              <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>•</span>
              <span style={{ color: '#38BDF8', fontSize: '0.85rem', fontWeight: 600 }}>
                {user?.name || 'Client Executive'}
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F8FAFC' }}>
              Training Program Health & Business Outcomes
            </h1>
            <p style={{ margin: '6px 0 0 0', color: '#94A3B8', fontSize: '0.9rem' }}>
              Authorized operational performance metrics, attendance tracking, and certification milestones.
            </p>
          </div>

          {/* Project Selector & Refresh Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{
                  background: '#0F172A',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minWidth: '220px',
                  outline: 'none'
                }}
              >
                <option value="all">All Authorized Projects ({projects.length})</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.subProjects?.length > 0 ? `(${p.subProjects.length} subprojects)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fetchCockpitData(true)}
              disabled={syncing || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                color: '#38BDF8',
                border: '1px solid #334155',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              <span>{syncing ? 'Updating...' : 'Sync Live'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          color: '#FCA5A5',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* ─── 9 REAL DATABASE KPIS ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {/* KPI 1: Active Projects */}
        <div style={kpiCardStyle('#3B82F6')}>
          <div style={kpiIconStyle('rgba(59, 130, 246, 0.15)', '#60A5FA')}>
            <Briefcase size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Active Projects</div>
            <div style={kpiValueStyle}>{loading ? '—' : metrics?.activeProjects ?? 0}</div>
            <div style={kpiSubStyle}>Authorized initiatives</div>
          </div>
        </div>

        {/* KPI 2: Active Training Sessions */}
        <div style={kpiCardStyle('#06B6D4')}>
          <div style={kpiIconStyle('rgba(6, 182, 212, 0.15)', '#22D3EE')}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Active Training Sessions</div>
            <div style={kpiValueStyle}>{loading ? '—' : metrics?.activeTrainingSessions ?? 0}</div>
            <div style={kpiSubStyle}>Curriculum modules</div>
          </div>
        </div>

        {/* KPI 3: Total Participants */}
        <div style={kpiCardStyle('#8B5CF6')}>
          <div style={kpiIconStyle('rgba(139, 92, 246, 0.15)', '#A78BFA')}>
            <Users size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Total Participants</div>
            <div style={kpiValueStyle}>{loading ? '—' : metrics?.totalParticipants ?? 0}</div>
            <div style={kpiSubStyle}>Enrolled workforce</div>
          </div>
        </div>

        {/* KPI 4: Training Completion */}
        <div style={kpiCardStyle('#10B981')}>
          <div style={kpiIconStyle('rgba(16, 185, 129, 0.15)', '#34D399')}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Training Completion</div>
            <div style={kpiValueStyle}>{loading ? '—' : `${metrics?.trainingCompletionRate ?? 0}%`}</div>
            <div style={kpiSubStyle}>Module completion</div>
          </div>
        </div>

        {/* KPI 5: Attendance Rate */}
        <div style={kpiCardStyle('#F59E0B')}>
          <div style={kpiIconStyle('rgba(245, 158, 11, 0.15)', '#FBBF24')}>
            <Clock size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Attendance Rate</div>
            <div style={kpiValueStyle}>{loading ? '—' : `${metrics?.attendanceRate ?? 0}%`}</div>
            <div style={kpiSubStyle}>Verified presence</div>
          </div>
        </div>

        {/* KPI 6: Assessment Average */}
        <div style={kpiCardStyle('#3B82F6')}>
          <div style={kpiIconStyle('rgba(59, 130, 246, 0.15)', '#60A5FA')}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Assessment Average</div>
            <div style={kpiValueStyle}>{loading ? '—' : `${metrics?.assessmentAverageScore ?? 0}%`}</div>
            <div style={kpiSubStyle}>Class performance</div>
          </div>
        </div>

        {/* KPI 7: Assessment Pass Rate */}
        <div style={kpiCardStyle('#10B981')}>
          <div style={kpiIconStyle('rgba(16, 185, 129, 0.15)', '#34D399')}>
            <Percent size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Assessment Pass Rate</div>
            <div style={kpiValueStyle}>{loading ? '—' : `${metrics?.assessmentPassRate ?? 0}%`}</div>
            <div style={kpiSubStyle}>Meeting benchmark</div>
          </div>
        </div>

        {/* KPI 8: Certification Progress */}
        <div style={kpiCardStyle('#EC4899')}>
          <div style={kpiIconStyle('rgba(236, 72, 153, 0.15)', '#F472B6')}>
            <Award size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>Certification Progress</div>
            <div style={kpiValueStyle}>{loading ? '—' : `${metrics?.certificationProgress ?? 0}%`}</div>
            <div style={kpiSubStyle}>{metrics?.certifiedParticipants ?? 0} certified</div>
          </div>
        </div>

        {/* KPI 9: At-Risk Participants */}
        <div style={kpiCardStyle(metrics?.atRiskParticipants > 0 ? '#EF4444' : '#10B981')}>
          <div style={kpiIconStyle(metrics?.atRiskParticipants > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', metrics?.atRiskParticipants > 0 ? '#F87171' : '#34D399')}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={kpiLabelStyle}>At-Risk Participants</div>
            <div style={kpiValueStyle}>{loading ? '—' : metrics?.atRiskParticipants ?? 0}</div>
            <div style={kpiSubStyle}>Action recommended</div>
          </div>
        </div>
      </div>

      {/* ─── PROJECT BREAKDOWN SECTION ─── */}
      {metrics?.projectBreakdown && metrics.projectBreakdown.length > 0 && (
        <div style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                Project Health & Performance Matrix
              </h3>
              <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.85rem' }}>
                Comparative delivery outcomes across your assigned program scopes.
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
              {metrics.projectBreakdown.length} Initiative{metrics.projectBreakdown.length > 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8' }}>
                  <th style={{ padding: '12px 16px' }}>Project Name</th>
                  <th style={{ padding: '12px 16px' }}>Code</th>
                  <th style={{ padding: '12px 16px' }}>Participants</th>
                  <th style={{ padding: '12px 16px' }}>Attendance</th>
                  <th style={{ padding: '12px 16px' }}>Avg Score</th>
                  <th style={{ padding: '12px 16px' }}>Pass Rate</th>
                  <th style={{ padding: '12px 16px' }}>Certified</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.projectBreakdown.map((pb, idx) => (
                  <tr key={pb.id || idx} style={{ borderBottom: '1px solid #1E293B', transition: 'background 0.2s' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#F8FAFC' }}>
                      {pb.name}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B', fontFamily: 'monospace' }}>
                      {pb.code || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#CBD5E1' }}>
                      {pb.participants}
                    </td>
                    <td style={{ padding: '14px 16px', color: pb.attendanceRate >= 75 ? '#34D399' : '#F87171', fontWeight: 600 }}>
                      {pb.attendanceRate}%
                    </td>
                    <td style={{ padding: '14px 16px', color: pb.avgScore >= 70 ? '#38BDF8' : '#F87171', fontWeight: 600 }}>
                      {pb.avgScore}%
                    </td>
                    <td style={{ padding: '14px 16px', color: pb.passRate >= 70 ? '#34D399' : '#FBBF24', fontWeight: 600 }}>
                      {pb.passRate}%
                    </td>
                    <td style={{ padding: '14px 16px', color: '#F472B6', fontWeight: 600 }}>
                      {pb.certified}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: pb.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                        color: pb.status === 'Active' ? '#34D399' : '#94A3B8'
                      }}>
                        {pb.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── PARTICIPANT PERFORMANCE ROSTER ─── */}
      <div style={{
        background: '#0F172A',
        border: '1px solid #1E293B',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
              Participant Performance & Certification Roster
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.85rem' }}>
              Individual progress tracking scoped strictly to your contracted participants.
            </p>
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search by name or employee ID..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
                style={{
                  background: '#1E293B',
                  color: '#F8FAFC',
                  border: '1px solid #334155',
                  padding: '9px 14px 9px 36px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  minWidth: '280px'
                }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            </div>

            <button
              onClick={executeSearch}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Filter
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8' }}>
                <th style={{ padding: '12px 16px' }}>Participant</th>
                <th style={{ padding: '12px 16px' }}>Employee ID</th>
                <th style={{ padding: '12px 16px' }}>Project</th>
                <th style={{ padding: '12px 16px' }}>Attendance</th>
                <th style={{ padding: '12px 16px' }}>Assessment</th>
                <th style={{ padding: '12px 16px' }}>Completion</th>
                <th style={{ padding: '12px 16px' }}>Certification</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Participant 360</th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                    {loading ? 'Loading participants...' : 'No participants found for the selected scope.'}
                  </td>
                </tr>
              ) : (
                participants.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #1E293B', transition: 'background 0.2s' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{p.designation || 'Participant'}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94A3B8', fontFamily: 'monospace' }}>
                      {p.employeeId || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#CBD5E1' }}>
                      {p.projectName}
                    </td>
                    <td style={{ padding: '14px 16px', color: p.attendanceRate >= 75 ? '#34D399' : '#F87171', fontWeight: 600 }}>
                      {p.attendanceRate}%
                    </td>
                    <td style={{ padding: '14px 16px', color: p.avgScore >= 70 ? '#38BDF8' : '#F87171', fontWeight: 600 }}>
                      {p.avgScore}%
                    </td>
                    <td style={{ padding: '14px 16px', color: '#CBD5E1' }}>
                      {p.trainingProgress}%
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {p.certified ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(236, 72, 153, 0.15)',
                          color: '#F472B6',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          <Award size={12} />
                          Certified
                        </span>
                      ) : (
                        <span style={{ color: '#64748B', fontSize: '0.8rem' }}>In Progress</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: p.status === 'Passed' ? 'rgba(16, 185, 129, 0.15)' : (p.status === 'At Risk' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                        color: p.status === 'Passed' ? '#34D399' : (p.status === 'At Risk' ? '#F87171' : '#FBBF24')
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => openParticipant360(p.id)}
                        style={{
                          background: 'transparent',
                          color: '#38BDF8',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Eye size={13} />
                        View 360
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── PARTICIPANT 360 MODAL (STRICT AUTHORIZED CLIENT SCOPE) ─── */}
      {selectedParticipantId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="participant-360-modal" style={{
            background: '#0F172A',
            border: '1px solid #334155',
            borderRadius: '20px',
            maxWidth: '750px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <button
              className="modal-close"
              onClick={closeParticipant360}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#1E293B',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>

            {loading360 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
                <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                <div>Loading Participant 360 evaluation...</div>
              </div>
            ) : error360 ? (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                padding: '20px',
                color: '#FCA5A5',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <AlertTriangle size={24} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Access Denied</div>
                  <div style={{ fontSize: '0.85rem' }}>{error360}</div>
                </div>
              </div>
            ) : participant360Data ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '1.4rem',
                    fontWeight: 800
                  }}>
                    {participant360Data.user?.name ? participant360Data.user.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.05em' }}>
                      PARTICIPANT 360 INTELLIGENCE
                    </div>
                    <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC' }}>
                      {participant360Data.user?.name}
                    </h2>
                    <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
                      {participant360Data.user?.designation || 'Participant'} • {participant360Data.user?.Project?.name || 'Assigned Project'}
                    </div>
                  </div>
                </div>

                {/* Score Summary Metrics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  marginBottom: '24px'
                }}>
                  <div style={{ background: '#1E293B', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Attendance</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34D399', marginTop: '4px' }}>
                      {participant360Data.metrics?.attendanceRate ?? 0}%
                    </div>
                  </div>
                  <div style={{ background: '#1E293B', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Assessment Avg</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38BDF8', marginTop: '4px' }}>
                      {participant360Data.metrics?.avgScore ?? 0}%
                    </div>
                  </div>
                  <div style={{ background: '#1E293B', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Status</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FBBF24', marginTop: '6px' }}>
                      {participant360Data.metrics?.status || 'Active'}
                    </div>
                  </div>
                </div>

                {/* Training History */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 700, color: '#CBD5E1' }}>
                    Training Modules Progress
                  </h4>
                  {participant360Data.trainings && participant360Data.trainings.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {participant360Data.trainings.map((t, idx) => (
                        <div key={idx} style={{
                          background: '#1E293B',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.85rem'
                        }}>
                          <span style={{ fontWeight: 600, color: '#F8FAFC' }}>{t.title}</span>
                          <span style={{
                            color: t.completed ? '#34D399' : '#FBBF24',
                            fontWeight: 700,
                            fontSize: '0.75rem'
                          }}>
                            {t.completed ? 'COMPLETED' : 'IN PROGRESS'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#64748B', fontSize: '0.85rem' }}>No modules recorded yet.</div>
                  )}
                </div>

                {/* Certificates */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 700, color: '#CBD5E1' }}>
                    Issued Credentials
                  </h4>
                  {participant360Data.certificates && participant360Data.certificates.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {participant360Data.certificates.map(c => (
                        <div key={c.id} style={{
                          background: 'rgba(236, 72, 153, 0.1)',
                          border: '1px solid rgba(236, 72, 153, 0.3)',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.85rem'
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#F472B6' }}>{c.certificate_id}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Issued: {c.issueDate ? new Date(c.issueDate).toLocaleDateString() : 'N/A'}</div>
                          </div>
                          <Link
                            to="/certificates"
                            style={{
                              color: '#38BDF8',
                              textDecoration: 'none',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>View Ledger</span>
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#64748B', fontSize: '0.85rem' }}>No certificates issued yet.</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper styling functions for Cockpit Cards
const kpiCardStyle = (accentColor) => ({
  background: '#0F172A',
  border: '1px solid #1E293B',
  borderRadius: '14px',
  padding: '20px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '16px',
  borderTop: `3px solid ${accentColor}`,
  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.3)'
});

const kpiIconStyle = (bg, color) => ({
  width: '42px',
  height: '42px',
  borderRadius: '10px',
  background: bg,
  color: color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
});

const kpiLabelStyle = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#94A3B8',
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
};

const kpiValueStyle = {
  fontSize: '1.65rem',
  fontWeight: 800,
  color: '#F8FAFC',
  margin: '4px 0 2px 0'
};

const kpiSubStyle = {
  fontSize: '0.72rem',
  color: '#64748B'
};
