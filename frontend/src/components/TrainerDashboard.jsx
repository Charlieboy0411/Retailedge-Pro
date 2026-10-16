import React, { useState, useEffect, useRef } from 'react';
import {
  Users, CheckCircle, BarChart2, TrendingUp, Star, Calendar,
  ChevronDown, Plus, Play, Edit3, Trash2, WifiOff, Check, Copy,
  X, Mail, BookOpen, Award, ArrowUpRight, Search, FileText,
  Volume2, HelpCircle, Clock, Video, Radio, AlertTriangle, CheckCircle2,
  Filter, ChevronRight, UserCheck, ShieldCheck, RefreshCw, Zap, Activity,
  Layers, ExternalLink, Sparkles, Building2
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import CalendarWidget from './CalendarWidget';
import ProjectFolder from './ProjectFolder';
import { copyTextToClipboard } from '../utils/clipboard';
import { PageHeader, KpiCard, StatusBadge, EmptyState, LoadingSkeleton } from './ui';

/**
 * RetailEdge PRO — Trainer Operational Workspace
 * Gold Standard Enterprise Light Design for Training Execution, Delivery & Learner Coaching.
 * 100% Data, RBAC & API Preserved. Light, Crisp Corporate UI.
 */
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

  // Offline form state with strict scheduling & expiry in Asia/Kolkata (IST)
  const [offlineForm, setOfflineForm] = useState({
    isOffline: false,
    startNow: true,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    isLegacyUnconfigured: false
  });
  const [offlineSaving, setOfflineSaving] = useState(false);
  const [offlineValidationError, setOfflineValidationError] = useState('');
  const [offlineConfigSummary, setOfflineConfigSummary] = useState(null);
  const [offlineQuizLink, setOfflineQuizLink] = useState('');
  const [offlineBaseUrl, setOfflineBaseUrl] = useState(window.location.origin);

  // Timezone & DateTime helpers for Asia/Kolkata (IST)
  const toISTParts = (isoStr) => {
    if (!isoStr) return { date: '', time: '' };
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return { date: '', time: '' };
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const p = f.formatToParts(d);
    const gp = (t) => p.find(x => x.type === t)?.value || '';
    return {
      date: `${gp('year')}-${gp('month')}-${gp('day')}`,
      time: `${gp('hour')}:${gp('minute')}`
    };
  };

  const istToISO = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const isoWithOffset = `${dateStr}T${timeStr}:00+05:30`;
    const d = new Date(isoWithOffset);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const formatISTDisplay = (dateOrStr) => {
    if (!dateOrStr) return '';
    const d = new Date(dateOrStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' IST';
  };

  const getFutureIST = (hoursFromNow = 2, baseISO = null) => {
    const base = baseISO ? new Date(baseISO) : new Date();
    const future = new Date(base.getTime() + hoursFromNow * 3600 * 1000);
    return toISTParts(future.toISOString());
  };

  const handleApplyPreset = (hours) => {
    let baseISO = null;
    if (!offlineForm.startNow && offlineForm.startDate && offlineForm.startTime) {
      baseISO = istToISO(offlineForm.startDate, offlineForm.startTime);
    }
    const future = getFutureIST(hours, baseISO);
    setOfflineForm(prev => ({
      ...prev,
      endDate: future.date,
      endTime: future.time
    }));
    setOfflineValidationError('');
  };

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

  // Dynamic Performance Trend Calculation
  const computeDynamicTrend = () => {
    const now = new Date();
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

    // Monthly
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

  // Handle offline mode toggle submit with validation and IST persistence
  const handleOfflineSubmit = async (e) => {
    e.preventDefault();
    setOfflineValidationError('');

    if (offlineForm.isOffline) {
      // 1. Mandatory Expiry Validation
      if (!offlineForm.endDate || !offlineForm.endTime) {
        setOfflineValidationError('Expiry Date and Time are mandatory for offline quizzes.');
        return;
      }
      const endISO = istToISO(offlineForm.endDate, offlineForm.endTime);
      if (!endISO) {
        setOfflineValidationError('Please enter a valid Expiry Date and Time.');
        return;
      }
      const endMs = new Date(endISO).getTime();
      const nowMs = Date.now();

      let startISO = null;
      if (!offlineForm.startNow) {
        // Scheduled Start Validation
        if (!offlineForm.startDate || !offlineForm.startTime) {
          setOfflineValidationError('Start Date and Time are required when not starting immediately.');
          return;
        }
        startISO = istToISO(offlineForm.startDate, offlineForm.startTime);
        if (!startISO) {
          setOfflineValidationError('Please enter a valid Start Date and Time.');
          return;
        }
        const startMs = new Date(startISO).getTime();
        if (startMs < nowMs - 5 * 60 * 1000) {
          setOfflineValidationError('Scheduled start time cannot be in the past.');
          return;
        }
        if (endMs <= startMs) {
          setOfflineValidationError('Expiry time must be strictly later than the start time.');
          return;
        }
      } else {
        // Immediate start: Expiry must be in the future
        if (endMs <= nowMs) {
          setOfflineValidationError('Expiry time must be strictly later than current time.');
          return;
        }
      }

      try {
        setOfflineSaving(true);
        const res = await axios.post(`/api/quizzes/${selectedOfflineQuiz.id}/offline`, {
          isOffline: true,
          startNow: offlineForm.startNow,
          startTime: offlineForm.startNow ? null : startISO,
          endTime: endISO
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setOfflineConfigSummary({
          startIST: res.data.startTimeIST || formatISTDisplay(res.data.config.offlineStartTime),
          endIST: res.data.endTimeIST || formatISTDisplay(res.data.config.offlineEndTime),
          isImmediate: offlineForm.startNow
        });
        setIsOfflineSuccessView(true);
        if (fetchAllData) fetchAllData(true);
      } catch (err) {
        console.error(err);
        setOfflineValidationError(err.response?.data?.error || 'Failed to save offline quiz settings.');
      } finally {
        setOfflineSaving(false);
      }
    } else {
      // Disabling offline taking or closing link early
      try {
        setOfflineSaving(true);
        await axios.post(`/api/quizzes/${selectedOfflineQuiz.id}/offline`, {
          isOffline: false
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        alert('Offline taking disabled successfully.');
        setIsOfflineModalOpen(false);
        if (fetchAllData) fetchAllData(true);
      } catch (err) {
        console.error(err);
        setOfflineValidationError(err.response?.data?.error || 'Failed to disable offline taking.');
      } finally {
        setOfflineSaving(false);
      }
    }
  };

  const handleCloseLinkEarly = async () => {
    if (!window.confirm("Are you sure you want to close this offline quiz link early? Participants will no longer be able to open or submit.")) {
      return;
    }
    try {
      setOfflineSaving(true);
      await axios.post(`/api/quizzes/${selectedOfflineQuiz.id}/offline`, {
        isOffline: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Quiz link has been closed early.');
      setIsOfflineModalOpen(false);
      if (fetchAllData) fetchAllData(true);
    } catch (err) {
      console.error(err);
      setOfflineValidationError(err.response?.data?.error || 'Failed to close link.');
    } finally {
      setOfflineSaving(false);
    }
  };

  const handleCopyLink = async (text) => {
    const success = await copyTextToClipboard(text);
    if (success) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleOpenOfflineModal = (quiz) => {
    setSelectedOfflineQuiz(quiz);
    const conf = quiz.config || {};
    const isLegacyUnconfigured = !!(conf.isOffline && !conf.offlineEndTime);

    const nowIST = toISTParts(new Date().toISOString());
    const defaultEndIST = getFutureIST(2);

    let startNowVal = true;
    let startDateVal = nowIST.date;
    let startTimeVal = nowIST.time;
    let endDateVal = defaultEndIST.date;
    let endTimeVal = defaultEndIST.time;

    if (conf.isOffline && conf.offlineEndTime) {
      const endParts = toISTParts(conf.offlineEndTime);
      endDateVal = endParts.date;
      endTimeVal = endParts.time;

      if (conf.offlineStartTime) {
        const startParts = toISTParts(conf.offlineStartTime);
        startDateVal = startParts.date;
        startTimeVal = startParts.time;
        startNowVal = conf.offlineStartMode === 'immediate';
      }
    } else if (isLegacyUnconfigured) {
      startNowVal = true;
      startDateVal = nowIST.date;
      startTimeVal = nowIST.time;
      endDateVal = defaultEndIST.date;
      endTimeVal = defaultEndIST.time;
    }

    setOfflineForm({
      isOffline: !!conf.isOffline,
      startNow: startNowVal,
      startDate: startDateVal,
      startTime: startTimeVal,
      endDate: endDateVal,
      endTime: endTimeVal,
      isLegacyUnconfigured: isLegacyUnconfigured
    });
    setOfflineValidationError('');
    setOfflineConfigSummary(null);
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

  // Authoritative RetailEdge Pro Rule: Attendance >= 80% AND Passing Score >= 70%
  const certificationReadyParticipants = operationalParticipants.filter(p =>
    (p.attendancePercentage || 0) >= 80 && (p.assessmentScore || 0) >= 70
  );
  const certificationReadyCount = certificationReadyParticipants.length;

  // Coaching Status Classification: <60% At Risk, 60-74% Needs Review, >=75% On Track
  const getCoachingStatus = (score) => {
    if (score < 60) return { label: 'At Risk', variant: 'danger', color: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5' };
    if (score < 75) return { label: 'Needs Review', variant: 'warning', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    return { label: 'On Track', variant: 'success', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
  };

  const filteredParticipants = operationalParticipants.filter(p => {
    const status = getCoachingStatus(p.assessmentScore || 0);
    if (coachingFilter === 'at_risk') return status.label === 'At Risk';
    if (coachingFilter === 'needs_review') return status.label === 'Needs Review';
    if (coachingFilter === 'on_track') return status.label === 'On Track';
    return true;
  });

  const atRiskLearnersCount = operationalParticipants.filter(p => (p.assessmentScore || 0) < 60).length;

  // Date Picker Option Click
  const handleDateFilterSelect = (val) => {
    setSelectedDateFilter(val);
    setShowDateDropdown(false);
  };

  return (
    <div className="trainer-workspace-page" style={{
      minHeight: '100%',
      background: 'var(--re-bg, #F6F8FC)',
      padding: '24px 32px 56px',
      color: 'var(--re-text, #0F172A)'
    }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>

        {/* ─── 1. PAGE HEADER (ENTERPRISE OPERATIONAL STANDARD) ─── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--re-border, #E2E8F0)',
          borderRadius: '14px',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{
                background: '#1E40AF',
                color: '#FFFFFF',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.07em',
                padding: '4px 9px',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}>
                TRAINER WORKSPACE
              </span>
              <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>•</span>
              <span style={{
                color: '#1E40AF',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Building2 size={14} />
                {user?.name || 'Trainer'}
              </span>
            </div>

            <h1 style={{
              margin: 0,
              fontSize: '1.65rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--re-navy, #0F172A)',
              fontFamily: 'var(--font-heading)'
            }}>
              Training Delivery & Performance
            </h1>

            <p style={{
              margin: '6px 0 0 0',
              color: 'var(--re-text-secondary, #475569)',
              fontSize: '0.88rem',
              lineHeight: 1.4
            }}>
              Manage assigned sessions, monitor learner progress and take action on training performance.
            </p>
          </div>

          {/* Right Header Controls: Project Selector, Date filter, Sync & Quick Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Assigned Project Selector */}
            <div style={{ position: 'relative' }}>
              <select
                id="trainer-project-selector"
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                style={{
                  background: '#FFFFFF',
                  color: 'var(--re-navy, #0F172A)',
                  border: '1px solid var(--re-border, #E2E8F0)',
                  padding: '9px 36px 9px 14px',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minWidth: '220px',
                  outline: 'none',
                  appearance: 'none',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
                }}
              >
                <option value="all">All Assigned Projects ({trainerProjects.length})</option>
                {trainerProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown
                size={16}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B'
                }}
              />
            </div>

            {/* Date Range Filter Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <Calendar size={14} style={{ color: '#2563EB' }} />
                <span>{selectedDateFilter}</span>
                <ChevronDown size={14} style={{ color: '#64748B' }} />
              </button>
              {showDateDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  right: 0,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  width: '160px',
                  boxShadow: '0 10px 25px rgba(15,23,42,0.1)',
                  zIndex: 110,
                  overflow: 'hidden'
                }}>
                  {['Today', 'Last 7 Days', 'Last 30 Days'].map(opt => (
                    <div
                      key={opt}
                      onClick={() => handleDateFilterSelect(opt)}
                      style={{
                        padding: '9px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        color: selectedDateFilter === opt ? '#1E40AF' : '#475569',
                        background: selectedDateFilter === opt ? '#EFF6FF' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseOut={e => {
                        if (selectedDateFilter === opt) e.currentTarget.style.background = '#EFF6FF';
                        else e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sync Live Button */}
            <button
              id="trainer-sync-btn"
              onClick={handleSyncDashboard}
              disabled={syncStatus === 'syncing'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FFFFFF',
                color: syncStatus === 'success' ? '#059669' : (syncStatus === 'error' ? '#DC2626' : 'var(--re-primary, #1E40AF)'),
                border: '1px solid var(--re-border, #E2E8F0)',
                padding: '9px 14px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: syncStatus === 'syncing' ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
              }}
              title={`Last synced: ${formatSyncTime(lastSyncedTime)}`}
            >
              <RefreshCw size={14} style={{ animation: syncStatus === 'syncing' ? 'spin 1s linear infinite' : 'none' }} />
              <span>{syncStatus === 'syncing' ? 'Syncing...' : (syncStatus === 'success' ? 'Synced' : 'Sync')}</span>
            </button>

            {/* Primary Action Button (Create Quiz / Schedule) */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowActionDropdown(!showActionDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--re-primary, #1E40AF)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)'
                }}
              >
                <span>Actions</span>
                <ChevronDown size={14} />
              </button>
              {showActionDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  right: 0,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
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
                    { label: 'Issue Certificate', action: () => navigate('/certificates') }
                  ].map(act => (
                    <div
                      key={act.label}
                      onClick={() => { act.action(); setShowActionDropdown(false); }}
                      style={{
                        padding: '10px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        color: '#334155',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'}
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

        {/* ─── 2. TRAINER OPERATIONAL KPI AREA (REAL DATABASE KPIS) ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* KPI 1: Today's Sessions */}
          <KpiCard
            icon={Calendar}
            label="TODAY'S SESSIONS"
            value={loadingCockpit ? '—' : todaySessionsCount}
            subtext="Scheduled for delivery"
            variant="blue"
            loading={loadingCockpit}
          />

          {/* KPI 2: Upcoming Sessions */}
          <KpiCard
            icon={Clock}
            label="UPCOMING SESSIONS"
            value={loadingCockpit ? '—' : upcomingSessionsCount}
            subtext="In calendar queue"
            variant="cyan"
            loading={loadingCockpit}
          />

          {/* KPI 3: Live Sessions */}
          <KpiCard
            icon={Radio}
            label="LIVE SESSIONS"
            value={loadingCockpit ? '—' : liveSessionsCount}
            subtext={liveSessionsCount > 0 ? "Room currently active" : "No active rooms"}
            variant={liveSessionsCount > 0 ? "green" : "neutral"}
            loading={loadingCockpit}
          />

          {/* KPI 4: Total Participants */}
          <KpiCard
            icon={Users}
            label="TOTAL PARTICIPANTS"
            value={loadingCockpit ? '—' : totalParticipantsCount}
            subtext="Enrolled workforce"
            variant="purple"
            loading={loadingCockpit}
          />

          {/* KPI 5: Attendance Rate */}
          <KpiCard
            icon={CheckCircle2}
            label="ATTENDANCE RATE"
            value={loadingCockpit ? '—' : (operationalParticipants.length > 0 ? `${attendanceRate}%` : '—')}
            subtext="Verified presence"
            variant="amber"
            radialProgress={attendanceRate}
            loading={loadingCockpit}
          />

          {/* KPI 6: Active Quizzes */}
          <KpiCard
            icon={BarChart2}
            label="ACTIVE QUIZZES"
            value={loadingCockpit ? '—' : activeQuizzesCount}
            subtext="Assessment studio"
            variant="blue"
            loading={loadingCockpit}
          />

          {/* KPI 7: Average Assessment Score */}
          <KpiCard
            icon={TrendingUp}
            label="AVERAGE SCORE"
            value={loadingCockpit ? '—' : (operationalParticipants.length > 0 ? `${avgQuizScore}%` : '—')}
            subtext="Class performance"
            variant="green"
            radialProgress={avgQuizScore}
            loading={loadingCockpit}
          />

          {/* KPI 8: Certification Ready */}
          <KpiCard
            icon={Award}
            label="CERTIFICATION READY"
            value={loadingCockpit ? '—' : certificationReadyCount}
            subtext="Att ≥80% & Score ≥70%"
            variant="pink"
            loading={loadingCockpit}
          />

          {/* KPI 9: At-Risk Learners */}
          <KpiCard
            icon={AlertTriangle}
            label="AT-RISK LEARNERS"
            value={loadingCockpit ? '—' : atRiskLearnersCount}
            subtext={atRiskLearnersCount > 0 ? "Remediation recommended" : "Cohort on track"}
            variant={atRiskLearnersCount > 0 ? "red" : "green"}
            loading={loadingCockpit}
          />
        </div>

        {/* ─── 3. OPERATIONAL SESSIONS DELIVERY (TODAY / NEXT UP) ─── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--re-border, #E2E8F0)',
          borderRadius: '14px',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: '#2563EB' }} />
                <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 700, color: 'var(--re-navy, #0F172A)' }}>
                  Today's Training & Scheduled Sessions
                </h3>
              </div>
              <p style={{ margin: '4px 0 0 0', color: 'var(--re-text-secondary, #475569)', fontSize: '0.84rem' }}>
                Authoritative project delivery — live session execution, attendance rosters, and assessment launches.
              </p>
            </div>

            <button
              onClick={() => { setIsSuccessView(false); setIsUrlCustom(false); setIsMeetingModalOpen(true); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--re-primary, #1E40AF)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} /> Schedule Training Batch
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
            <EmptyState
              title="No assigned training projects available"
              description="Contact your administrator to be assigned to an active retail initiative."
            />
          )}
        </div>

        {/* ─── 4. LEARNERS REQUIRING ATTENTION (COACHING TRIAGE) ─── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--re-border, #E2E8F0)',
          borderRadius: '14px',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#D97706' }} />
                <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 700, color: 'var(--re-navy, #0F172A)' }}>
                  Learners Requiring Attention
                </h3>
              </div>
              <p style={{ margin: '4px 0 0 0', color: 'var(--re-text-secondary, #475569)', fontSize: '0.84rem' }}>
                Operational triage identifying participants needing coaching intervention prior to certification.
              </p>
            </div>

            {/* Coaching Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Learners', count: operationalParticipants.length },
                { id: 'at_risk', label: 'At Risk (<60%)', count: atRiskLearnersCount },
                { id: 'needs_review', label: 'Needs Review (60-74%)', count: operationalParticipants.filter(p => (p.assessmentScore || 0) >= 60 && (p.assessmentScore || 0) < 75).length },
                { id: 'on_track', label: 'On Track (≥75%)', count: operationalParticipants.filter(p => (p.assessmentScore || 0) >= 75).length }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setCoachingFilter(f.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: coachingFilter === f.id ? '1px solid #2563EB' : '1px solid #E2E8F0',
                    background: coachingFilter === f.id ? '#EFF6FF' : '#F8FAFC',
                    color: coachingFilter === f.id ? '#1E40AF' : '#64748B',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>

          {/* Boundary Notice Banner */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            background: '#EFF6FF',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            fontSize: '0.78rem',
            color: '#1E40AF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div>
              <strong>COACHING SIGNALS:</strong> &lt;60% At Risk • 60-74% Needs Review • ≥75% On Track
            </div>
            <div style={{ color: '#059669', fontWeight: 600 }}>
              <strong>CERTIFICATION STANDARD:</strong> Attendance ≥80% AND Assessment ≥70%
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Participant</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attendance</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Assessment Score</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Coaching Status</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Certification Readiness</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.length > 0 ? (
                  filteredParticipants.map(p => {
                    const cStatus = getCoachingStatus(p.assessmentScore || 0);
                    const isCertEligible = (p.attendancePercentage || 0) >= 80 && (p.assessmentScore || 0) >= 70;
                    const initials = p.name ? p.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'P';
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: '#EFF6FF',
                              border: '1px solid rgba(37, 99, 235, 0.2)',
                              color: '#1E40AF',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--re-navy, #0F172A)' }}>{p.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {p.employee_id || '—'} • {p.designation || 'Learner'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {trainerProjects.find(pr => pr.id === p.projectId)?.name || 'Project Alpha'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '45px', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${p.attendancePercentage || 0}%`,
                                height: '100%',
                                background: (p.attendancePercentage || 0) >= 80 ? '#10B981' : '#EF4444',
                                borderRadius: '3px'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: (p.attendancePercentage || 0) >= 80 ? '#059669' : '#DC2626' }}>
                              {p.attendancePercentage ?? 0}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '45px', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${p.assessmentScore || 0}%`,
                                height: '100%',
                                background: (p.assessmentScore || 0) >= 70 ? '#10B981' : '#F59E0B',
                                borderRadius: '3px'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: (p.assessmentScore || 0) >= 70 ? '#059669' : '#D97706' }}>
                              {p.assessmentScore ?? 0}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <StatusBadge
                            status={cStatus.label}
                            variant={cStatus.variant}
                          />
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {isCertEligible ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: '#ECFDF5',
                              color: '#065F46',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}>
                              <CheckCircle2 size={12} />
                              Eligible
                            </span>
                          ) : (
                            <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>
                              Needs {(p.attendancePercentage || 0) < 80 ? 'Att' : 'Score'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              alert(`Initiating 1-on-1 coaching review for ${p.name}. Assessment: ${p.assessmentScore}%, Attendance: ${p.attendancePercentage}%.`);
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              background: cStatus.label === 'At Risk' ? '#FEF2F2' : '#FFFFFF',
                              color: cStatus.label === 'At Risk' ? '#DC2626' : '#1E40AF',
                              border: cStatus.label === 'At Risk' ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
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
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                      No participants matching this coaching triage filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── 5. PERFORMANCE OVERVIEW & PARTICIPANT DISTRIBUTION ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
          marginBottom: '24px'
        }}>
          {/* Performance Overview (Chart) */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--re-border, #E2E8F0)',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--re-navy, #0F172A)', margin: 0 }}>
                  Training Performance Trends
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>
                  Delivery effectiveness and assessment completion trends
                </p>
              </div>

              {/* Chart Timeline Selection */}
              <div style={{ display: 'flex', gap: '3px', background: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                {['Daily', 'Weekly', 'Monthly'].map(tl => (
                  <button
                    key={tl}
                    onClick={() => setChartTimeline(tl)}
                    style={{
                      background: chartTimeline === tl ? '#FFFFFF' : 'transparent',
                      color: chartTimeline === tl ? 'var(--re-navy, #0F172A)' : '#64748B',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: chartTimeline === tl ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none'
                    }}
                  >
                    {tl}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentTrend.labels.map((lbl, idx) => {
                const sc = currentTrend.avgScore[idx] || 0;
                const pt = currentTrend.participants[idx] || 0;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '60px', fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>
                      {lbl}
                    </span>
                    <div style={{ flex: 1, height: '10px', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${sc}%`,
                        height: '100%',
                        background: sc >= 70 ? 'linear-gradient(90deg, #1E40AF 0%, #3B82F6 100%)' : '#F59E0B',
                        borderRadius: '6px'
                      }} />
                    </div>
                    <span style={{ width: '40px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--re-navy, #0F172A)', textAlign: 'right' }}>
                      {sc > 0 ? `${sc}%` : '—'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8', minWidth: '45px' }}>
                      ({pt} learners)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Participants by Project Distribution */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--re-border, #E2E8F0)',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--re-navy, #0F172A)', margin: '0 0 16px 0' }}>
              Participants by Project Scope
            </h3>

            {(() => {
              const projectBreakdown = (trainerProjects.length > 0 ? trainerProjects : projects).map(proj => {
                const count = usersList.filter(u => u.projectId === proj.id || u.Project?.id === proj.id).length;
                return { id: proj.id, name: proj.name, count };
              });
              const totalAssignedLearners = projectBreakdown.reduce((acc, p) => acc + p.count, 0);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {projectBreakdown.length === 0 ? (
                    <span style={{ color: '#64748B', fontSize: '0.84rem' }}>No projects assigned yet.</span>
                  ) : (
                    projectBreakdown.map((item, idx) => {
                      const pct = totalAssignedLearners > 0 ? Math.round((item.count / totalAssignedLearners) * 100) : 0;
                      return (
                        <div key={item.id || idx} style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '10px 14px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--re-navy, #0F172A)' }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E40AF' }}>
                              {item.count} learners ({pct}%)
                            </span>
                          </div>
                          <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: '#2563EB',
                              borderRadius: '3px'
                            }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ─── 6. LIVE ARENA — MY QUIZZES (PROJECT FOLDER HIERARCHY) ─── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--re-border, #E2E8F0)',
          borderRadius: '14px',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: '#2563EB' }} />
                <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 700, color: 'var(--re-navy, #0F172A)' }}>
                  Live Arena — My Quizzes
                </h3>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--re-text-secondary, #475569)' }}>
                Interactive quizzes organized by assigned project folder.
              </p>
            </div>
            <button
              onClick={() => navigate('/builder')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--re-primary, #1E40AF)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} /> Create Quiz
            </button>
          </div>

          {(() => {
            const activeProjects = (trainerProjects.length > 0 ? trainerProjects : projects);
            const unassignedQuizzes = quizzes.filter(q => !q.projectId || !activeProjects.some(p => p.id === q.projectId));

            if (activeProjects.length === 0 && quizzes.length === 0) {
              return <p style={{ color: '#64748B', marginTop: '16px', fontSize: '0.85rem' }}>No quizzes found. Use the Create Quiz actions to build one!</p>;
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
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 18px',
            fontSize: '0.82rem',
            color: '#475569',
            boxShadow: 'var(--re-shadow-sm, 0 1px 3px 0 rgba(15, 23, 42, 0.05))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>💡</span>
              <span><strong>Pro Tip:</strong> {TIPS[tipIndex]}</span>
            </div>
            <button
              onClick={() => setShowTip(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', color: '#94A3B8' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

      </div>

      {/* ─── MODAL: SCHEDULE NEW MEETING (ENTERPRISE WHITE THEME) ─── */}
      {isMeetingModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '580px', background: '#FFFFFF',
            maxHeight: '90vh', overflowY: 'auto', padding: '28px',
            borderRadius: '16px', border: '1px solid var(--re-border, #E2E8F0)',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.15)'
          }}>

            {!isSuccessView ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: 'var(--re-navy, #0F172A)', fontSize: '1.25rem', fontWeight: 800 }}>
                    Schedule Training Batch
                  </h3>
                  <button
                    onClick={() => { setIsMeetingModalOpen(false); setIsUrlCustom(false); }}
                    style={{ cursor: 'pointer', background: '#F1F5F9', border: 'none', color: '#64748B', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Training Topic / Title *</label>
                    <input
                      type="text"
                      value={meetingForm.title}
                      onChange={e => setMeetingForm({...meetingForm, title: e.target.value})}
                      required
                      placeholder="e.g. Retail Compliance & Merchandise Strategy"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.84rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Agenda & Description</label>
                    <textarea
                      value={meetingForm.description}
                      onChange={e => setMeetingForm({...meetingForm, description: e.target.value})}
                      placeholder="Enter session curriculum objectives..."
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', minHeight: '60px', resize: 'vertical', fontSize: '0.84rem', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Select Project</label>
                      <select
                        value={meetingForm.projectId}
                        onChange={e => handleProjectChange(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.84rem', outline: 'none' }}
                      >
                        <option value="">-- General / Global --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={meetingForm.scheduledAt}
                        onChange={e => setMeetingForm({...meetingForm, scheduledAt: e.target.value})}
                        required
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.84rem', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Meeting Platform *</label>
                    <select
                      value={meetingForm.platform}
                      onChange={e => {
                        setIsUrlCustom(false);
                        setMeetingForm({...meetingForm, platform: e.target.value});
                      }}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.84rem', outline: 'none' }}
                    >
                      <option value="google_meet">Google Meet (Auto-generated Link)</option>
                      <option value="jitsi">Jitsi Meet (Auto-generated Link)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Meeting URL *</label>
                    <input
                      type="text"
                      value={meetingForm.url}
                      onChange={e => {
                        setIsUrlCustom(true);
                        setMeetingForm({...meetingForm, url: e.target.value});
                      }}
                      required
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.84rem', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                    <button
                      type="button"
                      onClick={() => { setIsMeetingModalOpen(false); setIsUrlCustom(false); }}
                      style={{ padding: '8px 14px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--re-primary, #1E40AF)', border: 'none', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Schedule Session
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ECFDF5', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <Check size={24} style={{ color: '#059669' }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--re-navy, #0F172A)', marginBottom: '6px', fontWeight: 800 }}>
                  Session Scheduled!
                </h3>
                <p style={{ color: '#64748B', marginBottom: '20px', fontSize: '0.84rem' }}>
                  Your training meeting has been created for <strong>{scheduledMeetingDetails?.projectName}</strong>.
                </p>

                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px', textAlign: 'left', marginBottom: '20px', border: '1px solid #E2E8F0', fontSize: '0.82rem' }}>
                  <div style={{ marginBottom: '6px' }}><strong>Topic:</strong> {scheduledMeetingDetails?.title}</div>
                  <div><strong>Date:</strong> {scheduledMeetingDetails?.scheduledAt ? new Date(scheduledMeetingDetails.scheduledAt).toLocaleString() : 'N/A'}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsMeetingModalOpen(false);
                    setIsSuccessView(false);
                  }}
                  style={{ width: '100%', padding: '10px', background: 'var(--re-primary, #1E40AF)', border: 'none', color: '#FFFFFF', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', fontSize: '0.84rem' }}
                >
                  Close & Back to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: OFFLINE QUIZ CONFIG (ENTERPRISE WHITE THEME) ─── */}
      {isOfflineModalOpen && selectedOfflineQuiz && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '520px', background: '#FFFFFF',
            padding: '28px', borderRadius: '16px', border: '1px solid var(--re-border, #E2E8F0)',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.18)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            {!isOfflineSuccessView ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--re-navy, #0F172A)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <WifiOff size={20} style={{ color: '#2563EB' }} /> Configure Offline Quiz
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                      {selectedOfflineQuiz.title}
                    </div>
                  </div>
                  <button onClick={() => setIsOfflineModalOpen(false)} style={{ background: '#F1F5F9', border: 'none', color: '#64748B', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>

                {offlineForm.isLegacyUnconfigured && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', color: '#991B1B', fontSize: '0.78rem' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#DC2626' }} />
                    <div>
                      <strong>Expiry Not Configured:</strong> This legacy link is currently paused because no expiry time was set. To make it available to learners, configure a valid start and expiry schedule below.
                    </div>
                  </div>
                )}

                {offlineValidationError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', color: '#DC2626', fontSize: '0.8rem', fontWeight: 600 }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                    {offlineValidationError}
                  </div>
                )}

                <form onSubmit={handleOfflineSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* 1. Toggle: Enable Offline Taking */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A' }}>Enable Offline Taking</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Learners can join asynchronously via shareable link</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={offlineForm.isOffline}
                      onChange={e => {
                        setOfflineForm({ ...offlineForm, isOffline: e.target.checked });
                        setOfflineValidationError('');
                      }}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563EB' }}
                    />
                  </div>

                  {offlineForm.isOffline && (
                    <>
                      {/* 2. Start Availability: Immediate vs Scheduled */}
                      <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: offlineForm.startNow ? '#ECFDF5' : '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${offlineForm.startNow ? '#A7F3D0' : '#E2E8F0'}` }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: offlineForm.startNow ? '#065F46' : '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              ⚡ Start Immediately
                            </div>
                            <div style={{ fontSize: '0.72rem', color: offlineForm.startNow ? '#047857' : '#64748B' }}>
                              Quiz opens the moment settings are saved
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={offlineForm.startNow}
                            onChange={e => {
                              const checked = e.target.checked;
                              const nowIST = toISTParts(new Date().toISOString());
                              setOfflineForm(prev => ({
                                ...prev,
                                startNow: checked,
                                startDate: checked ? nowIST.date : prev.startDate || nowIST.date,
                                startTime: checked ? nowIST.time : prev.startTime || nowIST.time
                              }));
                              setOfflineValidationError('');
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#059669' }}
                          />
                        </div>

                        {/* Scheduled Start Inputs (when Start Immediately is unchecked) */}
                        {!offlineForm.startNow && (
                          <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                              Scheduled Start Date & Time <span style={{ color: '#2563EB', fontWeight: 600 }}>(Asia/Kolkata - IST)</span> *
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>Start Date</span>
                                <input
                                  type="date"
                                  required
                                  value={offlineForm.startDate}
                                  onChange={e => setOfflineForm({ ...offlineForm, startDate: e.target.value })}
                                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', boxSizing: 'border-box' }}
                                />
                              </div>
                              <div>
                                <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>Start Time (IST)</span>
                                <input
                                  type="time"
                                  required
                                  value={offlineForm.startTime}
                                  onChange={e => setOfflineForm({ ...offlineForm, startTime: e.target.value })}
                                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', boxSizing: 'border-box' }}
                                />
                              </div>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '6px' }}>
                              Before this time, learners opening the link will see “Quiz not yet available” with the scheduled opening time.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 3. Link Expiry (Mandatory for ALL offline quizzes) */}
                      <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                            Link Expiry Date & Time <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <span style={{ fontSize: '0.7rem', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Asia/Kolkata (IST)
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600, marginBottom: '8px' }}>
                          Participants can no longer start or submit after this time.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>Expiry Date</span>
                            <input
                              type="date"
                              required
                              value={offlineForm.endDate}
                              onChange={e => setOfflineForm({ ...offlineForm, endDate: e.target.value })}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>Expiry Time (IST)</span>
                            <input
                              type="time"
                              required
                              value={offlineForm.endTime}
                              onChange={e => setOfflineForm({ ...offlineForm, endTime: e.target.value })}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', color: '#0F172A', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Quick Presets:</span>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(2)}
                            style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            +2 Hours
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(24)}
                            style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            +24 Hours
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(72)}
                            style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#334155', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            +3 Days
                          </button>
                        </div>
                      </div>

                      {/* 4. Shareable Quiz Link */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Shareable Quiz Link</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            value={offlineQuizLink}
                            readOnly
                            style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontSize: '0.8rem' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyLink(offlineQuizLink)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #E2E8F0', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {linkCopied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                            {linkCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                        {!offlineForm.startNow && (
                          <span style={{ fontSize: '0.7rem', color: '#D97706', display: 'block', marginTop: '4px', fontWeight: 600 }}>
                            ⚠️ Note: Link will show “Quiz not yet available” until the scheduled start time.
                          </span>
                        )}
                      </div>

                      {/* Close Link Early Button (if previously active) */}
                      {selectedOfflineQuiz.config?.isOffline && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '4px' }}>
                          <button
                            type="button"
                            onClick={handleCloseLinkEarly}
                            disabled={offlineSaving}
                            style={{
                              padding: '6px 12px', borderRadius: '6px',
                              background: '#FEF2F2', border: '1px solid #FECACA',
                              color: '#DC2626', fontSize: '0.74rem', fontWeight: 700,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                            }}
                          >
                            <WifiOff size={13} /> Close Link Early
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                    <button
                      type="button"
                      onClick={() => setIsOfflineModalOpen(false)}
                      disabled={offlineSaving}
                      style={{ padding: '8px 14px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={offlineSaving}
                      style={{
                        padding: '8px 18px', borderRadius: '8px',
                        background: offlineSaving ? '#94A3B8' : 'var(--re-primary, #1E40AF)',
                        border: 'none', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 700,
                        cursor: offlineSaving ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {offlineSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ECFDF5', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <Check size={24} style={{ color: '#059669' }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--re-navy, #0F172A)', marginBottom: '6px', fontWeight: 800 }}>
                  Offline Availability Configured!
                </h3>
                <p style={{ color: '#64748B', marginBottom: '16px', fontSize: '0.84rem' }}>
                  Quiz <strong>{selectedOfflineQuiz.title}</strong> availability window has been saved on the server.
                </p>

                {offlineConfigSummary && (
                  <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '14px', textAlign: 'left', marginBottom: '18px', border: '1px solid #E2E8F0', fontSize: '0.82rem' }}>
                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Start Window:</span>
                      <strong style={{ color: '#0F172A' }}>
                        {offlineConfigSummary.isImmediate ? `⚡ Immediate (${offlineConfigSummary.startIST})` : `⏰ Scheduled (${offlineConfigSummary.startIST})`}
                      </strong>
                    </div>
                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Expiry Deadline:</span>
                      <strong style={{ color: '#DC2626' }}>
                        {offlineConfigSummary.endIST}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Timezone:</span>
                      <strong style={{ color: '#2563EB' }}>Asia/Kolkata (IST)</strong>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={offlineQuizLink}
                      readOnly
                      style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontSize: '0.8rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(offlineQuizLink)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #E2E8F0', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {linkCopied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                      {linkCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsOfflineModalOpen(false);
                    setIsOfflineSuccessView(false);
                  }}
                  style={{ width: '100%', padding: '10px', background: 'var(--re-primary, #1E40AF)', border: 'none', color: '#FFFFFF', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', fontSize: '0.84rem' }}
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
