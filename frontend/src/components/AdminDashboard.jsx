import React, { useState, useEffect, useContext } from 'react';
import {
  Users, BarChart2, Award, Calendar, Settings, Shield, BookOpen,
  FolderOpen, CheckCircle, Clock, TrendingUp, AlertCircle, FileText,
  Presentation, Download, Server, Database, Activity, Bell, Lock,
  PlusCircle, Upload, Eye, Edit3, Trash2, RefreshCw, Search, Filter,
  Globe, Mail, MessageSquare, ClipboardList, Star, Zap, AlertTriangle,
  ChevronRight, BarChart3, UserCheck, Layers, Smartphone, Briefcase, ZapOff, PenTool
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard({ allUsers = [], projectsList = [], reports = [], syncTrigger = 0 }) {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/superadmin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch superadmin stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token, syncTrigger]);

  if (loading || !stats) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#5F6875' }}>Loading command center data...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Quick Actions Widget */}
      <div className="glass-card" style={{ padding: '24px', background: '#FFFFFF' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#1F2328' }}>Quick Actions</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/trainings')}><Calendar size={16} /> Create Training Session</button>
          <button className="btn btn-secondary" onClick={() => navigate('/users')}><Users size={16} /> Add Users</button>
          <button className="btn btn-secondary" onClick={() => navigate('/users')}><Upload size={16} /> Import Learners</button>
          <button className="btn btn-secondary" onClick={() => navigate('/builder')}><PenTool size={16} /> Create Quiz</button>
          <button className="btn btn-secondary" onClick={() => navigate('/reports')}><FileText size={16} /> Publish Assessment</button>
          <button className="btn btn-secondary" onClick={() => navigate('/certificates')}><Award size={16} /> Issue Certificate</button>
          <button className="btn btn-secondary" onClick={() => navigate('/reports')}><BarChart3 size={16} /> Generate Report</button>
          <button className="btn btn-secondary" onClick={() => navigate('/notifications')}><Bell size={16} /> Broadcast Notification</button>
          <button className="btn btn-secondary" onClick={() => navigate('/offline-sync')}><RefreshCw size={16} /> Force Device Sync</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* Workforce */}
        <div className="glass-card stat-card" style={{ borderTop: '4px solid #3E5C8A', padding: '24px', background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)', alignItems: 'flex-start' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1F2328', margin: '0', fontSize: '1.1rem', width: '180px', flexShrink: 0 }}>
            <div style={{ padding: '10px', background: 'rgba(62,92,138,0.1)', borderRadius: '10px' }}><Users size={22} color="#3E5C8A" /></div>
            Workforce
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Total Registered Users</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.workforce.totalRegisteredUsers}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Active Users</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.workforce.activeUsers}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Trainers</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.workforce.trainers}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Supervisors</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.workforce.supervisors}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Learners</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.workforce.learners}</strong></div>
          </div>
        </div>

        {/* Training */}
        <div className="glass-card stat-card" style={{ borderTop: '4px solid #3B8C68', padding: '24px', background: 'linear-gradient(145deg, #ffffff 0%, #f6fdf9 100%)', alignItems: 'flex-start' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1F2328', margin: '0', fontSize: '1.1rem', width: '180px', flexShrink: 0 }}>
            <div style={{ padding: '10px', background: 'rgba(59,140,104,0.1)', borderRadius: '10px' }}><Presentation size={22} color="#3B8C68" /></div>
            Training Sessions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Trainings Conducted</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.training.trainingsConducted}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Upcoming Trainings</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.training.upcomingTrainings}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Ongoing Sessions</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.training.ongoingSessions}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Cancelled Sessions</span><strong style={{ fontSize: '1.1rem', color: '#EF4444' }}>{stats.training.cancelledSessions}</strong></div>
          </div>
        </div>

        {/* Attendance */}
        <div className="glass-card stat-card" style={{ borderTop: '4px solid #F59E0B', padding: '24px', background: 'linear-gradient(145deg, #ffffff 0%, #fffcf5 100%)', alignItems: 'flex-start' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1F2328', margin: '0', fontSize: '1.1rem', width: '180px', flexShrink: 0 }}>
            <div style={{ padding: '10px', background: 'rgba(245,158,11,0.1)', borderRadius: '10px' }}><ClipboardList size={22} color="#F59E0B" /></div>
            Attendance Analytics
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Attendance Recorded</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.attendance.attendanceRecorded}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Attendance %</span><strong style={{ fontSize: '1.1rem', color: '#3B8C68' }}>{stats.attendance.attendancePercent}%</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Absentees</span><strong style={{ fontSize: '1.1rem', color: '#EF4444' }}>{stats.attendance.absentees}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Exceptions</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.attendance.exceptions}</strong></div>
          </div>
        </div>

        {/* Assessments */}
        <div className="glass-card stat-card" style={{ borderTop: '4px solid #8B5CF6', padding: '24px', background: 'linear-gradient(145deg, #ffffff 0%, #faf5ff 100%)', alignItems: 'flex-start' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1F2328', margin: '0', fontSize: '1.1rem', width: '180px', flexShrink: 0 }}>
            <div style={{ padding: '10px', background: 'rgba(139,92,246,0.1)', borderRadius: '10px' }}><FileText size={22} color="#8B5CF6" /></div>
            Assessments
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Assessments Conducted</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.assessments.assessmentsConducted}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Participants Assessed</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.assessments.participantsAssessed}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Pass Rate</span><strong style={{ fontSize: '1.1rem', color: '#3B8C68' }}>{stats.assessments.passRate}%</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Fail Rate</span><strong style={{ fontSize: '1.1rem', color: '#EF4444' }}>{stats.assessments.failRate}%</strong></div>
          </div>
        </div>

        {/* Certifications */}
        <div className="glass-card stat-card" style={{ borderTop: '4px solid #F97316', padding: '24px', background: 'linear-gradient(145deg, #ffffff 0%, #fffaf5 100%)', alignItems: 'flex-start' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1F2328', margin: '0', fontSize: '1.1rem', width: '180px', flexShrink: 0 }}>
            <div style={{ padding: '10px', background: 'rgba(249,115,22,0.1)', borderRadius: '10px' }}><Award size={22} color="#F97316" /></div>
            Certifications
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Certificates Issued</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.certifications.certificatesIssued}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Expiring Certificates</span><strong style={{ fontSize: '1.1rem', color: '#F59E0B' }}>{stats.certifications.expiringCertificates}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Revoked Certificates</span><strong style={{ fontSize: '1.1rem', color: '#EF4444' }}>{stats.certifications.revokedCertificates}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Re-certification Due</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.certifications.recertificationDue}</strong></div>
          </div>
        </div>

        {/* Offline Sync */}
        <div className="glass-card stat-card" style={{ borderTop: '4px solid #14B8A6', padding: '24px', background: 'linear-gradient(145deg, #ffffff 0%, #f3fdfb 100%)', alignItems: 'flex-start' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#1F2328', margin: '0', fontSize: '1.1rem', width: '180px', flexShrink: 0 }}>
            <div style={{ padding: '10px', background: 'rgba(20,184,166,0.1)', borderRadius: '10px' }}><Smartphone size={22} color="#14B8A6" /></div>
            Offline Sync
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Devices Synced Today</span><strong style={{ fontSize: '1.1rem', color: '#14B8A6' }}>{stats.offlineSync.devicesSyncedToday}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Pending Synchronizations</span><strong style={{ fontSize: '1.1rem', color: '#1E293B' }}>{stats.offlineSync.pendingSyncs}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Failed Synchronizations</span><strong style={{ fontSize: '1.1rem', color: '#EF4444' }}>{stats.offlineSync.failedSyncs}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748B', fontSize: '0.9rem' }}>Last Sync Timestamp</span><strong style={{ fontSize: '0.85rem', color: '#1E293B' }}>{stats.offlineSync.lastSyncTimestamp ? new Date(stats.offlineSync.lastSyncTimestamp).toLocaleString() : 'N/A'}</strong></div>
          </div>
        </div>

        {/* Projects */}
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid #6366F1', padding: '20px', gridColumn: '1 / -1' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1F2328', margin: '0 0 16px 0' }}><Briefcase size={20} color="#6366F1" /> Projects & Clients</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ background: 'rgba(99,102,241,0.05)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#5F6875', marginBottom: '8px' }}>Active Projects</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F2328' }}>{stats.projects.activeProjects}</div>
            </div>
            <div style={{ background: 'rgba(99,102,241,0.05)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#5F6875', marginBottom: '8px' }}>Clients Served</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F2328' }}>{stats.projects.clientsServed}</div>
            </div>
            <div style={{ background: 'rgba(99,102,241,0.05)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#5F6875', marginBottom: '8px' }}>Regions Covered</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F2328' }}>{stats.projects.regionsCovered}</div>
            </div>
            <div style={{ background: 'rgba(99,102,241,0.05)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#5F6875', marginBottom: '8px' }}>Stores Covered</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F2328' }}>{stats.projects.storesCovered}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
