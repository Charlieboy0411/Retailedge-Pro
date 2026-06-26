import React, { useEffect, useState, useContext } from 'react';
import { Users, BookOpen, Activity, Play, Settings, X, Copy, Mail, Check, TrendingUp, Target, Zap, WifiOff, Edit3, Trash2, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import TDManagerDashboard from '../components/TDManagerDashboard';
import AdminDashboard from '../components/AdminDashboard';
import TrainerDashboard from '../components/TrainerDashboard';
import CalendarWidget from '../components/CalendarWidget';

export default function Dashboard() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(0);
  
  const [stats, setStats] = useState({
    activeQuizzes: 0,
    totalParticipants: 0,
    avgScore: '0%'
  });

  // New Meeting Scheduling States
  const [projects, setProjects] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isSuccessView, setIsSuccessView] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [scheduledMeetingDetails, setScheduledMeetingDetails] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [isUrlCustom, setIsUrlCustom] = useState(false);

  // Offline Quiz States
  const [selectedOfflineQuiz, setSelectedOfflineQuiz] = useState(null);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [offlineForm, setOfflineForm] = useState({ isOffline: false, startTime: '', endTime: '' });
  const [offlineQuizLink, setOfflineQuizLink] = useState('');
  const [isOfflineSuccessView, setIsOfflineSuccessView] = useState(false);
  const [offlineBaseUrl, setOfflineBaseUrl] = useState(window.location.origin);

  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    projectId: '',
    scheduledAt: '',
    url: '',
    inviteeIds: [],
    platform: 'google_meet'
  });
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    if (user && !['Admin', 'Super Admin', 'Trainer', 'T&D Manager'].includes(user.role)) {
      navigate('/pm-dashboard', { replace: true });
    }
  }, [user, navigate]);


  const fetchAllData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      await Promise.all([
        fetchQuizzes(),
        fetchMeetings()
      ]);
      if (token && ['Trainer', 'T&D Manager', 'Admin', 'Super Admin'].includes(user?.role)) {
        await Promise.all([fetchProjects(), fetchUsers()]);
      }
      setSyncTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to sync dashboard data', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const response = await axios.get('/api/trainings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMeetings(response.data.filter(t => t.type === 'Meeting'));
    } catch (err) {
      console.error('Failed to fetch meetings', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllData(false);

      // Establish live socket synchronization
      const socket = io(window.location.origin);
      
      const handleSync = (data) => {
        console.log('[Live Sync] Real-time updates detected:', data);
        fetchAllData(true);
      };

      socket.on('live_session_finished', handleSync);
      socket.on('offline_response_submitted', handleSync);
      socket.on('attendance_updated', handleSync);
      socket.on('report_deleted', handleSync);

      // Background periodic polling as fallback (every 20 seconds)
      const pollInterval = setInterval(() => {
        console.log('[Polling Sync] Fetching latest dashboard data...');
        fetchAllData(true);
      }, 20000);

      return () => {
        socket.disconnect();
        clearInterval(pollInterval);
      };
    }
  }, [token, user]);

  useEffect(() => {
    const fetchJoinUrl = async () => {
      try {
        const res = await axios.get('/api/join-url');
        if (res.data && res.data.url) {
          setOfflineBaseUrl(res.data.url);
        }
      } catch (err) {
        console.error('Failed to fetch join-url', err);
      }
    };
    fetchJoinUrl();
  }, []);

  useEffect(() => {
    if (isMeetingModalOpen && !isUrlCustom) {
      setMeetingForm(prev => {
        const pool = 'abcdefghijklmnopqrstuvwxyz';
        const rand = (len) => Array.from({ length: len }, () => pool[Math.floor(Math.random() * pool.length)]).join('');

        if (prev.platform === 'google_meet') {
          const meetLink = `https://meet.google.com/${rand(3)}-${rand(4)}-${rand(3)}`;
          return { ...prev, url: meetLink };
        } else {
          // Jitsi Meet
          const selectedProj = projects.find(p => p.id === prev.projectId);
          const cleanProjName = selectedProj ? selectedProj.name : 'training';
          const slug = cleanProjName.toLowerCase().replace(/[^a-z]/g, '');
          const part1 = (slug.substring(0, 3) || 'qzh').padEnd(3, 'a');
          const part2 = ((slug.substring(3, 5) || '') + rand(4)).substring(0, 4);
          const part3 = rand(3);
          const meetLink = `https://meet.jit.si/RetailEdge-${part1}-${part2}-${part3}`;
          return { ...prev, url: meetLink };
        }
      });
    }
  }, [meetingForm.projectId, meetingForm.platform, projects, isMeetingModalOpen, isUrlCustom]);

  const handleProjectChange = (projId) => {
    const projectMembers = usersList
      .filter(u => {
        const matchesProj = projId ? (u.projectId === projId || u.Project?.id === projId) : true;
        const isSelf = u.id === user?.id;
        return matchesProj && !isSelf;
      })
      .map(u => u.id);
    setMeetingForm(prev => ({
      ...prev,
      projectId: projId,
      inviteeIds: projectMembers
    }));
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsersList(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const response = await axios.get('/api/quizzes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizzes(response.data);
    } catch (error) {
      console.error('Failed to fetch quizzes', error);
    }
  };

  const handleLaunchQuiz = async (quizId) => {
    navigate(`/host/${quizId}`);
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz room? This will delete all its questions and sessions.")) {
      return;
    }
    try {
      await axios.delete(`/api/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Quiz room deleted successfully!");
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
    } catch (error) {
      console.error("Failed to delete quiz:", error);
      alert(error.response?.data?.error || "Failed to delete quiz.");
    }
  };

  const handleCopyLink = (text) => {
    navigator.clipboard.writeText(text);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleOpenOfflineModal = (quiz) => {
    setSelectedOfflineQuiz(quiz);
    const conf = quiz.config || {};
    
    const formatDatetimeLocal = (isoStr) => {
      if (!isoStr) return '';
      const date = new Date(isoStr);
      const tzoffset = date.getTimezoneOffset() * 60000;
      return (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
    };

    setOfflineForm({
      isOffline: !!conf.isOffline,
      startTime: formatDatetimeLocal(conf.offlineStartTime),
      endTime: formatDatetimeLocal(conf.offlineEndTime)
    });
    setOfflineQuizLink(`${offlineBaseUrl}/offline-quiz/${quiz.id}`);
    setIsOfflineSuccessView(false);
    setIsOfflineModalOpen(true);
  };

  const handleOfflineSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/api/quizzes/${selectedOfflineQuiz.id}/offline`, {
        isOffline: offlineForm.isOffline,
        startTime: offlineForm.startTime ? new Date(offlineForm.startTime).toISOString() : null,
        endTime: offlineForm.endTime ? new Date(offlineForm.endTime).toISOString() : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setQuizzes(quizzes.map(q => q.id === selectedOfflineQuiz.id ? { ...q, config: res.data.config } : q));
      
      if (offlineForm.isOffline) {
        setIsOfflineSuccessView(true);
      } else {
        alert('Offline settings saved successfully!');
        setIsOfflineModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save offline quiz settings.');
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!meetingForm.title || !meetingForm.scheduledAt || !meetingForm.url) {
      alert("Please fill in all required fields (Title, Date & Time, and Google Meet URL).");
      return;
    }

    let formattedUrl = meetingForm.url.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      const response = await axios.post('/api/trainings/schedule-meeting', { ...meetingForm, url: formattedUrl }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScheduledMeetingDetails({
        ...response.data.meeting,
        inviteeCount: response.data.inviteeCount,
        projectName: projects.find(p => p.id === meetingForm.projectId)?.name || 'General (Global)'
      });
      setIsSuccessView(true);
      setIsUrlCustom(false);
      // Reset form
      setMeetingForm({
        title: '',
        description: '',
        projectId: '',
        scheduledAt: '',
        url: '',
        inviteeIds: [],
        platform: 'google_meet'
      });
      setMemberSearch('');
    } catch (error) {
      console.error('Failed to schedule meeting', error);
      alert(error.response?.data?.error || 'Failed to schedule meeting. Please try again.');
    }
  };

  const filteredUsers = usersList
    .filter(u => {
      const term = memberSearch.toLowerCase();
      const matchesSearch = u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      const isSelf = u.id === user?.id;
      return matchesSearch && !isSelf;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Compute training completion % from quizzes as proxy metric
  const completionPct = quizzes.length > 0 ? Math.min(100, Math.round((stats.totalParticipants / Math.max(quizzes.length * 10, 1)) * 100)) : 0;

  const ZONE_DATA = [
    { zone: 'North Zone', score: 87, trend: '+4%', color: '#FF6B35' },
    { zone: 'South Zone', score: 73, trend: '+1%', color: '#2EA8FF' },
    { zone: 'West Zone',  score: 91, trend: '+7%', color: '#00C896' },
    { zone: 'East Zone',  score: 65, trend: '-2%', color: '#F59E0B' },
  ];

  if (user?.role === 'T&D Manager') {
    return (
      <div className="view-section active">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', height: '38px', flexShrink: 0 }}>
              <img src="/logo.png" alt="Idonneous Logo" style={{ height: '22px', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, margin: 0 }}>
                🎓 Learning &amp; Development Dashboard
              </h2>
              <p className="section-desc" style={{ margin: '4px 0 0 0' }}>Welcome back, <strong>{user?.name || 'T&D Manager'}</strong>! Track capabilities and skill gaps here.</p>
            </div>
          </div>
          <button
            onClick={async () => {
              setSyncing(true);
              await fetchAllData(true);
              setSyncing(false);
            }}
            disabled={syncing || loading}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
              height: '38px',
            }}
          >
            <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            Sync Live Data
          </button>
        </div>
        <TDManagerDashboard projectUsers={usersList} projectsList={projects} reports={quizzes} />
      </div>
    );
  }

  if (['Admin', 'Super Admin'].includes(user?.role)) {
    return (
      <div className="view-section active">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', height: '38px', flexShrink: 0 }}>
              <img src="/logo.png" alt="Idonneous Logo" style={{ height: '22px', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, margin: 0 }}>
                ⚙️ Admin Control Center
              </h2>
              <p className="section-desc" style={{ margin: '4px 0 0' }}>
                Welcome, <strong>{user?.name || 'Admin'}</strong>! Full platform management and analytics.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              setSyncing(true);
              await fetchAllData(true);
              setSyncing(false);
            }}
            disabled={syncing || loading}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
              height: '38px',
            }}
          >
            <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            Sync Live Data
          </button>
        </div>
        <AdminDashboard
          allUsers={usersList}
          projectsList={projects}
          reports={quizzes}
          syncTrigger={syncTrigger}
        />
      </div>
    );
  }

  if (user?.role === 'Trainer') {
    return (
      <div className="view-section active">
        <TrainerDashboard
          quizzes={quizzes}
          projects={projects}
          usersList={usersList}
          token={token}
          user={user}
          fetchAllData={fetchAllData}
        />
      </div>
    );
  }

  return (
    <div className="view-section active">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', height: '38px', flexShrink: 0 }}>
            <img src="/logo.png" alt="Idonneous Logo" style={{ height: '22px', objectFit: 'contain' }} />
          </div>
          <div>
            <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, margin: 0 }}>
              {user?.role || 'User'} Dashboard
            </h2>
            <p className="section-desc" style={{ margin: '4px 0 0 0' }}>Welcome back to the Arena! Here's today's performance snapshot.</p>
          </div>
        </div>
        {/* Calendar + Live Active badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={async () => {
              setSyncing(true);
              await fetchAllData(true);
              setSyncing(false);
            }}
            disabled={syncing || loading}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.82rem',
              height: '38px',
            }}
          >
            <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            Sync Live Data
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: '20px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, color: '#FF6B35' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#FF6B35', display: 'inline-block' }} />
            Live Arena Active
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '20px', width: '100%' }}>
          {/* ── 4-Card KPI Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* Card 1 */}
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid #FF6B35' }}>
              <div className="stat-info">
                <span className="stat-label">Active Sessions</span>
                <span className="stat-value" style={{ color: '#FF6B35' }}>{stats.activeQuizzes}</span>
              </div>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(255,107,53,0.1)', color: '#FF6B35' }}>
                <Zap size={24} />
              </div>
            </div>

            {/* Card 2 */}
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid #2EA8FF' }}>
              <div className="stat-info">
                <span className="stat-label">Supervisors Enrolled</span>
                <span className="stat-value" style={{ color: '#2EA8FF' }}>{stats.totalParticipants}</span>
              </div>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(46,168,255,0.1)', color: '#2EA8FF' }}>
                <Users size={24} />
              </div>
            </div>

            {/* Card 3 */}
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid #00C896' }}>
              <div className="stat-info">
                <span className="stat-label">Avg. Quiz Score</span>
                <span className="stat-value" style={{ color: '#00C896' }}>{stats.avgScore}</span>
              </div>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(0,200,150,0.1)', color: '#00C896' }}>
                <Target size={24} />
              </div>
            </div>

            {/* Card 4 */}
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid #F59E0B' }}>
              <div className="stat-info">
                <span className="stat-label">Training Completion</span>
                <span className="stat-value" style={{ color: '#F59E0B' }}>{completionPct}%</span>
              </div>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                <BookOpen size={24} />
              </div>
            </div>
          </div>

          {/* ── Training Meter ── */}
          <div className="glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1rem' }}>Training Completion Meter</h3>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Overall shelf stock — content consumed across all supervisors</p>
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Poppins, sans-serif', color: '#FF6B35' }}>{completionPct}%</span>
            </div>
            <div style={{ height: '14px', background: 'var(--bg-tertiary)', borderRadius: '7px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
              <div style={{
                height: '100%',
                width: `${completionPct}%`,
                background: 'linear-gradient(90deg, #FF6B35 0%, #00C896 100%)',
                borderRadius: '7px',
                transition: 'width 1s ease',
                boxShadow: '0 0 8px rgba(255,107,53,0.3)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>0%</span><span>Target: 100%</span>
            </div>
          </div>

          {/* ── Zone Performance Preview ── */}
          <div className="glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1rem' }}>Zone Performance Board</h3>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Live KPI snapshot across active deployment zones</p>
              </div>
              <TrendingUp size={20} color="#FF6B35" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
              {ZONE_DATA.map((z, i) => (
                <div key={i} style={{
                  padding: '16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '14px',
                  border: `1.5px solid ${z.color}22`,
                  textAlign: 'center',
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: z.color, margin: '0 auto 10px', boxShadow: `0 0 8px ${z.color}` }} />
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>{z.zone}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Poppins, sans-serif', color: z.color, lineHeight: 1 }}>{z.score}</div>
                  <div style={{ fontSize: '0.72rem', marginTop: '6px', color: z.trend.startsWith('+') ? '#00C896' : '#EF4444', fontWeight: 600 }}>{z.trend}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-columns">
            <div className="glass-card" style={{ flex: 2 }}>
              <h3 style={{ marginBottom: '16px', fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>🎯 Live Arena — My Quizzes</h3>
              {user?.role !== 'Trainer' ? (
                 <p style={{color: 'var(--text-muted)', marginTop: '16px'}}>Only Trainers can prepare and host live quizzes.</p>
              ) : quizzes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {quizzes.map(quiz => (
                    <div key={quiz.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                      <div>
                        <h4 style={{ margin: 0 }}>{quiz.title}</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {quiz.questions ? quiz.questions.length : 0} Questions • {quiz.Project ? quiz.Project.name : 'No Project'}
                          </span>
                          {quiz.config?.isOffline && (() => {
                            const now = new Date();
                            const start = quiz.config.offlineStartTime ? new Date(quiz.config.offlineStartTime) : null;
                            const end = quiz.config.offlineEndTime ? new Date(quiz.config.offlineEndTime) : null;
                            const linkUrl = `${offlineBaseUrl}/offline-quiz/${quiz.id}`;
                            let badge;
                            if (start && now < start) {
                              badge = (
                                <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '4px' }}>
                                  ⏰ Scheduled
                                </span>
                              );
                            } else if (end && now > end) {
                              badge = (
                                <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px' }}>
                                  🚫 Expired
                                </span>
                              );
                            } else {
                              badge = (
                                <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--success-glow)', color: 'var(--success)', border: '1px solid var(--success-border, rgba(139,207,0,0.2))', borderRadius: '4px' }}>
                                  🟢 Offline Active
                                </span>
                              );
                            }
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {badge}
                                <a 
                                  href={linkUrl} 
                                  style={{ color: '#FF6B35', fontSize: '0.78rem', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  🔗 Open Quiz
                                </a>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }} 
                          onClick={() => handleOpenOfflineModal(quiz)} 
                          title="Configure Offline Mode"
                        >
                          <WifiOff size={15} /> Offline Mode
                        </button>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }} 
                          onClick={() => handleLaunchQuiz(quiz.id)}
                        >
                          <Play size={15} /> Host Live
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }} 
                          onClick={() => navigate(`/builder/${quiz.id}`)}
                          title="Edit Quiz"
                        >
                          <Edit3 size={15} /> Edit
                        </button>
                        <button 
                          type="button"
                          className="btn btn-secondary" 
                          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#EF4444', borderColor: '#EF444430' }} 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteQuiz(quiz.id); }}
                          title="Delete Quiz Room"
                        >
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{color: 'var(--text-muted)', marginTop: '16px'}}>No quizzes found. Go to Create Quiz to build one!</p>
              )}
            </div>
            
            <div className="glass-card" style={{ flex: 1 }}>
              <h3>Quick Actions</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px'}}>
                {user?.role === 'Trainer' && (
                  <>
                    <button className="btn btn-primary" onClick={() => navigate('/builder')}>Create New Quiz</button>
                    <button className="btn btn-secondary" onClick={() => {
                      setIsSuccessView(false);
                      setIsUrlCustom(false);
                      setIsMeetingModalOpen(true);
                    }}>Create New Meeting</button>
                  </>
                )}
                <button className="btn btn-secondary" onClick={() => navigate('/reports')}>View Reports</button>
              </div>
            </div>
          </div>
        </div>



      {/* Create New Meeting Modal */}
      {isMeetingModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="glass-card" style={{ width: '650px', background: 'var(--bg-primary)', maxHeight: '90vh', overflowY: 'auto', padding: '32px', borderRadius: '16px', boxShadow: 'var(--shadow-lg)' }}>
            
            {!isSuccessView ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600 }}>Create New Meeting</h3>
                  <button onClick={() => { setIsMeetingModalOpen(false); setIsUrlCustom(false); }} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-primary)' }}><X size={20} /></button>
                </div>
                
                <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Title & Description */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Meeting Topic/Title *</label>
                    <input 
                      type="text" 
                      value={meetingForm.title} 
                      onChange={e => setMeetingForm({...meetingForm, title: e.target.value})} 
                      required 
                      placeholder="e.g. Project Onboarding Session"
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Description</label>
                    <textarea 
                      value={meetingForm.description} 
                      onChange={e => setMeetingForm({...meetingForm, description: e.target.value})} 
                      placeholder="Enter meeting agenda or notes..."
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', minHeight: '80px', resize: 'vertical' }} 
                    />
                  </div>

                  {/* Project & DateTime Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Select Project</label>
                      <select 
                        value={meetingForm.projectId} 
                        onChange={e => handleProjectChange(e.target.value)} 
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                      >
                        <option value="">-- General / Global --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Date & Time *</label>
                      <input 
                        type="datetime-local" 
                        value={meetingForm.scheduledAt} 
                        onChange={e => setMeetingForm({...meetingForm, scheduledAt: e.target.value})} 
                        required 
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} 
                      />
                    </div>
                  </div>

                  {/* Meeting Platform Selection */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Meeting Platform *</label>
                    <select
                      value={meetingForm.platform}
                      onChange={e => {
                        setIsUrlCustom(false);
                        setMeetingForm({...meetingForm, platform: e.target.value});
                      }}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="google_meet">Google Meet (Auto-generated Link)</option>
                      <option value="jitsi">Jitsi Meet (Auto-generated Link)</option>
                    </select>
                  </div>

                  {/* Generated Google Meet Invite */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Meeting Link (Auto-generated working room, or paste custom Google Meet link) *
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={meetingForm.url} 
                        onChange={e => {
                          setIsUrlCustom(true);
                          setMeetingForm({...meetingForm, url: e.target.value});
                        }} 
                        placeholder="https://meet.google.com/abc-defg-hij"
                        required
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.9rem' }} 
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleCopyLink(meetingForm.url)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                      >
                        {linkCopied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                        {linkCopied ? "Copied" : "Copy Link"}
                      </button>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                      * A fully functional meeting link is generated by default. Feel free to replace it with a custom link.
                    </span>
                  </div>

                  {/* Add Members Checklist */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Invite Members</label>
                      <input 
                        type="text" 
                        placeholder="Search members..." 
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.8rem', width: '180px' }}
                      />
                    </div>

                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '8px 12px', background: 'var(--bg-tertiary)' }}>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(u => {
                          const isChecked = meetingForm.inviteeIds.includes(u.id);
                          return (
                            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={() => {
                                  const updatedIds = isChecked 
                                    ? meetingForm.inviteeIds.filter(id => id !== u.id)
                                    : [...meetingForm.inviteeIds, u.id];
                                  setMeetingForm({...meetingForm, inviteeIds: updatedIds});
                                }}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <div style={{ fontSize: '0.85rem' }}>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{u.email} • {u.Role?.role_name || 'Employee'} {u.Project ? `(${u.Project.name})` : ''}</div>
                              </div>
                            </label>
                          );
                        })
                      ) : (
                        <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No members found</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setIsMeetingModalOpen(false); setIsUrlCustom(false); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={16} /> Schedule & Send Invites
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '2px solid var(--success)' }}>
                  <Check size={32} color="var(--success)" />
                </div>
                <h3 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Meeting Scheduled!</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Your training meeting has been successfully created. We've simulated sending invitation emails to <strong>{scheduledMeetingDetails?.inviteeCount || 0}</strong> invitees.
                </p>

                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '20px', textAlign: 'left', marginBottom: '24px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Topic</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{scheduledMeetingDetails?.title}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Project</span>
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{scheduledMeetingDetails?.projectName}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Date & Time</span>
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{scheduledMeetingDetails?.scheduledAt ? new Date(scheduledMeetingDetails.scheduledAt).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Google Meet Link</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={scheduledMeetingDetails?.url || ''} 
                        readOnly 
                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: '0.85rem' }} 
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleCopyLink(scheduledMeetingDetails?.url || '')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', padding: '8px 12px' }}
                      >
                        {linkCopied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                        {linkCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => {
                    setIsMeetingModalOpen(false);
                    setIsSuccessView(false);
                    setIsUrlCustom(false);
                  }}
                  style={{ width: '100%', padding: '12px' }}
                >
                  Close & Back to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Offline Quiz Config Modal */}
      {isOfflineModalOpen && selectedOfflineQuiz && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="glass-card" style={{ width: '500px', background: 'var(--bg-primary)', padding: '28px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
            
            {!isOfflineSuccessView ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontFamily: 'Poppins, sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <WifiOff size={20} color="#FF6B35" /> Configure Offline Quiz
                  </h3>
                  <button onClick={() => setIsOfflineModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleOfflineSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Enable Offline Taking</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Learners can join asynchronously via a link</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={offlineForm.isOffline}
                      onChange={e => setOfflineForm({ ...offlineForm, isOffline: e.target.checked })}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                  </div>

                  {offlineForm.isOffline && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Start Date & Time</label>
                          <input 
                            type="datetime-local" 
                            value={offlineForm.startTime}
                            onChange={e => setOfflineForm({ ...offlineForm, startTime: e.target.value })}
                            required
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>End Date & Time</label>
                          <input 
                            type="datetime-local" 
                            value={offlineForm.endTime}
                            onChange={e => setOfflineForm({ ...offlineForm, endTime: e.target.value })}
                            required
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Shareable Quiz Link</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <input 
                            type="text" 
                            value={offlineQuizLink} 
                            readOnly 
                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}
                          />
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={() => handleCopyLink(offlineQuizLink)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', padding: '10px 14px' }}
                          >
                            {linkCopied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                            {linkCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <a 
                            href={offlineQuizLink}
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              fontSize: '0.82rem', 
                              color: '#FF6B35', 
                              textDecoration: 'underline', 
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            🔗 Open Quiz Link
                          </a>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                          * Note: Save changes first before opening the link, so the server activates offline mode.
                        </span>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsOfflineModalOpen(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Settings</button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-glow)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '2px solid var(--success)' }}>
                  <Check size={32} color="var(--success)" />
                </div>
                <h3 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Offline Mode Activated!</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
                  The quiz <strong>{selectedOfflineQuiz.title}</strong> has been successfully configured for offline taking.
                </p>

                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '20px', textAlign: 'left', marginBottom: '24px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Date Range</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {new Date(offlineForm.startTime).toLocaleString()} - {new Date(offlineForm.endTime).toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Shareable Quiz Link</span>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <input 
                        type="text" 
                        value={offlineQuizLink} 
                        readOnly 
                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: '0.85rem' }} 
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleCopyLink(offlineQuizLink)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', padding: '8px 12px' }}
                      >
                        {linkCopied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                        {linkCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <a 
                      href={offlineQuizLink}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.85rem', 
                        color: '#FF6B35', 
                        textDecoration: 'underline', 
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      🔗 Open Quiz Link
                    </a>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => {
                    setIsOfflineModalOpen(false);
                    setIsOfflineSuccessView(false);
                  }}
                  style={{ width: '100%', padding: '12px' }}
                >
                  Close & Back to Dashboard
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
