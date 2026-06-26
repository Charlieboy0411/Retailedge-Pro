import React, { useContext, useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, PenTool, BarChart3, Settings, LogOut, Bell, Search, Users, FolderOpen, BookOpen, Award, Radio, MapPin, ClipboardList, Trophy, ShoppingBag, Network, AlertTriangle, Calendar, Shield, Briefcase, FileText, RefreshCw, Archive } from 'lucide-react';
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
  if (pathname.includes('/users')) return 'User Directory';
  if (pathname.includes('/projects')) return 'Projects Admin';
  if (pathname.includes('/org-chart')) return 'Org Chart';
  if (pathname.includes('/certificates')) return 'Certificates';
  if (pathname.includes('/gamification')) return 'Gamification Arena';
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
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (token) {
      axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setProjectsList(res.data || []))
        .catch(err => console.error('Layout project fetch error:', err));
    }
  }, [token]);

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

  const isAdmin    = ['Admin', 'Super Admin'].includes(user?.role);
  const isPM       = user?.role === 'Program Manager';
  const isClient   = user?.role === 'Client';
  const isTrainer  = user?.role === 'Trainer';
  const isTDManager = user?.role === 'T&D Manager';
  const showPMDashboard = !isAdmin && !isTrainer && !isTDManager;


  return (
    <div className="app-container">
      {/* Sidebar */}
      <nav className="sidebar">
        {/* Brand */}
        <div className="brand-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px 16px', borderBottom: '1px solid var(--border-sidebar)' }}>
          <div style={{ width: '100%', background: '#FFFFFF', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', height: '54px' }}>
            <img src="/logo.png" alt="Idonneous Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', marginTop: '4px' }}>
            <span className="brand-name" style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 800,
              fontSize: '0.95rem',
              background: 'linear-gradient(135deg, #fff 30%, #93C5FD 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>RetailEdge Pro</span>
            <span style={{ fontSize: '0.6rem', color: '#F59E0B', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase' }}>Training Arena</span>
          </div>
        </div>

        {/* Nav Links */}
        <div className="nav-section">
          {/* PM / Client: dedicated dashboard */}
          {showPMDashboard ? (
            <>
              <Link to="/pm-dashboard?projectId=all" className={`nav-link ${isActive('/pm-dashboard') && (!searchParams.get('projectId') || searchParams.get('projectId') === 'all') ? 'active' : ''}`}>
                <ClipboardList size={20} />
                {isClient ? 'Client Dashboard' : isPM ? 'PM Dashboard' : `${user?.role || 'Client'} Dashboard`}
              </Link>
              
              {/* Project Tree for Executive Roles */}
              {isMotherProjectAccess && (
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '16px', marginTop: '4px', marginBottom: '8px', gap: '2px' }}>
                  {/* Mother Project Link */}
                  {motherProject && (
                    <Link
                      to={`/pm-dashboard?projectId=${myProjectId}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        color: searchParams.get('projectId') === myProjectId ? '#2563EB' : 'var(--text-secondary)',
                        background: searchParams.get('projectId') === myProjectId ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        fontWeight: searchParams.get('projectId') === myProjectId ? 700 : 500,
                        transition: 'all 0.15s',
                        borderLeft: `2.5px solid ${searchParams.get('projectId') === myProjectId ? '#2563EB' : 'transparent'}`,
                      }}
                      onMouseOver={e => { if (searchParams.get('projectId') !== myProjectId) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; } }}
                      onMouseOut={e => { if (searchParams.get('projectId') !== myProjectId) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; } }}
                    >
                      <FolderOpen size={14} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{motherProject.name}</span>
                    </Link>
                  )}
                  
                  {/* Sub-projects list */}
                  {childProjects.map(cp => (
                    <Link
                      key={cp.id}
                      to={`/pm-dashboard?projectId=${cp.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        marginLeft: '12px',
                        fontSize: '0.8rem',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        color: searchParams.get('projectId') === cp.id ? '#2563EB' : 'var(--text-secondary)',
                        background: searchParams.get('projectId') === cp.id ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        fontWeight: searchParams.get('projectId') === cp.id ? 700 : 500,
                        transition: 'all 0.15s',
                        borderLeft: `2.5px solid ${searchParams.get('projectId') === cp.id ? '#2563EB' : 'transparent'}`,
                      }}
                      onMouseOver={e => { if (searchParams.get('projectId') !== cp.id) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; } }}
                      onMouseOut={e => { if (searchParams.get('projectId') !== cp.id) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; } }}
                    >
                      <Network size={14} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cp.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              Dashboard
            </Link>
          )}

          {isAdmin ? (
            <>
              <div style={{ padding: '16px 20px 8px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Management</div>
              <Link to="/users" className={`nav-link ${isActive('/users') ? 'active' : ''}`}>
                <Users size={20} />
                User Management
              </Link>
              <Link to="/roles" className={`nav-link ${isActive('/roles') ? 'active' : ''}`}>
                <Shield size={20} />
                Role Management
              </Link>
              <Link to="/clients" className={`nav-link ${isActive('/clients') ? 'active' : ''}`}>
                <Briefcase size={20} />
                Client Management
              </Link>
              <Link to="/projects" className={`nav-link ${isActive('/projects') ? 'active' : ''}`}>
                <FolderOpen size={20} />
                Project Management
              </Link>

              <div style={{ padding: '16px 20px 8px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Operations</div>
              <Link to="/trainings" className={`nav-link ${isActive('/trainings') ? 'active' : ''}`}>
                <Calendar size={20} />
                Training Sessions
              </Link>
              <Link to="/attendance" className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}>
                <ClipboardList size={20} />
                Attendance Management
              </Link>
              <Link to="/builder" className={`nav-link ${isActive('/builder') ? 'active' : ''}`}>
                <FileText size={20} />
                Assessment Center
              </Link>
              <Link to="/certificates" className={`nav-link ${isActive('/certificates') ? 'active' : ''}`}>
                <Award size={20} />
                Certification Center
              </Link>
              <Link to="/reports" className={`nav-link ${isActive('/reports') ? 'active' : ''}`}>
                <BarChart3 size={20} />
                Reports & Analytics
              </Link>

              <div style={{ padding: '16px 20px 8px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>System</div>
              <Link to="/offline-sync" className={`nav-link ${isActive('/offline-sync') ? 'active' : ''}`}>
                <RefreshCw size={20} />
                Offline Synchronization
              </Link>
              <Link to="/notifications" className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}>
                <Bell size={20} />
                Notifications
              </Link>
              <Link to="/audit-logs" className={`nav-link ${isActive('/audit-logs') ? 'active' : ''}`}>
                <Archive size={20} />
                Audit Logs
              </Link>
              <Link to="/settings" className={`nav-link ${isActive('/settings') ? 'active' : ''}`}>
                <Settings size={20} />
                Settings
              </Link>
            </>
          ) : (
            <>
              {/* Fallback for non-admin roles */}
              <Link to="/schedule" className={`nav-link ${isActive('/schedule') ? 'active' : ''}`}>
                <Calendar size={20} />
                Schedule
              </Link>
              {!showPMDashboard && (
                <Link to="/trainings" className={`nav-link ${isActive('/trainings') ? 'active' : ''}`}>
                  <BookOpen size={20} />
                  Trainings
                </Link>
              )}
              {!showPMDashboard && (
                <Link to="/join" className={`nav-link ${isActive('/join') ? 'active' : ''}`}>
                  <Radio size={20} />
                  Live Arena
                </Link>
              )}
              {!showPMDashboard && (
                <Link to="/attendance" className={`nav-link ${isActive('/attendance') ? 'active' : ''}`}>
                  <MapPin size={20} />
                  Attendance
                </Link>
              )}
              {['Trainer', 'T&D Manager'].includes(user?.role) && (
                <Link to="/builder" className={`nav-link ${isActive('/builder') ? 'active' : ''}`}>
                  <PenTool size={20} />
                  Create Quiz
                </Link>
              )}
            </>
          )}

          {!showPMDashboard && (
            <Link to="/certificates" className={`nav-link ${isActive('/certificates') ? 'active' : ''}`}>
              <Award size={20} />
              Certificates
            </Link>
          )}

          {!showPMDashboard && ['Admin', 'Super Admin', 'Trainer', 'Client', 'Manager', 'T&D Manager'].includes(user?.role) && (
            <Link to="/reports" className={`nav-link ${isActive('/reports') ? 'active' : ''}`}>
              <BarChart3 size={20} />
              Reports
            </Link>
          )}


          {/* Gamification — visible to Trainer, Admin, Supervisor */}
          {!showPMDashboard && (
            <Link to="/gamification" className={`nav-link ${isActive('/gamification') ? 'active' : ''}`}>
              <Trophy size={20} />
              Arena Stats
            </Link>
          )}

          {!showPMDashboard && (
            <Link to="/settings" className={`nav-link ${isActive('/settings') ? 'active' : ''}`}>
              <Settings size={20} />
              Settings
            </Link>
          )}
        </div>

        {/* Sidebar Footer Profile */}
        <div className="sidebar-profile" style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <div className="profile-avatar" style={{
              background: 'var(--primary-gradient)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
            </div>
            {/* Online Indicator */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px',
              backgroundColor: 'var(--success)', border: '2px solid var(--bg-sidebar-active)',
              borderRadius: '50%'
            }} title="Online"></div>
          </div>
          <div className="profile-info">
            <div className="profile-name">{user?.name || 'Guest User'}</div>
            <div className="profile-role" style={{ color: 'var(--text-muted)' }}>{user?.role || 'Viewer'}</div>
          </div>
          <button onClick={handleLogout} style={{ color: 'var(--text-sidebar)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', transition: 'all 0.2s', borderRadius: '4px' }}
            onMouseOver={e => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-sidebar)'; e.currentTarget.style.background = 'none'; }}
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-panel">
        <header className="top-header">
          <div className="header-search">
            <Search size={18} />
            <input type="text" placeholder="Search sessions, supervisors, trainings..." />
          </div>
          <div className="header-actions">
            <button 
              onClick={() => {
                setQuerySubject('');
                setQueryDesc('');
                const detectedDash = getDetectedDashboard(location.pathname, user?.role);
                setQueryDashboard(detectedDash);
                setQuerySuccess(false);
                setQueryError('');
                setIsQueryModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#EF4444',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                height: '32px'
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
            >
              <AlertTriangle size={14} />
              <span>Raise Query</span>
            </button>
            <button className="icon-badge-btn">
              <Bell size={20} />
              <span className="badge-dot"></span>
            </button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#2563EB'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2563EB', display: 'inline-block', animation: 'pulse-badge 1.5s infinite' }}></span>
              RetailEdge Pro
            </div>
          </div>
        </header>

        <style>{`
          @keyframes pulse-badge {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(0.85); }
          }
        `}</style>

        <div className="view-container">
          <Outlet />
        </div>
      </main>

      {/* ─── RAISE QUERY MODAL ─── */}
      {isQueryModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '500px', background: 'var(--bg-primary)', padding: '28px', borderRadius: '16px', border: '1px solid var(--border-glass)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444' }}>
                <AlertTriangle size={20} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Submit Support Query</h3>
              </div>
              <button onClick={() => setIsQueryModalOpen(false)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
                <LogOut size={18} style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>

            {querySuccess ? (
              <div style={{ padding: '20px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
                <h4 style={{ color: 'var(--success)', fontWeight: 800, margin: '0 0 8px 0' }}>Query Submitted!</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>The Admin team will investigate and highlight this error.</p>
              </div>
            ) : (
              <form onSubmit={handleQuerySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {queryError && (
                  <div style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {queryError}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dashboard Context</label>
                  <select 
                    value={queryDashboard} 
                    onChange={e => setQueryDashboard(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    {['Trainer Dashboard', 'MD Dashboard', 'COO Dashboard', 'VP Operations Dashboard', 'Client Dashboard', 'Program Manager Dashboard', 'Supervisor Dashboard', 'Marketing Manager Dashboard', 'Promoter Portal', 'Quiz Builder', 'Reports Portal', 'Trainings Portal', 'Attendance Portal', 'Settings page', 'Other'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subject *</label>
                  <input 
                    type="text" 
                    value={querySubject} 
                    onChange={e => setQuerySubject(e.target.value)}
                    placeholder="Brief summary of the issue..."
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description & Error Details *</label>
                  <textarea 
                    value={queryDesc} 
                    onChange={e => setQueryDesc(e.target.value)}
                    placeholder="Describe what went wrong, including any error messages..."
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setIsQueryModalOpen(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={querySubmitting} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #EF4444, #F87171)', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)' }}>
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
