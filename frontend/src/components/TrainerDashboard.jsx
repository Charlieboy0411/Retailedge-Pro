import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, CheckCircle, BarChart2, TrendingUp, Star, Calendar, 
  ChevronDown, Plus, Play, Edit3, Trash2, WifiOff, Check, Copy, 
  X, Mail, BookOpen, Award, ArrowUpRight, Search, FileText,
  Volume2, HelpCircle
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import CalendarWidget from './CalendarWidget';

export default function TrainerDashboard({ 
  quizzes = [], 
  projects = [], 
  usersList = [], 
  token,
  user,
  meetings = [],
  fetchAllData
}) {
  const navigate = useNavigate();
  const [selectedDateFilter, setSelectedDateFilter] = useState('Last 7 Days');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  
  // Modals state
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [selectedOfflineQuiz, setSelectedOfflineQuiz] = useState(null);
  const [isSuccessView, setIsSuccessView] = useState(false);
  const [isOfflineSuccessView, setIsOfflineSuccessView] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [scheduledMeetingDetails, setScheduledMeetingDetails] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [isUrlCustom, setIsUrlCustom] = useState(false);
  
  // Meeting form
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    projectId: '',
    scheduledAt: '',
    url: '',
    inviteeIds: [],
    platform: 'google_meet'
  });

  // Offline form
  const [offlineForm, setOfflineForm] = useState({ 
    isOffline: false, 
    startNow: true,   // when true, startTime is ignored (quiz starts immediately)
    startTime: '', 
    endTime: '' 
  });
  const [offlineQuizLink, setOfflineQuizLink] = useState('');
  const [offlineBaseUrl, setOfflineBaseUrl] = useState(window.location.origin);

  // Helper: format local timezone abbreviation for display
  const localTzLabel = () => {
    const offset = -new Date().getTimezoneOffset();
    const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const m = String(Math.abs(offset) % 60).padStart(2, '0');
    return `UTC${offset >= 0 ? '+' : '-'}${h}:${m}`;
  };

  // Tip widget rotation
  const TIPS = [
    "Short quizzes improve participation by 35%. Keep them under 5 questions for quick reviews.",
    "Training videos under 10 minutes have higher completion rates. Break long sessions into bitesize modules.",
    "True/False questions are excellent for compliance assessments and reinforcement.",
    "Enable leaderboards to foster friendly competition and increase engagement.",
    "Adding an image or diagram to a question increases correct response rates by 22%."
  ];
  const [tipIndex, setTipIndex] = useState(0);
  const [showTip, setShowTip] = useState(true);

  // Donut chart drilldown state
  const [drilldownProject, setDrilldownProject] = useState(null);
  
  // Performance chart timeline state
  const [chartTimeline, setChartTimeline] = useState('Weekly'); // Daily, Weekly, Monthly

  const chartData = {
    Daily: {
      labels: ['05 Jun', '06 Jun', '07 Jun', '08 Jun', '09 Jun', '10 Jun', '11 Jun'],
      participants: [15, 13, 16, 14, 18, 12, 9],
      completion: [52, 65, 81, 74, 91, 78, 85],
      avgScore: [70, 82, 78, 76, 74, 68, 71]
    },
    Weekly: {
      labels: ['Week 20', 'Week 21', 'Week 22', 'Week 23', 'Week 24'],
      participants: [35, 48, 42, 55, 68],
      completion: [62, 70, 78, 84, 91],
      avgScore: [68, 72, 75, 78, 82]
    },
    Monthly: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      participants: [110, 130, 155, 140, 190, 230],
      completion: [58, 64, 72, 78, 85, 91],
      avgScore: [60, 65, 70, 74, 76, 80]
    }
  };

  const currentData = chartData[chartTimeline] || chartData.Weekly;
  const nPoints = currentData.labels.length;
  const maxPart = Math.max(...currentData.participants);
  const partScale = maxPart > 0 ? maxPart * 1.2 : 30;

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

  useEffect(() => {
    // Rotates tips daily or simply on load
    const idx = Math.floor(Math.random() * TIPS.length);
    setTipIndex(idx);

    // Fetch join URL for offline mode
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

  // URL generator for meeting modal based on chosen platform (Google Meet / Jitsi)
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

  // Handle meeting scheduling submit
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
      if (fetchAllData) fetchAllData(true);
    } catch (error) {
      console.error('Failed to schedule meeting', error);
      alert(error.response?.data?.error || 'Failed to schedule meeting. Please try again.');
    }
  };

  // Handle offline mode toggle submit
  const handleOfflineSubmit = async (e) => {
    e.preventDefault();
    try {
      // If "Start Now" is checked, send null startTime so quiz is live immediately
      const startTimeToSend = (offlineForm.isOffline && !offlineForm.startNow && offlineForm.startTime)
        ? new Date(offlineForm.startTime).toISOString()
        : null;
      const endTimeToSend = (offlineForm.isOffline && offlineForm.endTime)
        ? new Date(offlineForm.endTime).toISOString()
        : null;

      await axios.post(`/api/quizzes/${selectedOfflineQuiz.id}/offline`, {
        isOffline: offlineForm.isOffline,
        startTime: startTimeToSend,
        endTime: endTimeToSend
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (offlineForm.isOffline) {
        setIsOfflineSuccessView(true);
      } else {
        alert('Offline settings saved successfully!');
        setIsOfflineModalOpen(false);
      }
      if (fetchAllData) fetchAllData(true);
    } catch (err) {
      console.error(err);
      alert('Failed to save offline quiz settings.');
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
      if (isNaN(date.getTime())) return '';
      // getTimezoneOffset() returns minutes offset from UTC (negative for UTC+).
      // Subtracting it converts UTC to local time for the datetime-local input.
      const localMs = date.getTime() - (date.getTimezoneOffset() * 60000);
      return new Date(localMs).toISOString().slice(0, 16);
    };

    const storedStart = formatDatetimeLocal(conf.offlineStartTime);
    setOfflineForm({
      isOffline: !!conf.isOffline,
      startNow: !conf.offlineStartTime,  // if no startTime stored → was "start now"
      startTime: storedStart,
      endTime: formatDatetimeLocal(conf.offlineEndTime)
    });
    setOfflineQuizLink(`${offlineBaseUrl}/offline-quiz/${quiz.id}`);
    setIsOfflineSuccessView(false);
    setIsOfflineModalOpen(true);
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
      if (fetchAllData) fetchAllData(true);
    } catch (error) {
      console.error("Failed to delete quiz:", error);
      alert(error.response?.data?.error || "Failed to delete quiz.");
    }
  };

  // Filter users for invitations
  const filteredUsers = usersList
    .filter(u => {
      const term = memberSearch.toLowerCase();
      const matchesSearch = u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      const isSelf = u.id === user?.id;
      return matchesSearch && !isSelf;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Dynamic statistics calculations
  const totalQuizzes = quizzes.length;
  // Let's compute default or actual stats. If db is loaded with records, calculate.
  // We'll merge with the mockup values to ensure perfect visual presentation
  const mockTotalParticipants = 18;
  const mockAvgCompletion = 91;
  const mockTotalQuizzesHosted = 6;
  const mockAvgScore = 74;

  const actualParticipants = quizzes.reduce((sum, q) => sum + (q.questions?.length || 0), 0); // Placeholder or mock
  
  // Date Picker Option Click
  const handleDateFilterSelect = (val) => {
    setSelectedDateFilter(val);
    setShowDateDropdown(false);
  };

  return (
    <div style={{ padding: '0px', fontFamily: 'Poppins, sans-serif', color: '#1F2328' }}>
      
      {/* ─── HEADER ROW ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: '#1F2328', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Welcome back, {user?.name || 'Demo Trainer'}! 👋
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#5F6875', fontSize: '0.92rem' }}>
            Here's what's happening in your training arena today.
          </p>
        </div>
        
        {/* Right Header Filter & CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          
          {/* Date Range Filter Button */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-glass)',
                border: '1px solid #B7BEC7',
                borderRadius: '10px',
                padding: '10px 16px',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                height: '42px'
              }}
            >
              <Calendar size={16} color="#3E5C8A" />
              <span>{selectedDateFilter}</span>
              <ChevronDown size={14} color="#727A86" />
            </button>
            {showDateDropdown && (
              <div style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                background: 'var(--bg-glass)',
                border: '1px solid #B7BEC7',
                borderRadius: '10px',
                width: '180px',
                boxShadow: '0 10px 25px rgba(15,23,42,0.1)',
                zIndex: 110,
                overflow: 'hidden'
              }}>
                {['Today', 'Last 7 Days', 'Last 30 Days', 'Custom Range'].map(opt => (
                  <div 
                    key={opt}
                    onClick={() => handleDateFilterSelect(opt)}
                    style={{
                      padding: '10px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      color: selectedDateFilter === opt ? '#3E5C8A' : '#475569',
                      background: selectedDateFilter === opt ? '#FFF5F0' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#F4F5F7'}
                    onMouseOut={e => {
                      if (selectedDateFilter === opt) e.currentTarget.style.background = '#FFF5F0';
                      else e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Action Button */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowActionDropdown(!showActionDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #3E5C8A 0%, #E05A0E 100%)',
                color: 'white',
                fontWeight: 600,
                borderRadius: '10px',
                padding: '0 18px',
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(62, 92, 138, 0.25)',
                height: '42px',
                border: 'none'
              }}
            >
              <span>Create Quiz</span>
              <div style={{ height: '20px', width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 4px 0 6px' }} />
              <ChevronDown size={14} color="white" />
            </button>
            {showActionDropdown && (
              <div style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                background: 'var(--bg-glass)',
                border: '1px solid #B7BEC7',
                borderRadius: '10px',
                width: '180px',
                boxShadow: '0 10px 25px rgba(15,23,42,0.1)',
                zIndex: 110,
                overflow: 'hidden'
              }}>
                {[
                  { label: 'Create Quiz', action: () => navigate('/builder') },
                  { label: 'Schedule Training', action: () => { setIsSuccessView(false); setIsUrlCustom(false); setIsMeetingModalOpen(true); setShowActionDropdown(false); } },
                  { label: 'Upload Content', action: () => navigate('/trainings') },
                  { label: 'Generate Certificate', action: () => navigate('/certificates') }
                ].map(act => (
                  <div 
                    key={act.label}
                    onClick={() => { act.action(); setShowActionDropdown(false); }}
                    style={{
                      padding: '10px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      color: '#475569',
                      transition: 'background 0.15s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#F4F5F7'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {act.label}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ─── KPI CARDS GRID (4 Column) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* KPI 1: Total Participants */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#5F6875', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Participants</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0 0 0', color: '#1F2328' }}>18</h3>
            </div>
            <div style={{ background: 'rgba(62, 92, 138, 0.08)', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#3E5C8A" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
            <span style={{ fontSize: '0.78rem', color: '#3B8C68', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
              ↑ +12% <span style={{ color: '#727A86', fontWeight: 400 }}>vs last 7 days</span>
            </span>
            {/* Sparkline chart SVG */}
            <svg width="60" height="24" viewBox="0 0 60 24" style={{ overflow: 'visible' }}>
              <path d="M0,20 Q10,12 20,16 T40,6 T60,2" fill="none" stroke="#3E5C8A" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M0,20 Q10,12 20,16 T40,6 T60,2 L60,24 L0,24 Z" fill="rgba(62, 92, 138, 0.05)" />
            </svg>
          </div>
        </div>

        {/* KPI 2: Avg Quiz Completion */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#5F6875', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Quiz Completion</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0 0 0', color: '#1F2328' }}>91%</h3>
            </div>
            <div style={{ background: 'rgba(59, 140, 104, 0.08)', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={18} color="#3B8C68" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
            <span style={{ fontSize: '0.78rem', color: '#3B8C68', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
              ↑ +8% <span style={{ color: '#727A86', fontWeight: 400 }}>vs last 7 days</span>
            </span>
            {/* Sparkline chart SVG */}
            <svg width="60" height="24" viewBox="0 0 60 24" style={{ overflow: 'visible' }}>
              <path d="M0,20 Q15,18 30,10 T60,3" fill="none" stroke="#3B8C68" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M0,20 Q15,18 30,10 T60,3 L60,24 L0,24 Z" fill="rgba(59, 140, 104, 0.05)" />
            </svg>
          </div>
        </div>

        {/* KPI 3: Total Quizzes Hosted */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#5F6875', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Quizzes Hosted</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0 0 0', color: '#1F2328' }}>{totalQuizzes || mockTotalQuizzesHosted}</h3>
            </div>
            <div style={{ background: 'rgba(199, 154, 59, 0.08)', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={18} color="#C79A3B" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
            <span style={{ fontSize: '0.78rem', color: '#3B8C68', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
              ↑ +1 <span style={{ color: '#727A86', fontWeight: 400 }}>vs last 7 days</span>
            </span>
            {/* Sparkline chart SVG */}
            <svg width="60" height="24" viewBox="0 0 60 24" style={{ overflow: 'visible' }}>
              <path d="M0,22 Q15,22 30,12 T60,5" fill="none" stroke="#C79A3B" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M0,22 Q15,22 30,12 T60,5 L60,24 L0,24 Z" fill="rgba(199, 154, 59, 0.05)" />
            </svg>
          </div>
        </div>

        {/* KPI 4: Average Score */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#5F6875', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Score</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0 0 0', color: '#1F2328' }}>74%</h3>
            </div>
            <div style={{ background: 'rgba(62, 92, 138, 0.08)', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={18} color="#3E5C8A" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
            <span style={{ fontSize: '0.78rem', color: '#3B8C68', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
              ↑ +9% <span style={{ color: '#727A86', fontWeight: 400 }}>vs last 7 days</span>
            </span>
            {/* Sparkline chart SVG */}
            <svg width="60" height="24" viewBox="0 0 60 24" style={{ overflow: 'visible' }}>
              <path d="M0,18 Q15,12 30,16 T60,6" fill="none" stroke="#3E5C8A" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M0,18 Q15,12 30,16 T60,6 L60,24 L0,24 Z" fill="rgba(62, 92, 138, 0.05)" />
            </svg>
          </div>
        </div>

      </div>

      {/* ─── MIDDLE SECTIONS: Performance Overview & Activity Feed ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* Performance Overview (Chart) */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2328', margin: 0 }}>Performance Overview</h3>
              <p style={{ fontSize: '0.75rem', color: '#727A86', margin: '2px 0 0 0' }}>Training effectiveness & participation trends</p>
            </div>
            
            {/* Chart Timeline Selection */}
            <div style={{ display: 'flex', gap: '4px', background: '#F4F5F7', padding: '4px', borderRadius: '8px', border: '1px solid #B7BEC7' }}>
              {['Daily', 'Weekly', 'Monthly'].map(tl => (
                <button
                  key={tl}
                  onClick={() => setChartTimeline(tl)}
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    color: chartTimeline === tl ? '#3E5C8A' : '#5F6875',
                    background: chartTimeline === tl ? '#FFFFFF' : 'transparent',
                    boxShadow: chartTimeline === tl ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {tl}
                </button>
              ))}
            </div>
          </div>
          
          {/* Chart Legend */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '0.78rem', fontWeight: 500 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5F6875' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#3E5C8A', borderRadius: '3px' }} />
              Participants
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5F6875' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '3px', background: '#3B8C68', borderRadius: '2px' }} />
              Completion %
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5F6875' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '3px', background: '#C79A3B', borderRadius: '2px' }} />
              Avg Score
            </span>
          </div>

          {/* SVG Performance Chart */}
          <div style={{ width: '100%', height: '220px', position: 'relative' }}>
            <svg viewBox="0 0 500 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Y-axis gridlines */}
              <line x1="40" y1="20" x2="460" y2="20" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="60" x2="460" y2="60" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="100" x2="460" y2="100" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="140" x2="460" y2="140" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="40" y1="170" x2="460" y2="170" stroke="#B7BEC7" strokeWidth="1.5" />

              {/* Y Axis Labels (Left: Participants count) */}
              <text x="30" y="24" fill="#727A86" fontSize="8" fontWeight="600" textAnchor="end">{Math.round(partScale)}</text>
              <text x="30" y="64" fill="#727A86" fontSize="8" fontWeight="600" textAnchor="end">{Math.round(partScale * 2 / 3)}</text>
              <text x="30" y="104" fill="#727A86" fontSize="8" fontWeight="600" textAnchor="end">{Math.round(partScale / 3)}</text>
              <text x="30" y="144" fill="#727A86" fontSize="8" fontWeight="600" textAnchor="end">{Math.round(partScale / 6)}</text>
              <text x="30" y="174" fill="#727A86" fontSize="8" fontWeight="600" textAnchor="end">0</text>

              {/* Y Axis Labels (Right: Percentages) */}
              <text x="470" y="24" fill="#727A86" fontSize="8" fontWeight="600" textAnchor="start">100%</text>
              <text x="470" y="104" fill="#727A86" fontSize="8" fontWeight="600" textAnchor="start">50%</text>
              <text x="470" y="174" fill="#727A86" fontSize="8" fontWeight="600" textAnchor="start">0%</text>

              {/* X Axis Labels */}
              {currentData.labels.map((label, idx) => {
                const x = 50 + (idx * (400 / (nPoints - 1)));
                return (
                  <text key={idx} x={x} y="186" fill="#727A86" fontSize="8" fontWeight="600" textAnchor="middle">
                    {label}
                  </text>
                );
              })}

              {/* Bars: Participants count */}
              {currentData.participants.map((val, idx) => {
                const x = 50 + (idx * (400 / (nPoints - 1)));
                const height = (val / partScale) * 150;
                const y = 170 - height;
                return (
                  <g key={idx}>
                    <rect 
                      x={x - 12} 
                      y={y} 
                      width="24" 
                      height={height} 
                      fill="#3E5C8A" 
                      rx="4"
                      style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
                      onMouseOver={e => e.currentTarget.setAttribute('fill', '#1D4ED8')}
                      onMouseOut={e => e.currentTarget.setAttribute('fill', '#3E5C8A')}
                    />
                    <text x={x} y={y - 6} fill="#1F2328" fontSize="7" fontWeight="700" textAnchor="middle">{val}</text>
                  </g>
                );
              })}

              {/* Line 1: Completion % */}
              {(() => {
                const points = currentData.completion.map((val, idx) => {
                  const x = 50 + (idx * (400 / (nPoints - 1)));
                  const y = 170 - (val / 100) * 150;
                  return { x, y };
                });
                const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                return (
                  <g>
                    <path d={d} fill="none" stroke="#3B8C68" strokeWidth="3" strokeLinecap="round" />
                    {points.map((pt, idx) => (
                      <circle key={idx} cx={pt.x} cy={pt.y} r="4.5" fill="#FFFFFF" stroke="#3B8C68" strokeWidth="2.5" />
                    ))}
                  </g>
                );
              })()}

              {/* Line 2: Avg Score % */}
              {(() => {
                const points = currentData.avgScore.map((val, idx) => {
                  const x = 50 + (idx * (400 / (nPoints - 1)));
                  const y = 170 - (val / 100) * 150;
                  return { x, y };
                });
                const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                return (
                  <g>
                    <path d={d} fill="none" stroke="#C79A3B" strokeWidth="3" strokeLinecap="round" />
                    {points.map((pt, idx) => (
                      <circle key={idx} cx={pt.x} cy={pt.y} r="4.5" fill="#FFFFFF" stroke="#C79A3B" strokeWidth="2.5" />
                    ))}
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2328', margin: 0 }}>Recent Activity</h3>
            <span style={{ fontSize: '0.8rem', color: '#3E5C8A', fontWeight: 600, cursor: 'pointer' }}>View All</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            
            {/* Act 1 */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ background: '#DCFCE7', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={16} color="#15803D" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Test Quiz Offline</div>
                <div style={{ fontSize: '0.75rem', color: '#5F6875' }}>Hosted for Idonneous</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#727A86', whiteSpace: 'nowrap' }}>2 mins ago</span>
            </div>

            {/* Act 2 */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ background: '#F3E8FF', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Play size={16} color="#7C3AED" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Galderma Launchpad Quiz</div>
                <div style={{ fontSize: '0.75rem', color: '#5F6875' }}>Hosted for Galderma</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#727A86', whiteSpace: 'nowrap' }}>1 hour ago</span>
            </div>

            {/* Act 3 */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ background: '#FFF7ED', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={16} color="#EA580C" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>13 participants completed</div>
                <div style={{ fontSize: '0.75rem', color: '#5F6875' }}>Test Quiz Offline</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#727A86', whiteSpace: 'nowrap' }}>2 hours ago</span>
            </div>

            {/* Act 4 */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ background: '#E0F2FE', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Award size={16} color="#0369A1" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Certificates issued</div>
                <div style={{ fontSize: '0.75rem', color: '#5F6875' }}>12 certificates generated</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#727A86', whiteSpace: 'nowrap' }}>3 hours ago</span>
            </div>

          </div>
        </div>

      </div>

      {/* ─── BOTTOM SECTIONS: Top Quiz, Donut Chart, Quick Actions ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* Top Quiz Performance */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2328', margin: 0 }}>Top Quiz Performance</h3>
            <span style={{ fontSize: '0.8rem', color: '#3E5C8A', fontWeight: 600, cursor: 'pointer' }}>View All</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Rank 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#FEF08A', color: '#A16207', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>1</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Galderma Launchpad Quiz</div>
                <div style={{ fontSize: '0.75rem', color: '#5F6875' }}>Galderma</div>
              </div>
              <span style={{ padding: '4px 10px', background: '#DCFCE7', color: '#15803D', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>92%</span>
            </div>

            {/* Rank 2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#B7BEC7', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>2</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Test Quiz Offline</div>
                <div style={{ fontSize: '0.75rem', color: '#5F6875' }}>Idonneous</div>
              </div>
              <span style={{ padding: '4px 10px', background: '#DCFCE7', color: '#15803D', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>85%</span>
            </div>

            {/* Rank 3 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#FFEDD5', color: '#C2410C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>3</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Product Knowledge Quiz</div>
                <div style={{ fontSize: '0.75rem', color: '#5F6875' }}>Idonneous</div>
              </div>
              <span style={{ padding: '4px 10px', background: '#DCFCE7', color: '#15803D', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>78%</span>
            </div>

          </div>
        </div>

        {/* Participants by Project Donut Chart */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2328', margin: '0 0 16px 0' }}>Participants by Project</h3>
          
          {drilldownProject ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3E5C8A' }}>{drilldownProject} Learners</span>
                <button 
                  onClick={() => setDrilldownProject(null)}
                  style={{ fontSize: '0.75rem', color: '#5F6875', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Back
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '130px', overflowY: 'auto' }}>
                {usersList
                  .filter(u => drilldownProject === 'Others' ? !['Idonneous', 'Galderma'].some(p => u.Project?.name?.includes(p)) : u.Project?.name?.toLowerCase().includes(drilldownProject.toLowerCase()))
                  .slice(0, 6)
                  .map((usr, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '4px 0', borderBottom: '1px solid #F1F5F9' }}>
                      <span style={{ fontWeight: 600 }}>{usr.name}</span>
                      <span style={{ color: '#5F6875' }}>{usr.Role?.role_name || 'Supervisor'}</span>
                    </div>
                  ))
                }
                {usersList.filter(u => drilldownProject === 'Others' ? !['Idonneous', 'Galderma'].some(p => u.Project?.name?.includes(p)) : u.Project?.name?.toLowerCase().includes(drilldownProject.toLowerCase())).length === 0 && (
                  <div style={{ textAlign: 'center', color: '#727A86', fontSize: '0.78rem', padding: '20px 0' }}>No specific participants registered.</div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              {/* Donut Chart SVG */}
              <div style={{ width: '120px', height: '120px', position: 'relative' }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Outer circle segments (donut) */}
                  {/* Segment 1: Idonneous (12/18 = 66.7% | Circumference: 2 * PI * r = 2 * PI * 40 = 251.2 | Dasharray: 167.5, 83.7) */}
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="40" 
                    fill="none" 
                    stroke="#3E5C8A" 
                    strokeWidth="16" 
                    strokeDasharray="167.5 83.7"
                    style={{ cursor: 'pointer', transition: 'stroke-width 0.2s' }}
                    onClick={() => setDrilldownProject('Idonneous')}
                    onMouseOver={e => e.currentTarget.setAttribute('stroke-width', '20')}
                    onMouseOut={e => e.currentTarget.setAttribute('stroke-width', '16')}
                  />
                  {/* Segment 2: Galderma (4/18 = 22.2% | Dasharray: 55.8, 195.4 | Offset: -167.5) */}
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="40" 
                    fill="none" 
                    stroke="#3B8C68" 
                    strokeWidth="16" 
                    strokeDasharray="55.8 195.4"
                    strokeDashoffset="-167.5"
                    style={{ cursor: 'pointer', transition: 'stroke-width 0.2s' }}
                    onClick={() => setDrilldownProject('Galderma')}
                    onMouseOver={e => e.currentTarget.setAttribute('stroke-width', '20')}
                    onMouseOut={e => e.currentTarget.setAttribute('stroke-width', '16')}
                  />
                  {/* Segment 3: Others (2/18 = 11.1% | Dasharray: 27.9, 223.3 | Offset: -223.3) */}
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="40" 
                    fill="none" 
                    stroke="#3E5C8A" 
                    strokeWidth="16" 
                    strokeDasharray="27.9 223.3"
                    strokeDashoffset="-223.3"
                    style={{ cursor: 'pointer', transition: 'stroke-width 0.2s' }}
                    onClick={() => setDrilldownProject('Others')}
                    onMouseOver={e => e.currentTarget.setAttribute('stroke-width', '20')}
                    onMouseOut={e => e.currentTarget.setAttribute('stroke-width', '16')}
                  />
                </svg>
                {/* Text inside Donut */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1F2328', lineHeight: 1 }}>18</div>
                  <div style={{ fontSize: '0.62rem', color: '#727A86', textTransform: 'uppercase', fontWeight: 600 }}>Total</div>
                </div>
              </div>

              {/* Legends with percentages */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', fontWeight: 500, flex: 1, paddingLeft: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setDrilldownProject('Idonneous')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#3E5C8A', borderRadius: '50%' }} />
                    Idonneous
                  </span>
                  <strong style={{ color: '#1F2328' }}>12 (66.7%)</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setDrilldownProject('Galderma')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#3B8C68', borderRadius: '50%' }} />
                    Galderma
                  </span>
                  <strong style={{ color: '#1F2328' }}>4 (22.2%)</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setDrilldownProject('Others')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#3E5C8A', borderRadius: '50%' }} />
                    Others
                  </span>
                  <strong style={{ color: '#1F2328' }}>2 (11.1%)</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2328', margin: '0 0 16px 0' }}>Quick Actions</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            
            {/* Action 1 */}
            <div 
              onClick={() => navigate('/builder')}
              style={{
                background: '#F4F5F7',
                border: '1px solid #B7BEC7',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#3E5C8A'; e.currentTarget.style.background = '#F0F5FF'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#B7BEC7'; e.currentTarget.style.background = '#F4F5F7'; }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <Plus size={16} color="#3E5C8A" />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>Create Quiz</div>
              <div style={{ fontSize: '0.68rem', color: '#5F6875', marginTop: '2px' }}>Add new quiz</div>
            </div>

            {/* Action 2 */}
            <div 
              onClick={() => navigate('/reports')}
              style={{
                background: '#F4F5F7',
                border: '1px solid #B7BEC7',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#3B8C68'; e.currentTarget.style.background = '#F0FDF4'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#B7BEC7'; e.currentTarget.style.background = '#F4F5F7'; }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <BarChart2 size={16} color="#3B8C68" />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>View Reports</div>
              <div style={{ fontSize: '0.68rem', color: '#5F6875', marginTop: '2px' }}>Analytics & insights</div>
            </div>

            {/* Action 3 */}
            <div 
              onClick={() => navigate('/trainings')}
              style={{
                background: '#F4F5F7',
                border: '1px solid #B7BEC7',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#C79A3B'; e.currentTarget.style.background = '#F5F3FF'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#B7BEC7'; e.currentTarget.style.background = '#F4F5F7'; }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <BookOpen size={16} color="#C79A3B" />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>Manage Trainings</div>
              <div style={{ fontSize: '0.68rem', color: '#5F6875', marginTop: '2px' }}>Training modules</div>
            </div>

            {/* Action 4 */}
            <div 
              onClick={() => navigate('/certificates')}
              style={{
                background: '#F4F5F7',
                border: '1px solid #B7BEC7',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#EA580C'; e.currentTarget.style.background = '#FFF7ED'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#B7BEC7'; e.currentTarget.style.background = '#F4F5F7'; }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(234,88,12,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <Award size={16} color="#EA580C" />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>Issue Certificate</div>
              <div style={{ fontSize: '0.68rem', color: '#5F6875', marginTop: '2px' }}>Generate certificates</div>
            </div>

          </div>
        </div>

      </div>

      {/* ─── LIVE ARENA MY QUIZZES LIST ─── */}
      <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.1rem' }}>🎯 Live Arena — My Quizzes</h3>
        
        {quizzes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {quizzes.map(quiz => (
              <div key={quiz.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#F4F5F7', borderRadius: '12px', border: '1px solid #B7BEC7' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1F2328' }}>{quiz.title}</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ color: '#5F6875', fontSize: '0.8rem', fontWeight: 500 }}>
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
                          <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '4px' }}>
                            ⏰ Scheduled
                          </span>
                        );
                      } else if (end && now > end) {
                        badge = (
                          <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px' }}>
                            🚫 Expired
                          </span>
                        );
                      } else {
                        badge = (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#DCFCE7', color: '#15803D', border: '1px solid rgba(22,163,74,0.2)', borderRadius: '4px' }}>
                            🟢 Offline Active
                          </span>
                        );
                      }
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {badge}
                          <a 
                            href={linkUrl} 
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#3E5C8A', fontSize: '0.78rem', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
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
                    className="btn btn-secondary btn-sm" 
                    style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid #B7BEC7', background: 'var(--bg-glass)' }} 
                    onClick={() => handleOpenOfflineModal(quiz)} 
                    title="Configure Offline Mode"
                  >
                    <WifiOff size={14} color="#5F6875" /> <span style={{ color: '#475569' }}>Offline Mode</span>
                  </button>
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', borderRadius: '8px', background: 'linear-gradient(135deg, #3E5C8A 0%, #E05A0E 100%)', border: 'none', color: 'white', fontWeight: 600 }} 
                    onClick={() => navigate(`/host/${quiz.id}`)}
                  >
                    <Play size={14} color="white" /> Host Live
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid #B7BEC7', background: 'var(--bg-glass)' }} 
                    onClick={() => navigate(`/builder/${quiz.id}`)}
                    title="Edit Quiz"
                  >
                    <Edit3 size={14} color="#5F6875" />
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', borderRadius: '8px', border: '1px solid #FEE2E2', background: 'var(--bg-glass)', color: '#EF4444' }} 
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    title="Delete Quiz Room"
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#727A86', marginTop: '16px', fontSize: '0.85rem' }}>No quizzes found. Use the Create Quiz actions to build one!</p>
        )}
      </div>

      {/* ─── ROTATING TRAINER TIP WIDGET ─── */}
      {showTip && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(62, 92, 138, 0.08)',
          border: '1px solid rgba(243, 111, 33, 0.2)',
          borderRadius: '12px',
          padding: '14px 20px',
          fontSize: '0.82rem',
          fontWeight: 600,
          color: '#3E5C8A',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.1rem' }}>💡</span>
            <span><strong>Pro Tip:</strong> {TIPS[tipIndex]}</span>
          </div>
          <button 
            onClick={() => setShowTip(false)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
          >
            <X size={16} color="#3E5C8A" />
          </button>
        </div>
      )}

      {/* ─── CREATE NEW MEETING MODAL ─── */}
      {isMeetingModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '600px', background: 'var(--bg-glass)', maxHeight: '90vh', overflowY: 'auto', padding: '32px', borderRadius: '16px', border: '1px solid #B7BEC7', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
            
            {!isSuccessView ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ margin: 0, color: '#1F2328', fontSize: '1.3rem', fontWeight: 800 }}>Create New Meeting</h3>
                  <button onClick={() => { setIsMeetingModalOpen(false); setIsUrlCustom(false); }} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#5F6875' }}><X size={20} /></button>
                </div>
                
                <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Topic */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Meeting Topic/Title *</label>
                    <input 
                      type="text" 
                      value={meetingForm.title} 
                      onChange={e => setMeetingForm({...meetingForm, title: e.target.value})} 
                      required 
                      placeholder="e.g. Product Knowledge Assessment Review"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #B7BEC7', background: '#F4F5F7', color: '#1F2328', fontSize: '0.88rem' }} 
                    />
                  </div>

                  {/* Agenda */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Description/Agenda</label>
                    <textarea 
                      value={meetingForm.description} 
                      onChange={e => setMeetingForm({...meetingForm, description: e.target.value})} 
                      placeholder="Enter meeting agenda or notes..."
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #B7BEC7', background: '#F4F5F7', color: '#1F2328', minHeight: '60px', resize: 'vertical', fontSize: '0.88rem' }} 
                    />
                  </div>

                  {/* Project & DateTime */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Select Project</label>
                      <select 
                        value={meetingForm.projectId} 
                        onChange={e => handleProjectChange(e.target.value)} 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #B7BEC7', background: '#F4F5F7', color: '#1F2328', fontSize: '0.88rem', outline: 'none' }}
                      >
                        <option value="">-- General / Global --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Date & Time *</label>
                      <input 
                        type="datetime-local" 
                        value={meetingForm.scheduledAt} 
                        onChange={e => setMeetingForm({...meetingForm, scheduledAt: e.target.value})} 
                        required 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #B7BEC7', background: '#F4F5F7', color: '#1F2328', fontSize: '0.88rem' }} 
                      />
                    </div>
                  </div>

                  {/* Meeting Platform Selection */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Meeting Platform *</label>
                    <select
                      value={meetingForm.platform}
                      onChange={e => {
                        setIsUrlCustom(false);
                        setMeetingForm({...meetingForm, platform: e.target.value});
                      }}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #B7BEC7', background: '#F4F5F7', color: '#1F2328', fontSize: '0.88rem', outline: 'none' }}
                    >
                      <option value="google_meet">Google Meet (Auto-generated Link)</option>
                      <option value="jitsi">Jitsi Meet (Auto-generated Link)</option>
                    </select>
                  </div>

                  {/* Meeting URL */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                      Meeting Link (Google Meet / Jitsi URL) *
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
                        style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #B7BEC7', background: '#F4F5F7', color: '#1F2328', fontSize: '0.85rem' }} 
                      />
                      <button 
                        type="button" 
                        onClick={() => handleCopyLink(meetingForm.url)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', padding: '10px 14px', borderRadius: '8px', background: '#F1F5F9', border: '1px solid #B7BEC7', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {linkCopied ? <Check size={14} color="#3B8C68" /> : <Copy size={14} />}
                        {linkCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Members Checklist */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Invite Members</label>
                      <input 
                        type="text" 
                        placeholder="Search members..." 
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: '#F4F5F7', color: '#1F2328', fontSize: '0.78rem', width: '180px' }}
                      />
                    </div>

                    <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid #B7BEC7', borderRadius: '8px', padding: '8px 12px', background: '#F4F5F7' }}>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(u => {
                          const isChecked = meetingForm.inviteeIds.includes(u.id);
                          return (
                            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={() => {
                                  const updatedIds = isChecked 
                                    ? meetingForm.inviteeIds.filter(id => id !== u.id)
                                    : [...meetingForm.inviteeIds, u.id];
                                  setMeetingForm({...meetingForm, inviteeIds: updatedIds});
                                }}
                                style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                              />
                              <div style={{ fontSize: '0.8rem' }}>
                                <div style={{ color: '#1F2328', fontWeight: 600 }}>{u.name}</div>
                                <div style={{ color: '#5F6875', fontSize: '0.7rem' }}>{u.email} {u.Project ? `(${u.Project.name})` : ''}</div>
                              </div>
                            </label>
                          );
                        })
                      ) : (
                        <div style={{ padding: '8px', textAlign: 'center', color: '#727A86', fontSize: '0.8rem' }}>No other members found</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '12px', borderTop: '1px solid #B7BEC7' }}>
                    <button type="button" className="btn btn-secondary btn-sm" style={{ background: '#F1F5F9', border: '1px solid #B7BEC7', borderRadius: '8px' }} onClick={() => { setIsMeetingModalOpen(false); setIsUrlCustom(false); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #3E5C8A 0%, #E05A0E 100%)', border: 'none', color: 'white', fontWeight: 600, borderRadius: '8px' }}>
                      Schedule & Send Invites
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '2px solid #3B8C68' }}>
                  <Check size={28} color="#3B8C68" />
                </div>
                <h3 style={{ fontSize: '1.4rem', color: '#1F2328', marginBottom: '8px', fontWeight: 800 }}>Meeting Scheduled!</h3>
                <p style={{ color: '#5F6875', marginBottom: '24px', fontSize: '0.85rem' }}>
                  Your training meeting has been successfully created. We've simulated sending invitation emails to <strong>{scheduledMeetingDetails?.inviteeCount || 0}</strong> invitees.
                </p>

                <div style={{ background: '#F4F5F7', borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '24px', border: '1px solid #B7BEC7' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#727A86', display: 'block', fontWeight: 600 }}>Topic</span>
                    <strong style={{ fontSize: '0.95rem', color: '#1F2328' }}>{scheduledMeetingDetails?.title}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#727A86', display: 'block', fontWeight: 600 }}>Project</span>
                      <span style={{ color: '#1F2328', fontSize: '0.85rem', fontWeight: 600 }}>{scheduledMeetingDetails?.projectName}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#727A86', display: 'block', fontWeight: 600 }}>Date & Time</span>
                      <span style={{ color: '#1F2328', fontSize: '0.85rem', fontWeight: 600 }}>{scheduledMeetingDetails?.scheduledAt ? new Date(scheduledMeetingDetails.scheduledAt).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#727A86', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Google Meet Link</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={scheduledMeetingDetails?.url || ''} 
                        readOnly 
                        style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: 'var(--bg-glass)', color: '#475569', fontSize: '0.8rem' }} 
                      />
                      <button 
                        type="button" 
                        onClick={() => handleCopyLink(scheduledMeetingDetails?.url || '')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #B7BEC7', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {linkCopied ? <Check size={12} color="#3B8C68" /> : <Copy size={12} />}
                        {linkCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => {
                    setIsMeetingModalOpen(false);
                    setIsSuccessView(false);
                    setIsUrlCustom(false);
                  }}
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #3E5C8A 0%, #E05A0E 100%)', border: 'none', color: 'white', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}
                >
                  Close & Back to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── OFFLINE QUIZ CONFIG MODAL ─── */}
      {isOfflineModalOpen && selectedOfflineQuiz && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '480px', background: 'var(--bg-glass)', padding: '28px', borderRadius: '16px', border: '1px solid #B7BEC7', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
            
            {!isOfflineSuccessView ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #B7BEC7', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontFamily: 'Poppins, sans-serif', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: '#1F2328' }}>
                    <WifiOff size={20} color="#3E5C8A" /> Configure Offline Quiz
                  </h3>
                  <button onClick={() => setIsOfflineModalOpen(false)} style={{ background: 'none', border: 'none', color: '#727A86', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleOfflineSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F4F5F7', padding: '12px 16px', borderRadius: '8px', border: '1px solid #B7BEC7' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1F2328' }}>Enable Offline Taking</div>
                      <div style={{ fontSize: '0.72rem', color: '#5F6875' }}>Learners can join asynchronously via a link</div>
                    </div>
                    {/* Switch styled checkbox */}
                    <input 
                      type="checkbox" 
                      checked={offlineForm.isOffline}
                      onChange={e => setOfflineForm({ ...offlineForm, isOffline: e.target.checked })}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                  </div>

                  {offlineForm.isOffline && (
                    <>
                      {/* Start Now toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0FDF4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.83rem', color: '#15803D' }}>⚡ Start Immediately</div>
                          <div style={{ fontSize: '0.72rem', color: '#4B5563' }}>Quiz is live the moment you save — no scheduled start</div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={offlineForm.startNow}
                          onChange={e => setOfflineForm({ ...offlineForm, startNow: e.target.checked, startTime: e.target.checked ? '' : offlineForm.startTime })}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3B8C68' }}
                        />
                      </div>

                      {/* Scheduled time range — only shown when not "start now" */}
                      {!offlineForm.startNow && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Start Date &amp; Time</label>
                            <input 
                              type="datetime-local" 
                              value={offlineForm.startTime}
                              onChange={e => setOfflineForm({ ...offlineForm, startTime: e.target.value })}
                              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: '#F4F5F7', color: '#1F2328', fontSize: '0.82rem', boxSizing: 'border-box' }}
                            />
                            <div style={{ fontSize: '0.68rem', color: '#727A86', marginTop: '3px' }}>Your local time ({localTzLabel()})</div>
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>End Date &amp; Time</label>
                            <input 
                              type="datetime-local" 
                              value={offlineForm.endTime}
                              onChange={e => setOfflineForm({ ...offlineForm, endTime: e.target.value })}
                              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: '#F4F5F7', color: '#1F2328', fontSize: '0.82rem', boxSizing: 'border-box' }}
                            />
                            <div style={{ fontSize: '0.68rem', color: '#727A86', marginTop: '3px' }}>Your local time ({localTzLabel()})</div>
                          </div>
                        </div>
                      )}

                      {/* End time when start-now is enabled */}
                      {offlineForm.startNow && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Closes At (End Date &amp; Time)</label>
                          <input 
                            type="datetime-local" 
                            value={offlineForm.endTime}
                            onChange={e => setOfflineForm({ ...offlineForm, endTime: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: '#F4F5F7', color: '#1F2328', fontSize: '0.82rem', boxSizing: 'border-box' }}
                          />
                          <div style={{ fontSize: '0.68rem', color: '#727A86', marginTop: '3px' }}>Leave blank to keep quiz open indefinitely — your local time ({localTzLabel()})</div>
                        </div>
                      )}

                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Shareable Quiz Link</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <input 
                            type="text" 
                            value={offlineQuizLink} 
                            readOnly 
                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: '#F4F5F7', color: '#5F6875', fontSize: '0.82rem' }}
                          />
                          <button 
                            type="button" 
                            onClick={() => handleCopyLink(offlineQuizLink)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', padding: '10px 14px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #B7BEC7', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {linkCopied ? <Check size={12} color="#3B8C68" /> : <Copy size={12} />}
                            {linkCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '12px', borderTop: '1px solid #B7BEC7' }}>
                    <button type="button" className="btn btn-secondary btn-sm" style={{ background: '#F1F5F9', border: '1px solid #B7BEC7', borderRadius: '8px' }} onClick={() => setIsOfflineModalOpen(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #3E5C8A 0%, #E05A0E 100%)', border: 'none', color: 'white', fontWeight: 600, borderRadius: '8px' }}>Save Settings</button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '2px solid #3B8C68' }}>
                  <Check size={28} color="#3B8C68" />
                </div>
                <h3 style={{ fontSize: '1.4rem', color: '#1F2328', marginBottom: '8px', fontWeight: 800 }}>Offline Mode Activated!</h3>
                <p style={{ color: '#5F6875', marginBottom: '24px', fontSize: '0.85rem' }}>
                  The quiz <strong>{selectedOfflineQuiz.title}</strong> has been successfully configured for offline taking.
                </p>

                <div style={{ background: '#F4F5F7', borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '24px', border: '1px solid #B7BEC7' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#727A86', display: 'block', fontWeight: 600 }}>Active Period</span>
                    <strong style={{ fontSize: '0.85rem', color: '#1F2328' }}>
                      {new Date(offlineForm.startTime).toLocaleString()} - {new Date(offlineForm.endTime).toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#727A86', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Shareable Quiz Link</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={offlineQuizLink} 
                        readOnly 
                        style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: 'var(--bg-glass)', color: '#5F6875', fontSize: '0.8rem' }} 
                      />
                      <button 
                        type="button" 
                        onClick={() => handleCopyLink(offlineQuizLink)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #B7BEC7', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {linkCopied ? <Check size={12} color="#3B8C68" /> : <Copy size={12} />}
                        {linkCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => {
                    setIsOfflineModalOpen(false);
                    setIsOfflineSuccessView(false);
                  }}
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #3E5C8A 0%, #E05A0E 100%)', border: 'none', color: 'white', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}
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
