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
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #2563EB', borderTopColor: 'transparent', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
        Loading administrative command center...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ─── QUICK ACTIONS WIDGET ─── */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
          Administrative Quick Actions
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/trainings')}>
            <Calendar size={15} /> Create Training Session
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/users')}>
            <Users size={15} /> Add Users
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/users')}>
            <Upload size={15} /> Import Learners
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/builder')}>
            <PenTool size={15} /> Create Quiz
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/reports')}>
            <FileText size={15} /> Publish Assessment
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/certificates')}>
            <Award size={15} /> Issue Certificate
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/reports')}>
            <BarChart3 size={15} /> Generate Report
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/notifications')}>
            <Bell size={15} /> Broadcast Notification
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/offline-sync')}>
            <RefreshCw size={15} /> Force Device Sync
          </button>
        </div>
      </div>

      {/* ─── METRICS CARDS GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        
        {/* Workforce Card */}
        <div className="glass-card" style={{ borderTop: '3px solid #2563EB', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <Users size={20} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>Workforce Roster</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Total Registered Users</span>
              <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{stats.workforce.totalRegisteredUsers}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Active Users</span>
              <strong style={{ fontSize: '1.1rem', color: '#10B981' }}>{stats.workforce.activeUsers}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Trainers</span>
              <strong style={{ fontSize: '1.1rem', color: '#2563EB' }}>{stats.workforce.trainers}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Supervisors</span>
              <strong style={{ fontSize: '1.1rem', color: '#06B6D4' }}>{stats.workforce.supervisors}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Learners</span>
              <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{stats.workforce.learners}</strong>
            </div>
          </div>
        </div>

        {/* Training Sessions Card */}
        <div className="glass-card" style={{ borderTop: '3px solid #10B981', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
              <Presentation size={20} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>Training Sessions</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Trainings Conducted</span>
              <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{stats.training.trainingsConducted}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Upcoming Trainings</span>
              <strong style={{ fontSize: '1.1rem', color: '#2563EB' }}>{stats.training.upcomingTrainings}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Ongoing Sessions</span>
              <strong style={{ fontSize: '1.1rem', color: '#10B981' }}>{stats.training.ongoingSessions}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Cancelled Sessions</span>
              <strong style={{ fontSize: '1.1rem', color: '#EF4444' }}>{stats.training.cancelledSessions}</strong>
            </div>
          </div>
        </div>

        {/* Attendance Analytics Card */}
        <div className="glass-card" style={{ borderTop: '3px solid #F59E0B', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
              <ClipboardList size={20} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>Attendance Tracking</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Attendance Recorded</span>
              <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{stats.attendance.attendanceRecorded}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Attendance %</span>
              <strong style={{ fontSize: '1.1rem', color: '#10B981' }}>{stats.attendance.attendancePercent}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Absentees</span>
              <strong style={{ fontSize: '1.1rem', color: '#EF4444' }}>{stats.attendance.absentees}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Exceptions</span>
              <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{stats.attendance.exceptions}</strong>
            </div>
          </div>
        </div>

        {/* Assessments Card */}
        <div className="glass-card" style={{ borderTop: '3px solid #8B5CF6', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>
              <FileText size={20} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>Assessments &amp; Testing</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Assessments Conducted</span>
              <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{stats.assessments.assessmentsConducted}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Participants Assessed</span>
              <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{stats.assessments.participantsAssessed}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Pass Rate</span>
              <strong style={{ fontSize: '1.1rem', color: '#10B981' }}>{stats.assessments.passRate}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Fail Rate</span>
              <strong style={{ fontSize: '1.1rem', color: '#EF4444' }}>{stats.assessments.failRate}%</strong>
            </div>
          </div>
        </div>

        {/* Certifications Card */}
        <div className="glass-card" style={{ borderTop: '3px solid #06B6D4', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06B6D4' }}>
              <Award size={20} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>Certifications</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Certificates Issued</span>
              <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{stats.certifications.certificatesIssued}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Expiring Certificates</span>
              <strong style={{ fontSize: '1.1rem', color: '#F59E0B' }}>{stats.certifications.expiringCertificates}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Revoked Certificates</span>
              <strong style={{ fontSize: '1.1rem', color: '#EF4444' }}>{stats.certifications.revokedCertificates}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Re-certification Due</span>
              <strong style={{ fontSize: '1.1rem', color: '#2563EB' }}>{stats.certifications.recertificationDue}</strong>
            </div>
          </div>
        </div>

        {/* Offline Sync Card */}
        <div className="glass-card" style={{ borderTop: '3px solid #0891B2', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(8, 145, 178, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891B2' }}>
              <Smartphone size={20} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>Field &amp; Offline Sync</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Devices Synced Today</span>
              <strong style={{ fontSize: '1.1rem', color: '#0891B2' }}>{stats.offlineSync.devicesSyncedToday}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Pending Synchronizations</span>
              <strong style={{ fontSize: '1.1rem', color: '#0F172A' }}>{stats.offlineSync.pendingSyncs}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Failed Synchronizations</span>
              <strong style={{ fontSize: '1.1rem', color: '#EF4444' }}>{stats.offlineSync.failedSyncs}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.88rem' }}>Last Sync Timestamp</span>
              <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>{stats.offlineSync.lastSyncTimestamp ? new Date(stats.offlineSync.lastSyncTimestamp).toLocaleTimeString() : 'Active'}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* ─── PROJECTS & CLIENTS BANNER ─── */}
      <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #2563EB' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A', margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 800 }}>
          <Briefcase size={18} color="#2563EB" /> Projects &amp; Commercial Accounts
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Active Projects</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>{stats.projects.activeProjects}</div>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Clients Served</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>{stats.projects.clientsServed}</div>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Regions Covered</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>{stats.projects.regionsCovered}</div>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Stores &amp; Outlets</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A' }}>{stats.projects.storesCovered}</div>
          </div>
        </div>
      </div>

    </div>
  );
}
