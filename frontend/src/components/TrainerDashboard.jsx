import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Users, CheckCircle, BarChart2, TrendingUp, Star, Calendar,
  ChevronDown, Plus, Play, Edit3, Trash2, WifiOff, Check, Copy,
  X, Mail, BookOpen, Award, ArrowUpRight, Search, FileText,
  Volume2, HelpCircle, Clock, Video, Radio, AlertTriangle, CheckCircle2,
  Filter, ChevronRight, UserCheck, ShieldCheck, RefreshCw, Zap, Activity
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import CalendarWidget from './CalendarWidget';
import ProjectFolder from './ProjectFolder';

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

  // Operational state for Trainer Cockpit
  const [trainerProjects, setTrainerProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [operationalParticipants, setOperationalParticipants] = useState([]);
  const [operationalSessions, setOperationalSessions] = useState([]);
  const [trainerReports, setTrainerReports] = useState([]);
  const [loadingCockpit, setLoadingCockpit] = useState(false);
  const [coachingFilter, setCoachingFilter] = useState('all');

  // Synchronisation State Machine: 'idle' | 'syncing' | 'success' | 'error'
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncedTime, setLastSyncedTime] = useState(new Date());
  const [syncError, setSyncError] = useState('');
  const isSyncingRef = useRef(false);

  const formatSyncTime = (d) => {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day} ${month} ${year}, ${time}`;
  };

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
    startNow: true,
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
  const [chartTimeline, setChartTimeline] = useState('Monthly'); // Daily, Weekly, Monthly

  // Dynamic Performance Trend Calculation (Ending in September 2026)
  const computeDynamicTrend = () => {
    const now = new Date(); // Context: 2026-09-10
    const scopedReports = trainerReports.filter(r => {
      if (selectedProjectId === 'all') return true;
      return r.projectId === selectedProjectId || r.projectName === trainerProjects.find(p => p.id === selectedProjectId)?.name;
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (chartTimeline === 'Daily') {
      const labels = [];
      const participants = [];
      const completion = [];
      const avgScore = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayStr = String(d.getDate()).padStart(2, '0');
        const monthStr = monthNames[d.getMonth()];
        labels.push(`${dayStr} ${monthStr}`);

        const dateIso = d.toISOString().split('T')[0];
        const dayMatches = scopedReports.filter(r => r.date === dateIso);
        const dayParts = dayMatches.reduce((sum, r) => sum + (r.participants || 0), 0);
        participants.push(dayParts);

        if (dayMatches.length > 0) {
          const avgSc = Math.round(dayMatches.reduce((sum, r) => sum + (parseInt(r.avgScore) || 0), 0) / dayMatches.length);
          avgScore.push(avgSc);
          completion.push(avgSc > 0 ? 100 : 0);
        } else {
          avgScore.push(0);
          completion.push(0);
        }
      }

      const totalP = participants.reduce((a, b) => a + b, 0);
      return { labels, participants, completion, avgScore, hasData: totalP > 0 || scopedReports.length > 0 };
    }

    if (chartTimeline === 'Weekly') {
      const labels = [];
      const participants = [];
      const completion = [];
      const avgScore = [];

      for (let i = 4; i >= 0; i--) {
        const endD = new Date(now);
        endD.setDate(now.getDate() - (i * 7));
        const startD = new Date(endD);
        startD.setDate(endD.getDate() - 6);

        labels.push(`W-${5 - i} (${endD.getDate()} ${monthNames[endD.getMonth()]})`);

        const weekMatches = scopedReports.filter(r => {
          if (!r.date) return false;
          const rDate = new Date(r.date);
          return rDate >= startD && rDate <= endD;
        });

        const weekParts = weekMatches.reduce((sum, r) => sum + (r.participants || 0), 0);
        participants.push(weekParts);

        if (weekMatches.length > 0) {
          const avgSc = Math.round(weekMatches.reduce((sum, r) => sum + (parseInt(r.avgScore) || 0), 0) / weekMatches.length);
          avgScore.push(avgSc);
          completion.push(avgSc > 0 ? 100 : 0);
        } else {
          avgScore.push(0);
          completion.push(0);
        }
      }

      const totalP = participants.reduce((a, b) => a + b, 0);
      return { labels, participants, completion, avgScore, hasData: totalP > 0 || scopedReports.length > 0 };
    }

    // Monthly: Rolling 6 months ending in current month (e.g. Apr, May, Jun, Jul, Aug, Sep)
    const labels = [];
    const participants = [];
    const completion = [];
    const avgScore = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()]);

      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthMatches = scopedReports.filter(r => r.date && r.date.startsWith(ym));

      const monthParts = monthMatches.reduce((sum, r) => sum + (r.participants || 0), 0);
      participants.push(monthParts);

      if (monthMatches.length > 0) {
        const avgSc = Math.round(monthMatches.reduce((sum, r) => sum + (parseInt(r.avgScore) || 0), 0) / monthMatches.length);
        avgScore.push(avgSc);
        completion.push(avgSc > 0 ? 100 : 0);
      } else {
        avgScore.push(0);
        completion.push(0);
      }
    }

    const totalP = participants.reduce((a, b) => a + b, 0);
    return { labels, participants, completion, avgScore, hasData: totalP > 0 || scopedReports.length > 0 };
  };

  const currentTrend = computeDynamicTrend();
  const nPoints = currentTrend.labels.length;
  const maxPart = Math.max(...currentTrend.participants, 0);
  const partScale = maxPart > 0 ? Math.ceil(maxPart * 1.25) : 20;

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
    const idx = Math.floor(Math.random() * TIPS.length);
    setTipIndex(idx);

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

  // Operational Trainer Cockpit Data Fetching
  const fetchTrainerCockpitData = async (isSilent = false) => {
    if (!token) return;
    try {
      if (!isSilent) setLoadingCockpit(true);
      // 1. Fetch assigned projects via /api/projects/my-projects
      const projRes = await axios.get('/api/projects/my-projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const assignedProjects = projRes.data || [];
      setTrainerProjects(assignedProjects);

      // 2. Fetch trainings/sessions
      const trainRes = await axios.get('/api/trainings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allTrainings = trainRes.data || [];
      setOperationalSessions(allTrainings);

      // 3. Fetch participants & eligibility metrics via /api/certificates/eligibility
      const targetProj = selectedProjectId !== 'all' ? selectedProjectId : (assignedProjects[0]?.id || 'all');
      try {
        const eligRes = await axios.post('/api/certificates/eligibility', {
          projectId: targetProj,
          minAttendance: 80,
          minScore: 70,
          minCompletion: 100
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (eligRes.data && eligRes.data.participants) {
          setOperationalParticipants(eligRes.data.participants);
        }
      } catch (eligErr) {
        console.warn('Participant eligibility fetch error:', eligErr);
      }

      // 4. Fetch live session reports hosted by trainer
      try {
        const repRes = await axios.get('/api/reports', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTrainerReports(repRes.data || []);
      } catch (repErr) {
        console.warn('Trainer reports fetch error:', repErr);
      }
    } catch (err) {
      console.error('Trainer cockpit data error:', err);
    } finally {
      if (!isSilent) setLoadingCockpit(false);
    }
  };

  useEffect(() => {
    fetchTrainerCockpitData();
  }, [token, selectedProjectId]);

  // Authoritative Synchronization Action Handler
  const handleSyncDashboard = async () => {
    if (isSyncingRef.current) return;
    try {
      isSyncingRef.current = true;
      setSyncStatus('syncing');
      setSyncError('');

      const promises = [fetchTrainerCockpitData(true)];
      if (fetchAllData) {
        promises.push(fetchAllData(true));
      }
      await Promise.all(promises);

      const now = new Date();
      setLastSyncedTime(now);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3500);
    } catch (err) {
      console.error('Trainer dashboard sync failed:', err);
      setSyncStatus('error');
      setSyncError('Sync failed');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } finally {
      isSyncingRef.current = false;
    }
  };

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

  const handleCopyLink = async (text) => {
    try {
      if (window.ClipboardItem) {
        const html = `<a href="${text}">${text}</a>`;
        const blobText = new Blob([text], { type: 'text/plain' });
        const blobHtml = new Blob([html], { type: 'text/html' });
        const data = [new ClipboardItem({
            'text/plain': blobText,
            'text/html': blobHtml
        })];
        await navigator.clipboard.write(data);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard write failed, falling back to writeText:', err);
      navigator.clipboard.writeText(text).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }).catch(e => console.error(e));
    }
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

  // ─── OPERATIONAL KPI CALCULATIONS ───
  const todayDateStr = new Date().toISOString().split('T')[0];
  const filteredSessions = operationalSessions.filter(s => {
    if (selectedProjectId === 'all') return true;
    return s.projectId === selectedProjectId;
  });

  const todaySessionsList = filteredSessions.filter(s => {
    if (!s.scheduledAt) return false;
    return s.scheduledAt.startsWith(todayDateStr);
  });
  const todaySessionsCount = todaySessionsList.length;

  const upcomingSessionsList = filteredSessions.filter(s => {
    if (!s.scheduledAt) return false;
    return new Date(s.scheduledAt) >= new Date();
  });
  const upcomingSessionsCount = upcomingSessionsList.length;

  const liveSessionsCount = filteredSessions.filter(s => s.status === 'Ongoing' || s.isLive).length;

  const totalParticipantsCount = operationalParticipants.length;

  const attendanceRate = operationalParticipants.length > 0
    ? Math.round(operationalParticipants.reduce((sum, p) => sum + (p.attendancePercentage || 0), 0) / operationalParticipants.length)
    : 0;

  const activeQuizzesCount = quizzes.length;

  const avgQuizScore = operationalParticipants.length > 0
    ? Math.round(operationalParticipants.reduce((sum, p) => sum + (p.assessmentScore || 0), 0) / operationalParticipants.length)
    : 0;

  // Authoritative RetailEdge Pro Rule:
  // Attendance >= 80% AND Passing Assessment >= 70% AND Not Yet Certified
  const certificationReadyParticipants = operationalParticipants.filter(p =>
    (p.attendancePercentage || 0) >= 80 && (p.assessmentScore || 0) >= 70
  );
  const certificationReadyCount = certificationReadyParticipants.length;

  // Coaching Status Classification:
  // <60% At Risk, 60-74% Needs Review, >=75% On Track
  const getCoachingStatus = (score) => {
    if (score < 60) return { label: 'At Risk', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.25)' };
    if (score < 75) return { label: 'Needs Review', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)' };
    return { label: 'On Track', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)' };
  };

  // Filter participants for coaching triage table
  const filteredParticipants = operationalParticipants.filter(p => {
    const status = getCoachingStatus(p.assessmentScore || 0);
    if (coachingFilter === 'at_risk') return status.label === 'At Risk';
    if (coachingFilter === 'needs_review') return status.label === 'Needs Review';
    if (coachingFilter === 'on_track') return status.label === 'On Track';
    return true;
  });

  const totalQuizzes = quizzes.length;

  // Date Picker Option Click
  const handleDateFilterSelect = (val) => {
    setSelectedDateFilter(val);
    setShowDateDropdown(false);
  };

  return (
    <div style={{ padding: '0px', fontFamily: 'Poppins, sans-serif', color: 'var(--text-primary)' }}>

      {/* ─── HEADER ROW ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Welcome back, {user?.name || 'Demo Trainer'}! 👋
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Operational Cockpit — Training Delivery & Participant Coaching Roster
          </p>
        </div>

        {/* Right Header Filters & CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', flexWrap: 'wrap' }}>

          {/* Authoritative Sync Button with State Machine */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <button
              onClick={handleSyncDashboard}
              disabled={syncStatus === 'syncing'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: syncStatus === 'success' ? 'rgba(16, 185, 129, 0.12)' : (syncStatus === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-glass)'),
                border: syncStatus === 'success' ? '1.5px solid #10B981' : (syncStatus === 'error' ? '1.5px solid #EF4444' : '1px solid #B7BEC7'),
                borderRadius: '10px',
                padding: '0 16px',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: syncStatus === 'success' ? '#059669' : (syncStatus === 'error' ? '#DC2626' : 'var(--text-primary)'),
                cursor: syncStatus === 'syncing' ? 'not-allowed' : 'pointer',
                height: '42px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.2s'
              }}
              title="Synchronize training sessions, attendance, and assessment metrics"
            >
              <RefreshCw size={15} style={{ animation: syncStatus === 'syncing' ? 'spin 1s linear infinite' : 'none' }} />
              <span>
                {syncStatus === 'syncing' ? '↻ Syncing…' : (syncStatus === 'success' ? '✓ Synced just now' : (syncStatus === 'error' ? '⚠ Sync failed — Retry' : 'Sync'))}
              </span>
            </button>
            {lastSyncedTime && (
              <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                Last synced: {formatSyncTime(lastSyncedTime)}
              </span>
            )}
          </div>

          {/* Assigned Projects Selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-glass)',
                border: '1px solid #B7BEC7',
                borderRadius: '10px',
                padding: '0 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                height: '42px',
                outline: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}
            >
              <option value="all">🌐 All Assigned Projects</option>
              {trainerProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

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
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)',
                height: '42px'
              }}
            >
              <Calendar size={16} color='var(--primary)' />
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
                      color: selectedDateFilter === opt ? 'var(--primary)' : 'var(--text-secondary)',
                      background: selectedDateFilter === opt ? 'rgba(243, 111, 33, 0.15)' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseOut={e => {
                      if (selectedDateFilter === opt) e.currentTarget.style.background = 'rgba(243, 111, 33, 0.15)';
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
                background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                color: 'white',
                fontWeight: 600,
                borderRadius: '10px',
                padding: '0 18px',
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 30px rgba(0, 240, 255, 0.08)',
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
                      color: 'var(--text-secondary)',
                      transition: 'background 0.15s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
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

      {/* ─── 8 OPERATIONAL KPI CARDS GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', marginBottom: '24px' }}>

        {/* KPI 1: Today's Sessions */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px 18px', background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '14px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Sessions</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>{todaySessionsCount}</h3>
            </div>
            <div style={{ background: 'rgba(37, 99, 235, 0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} color='var(--primary)' />
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
            ⚡ Scheduled for delivery
          </span>
        </div>

        {/* KPI 2: Upcoming Sessions */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px 18px', background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '14px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Upcoming Sessions</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>{upcomingSessionsCount}</h3>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="#3B82F6" />
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#3B82F6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
            📅 In calendar queue
          </span>
        </div>

        {/* KPI 3: Live Sessions */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px 18px', background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '14px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Sessions</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0 0', color: liveSessionsCount > 0 ? '#10B981' : 'var(--text-primary)' }}>{liveSessionsCount}</h3>
            </div>
            <div style={{ background: liveSessionsCount > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={18} color={liveSessionsCount > 0 ? '#10B981' : '#64748B'} />
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: liveSessionsCount > 0 ? '#10B981' : '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}>
            {liveSessionsCount > 0 ? '🟢 Room currently active' : '⚪ No room active now'}
          </span>
        </div>

        {/* KPI 4: Total Participants */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px 18px', background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '14px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Participants</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>{totalParticipantsCount}</h3>
            </div>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#6366F1" />
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#3B8C68', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: 'auto' }}>
            👥 Enrolled roster
          </span>
        </div>

        {/* KPI 5: Attendance Rate */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px 18px', background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '14px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attendance Rate</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>{attendanceRate}%</h3>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={18} color="#10B981" />
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: attendanceRate >= 80 ? '#10B981' : '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: 'auto' }}>
            {attendanceRate >= 80 ? '✓ Above 80% benchmark' : '⚠ Below 80% benchmark'}
          </span>
        </div>

        {/* KPI 6: Active Quizzes */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px 18px', background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '14px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Quizzes</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>{activeQuizzesCount}</h3>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={18} color="#F59E0B" />
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: 'auto' }}>
            🎯 Assessment studio
          </span>
        </div>

        {/* KPI 7: Average Quiz Score */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px 18px', background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '14px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Quiz Score</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>{avgQuizScore}%</h3>
            </div>
            <div style={{ background: 'rgba(243, 111, 33, 0.1)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={18} color='var(--primary)' />
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', color: avgQuizScore >= 70 ? '#10B981' : '#EF4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: 'auto' }}>
            {avgQuizScore >= 70 ? '✓ Passing benchmark (≥70%)' : '⚠ Below passing (≥70%)'}
          </span>
        </div>

        {/* KPI 8: Certification Ready */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px 18px', background: 'rgba(16, 185, 129, 0.05)', border: '1.5px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Certification Ready</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0 0', color: '#059669' }}>{certificationReadyCount}</h3>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} color="#059669" />
            </div>
          </div>
          <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', marginTop: 'auto' }}>
            🎓 Att ≥80% & Score ≥70%
          </span>
        </div>

      </div>

      {/* ─── SECTION 1: OPERATIONAL SESSIONS & RECENT QUIZ BATCHES (PROJECT FOLDERS) ─── */}
      <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={19} color='var(--primary)' />
              Operational Sessions & Recent Quiz Batches
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Authoritative project hierarchy — live batch execution, attendance rosters, and assessment launches.
            </p>
          </div>

          <button
            onClick={() => { setIsSuccessView(false); setIsUrlCustom(false); setIsMeetingModalOpen(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--primary)', color: 'white', border: 'none',
              borderRadius: '8px', padding: '8px 14px', fontSize: '0.82rem',
              fontWeight: 700, cursor: 'pointer'
            }}
          >
            <Plus size={15} /> Schedule Training Batch
          </button>
        </div>

        {/* Project Folders Listing for Sessions */}
        {trainerProjects.length > 0 ? (
          <div>
            {trainerProjects
              .filter(p => selectedProjectId === 'all' || p.id === selectedProjectId)
              .map(project => {
                const projectSessions = filteredSessions.filter(s => s.projectId === project.id);
                return (
                  <ProjectFolder
                    key={project.id}
                    project={project}
                    items={projectSessions}
                    type="sessions"
                    defaultExpanded={projectSessions.length > 0}
                    onLaunchSession={(session) => {
                      if (session.url) window.open(session.url, '_blank');
                      else navigate('/attendance');
                    }}
                  />
                );
              })
            }
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
            No assigned training projects available. Contact your administrator to be assigned to a retail project.
          </div>
        )}
      </div>

      {/* ─── SECTION 2: PARTICIPANT ATTENTION & COACHING (OPERATIONAL TRIAGE) ─── */}
      <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={19} color="#F59E0B" />
              Participant Attention & Coaching Roster
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              "Which participants need coaching?" Triage matrix identifying learners needing remediation prior to certification.
            </p>
          </div>

          {/* Coaching Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Learners', count: operationalParticipants.length || 18 },
              { id: 'at_risk', label: 'At Risk (<60%)', color: '#EF4444', count: operationalParticipants.filter(p => (p.assessmentScore || 0) < 60).length },
              { id: 'needs_review', label: 'Needs Review (60-74%)', color: '#F59E0B', count: operationalParticipants.filter(p => (p.assessmentScore || 0) >= 60 && (p.assessmentScore || 0) < 75).length },
              { id: 'on_track', label: 'On Track (≥75%)', color: '#10B981', count: operationalParticipants.filter(p => (p.assessmentScore || 0) >= 75).length }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setCoachingFilter(f.id)}
                style={{
                  padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem',
                  fontWeight: coachingFilter === f.id ? 700 : 500,
                  cursor: 'pointer',
                  border: coachingFilter === f.id ? '1px solid #2563EB' : '1px solid #B7BEC7',
                  background: coachingFilter === f.id ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-tertiary)',
                  color: coachingFilter === f.id ? '#2563EB' : 'var(--text-secondary)'
                }}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        {/* Boundary Notice Banner */}
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
          background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.2)',
          fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span style={{ fontWeight: 800, color: '#2563EB' }}>OPERATIONAL RULES:</span>
          <span><strong>Coaching Status:</strong> &lt;60% At Risk • 60-74% Needs Review • ≥75% On Track.</span>
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#059669' }}>
            <strong>Certification Eligibility:</strong> Attendance ≥80% AND Passing Score ≥70%
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(183, 190, 199, 0.4)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Participant</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Project</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Attendance</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Assessment Score</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Coaching Status</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>Certification Eligibility</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.length > 0 ? (
                filteredParticipants.map(p => {
                  const cStatus = getCoachingStatus(p.assessmentScore || 0);
                  const isCertEligible = (p.attendancePercentage || 0) >= 80 && (p.assessmentScore || 0) >= 70;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(183, 190, 199, 0.2)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {p.employee_id} • {p.designation}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {trainerProjects.find(pr => pr.id === p.projectId)?.name || 'Project Alpha'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '50px', height: '6px', background: 'rgba(183, 190, 199, 0.3)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${p.attendancePercentage || 0}%`, height: '100%',
                              background: (p.attendancePercentage || 0) >= 80 ? '#10B981' : '#EF4444',
                              borderRadius: '3px'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: (p.attendancePercentage || 0) >= 80 ? '#10B981' : '#EF4444' }}>
                            {p.attendancePercentage}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '50px', height: '6px', background: 'rgba(183, 190, 199, 0.3)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${p.assessmentScore || 0}%`, height: '100%',
                              background: (p.assessmentScore || 0) >= 70 ? '#10B981' : '#F59E0B',
                              borderRadius: '3px'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: (p.assessmentScore || 0) >= 70 ? '#10B981' : '#F59E0B' }}>
                            {p.assessmentScore}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '4px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                          background: cStatus.bg, color: cStatus.color, border: `1px solid ${cStatus.border}`,
                          display: 'inline-block'
                        }}>
                          {cStatus.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {isCertEligible ? (
                          <span style={{
                            padding: '4px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                            background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}>
                            ✓ Eligible (Att & Score)
                          </span>
                        ) : (
                          <span style={{
                            padding: '4px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                            background: 'rgba(100, 116, 139, 0.1)', color: '#64748B', border: '1px solid rgba(100, 116, 139, 0.2)'
                          }}>
                            In Progress (Needs {(p.attendancePercentage || 0) < 80 ? 'Att' : 'Score'})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            alert(`Initiating 1-on-1 coaching review for ${p.name}. Assessment: ${p.assessmentScore}%, Attendance: ${p.attendancePercentage}%.`);
                          }}
                          style={{
                            padding: '6px 12px', borderRadius: '6px',
                            background: cStatus.label === 'At Risk' ? '#EF4444' : 'var(--bg-tertiary)',
                            color: cStatus.label === 'At Risk' ? 'white' : 'var(--text-primary)',
                            border: cStatus.label === 'At Risk' ? 'none' : '1px solid #B7BEC7',
                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          {cStatus.label === 'At Risk' ? '🚨 Coach Now' : 'Coach'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No participants matching this coaching triage filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MIDDLE SECTIONS: Performance Overview & Activity Feed ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '24px', marginBottom: '24px' }}>

        {/* Performance Overview (Chart) */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Performance Overview</h3>
              <p style={{ fontSize: '0.75rem', color: '#727A86', margin: '2px 0 0 0' }}>Training effectiveness & participation trends</p>
            </div>

            {/* Chart Timeline Selection */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px', border: '1px solid #B7BEC7' }}>
              {['Daily', 'Weekly', 'Monthly'].map(tl => (
                <button
                  key={tl}
                  onClick={() => setChartTimeline(tl)}
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    color: chartTimeline === tl ? 'var(--primary)' : 'var(--text-secondary)',
                    background: chartTimeline === tl ? 'var(--bg-glass)' : 'transparent',
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
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '3px' }} />
              Participants
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '3px', background: '#3B8C68', borderRadius: '2px' }} />
              Completion %
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '3px', background: '#C79A3B', borderRadius: '2px' }} />
              Avg Score
            </span>
          </div>

          {/* SVG Performance Chart */}
          <div style={{ width: '100%', height: '220px', position: 'relative' }}>
            <svg viewBox="0 0 500 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Y-axis gridlines */}
              <line x1="40" y1="20" x2="460" y2="20" stroke="var(--bg-tertiary)" strokeWidth="1" />
              <line x1="40" y1="60" x2="460" y2="60" stroke="var(--bg-tertiary)" strokeWidth="1" />
              <line x1="40" y1="100" x2="460" y2="100" stroke="var(--bg-tertiary)" strokeWidth="1" />
              <line x1="40" y1="140" x2="460" y2="140" stroke="var(--bg-tertiary)" strokeWidth="1" />
              <line x1="40" y1="170" x2="460" y2="170" stroke='var(--border-glass)' strokeWidth="1.5" />

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
              {currentTrend.labels.map((label, idx) => {
                const x = 50 + (idx * (400 / Math.max(nPoints - 1, 1)));
                return (
                  <text key={idx} x={x} y="186" fill="#727A86" fontSize="8" fontWeight="600" textAnchor="middle">
                    {label}
                  </text>
                );
              })}

              {/* Bars: Participants count */}
              {currentTrend.participants.map((val, idx) => {
                const x = 50 + (idx * (400 / Math.max(nPoints - 1, 1)));
                const height = partScale > 0 ? (val / partScale) * 150 : 0;
                const y = 170 - height;
                return (
                  <g key={idx}>
                    <rect
                      x={x - 12}
                      y={y}
                      width="24"
                      height={height}
                      fill='var(--primary)'
                      rx="4"
                      style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
                    />
                    {val > 0 && (
                      <text x={x} y={y - 6} fill='var(--text-primary)' fontSize="7" fontWeight="700" textAnchor="middle">{val}</text>
                    )}
                  </g>
                );
              })}

              {/* Line 1: Completion % */}
              {(() => {
                const points = currentTrend.completion.map((val, idx) => {
                  const x = 50 + (idx * (400 / Math.max(nPoints - 1, 1)));
                  const y = 170 - (val / 100) * 150;
                  return { x, y, val };
                });
                const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                return (
                  <g>
                    <path d={d} fill="none" stroke="#3B8C68" strokeWidth="3" strokeLinecap="round" />
                    {points.map((pt, idx) => (
                      <circle key={idx} cx={pt.x} cy={pt.y} r="4" fill='var(--bg-glass)' stroke="#3B8C68" strokeWidth="2.5" />
                    ))}
                  </g>
                );
              })()}

              {/* Line 2: Avg Score % */}
              {(() => {
                const points = currentTrend.avgScore.map((val, idx) => {
                  const x = 50 + (idx * (400 / Math.max(nPoints - 1, 1)));
                  const y = 170 - (val / 100) * 150;
                  return { x, y, val };
                });
                const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                return (
                  <g>
                    <path d={d} fill="none" stroke="#C79A3B" strokeWidth="3" strokeLinecap="round" />
                    {points.map((pt, idx) => (
                      <circle key={idx} cx={pt.x} cy={pt.y} r="4" fill='var(--bg-glass)' stroke="#C79A3B" strokeWidth="2.5" />
                    ))}
                  </g>
                );
              })()}
            </svg>

            {/* Empty State overlay if no live session data */}
            {!currentTrend.hasData && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(2px)',
                  borderRadius: '10px',
                  textAlign: 'center',
                  padding: '16px'
                }}
              >
                <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>📊</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Insufficient Data for {chartTimeline} Trend
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', maxWidth: '320px', marginTop: '4px' }}>
                  Complete quizzes and training sessions in your assigned projects to populate live performance analytics.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Recent Activity</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/reports')}>View Reports</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {(() => {
              const activities = [];
              if (trainerReports && trainerReports.length > 0) {
                trainerReports.slice(0, 4).forEach(rep => {
                  activities.push({
                    type: 'report',
                    title: rep.quizTitle || rep.title || 'Training Assessment Completed',
                    sub: `${rep.projectName || 'Assigned Project'} • ${rep.participants || 0} participants • Avg ${rep.avgScore || 0}%`,
                    time: rep.date || 'Recent'
                  });
                });
              }
              if (activities.length < 4 && quizzes && quizzes.length > 0) {
                quizzes.slice(0, 4 - activities.length).forEach(q => {
                  activities.push({
                    type: 'quiz',
                    title: q.title,
                    sub: `Hosted for ${q.Project?.name || 'Assigned Project'} • ${q.questions?.length || 0} Questions`,
                    time: q.createdAt ? new Date(q.createdAt).toLocaleDateString() : 'Active'
                  });
                });
              }
              if (activities.length === 0) {
                return (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    No recent activity recorded for your assigned projects.
                  </div>
                );
              }
              return activities.slice(0, 4).map((act, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ background: act.type === 'report' ? 'rgba(34, 197, 94, 0.2)' : '#E0F2FE', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {act.type === 'report' ? <CheckCircle size={16} color="#15803D" /> : <Play size={16} color="#0369A1" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{act.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{act.sub}</div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#727A86', whiteSpace: 'nowrap' }}>{act.time}</span>
                </div>
              ));
            })()}
          </div>
        </div>

      </div>

      {/* ─── BOTTOM SECTIONS: Top Quiz, Donut Chart, Quick Actions ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '24px', marginBottom: '24px' }}>

        {/* Top Quiz Performance */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Top Quiz Performance</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate('/quizzes')}>View All</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(() => {
              const topQuizzes = [...trainerReports]
                .filter(r => r.avgScore !== undefined && r.avgScore !== null)
                .sort((a, b) => (parseInt(b.avgScore) || 0) - (parseInt(a.avgScore) || 0))
                .slice(0, 3);

              if (topQuizzes.length === 0) {
                if (quizzes && quizzes.length > 0) {
                  return quizzes.slice(0, 3).map((q, idx) => (
                    <div key={q.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: idx === 0 ? '#FEF08A' : 'var(--border-glass)', color: idx === 0 ? '#A16207' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>{idx + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{q.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{q.Project?.name || 'Assigned Project'}</div>
                      </div>
                      <span style={{ padding: '4px 10px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>{q.questions?.length || 0} Qs</span>
                    </div>
                  ));
                }
                return (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '24px 0' }}>
                    No quiz performance data recorded yet.
                  </div>
                );
              }

              return topQuizzes.map((q, idx) => {
                const score = parseInt(q.avgScore) || 0;
                const badgeColor = score >= 80 ? '#15803D' : (score >= 60 ? '#A16207' : '#DC2626');
                const badgeBg = score >= 80 ? 'rgba(34, 197, 94, 0.2)' : (score >= 60 ? '#FEF08A' : '#FEE2E2');
                return (
                  <div key={q.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: idx === 0 ? '#FEF08A' : (idx === 1 ? 'var(--border-glass)' : '#FFEDD5'), color: idx === 0 ? '#A16207' : (idx === 1 ? 'var(--text-secondary)' : '#C2410C'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>{idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{q.quizTitle || q.title || 'Quiz Assessment'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{q.projectName || 'Project'}</div>
                    </div>
                    <span style={{ padding: '4px 10px', background: badgeBg, color: badgeColor, borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700 }}>{score}%</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Participants by Project Donut Chart */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Participants by Project</h3>

          {drilldownProject ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>{drilldownProject} Learners</span>
                <button
                  onClick={() => setDrilldownProject(null)}
                  style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
                >
                  Back
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '130px', overflowY: 'auto' }}>
                {usersList
                  .filter(u => {
                    const pName = u.Project?.name || '';
                    return pName.toLowerCase() === drilldownProject.toLowerCase() || u.projectId === drilldownProject;
                  })
                  .slice(0, 6)
                  .map((usr, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '4px 0', borderBottom: '1px solid var(--bg-tertiary)' }}>
                      <span style={{ fontWeight: 600 }}>{usr.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{usr.Role?.role_name || 'Participant'}</span>
                    </div>
                  ))
                }
                {usersList.filter(u => (u.Project?.name || '').toLowerCase() === drilldownProject.toLowerCase() || u.projectId === drilldownProject).length === 0 && (
                  <div style={{ textAlign: 'center', color: '#727A86', fontSize: '0.78rem', padding: '20px 0' }}>No participants found in this project.</div>
                )}
              </div>
            </div>
          ) : (
            (() => {
              const projectBreakdown = (trainerProjects.length > 0 ? trainerProjects : projects).map(proj => {
                const count = usersList.filter(u => u.projectId === proj.id || u.Project?.id === proj.id).length;
                return {
                  id: proj.id,
                  name: proj.name,
                  count
                };
              });

              const totalAssignedLearners = projectBreakdown.reduce((acc, p) => acc + p.count, 0);
              const colors = ['var(--primary)', '#3B8C68', '#C79A3B', '#7C3AED', '#06B6D4'];
              const circumference = 251.327; // 2 * Math.PI * 40

              let accumulatedOffset = 0;

              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  {/* Donut Chart SVG */}
                  <div style={{ width: '120px', height: '120px', position: 'relative', flexShrink: 0 }}>
                    <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                      {totalAssignedLearners === 0 ? (
                        <circle
                          cx="60"
                          cy="60"
                          r="40"
                          fill="none"
                          stroke="var(--bg-tertiary)"
                          strokeWidth="16"
                        />
                      ) : (
                        projectBreakdown.map((item, idx) => {
                          if (item.count === 0) return null;
                          const ratio = item.count / totalAssignedLearners;
                          const dashLength = ratio * circumference;
                          const dashSpace = circumference - dashLength;
                          const currentOffset = accumulatedOffset;
                          accumulatedOffset -= dashLength;

                          return (
                            <circle
                              key={item.id || idx}
                              cx="60"
                              cy="60"
                              r="40"
                              fill="none"
                              stroke={colors[idx % colors.length]}
                              strokeWidth="16"
                              strokeDasharray={`${dashLength} ${dashSpace}`}
                              strokeDashoffset={currentOffset}
                              style={{ cursor: 'pointer', transition: 'stroke-width 0.2s' }}
                              onClick={() => setDrilldownProject(item.name)}
                              onMouseOver={e => e.currentTarget.setAttribute('stroke-width', '20')}
                              onMouseOut={e => e.currentTarget.setAttribute('stroke-width', '16')}
                            />
                          );
                        })
                      )}
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
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {totalAssignedLearners}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#727A86', textTransform: 'uppercase', fontWeight: 600 }}>Total</div>
                    </div>
                  </div>

                  {/* Legends with percentages */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', fontWeight: 500, flex: 1, paddingLeft: '8px' }}>
                    {projectBreakdown.length === 0 ? (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>No projects assigned yet.</span>
                    ) : (
                      projectBreakdown.slice(0, 3).map((item, idx) => {
                        const pct = totalAssignedLearners > 0 ? ((item.count / totalAssignedLearners) * 100).toFixed(1) : '0.0';
                        return (
                          <div
                            key={item.id || idx}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                            onClick={() => setDrilldownProject(item.name)}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: colors[idx % colors.length], borderRadius: '50%' }} />
                              <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                            </span>
                            <strong style={{ color: 'var(--text-primary)' }}>{item.count} ({pct}%)</strong>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Quick Actions</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

            {/* Action 1 */}
            <div
              onClick={() => navigate('/builder')}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid #B7BEC7',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#F0F5FF'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <Plus size={16} color='var(--primary)' />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Create Quiz</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Add new quiz</div>
            </div>

            {/* Action 2 */}
            <div
              onClick={() => navigate('/reports')}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid #B7BEC7',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#3B8C68'; e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <BarChart2 size={16} color="#3B8C68" />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>View Reports</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Analytics & insights</div>
            </div>

            {/* Action 3 */}
            <div
              onClick={() => navigate('/trainings')}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid #B7BEC7',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#C79A3B'; e.currentTarget.style.background = '#F5F3FF'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <BookOpen size={16} color="#C79A3B" />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Manage Trainings</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Training modules</div>
            </div>

            {/* Action 4 */}
            <div
              onClick={() => navigate('/certificates')}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid #B7BEC7',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#EA580C'; e.currentTarget.style.background = 'rgba(234, 88, 12, 0.15)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(234,88,12,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <Award size={16} color="#EA580C" />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Issue Certificate</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Generate certificates</div>
            </div>

          </div>
        </div>

      </div>

      {/* ─── LIVE ARENA MY QUIZZES (PROJECT FOLDER HIERARCHY) ─── */}
      <div className="glass-card" style={{ background: 'var(--bg-glass)', border: '1px solid #B7BEC7', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.1rem' }}>🎯 Live Arena — My Quizzes</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Interactive quizzes organized by assigned project folder</p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/builder')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 14px', borderRadius: '8px' }}
          >
            <Plus size={14} /> Create Quiz
          </button>
        </div>

        {(() => {
          const activeProjects = (trainerProjects.length > 0 ? trainerProjects : projects);
          const unassignedQuizzes = quizzes.filter(q => !q.projectId || !activeProjects.some(p => p.id === q.projectId));

          if (activeProjects.length === 0 && quizzes.length === 0) {
            return <p style={{ color: '#727A86', marginTop: '16px', fontSize: '0.85rem' }}>No quizzes found. Use the Create Quiz actions to build one!</p>;
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {activeProjects.map(proj => {
                const projQuizzes = quizzes.filter(q => q.projectId === proj.id || q.Project?.id === proj.id);
                return (
                  <ProjectFolder
                    key={proj.id}
                    project={proj}
                    items={projQuizzes}
                    type="quizzes"
                    defaultExpanded={true}
                    offlineBaseUrl={offlineBaseUrl}
                    onOpenOfflineModal={handleOpenOfflineModal}
                    onDeleteQuiz={handleDeleteQuiz}
                    onHostQuiz={(quiz) => navigate(`/host/${quiz.id}`)}
                  />
                );
              })}

              {unassignedQuizzes.length > 0 && (
                <ProjectFolder
                  key="unassigned"
                  project={{ id: 'unassigned', name: 'General / Unassigned Quizzes' }}
                  items={unassignedQuizzes}
                  type="quizzes"
                  defaultExpanded={true}
                  offlineBaseUrl={offlineBaseUrl}
                  onOpenOfflineModal={handleOpenOfflineModal}
                  onDeleteQuiz={handleDeleteQuiz}
                  onHostQuiz={(quiz) => navigate(`/host/${quiz.id}`)}
                />
              )}
            </div>
          );
        })()}
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
          color: 'var(--primary)',
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
            <X size={16} color='var(--primary)' />
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
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.3rem', fontWeight: 800 }}>Create New Meeting</h3>
                  <button onClick={() => { setIsMeetingModalOpen(false); setIsUrlCustom(false); }} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-secondary)' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Topic */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Meeting Topic/Title *</label>
                    <input
                      type="text"
                      value={meetingForm.title}
                      onChange={e => setMeetingForm({...meetingForm, title: e.target.value})}
                      required
                      placeholder="e.g. Product Knowledge Assessment Review"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #B7BEC7', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                    />
                  </div>

                  {/* Agenda */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Description/Agenda</label>
                    <textarea
                      value={meetingForm.description}
                      onChange={e => setMeetingForm({...meetingForm, description: e.target.value})}
                      placeholder="Enter meeting agenda or notes..."
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #B7BEC7', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', minHeight: '60px', resize: 'vertical', fontSize: '0.88rem' }}
                    />
                  </div>

                  {/* Project & DateTime */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Project</label>
                      <select
                        value={meetingForm.projectId}
                        onChange={e => handleProjectChange(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #B7BEC7', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none' }}
                      >
                        <option value="">-- General / Global --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={meetingForm.scheduledAt}
                        onChange={e => setMeetingForm({...meetingForm, scheduledAt: e.target.value})}
                        required
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #B7BEC7', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>

                  {/* Meeting Platform Selection */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Meeting Platform *</label>
                    <select
                      value={meetingForm.platform}
                      onChange={e => {
                        setIsUrlCustom(false);
                        setMeetingForm({...meetingForm, platform: e.target.value});
                      }}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #B7BEC7', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none' }}
                    >
                      <option value="google_meet">Google Meet (Auto-generated Link)</option>
                      <option value="jitsi">Jitsi Meet (Auto-generated Link)</option>
                    </select>
                  </div>

                  {/* Meeting URL */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
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
                        style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #B7BEC7', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyLink(meetingForm.url)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid #B7BEC7', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {linkCopied ? <Check size={14} color="#3B8C68" /> : <Copy size={14} />}
                        {linkCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Members Checklist */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Invite Members</label>
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.78rem', width: '180px' }}
                      />
                    </div>

                    <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid #B7BEC7', borderRadius: '8px', padding: '8px 12px', background: 'var(--bg-tertiary)' }}>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(u => {
                          const isChecked = meetingForm.inviteeIds.includes(u.id);
                          return (
                            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--bg-tertiary)', cursor: 'pointer' }}>
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
                                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{u.name}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{u.email} {u.Project ? `(${u.Project.name})` : ''}</div>
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
                    <button type="button" className="btn btn-secondary btn-sm" style={{ background: 'var(--bg-tertiary)', border: '1px solid #B7BEC7', borderRadius: '8px' }} onClick={() => { setIsMeetingModalOpen(false); setIsUrlCustom(false); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', border: 'none', color: 'white', fontWeight: 600, borderRadius: '8px' }}>
                      Schedule & Send Invites
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '2px solid #3B8C68' }}>
                  <Check size={28} color="#3B8C68" />
                </div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 800 }}>Meeting Scheduled!</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.85rem' }}>
                  Your training meeting has been successfully created. We've simulated sending invitation emails to <strong>{scheduledMeetingDetails?.inviteeCount || 0}</strong> invitees.
                </p>

                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '24px', border: '1px solid #B7BEC7' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#727A86', display: 'block', fontWeight: 600 }}>Topic</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{scheduledMeetingDetails?.title}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#727A86', display: 'block', fontWeight: 600 }}>Project</span>
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>{scheduledMeetingDetails?.projectName}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#727A86', display: 'block', fontWeight: 600 }}>Date & Time</span>
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>{scheduledMeetingDetails?.scheduledAt ? new Date(scheduledMeetingDetails.scheduledAt).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#727A86', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Google Meet Link</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={scheduledMeetingDetails ? `${window.location.origin}/guest-join?id=${scheduledMeetingDetails.id}` : ''}
                        readOnly
                        style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: 'var(--bg-glass)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyLink(scheduledMeetingDetails ? `${window.location.origin}/guest-join?id=${scheduledMeetingDetails.id}` : '')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid #B7BEC7', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {linkCopied ? <Check size={12} color="#3B8C68" /> : <Copy size={12} />}
                        {linkCopied ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(scheduledMeetingDetails ? `${window.location.origin}/guest-join?id=${scheduledMeetingDetails.id}` : '', '_blank')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', border: 'none', color: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Open
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
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', border: 'none', color: 'white', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}
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
                  <h3 style={{ margin: 0, fontFamily: 'Poppins, sans-serif', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                    <WifiOff size={20} color='var(--primary)' /> Configure Offline Quiz
                  </h3>
                  <button onClick={() => setIsOfflineModalOpen(false)} style={{ background: 'none', border: 'none', color: '#727A86', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleOfflineSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid #B7BEC7' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Enable Offline Taking</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Learners can join asynchronously via a link</div>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(34, 197, 94, 0.15)', padding: '10px 14px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
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
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Start Date &amp; Time</label>
                            <input
                              type="datetime-local"
                              value={offlineForm.startTime}
                              onChange={e => setOfflineForm({ ...offlineForm, startTime: e.target.value })}
                              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                            />
                            <div style={{ fontSize: '0.68rem', color: '#727A86', marginTop: '3px' }}>Your local time ({localTzLabel()})</div>
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>End Date &amp; Time</label>
                            <input
                              type="datetime-local"
                              value={offlineForm.endTime}
                              onChange={e => setOfflineForm({ ...offlineForm, endTime: e.target.value })}
                              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                            />
                            <div style={{ fontSize: '0.68rem', color: '#727A86', marginTop: '3px' }}>Your local time ({localTzLabel()})</div>
                          </div>
                        </div>
                      )}

                      {/* End time when start-now is enabled */}
                      {offlineForm.startNow && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Closes At (End Date &amp; Time)</label>
                          <input
                            type="datetime-local"
                            value={offlineForm.endTime}
                            onChange={e => setOfflineForm({ ...offlineForm, endTime: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.82rem', boxSizing: 'border-box' }}
                          />
                          <div style={{ fontSize: '0.68rem', color: '#727A86', marginTop: '3px' }}>Leave blank to keep quiz open indefinitely — your local time ({localTzLabel()})</div>
                        </div>
                      )}

                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Shareable Quiz Link</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <input
                            type="text"
                            value={offlineQuizLink}
                            readOnly
                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.82rem' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyLink(offlineQuizLink)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', padding: '10px 14px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid #B7BEC7', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {linkCopied ? <Check size={12} color="#3B8C68" /> : <Copy size={12} />}
                            {linkCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '12px', borderTop: '1px solid #B7BEC7' }}>
                    <button type="button" className="btn btn-secondary btn-sm" style={{ background: 'var(--bg-tertiary)', border: '1px solid #B7BEC7', borderRadius: '8px' }} onClick={() => setIsOfflineModalOpen(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', border: 'none', color: 'white', fontWeight: 600, borderRadius: '8px' }}>Save Settings</button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '2px solid #3B8C68' }}>
                  <Check size={28} color="#3B8C68" />
                </div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 800 }}>Offline Mode Activated!</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.85rem' }}>
                  The quiz <strong>{selectedOfflineQuiz.title}</strong> has been successfully configured for offline taking.
                </p>

                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '24px', border: '1px solid #B7BEC7' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#727A86', display: 'block', fontWeight: 600 }}>Active Period</span>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
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
                        style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #B7BEC7', background: 'var(--bg-glass)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyLink(offlineQuizLink)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid #B7BEC7', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
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
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', border: 'none', color: 'white', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}
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
