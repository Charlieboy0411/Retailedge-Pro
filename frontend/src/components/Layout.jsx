import React, { useContext, useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard, PenTool, BarChart3, Settings, LogOut, Bell, Search, 
  Users, FolderOpen, BookOpen, Award, Radio, MapPin, ClipboardList, 
  Trophy, Network, AlertTriangle, Calendar, Shield, Briefcase, FileText, 
  RefreshCw, Archive, Sparkles, ChevronDown, CheckCircle2
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const getDetectedDashboard = (pathname, role) => {
  if (pathname.includes('/pm-dashboard')) {
    if (role === 'MD') return 'MD Dashboard';
    if (role === 'COO') return 'COO Dashboard';
    if (role === 'VP Operations') return 'VP Operations Dashboard';
    if (role === 'Client') return 'Client Dashboard';
    if (role === 'Supervisor') return 'Supervisor Dashboard';
    if (role === 'Marketing Manager') return 'Marketing Manager Dashboard';
    return 'Program Manager Dashboard';
  }
  if (pathname.includes('/portal')) return 'Promoter Portal';
  if (pathname.includes('/builder')) return 'Quiz Builder';
  if (pathname.includes('/reports')) return 'Reports Portal';
  if (pathname.includes('/trainings')) return 'Trainings Portal';
  if (pathname.includes('/attendance')) return 'Attendance Portal';
  if (pathname.includes('/settings')) return 'Settings page';
  if (pathname.includes('/project-participants')) return 'My Project Participants';
  if (pathname.includes('/users')) return 'User Directory';
  if (pathname.includes('/projects')) return 'Projects Admin';
  if (pathname.includes('/org-chart')) return 'Org Chart';
  if (pathname.includes('/certificates')) return 'Certificates';
  if (pathname.includes('/gamification')) return 'Participant Results & Performance';
  if (pathname.includes('/schedule')) return 'Schedule & Planner';
  
  if (role === 'Trainer') return 'Trainer Dashboard';
  if (role === 'Admin' || role === 'Super Admin') return 'Admin Dashboard';
  return 'Employee Dashboard';
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, token } = useContext(AuthContext);

  const [projectsList, setProjectsList] = useState([]);
  
  // Support Query states
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [querySubject, setQuerySubject] = useState('');
  const [queryDesc, setQueryDesc] = useState('');
  const [queryDashboard, setQueryDashboard] = useState('');
  const [querySubmitting, setQuerySubmitting] = useState(false);
  const [querySuccess, setQuerySuccess] = useState(false);
  const [queryError, setQueryError] = useState('');

  const [searchParams] = useSearchParams();

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!querySubject.trim() || !queryDesc.trim() || !queryDashboard.trim()) {
      setQueryError('Please fill in all fields.');
      return;
    }
    setQuerySubmitting(true);
    setQueryError('');
    try {
      await axios.post('/api/users/queries', {
        subject: querySubject,
        description: queryDesc,
        dashboard: queryDashboard
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuerySuccess(true);
      setQuerySubject('');
      setQueryDesc('');
      setTimeout(() => {
        setIsQueryModalOpen(false);
        setQuerySuccess(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      setQueryError(err.response?.data?.error || 'Failed to submit query. Please try again.');
    } finally {
      setQuerySubmitting(false);
    }
  };

  useEffect(() => {
    if (token) {
      const endpoint = ['Trainer', 'Employee', 'Supervisor'].includes(user?.role)
        ? '/api/projects/my-projects'
        : '/api/projects';
      axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setProjectsList(res.data || []))
        .catch(err => console.error('Layout project fetch error:', err));
    }
  }, [token, user?.role]);

  const isMotherProjectAccess = ['MD', 'COO', 'VP Operations'].includes(user?.role);
  const myProjectId = user?.projectId;

  const childProjects = isMotherProjectAccess && myProjectId && projectsList.length > 0
    ? projectsList.filter(p => p.parentId === myProjectId)
    : [];
  
  const motherProject = isMotherProjectAccess && myProjectId && projectsList.length > 0
    ? projectsList.find(p => p.id === myProjectId)
    : null;

  const isActive = (path) => location.pathname === path;

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    navigate('/');
  };

  const isAdmin     = ['Admin', 'Super Admin'].includes(user?.role);
  const isPM        = user?.role === 'Program Manager';
  const isClient    = user?.role === 'Client';
  const isTrainer   = user?.role === 'Trainer';
  const isTDManager = user?.role === 'T&D Manager';
  const isEmployee  = user?.role === 'Employee';
  const isPMExecutiveRole = ['Program Manager', 'MD', 'COO', 'VP Operations', 'Marketing Manager'].includes(user?.role);
  const isSupervisor = user?.role === 'Supervisor';
  const showPMDashboard = isPMExecutiveRole;

  return (
    <div className="app-container">
      {/* ─── LEFT SIDEBAR (Deep Navy Enterprise System) ─── */}
      <nav className="sidebar">
        {/* Brand Area */}
        <div className="brand-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '18px 20px', borderBottom: '1px solid #1E293B', background: '#0F172A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              {/* RetailEdge PRO 3-bar corporate icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="12" width="4" height="9" rx="1.5" fill="#2563EB" />
                <rect x="10" y="7" width="4" height="14" rx="1.5" fill="#38BDF8" />
                <rect x="17" y="3" width="4" height="18" rx="1.5" fill="#22C55E" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  RETAILEDGE
                </span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.05rem', color: '#38BDF8', letterSpacing: '0.02em' }}>
                  PRO
                </span>
              </div>
              <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                by Idonneous Marketing Services
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="nav-section">
          {/* PM dedicated role-aware navigation */}
          {isPM ? (
            <>
              <div className="nav-section-label">Overview</div>
              <Link 
                to="/pm-dashboard?projectId=all" 
                className={`nav-link ${isActive('/pm-dashboard') ? 'active' : ''}`}
              >
                <ClipboardList size={18} />
                <span>Training Operations</span>
              </Link>
              <Link 
                to="/projects" 
                className={`nav-link ${isActive('/projects') ? 'active' : ''}`}
              >
                <FolderOpen size={18} />
                <span>Project Portfolio</span>
              </Link>

              <div className="nav-section-label">Operations</div>
              <Link to="/schedule" className={`nav-link ${isActive('/schedule') ? 'active' : ''}`}>
                <Calendar size={18} />
                <span>Schedule & Batches</span>
              </Link>
              <Link to="/trainings" className={`nav-link ${isActive('/trainings') ? 'active' : ''}`}>
                <BookOpen size={18} />
                <span>Training Modules</span>
              </Link>

              <div className="nav-section-label">People</div>
              <Link to="/attendance" className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}>
                <MapPin size={18} />
                <span>Attendance & Roster</span>
              </Link>
              <Link to="/project-participants" className={`nav-link ${isActive('/project-participants') ? 'active' : ''}`}>
                <Users size={18} />
                <span>My Project Participants</span>
              </Link>

              <div className="nav-section-label">Performance</div>
              <Link 
                to="/gamification" 
                className={`nav-link ${isActive('/gamification') ? 'active' : ''}`}
              >
                <Trophy size={18} />
                <span>Participant Results</span>
              </Link>

              <div className="nav-section-label">Reporting & Compliance</div>
              <Link to="/reports" className={`nav-link ${isActive('/reports') ? 'active' : ''}`}>
                <BarChart3 size={18} />
                <span>Reports & Analytics</span>
              </Link>
              <Link to="/certificates" className={`nav-link ${isActive('/certificates') ? 'active' : ''}`}>
                <Award size={18} />
                <span>Certification Vault</span>
              </Link>

              <div className="nav-section-label">System</div>
              <Link to="/settings" className={`nav-link ${isActive('/settings') ? 'active' : ''}`}>
                <Settings size={18} />
                <span>Settings</span>
              </Link>
            </>
          ) : showPMDashboard ? (
            <>
              <div className="nav-section-label">Overview</div>
              <Link 
                to="/pm-dashboard?projectId=all" 
                className={`nav-link ${isActive('/pm-dashboard') && (!searchParams.get('projectId') || searchParams.get('projectId') === 'all') ? 'active' : ''}`}
              >
                <ClipboardList size={18} />
                <span>{isClient ? 'Client Command Center' : `${user?.role || 'Executive'} Dashboard`}</span>
              </Link>
              
              {/* Project Hierarchy Tree for Executive Roles */}
              {isMotherProjectAccess && (
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '14px', marginTop: '4px', marginBottom: '8px', gap: '2px' }}>
                  {motherProject && (
                    <Link
                      to={`/pm-dashboard?projectId=${myProjectId}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px',
                        textDecoration: 'none',
                        color: searchParams.get('projectId') === myProjectId ? '#38BDF8' : '#94A3B8',
                        background: searchParams.get('projectId') === myProjectId ? '#1E293B' : 'transparent',
                        fontWeight: searchParams.get('projectId') === myProjectId ? 700 : 500,
                        borderLeft: `2.5px solid ${searchParams.get('projectId') === myProjectId ? '#38BDF8' : 'transparent'}`
                      }}
                    >
                      <FolderOpen size={14} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{motherProject.name}</span>
                    </Link>
                  )}
                  
                  {childProjects.map(cp => (
                    <Link
                      key={cp.id}
                      to={`/pm-dashboard?projectId=${cp.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 12px', marginLeft: '10px', fontSize: '0.8rem', borderRadius: '6px',
                        textDecoration: 'none',
                        color: searchParams.get('projectId') === cp.id ? '#38BDF8' : '#94A3B8',
                        background: searchParams.get('projectId') === cp.id ? '#1E293B' : 'transparent',
                        fontWeight: searchParams.get('projectId') === cp.id ? 700 : 500,
                        borderLeft: `2.5px solid ${searchParams.get('projectId') === cp.id ? '#38BDF8' : 'transparent'}`
                      }}
                    >
                      <Network size={14} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cp.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              <Link 
                to="/gamification" 
                className={`nav-link ${isActive('/gamification') ? 'active' : ''}`}
              >
                <Trophy size={18} />
                <span>Participant Results</span>
              </Link>
            </>
          ) : (
            <>
              <div className="nav-section-label">Core</div>
              <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>{user?.role === 'Employee' ? 'Employee Dashboard' : (isSupervisor ? 'Supervisor Dashboard' : (isAdmin ? 'Admin Dashboard' : (isTrainer ? 'Trainer Dashboard' : (isClient ? 'Client Cockpit' : (isTDManager ? 'Capability Cockpit' : 'Dashboard')))))}</span>
              </Link>
            </>
          )}

          {isAdmin ? (
            <>
              <div className="nav-section-label">Enterprise Control</div>
              <Link to="/users" className={`nav-link ${isActive('/users') ? 'active' : ''}`}>
                <Users size={18} />
                <span>User Management</span>
              </Link>
              <Link to="/roles" className={`nav-link ${isActive('/roles') ? 'active' : ''}`}>
                <Shield size={18} />
                <span>Role Governance</span>
              </Link>
              <Link to="/clients" className={`nav-link ${isActive('/clients') ? 'active' : ''}`}>
                <Briefcase size={18} />
                <span>Client Portfolio</span>
              </Link>
              <Link to="/projects" className={`nav-link ${isActive('/projects') ? 'active' : ''}`}>
                <FolderOpen size={18} />
                <span>Project Management</span>
              </Link>

              <div className="nav-section-label">Learning & Operations</div>
              <Link to="/trainings" className={`nav-link ${isActive('/trainings') ? 'active' : ''}`}>
                <Calendar size={18} />
                <span>Training Programs</span>
              </Link>
              <Link to="/attendance" className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}>
                <ClipboardList size={18} />
                <span>Attendance & Roster</span>
              </Link>
              <Link to="/builder" className={`nav-link ${isActive('/builder') ? 'active' : ''}`}>
                <PenTool size={18} />
                <span>Assessment Studio</span>
              </Link>
              <Link to="/certificates" className={`nav-link ${isActive('/certificates') ? 'active' : ''}`}>
                <Award size={18} />
                <span>Certification Vault</span>
              </Link>
              <Link to="/reports" className={`nav-link ${isActive('/reports') ? 'active' : ''}`}>
                <BarChart3 size={18} />
                <span>Reports & Analytics</span>
              </Link>

              <div className="nav-section-label">System & Security</div>
              <Link to="/offline-sync" className={`nav-link ${isActive('/offline-sync') ? 'active' : ''}`}>
                <RefreshCw size={18} />
                <span>Device Synchronization</span>
              </Link>
              <Link to="/notifications" className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}>
                <Bell size={18} />
                <span>Notifications Center</span>
              </Link>
              <Link to="/audit-logs" className={`nav-link ${isActive('/audit-logs') ? 'active' : ''}`}>
                <Archive size={18} />
                <span>Audit & Security Logs</span>
              </Link>
              <Link to="/settings" className={`nav-link ${isActive('/settings') ? 'active' : ''}`}>
                <Settings size={18} />
                <span>System Settings</span>
              </Link>
            </>
          ) : isEmployee ? (
            <>
              <div className="nav-section-label">My Learning</div>
              <Link to="/trainings" className={`nav-link ${isActive('/trainings') ? 'active' : ''}`}>
                <BookOpen size={18} />
                <span>Training</span>
              </Link>
              <Link to="/join" className={`nav-link ${isActive('/join') ? 'active' : ''}`}>
                <Radio size={18} />
                <span>My Quizzes</span>
              </Link>

              <div className="nav-section-label">My Performance</div>
              <Link to="/attendance" className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}>
                <MapPin size={18} />
                <span>My Attendance</span>
              </Link>
              <Link to="/gamification" className={`nav-link ${isActive('/gamification') ? 'active' : ''}`}>
                <Trophy size={18} />
                <span>My Performance</span>
              </Link>

              <div className="nav-section-label">My Credentials</div>
              <Link to="/certificates" className={`nav-link ${isActive('/certificates') ? 'active' : ''}`}>
                <Award size={18} />
                <span>My Certificates</span>
              </Link>
            </>
          ) : isTrainer ? (
            <>
              <div className="nav-section-label">Training Delivery</div>
              <Link to="/schedule" className={`nav-link ${isActive('/schedule') ? 'active' : ''}`}>
                <Calendar size={18} />
                <span>Schedule & Batches</span>
              </Link>
              <Link to="/trainings" className={`nav-link ${isActive('/trainings') ? 'active' : ''}`}>
                <BookOpen size={18} />
                <span>Training Modules</span>
              </Link>
              <Link to="/join" className={`nav-link ${isActive('/join') ? 'active' : ''}`}>
                <Radio size={18} />
                <span>Live Quiz Arena</span>
              </Link>

              <div className="nav-section-label">Assessment & Coaching</div>
              <Link to="/builder" className={`nav-link ${isActive('/builder') ? 'active' : ''}`}>
                <PenTool size={18} />
                <span>Assessment Studio</span>
              </Link>
              <Link to="/attendance" className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}>
                <MapPin size={18} />
                <span>Session Attendance</span>
              </Link>
              <Link to="/gamification" className={`nav-link ${isActive('/gamification') ? 'active' : ''}`}>
                <Trophy size={18} />
                <span>Participant Results</span>
              </Link>

              <div className="nav-section-label">Credentials & Compliance</div>
              <Link to="/certificates" className={`nav-link ${isActive('/certificates') ? 'active' : ''}`}>
                <Award size={18} />
                <span>Certification Eligibility</span>
              </Link>

              <div className="nav-section-label">Reporting</div>
              <Link to="/reports" className={`nav-link ${isActive('/reports') ? 'active' : ''}`}>
                <BarChart3 size={18} />
                <span>My Training Reports</span>
              </Link>

              <div className="nav-section-label">System & Utility</div>
              <Link to="/offline-sync" className={`nav-link ${isActive('/offline-sync') ? 'active' : ''}`}>
                <RefreshCw size={18} />
                <span>Device Synchronization</span>
              </Link>
              <Link to="/notifications" className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}>
                <Bell size={18} />
                <span>Notifications Center</span>
              </Link>
            </>
          ) : isSupervisor ? (
            <>
              <div className="nav-section-label">My Team</div>
              <Link to="/attendance" className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}>
                <MapPin size={18} />
                <span>Team Attendance</span>
              </Link>
              <Link to="/trainings" className={`nav-link ${isActive('/trainings') ? 'active' : ''}`}>
                <BookOpen size={18} />
                <span>Training Progress</span>
              </Link>
              <Link to="/gamification" className={`nav-link ${isActive('/gamification') ? 'active' : ''}`}>
                <Trophy size={18} />
                <span>Team Performance</span>
              </Link>

              <div className="nav-section-label">Credentials & Compliance</div>
              <Link to="/certificates" className={`nav-link ${isActive('/certificates') ? 'active' : ''}`}>
                <Award size={18} />
                <span>Team Certifications</span>
              </Link>

              <div className="nav-section-label">Reporting</div>
              <Link to="/reports" className={`nav-link ${isActive('/reports') ? 'active' : ''}`}>
                <BarChart3 size={18} />
                <span>My Team Reports</span>
              </Link>

              <div className="nav-section-label">System & Utility</div>
              <Link to="/notifications" className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}>
                <Bell size={18} />
                <span>Notifications Center</span>
              </Link>
            </>
          ) : isClient ? (
            <>
              <div className="nav-section-label">Programs</div>
              <Link to="/trainings" className={`nav-link ${isActive('/trainings') ? 'active' : ''}`}>
                <BookOpen size={18} />
                <span>Training Modules</span>
              </Link>

              <div className="nav-section-label">Performance</div>
              <Link to="/attendance" className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}>
                <MapPin size={18} />
                <span>Attendance Tracking</span>
              </Link>
              <Link to="/gamification" className={`nav-link ${isActive('/gamification') ? 'active' : ''}`}>
                <Trophy size={18} />
                <span>Assessment Results</span>
              </Link>

              <div className="nav-section-label">Credentials</div>
              <Link to="/certificates" className={`nav-link ${isActive('/certificates') ? 'active' : ''}`}>
                <Award size={18} />
                <span>Program Certifications</span>
              </Link>

              <div className="nav-section-label">Reporting</div>
              <Link to="/reports" className={`nav-link ${isActive('/reports') ? 'active' : ''}`}>
                <BarChart3 size={18} />
                <span>Client Reports</span>
              </Link>

              <div className="nav-section-label">System</div>
              <Link to="/notifications" className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}>
                <Bell size={18} />
                <span>Notifications Center</span>
              </Link>
            </>
          ) : isTDManager ? (
            <>
              <div className="nav-section-label">Capability Framework</div>
              <Link to="/trainings" className={`nav-link ${isActive('/trainings') ? 'active' : ''}`}>
                <BookOpen size={18} />
                <span>Training Modules</span>
              </Link>
              <Link to="/builder" className={`nav-link ${isActive('/builder') ? 'active' : ''}`}>
                <PenTool size={18} />
                <span>Assessment Studio</span>
              </Link>
              <Link to="/schedule" className={`nav-link ${isActive('/schedule') ? 'active' : ''}`}>
                <Calendar size={18} />
                <span>Schedule & Batches</span>
              </Link>

              <div className="nav-section-label">Capability Tracking</div>
              <Link to="/attendance" className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}>
                <MapPin size={18} />
                <span>Attendance Tracking</span>
              </Link>
              <Link to="/gamification" className={`nav-link ${isActive('/gamification') ? 'active' : ''}`}>
                <Trophy size={18} />
                <span>Assessment Results</span>
              </Link>
              <Link to="/certificates" className={`nav-link ${isActive('/certificates') ? 'active' : ''}`}>
                <Award size={18} />
                <span>Certification Vault</span>
              </Link>

              <div className="nav-section-label">Capability Intelligence</div>
              <Link to="/reports" className={`nav-link ${isActive('/reports') ? 'active' : ''}`}>
                <BarChart3 size={18} />
                <span>Training Analytics</span>
              </Link>
              <Link to="/notifications" className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}>
                <Bell size={18} />
                <span>Notifications Center</span>
              </Link>
            </>
          ) : isPM ? null : (
            <>
              <div className="nav-section-label">Operations</div>
              <Link to="/schedule" className={`nav-link ${isActive('/schedule') ? 'active' : ''}`}>
                <Calendar size={18} />
                <span>Schedule & Batches</span>
              </Link>
              {!showPMDashboard && (
                <Link to="/trainings" className={`nav-link ${isActive('/trainings') ? 'active' : ''}`}>
                  <BookOpen size={18} />
                  <span>Training Modules</span>
                </Link>
              )}
              {!showPMDashboard && (
                <Link to="/join" className={`nav-link ${isActive('/join') ? 'active' : ''}`}>
                  <Radio size={18} />
                  <span>Live Quiz Arena</span>
                </Link>
              )}
              {!showPMDashboard && (
                <Link to="/attendance" className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}>
                  <MapPin size={18} />
                  <span>Attendance</span>
                </Link>
              )}
              {['Trainer', 'T&D Manager'].includes(user?.role) && (
                <Link to="/builder" className={`nav-link ${isActive('/builder') ? 'active' : ''}`}>
                  <PenTool size={18} />
                  <span>Assessment Studio</span>
                </Link>
              )}

              {!showPMDashboard && (
                <Link to="/certificates" className={`nav-link ${isActive('/certificates') ? 'active' : ''}`}>
                  <Award size={18} />
                  <span>Certificates</span>
                </Link>
              )}

              {!showPMDashboard && ['Trainer', 'Client', 'Manager', 'T&D Manager'].includes(user?.role) && (
                <Link to="/reports" className={`nav-link ${isActive('/reports') ? 'active' : ''}`}>
                  <BarChart3 size={18} />
                  <span>Reports & Insights</span>
                </Link>
              )}

              {!showPMDashboard && (
                <Link to="/gamification" className={`nav-link ${isActive('/gamification') ? 'active' : ''}`}>
                  <Trophy size={18} />
                  <span>Performance Arena</span>
                </Link>
              )}

              {!showPMDashboard && (
                <Link to="/settings" className={`nav-link ${isActive('/settings') ? 'active' : ''}`}>
                  <Settings size={18} />
                  <span>Settings</span>
                </Link>
              )}
            </>
          )}
        </div>

        {/* Sidebar Brand Watermark */}
        <div className="sidebar-watermark">
          <span className="sidebar-watermark-text">People.</span>
          <span className="sidebar-watermark-text">Power.</span>
          <span className="sidebar-watermark-text">Progress.</span>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="sidebar-profile">
          <div style={{ position: 'relative' }}>
            <div className="profile-avatar">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
            </div>
            {/* Online Status Dot */}
            <div 
              style={{
                position: 'absolute', bottom: -1, right: -1, width: '10px', height: '10px',
                backgroundColor: '#22C55E', border: '2px solid #0B1220',
                borderRadius: '50%'
              }} 
              title="Active Session"
            />
          </div>
          <div className="profile-info">
            <div className="profile-name">{user?.name || 'Authorized User'}</div>
            <div className="profile-role">{user?.role || 'Enterprise User'}</div>
          </div>
          <button 
            onClick={handleLogout} 
            style={{ 
              color: '#94A3B8', background: 'none', border: 'none', 
              cursor: 'pointer', padding: '6px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#1E293B'; }}
            onMouseOut={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'none'; }}
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* ─── MAIN CONTENT CANVAS ─── */}
      <main className="main-panel">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-search">
            <Search size={16} />
            <input type="text" placeholder="Search sessions, projects, users, reports..." />
          </div>

          <div className="header-actions">
            {/* Raise Query Action */}
            <button 
              className="header-query-btn"
              onClick={() => {
                setQuerySubject('');
                setQueryDesc('');
                const detectedDash = getDetectedDashboard(location.pathname, user?.role);
                setQueryDashboard(detectedDash);
                setQuerySuccess(false);
                setQueryError('');
                setIsQueryModalOpen(true);
              }}
              title="Raise Support Query"
              aria-label="Raise Support Query"
            >
              <AlertTriangle size={14} className="header-query-icon" />
              <span className="header-query-text">Raise Query</span>
              <span className="header-query-text-compact">Query</span>
            </button>

            {/* Notification Bell */}
            <button className="icon-badge-btn header-notification-btn" title="Notifications" aria-label="Notifications">
              <Bell size={18} />
              <span className="badge-dot" />
            </button>

            {/* Enterprise Brand Pill */}
            <div className="header-enterprise-pill" title="RetailEdge Pro Enterprise">
              <span className="header-enterprise-dot" />
              <span className="header-enterprise-name-full">RetailEdge Pro Enterprise</span>
              <span className="header-enterprise-name-compact">Enterprise</span>
              <span className="header-enterprise-name-tiny">PRO</span>
              <ChevronDown size={14} className="header-enterprise-chevron" />
            </div>

            {/* User Profile Context in Top Header */}
            <div className="header-user-wrapper" title={user?.name ? `${user.name} (${user?.role || 'Enterprise User'})` : 'User Profile'}>
              <div className="header-user-avatar" aria-label="User Avatar">
                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="header-user-meta">
                <span className="header-user-name">
                  {user?.name || 'Authorized User'}
                </span>
                <span className="header-user-role">
                  {user?.role || 'Enterprise User'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* View Content Outlet */}
        <div className="view-container">
          <Outlet />
        </div>
      </main>

      {/* ─── SUPPORT QUERY MODAL ─── */}
      {isQueryModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444' }}>
                <AlertTriangle size={20} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>Submit Support Query</h3>
              </div>
              <button onClick={() => setIsQueryModalOpen(false)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#64748B' }}>
                ✕
              </button>
            </div>

            {querySuccess ? (
              <div style={{ padding: '30px 10px', textAlign: 'center' }}>
                <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ color: '#10B981', fontWeight: 800, margin: '0 0 8px 0', fontSize: '1.2rem' }}>Query Submitted Successfully!</h4>
                <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0 }}>The Operations Support team has received your ticket and will respond shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleQuerySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {queryError && (
                  <div style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {queryError}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Module / Dashboard Context</label>
                  <select 
                    value={queryDashboard} 
                    onChange={e => setQueryDashboard(e.target.value)}
                    className="form-control"
                  >
                    {['Trainer Dashboard', 'MD Dashboard', 'COO Dashboard', 'VP Operations Dashboard', 'Client Dashboard', 'Program Manager Dashboard', 'Supervisor Dashboard', 'Marketing Manager Dashboard', 'Promoter Portal', 'Quiz Builder', 'Reports Portal', 'Trainings Portal', 'Attendance Portal', 'Settings page', 'Other'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <input 
                    type="text" 
                    value={querySubject} 
                    onChange={e => setQuerySubject(e.target.value)}
                    placeholder="Brief summary of the issue..."
                    required
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description & Error Details *</label>
                  <textarea 
                    value={queryDesc} 
                    onChange={e => setQueryDesc(e.target.value)}
                    placeholder="Describe what happened and include any relevant details..."
                    required
                    rows={4}
                    className="form-control"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                  <button type="button" onClick={() => setIsQueryModalOpen(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={querySubmitting} className="btn btn-danger">
                    {querySubmitting ? 'Submitting...' : 'Submit Query'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
