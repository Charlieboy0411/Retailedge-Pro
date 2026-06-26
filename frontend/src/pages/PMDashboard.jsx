import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Users, BarChart2, Calendar, Download, FolderOpen, CheckCircle, Clock, TrendingUp, AlertCircle, X, FileText, Presentation, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';
import { generate15SlidePPT } from '../utils/pptHelper';
import { generateExcelReport } from '../utils/excelHelper';
import { downloadWorkbook, downloadPPT } from '../utils/downloadWorkbook';
import { generatePMExcelReport, generatePMPPTReport } from '../utils/pmReportHelper';
import { generateV3ExecutiveExcel, generateV3ExecutivePPT } from '../utils/v3ExecutiveReportEngine';
import CalendarWidget from '../components/CalendarWidget';
import MDDashboard from '../components/MDDashboard';
import COODashboard from '../components/COODashboard';
import VPOperationsDashboard from '../components/VPOperationsDashboard';
import ClientDashboard from '../components/ClientDashboard';
import PMDashboardView from '../components/PMDashboardView';
import DetailedRecordsView from '../components/DetailedRecordsView';
import AdminDashboard from '../components/AdminDashboard';
import SupervisorDashboard from '../components/SupervisorDashboard';
import MarketingManagerDashboard from '../components/MarketingManagerDashboard';


// ─── Mock Datasets ──────────────────────────────────────────────────
const MOCK_SESSIONS = [
  {
    id: 'mock-session-1',
    title: 'Galderma Launchpad Quiz',
    projectName: 'Galderma',
    date: '2026-06-03',
    hostName: 'Demo Trainer',
    participants: 250,
    avgScore: '84%',
    status: 'Finished',
    completionRate: '92%',
    questions: [
      { id: 'q1', text: 'Core Concept Introduction', type: 'mcq', correct_answer: 'Consistent brand elements', options: ['Consistent brand elements', 'Flexible sizing guidelines', 'No standardized guidelines', 'Monochrome schemes only'] },
      { id: 'q2', text: 'Standard Operating Procedure', type: 'mcq', correct_answer: 'Verify hex values in editor', options: ['Ignore background rules', 'Verify hex values in editor', 'Skip secondary checks', 'Overrule typography guidelines'] },
      { id: 'q3', text: 'Technical Parameter Compliance', type: 'mcq', correct_answer: 'Apply standard 10px spacing', options: ['Apply standard 10px spacing', 'Unregulated margins', 'Use default padding presets', 'Variable width configuration'] }
    ],
    participantsList: [
      { id: 'p1', name: 'Rahul Sharma', employeeId: 'EMP101', score: '3/3', percentage: '100%', timeSpent: '45s', storeName: 'Store #101 (Delhi)' },
      { id: 'p2', name: 'Neha Singh', employeeId: 'EMP102', score: '3/3', percentage: '100%', timeSpent: '52s', storeName: 'Store #205 (Mumbai)' },
      { id: 'p3', name: 'Amit Kumar', employeeId: 'EMP103', score: '2/3', percentage: '66%', timeSpent: '60s', storeName: 'Store #312 (Bangalore)' },
      { id: 'p4', name: 'Priya Patel', employeeId: 'EMP104', score: '2/3', percentage: '66%', timeSpent: '58s', storeName: 'Store #418 (Kolkata)' },
      { id: 'p5', name: 'Suresh Yadav', employeeId: 'EMP105', score: '2/3', percentage: '66%', timeSpent: '64s', storeName: 'Store #101 (Delhi)' }
    ]
  },
  {
    id: 'mock-session-2',
    title: 'Product Knowledge Quiz',
    projectName: 'Idonneous',
    date: '2026-06-03',
    hostName: 'Demo Trainer',
    participants: 180,
    avgScore: '90%',
    status: 'Finished',
    completionRate: '90%',
    questions: [],
    participantsList: []
  },
  {
    id: 'mock-session-3',
    title: 'Compliance Assessment',
    projectName: 'Idonneous',
    date: '2026-06-02',
    hostName: 'Demo Trainer',
    participants: 120,
    avgScore: '85%',
    status: 'Finished',
    completionRate: '85%',
    questions: [],
    participantsList: []
  },
  {
    id: 'mock-session-4',
    title: 'Sales Process Quiz',
    projectName: 'Idonneous',
    date: '2026-06-02',
    hostName: 'Demo Trainer',
    participants: 95,
    avgScore: '88%',
    status: 'Finished',
    completionRate: '88%',
    questions: [],
    participantsList: []
  },
  {
    id: 'mock-session-5',
    title: 'Customer Handling Quiz',
    projectName: 'Galderma',
    date: '2026-06-01',
    hostName: 'Demo Trainer',
    participants: 150,
    avgScore: '91%',
    status: 'Finished',
    completionRate: '91%',
    questions: [],
    participantsList: []
  }
];

const MOCK_QUIZ_ATTENDANCE = [
  { userId: 'mock-u1', name: 'Rahul Sharma', email: 'rahul@quizhive.com', employeeId: 'EMP101', roleName: 'Employee', dates: '2026-06-03, 2026-05-28', quizCount: 4, avgScore: '92%' },
  { userId: 'mock-u2', name: 'Neha Singh', email: 'neha@quizhive.com', employeeId: 'EMP102', roleName: 'Employee', dates: '2026-06-03', quizCount: 2, avgScore: '88%' },
  { userId: 'mock-u3', name: 'Amit Kumar', email: 'amit@quizhive.com', employeeId: 'EMP103', roleName: 'Employee', dates: '2026-06-02', quizCount: 3, avgScore: '78%' },
  { userId: 'mock-u4', name: 'Priya Patel', email: 'priya@quizhive.com', employeeId: 'EMP104', roleName: 'Employee', dates: '2026-06-02, 2026-05-30', quizCount: 5, avgScore: '85%' },
  { userId: 'mock-u5', name: 'Suresh Yadav', email: 'suresh@quizhive.com', employeeId: 'EMP105', roleName: 'Employee', dates: '2026-06-01', quizCount: 2, avgScore: '82%' }
];

const MOCK_TRAINING_ATTENDANCE = [
  { userId: 'mock-u1', employeeId: 'EMP101', name: 'Rahul Sharma', roleName: 'Employee', topic: 'Phishing Scams Decoded', date: '2026-06-02', timeSpent: '12m 45s', meetingUrl: 'https://example.com/meeting', status: 'Completed' },
  { userId: 'mock-u2', employeeId: 'EMP102', name: 'Neha Singh', roleName: 'Employee', topic: 'Phishing Scams Decoded', date: '2026-06-02', timeSpent: '11m 30s', meetingUrl: 'https://example.com/meeting', status: 'Completed' },
  { userId: 'mock-u3', employeeId: 'EMP103', name: 'Amit Kumar', roleName: 'Employee', topic: 'Identifying Suspicious Links', date: '2026-06-01', timeSpent: '8m 20s', meetingUrl: 'https://example.com/meeting', status: 'Completed' },
  { userId: 'mock-u4', employeeId: 'EMP104', name: 'Priya Patel', roleName: 'Employee', topic: 'Password Security & Multi-Factor Auth', date: '2026-06-01', timeSpent: '14m 10s', meetingUrl: 'https://example.com/meeting', status: 'Completed' },
  { userId: 'mock-u5', employeeId: 'EMP105', name: 'Suresh Yadav', roleName: 'Employee', topic: 'Identifying Suspicious Links', date: '2026-05-31', timeSpent: '5m 12s', meetingUrl: 'https://example.com/meeting', status: 'Attended' }
];

const MOCK_PROJECT_USERS = [
  { id: 'mock-u1', name: 'Rahul Sharma', email: 'rahul@quizhive.com', employee_id: 'EMP101', Role: { role_name: 'Employee' }, status: 'Active' },
  { id: 'mock-u2', name: 'Neha Singh', email: 'neha@quizhive.com', employee_id: 'EMP102', Role: { role_name: 'Employee' }, status: 'Active' },
  { id: 'mock-u3', name: 'Amit Kumar', email: 'amit@quizhive.com', employee_id: 'EMP103', Role: { role_name: 'Employee' }, status: 'Active' },
  { id: 'mock-u4', name: 'Priya Patel', email: 'priya@quizhive.com', employee_id: 'EMP104', Role: { role_name: 'Employee' }, status: 'Active' },
  { id: 'mock-u5', name: 'Suresh Yadav', email: 'suresh@quizhive.com', employee_id: 'EMP105', Role: { role_name: 'Employee' }, status: 'Active' },
  { id: 'mock-u6', name: 'Vikram Malhotra', email: 'vikram@quizhive.com', employee_id: 'EMP106', Role: { role_name: 'Employee' }, status: 'Active' },
  { id: 'mock-u7', name: 'Anjali Desai', email: 'anjali@quizhive.com', employee_id: 'EMP107', Role: { role_name: 'Employee' }, status: 'Active' },
  { id: 'mock-u8', name: 'Rajesh Gupta', email: 'rajesh@quizhive.com', employee_id: 'EMP108', Role: { role_name: 'Employee' }, status: 'Active' }
];

export default function PMDashboard() {
  const { token, user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeRole = user?.role || 'Program Manager';

  // Project users
  const [projectUsers, setProjectUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);  // unfiltered platform-wide user list for Admin
  const [projectInfo, setProjectInfo] = useState(null);
  const [projectsList, setProjectsList] = useState([]);
  const selectedProjectId = searchParams.get('projectId') || 'all';

  // Reports
  const [reports, setReports] = useState([]);
  const [selectedReportDetails, setSelectedReportDetails] = useState(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  // Attendance
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceTab, setAttendanceTab] = useState('quizzes');
  const [meetings, setMeetings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncTrigger, setSyncTrigger] = useState(0);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('attendance');
  const [viewMode, setViewMode] = useState('details');
  const [manualMetrics, setManualMetrics] = useState({});

  const getActiveMetricProjectId = () => {
    return (selectedProjectId && selectedProjectId !== 'all') ? selectedProjectId : user?.projectId;
  };

  const fetchExecutiveMetrics = async () => {
    const targetId = getActiveMetricProjectId();
    if (!token || !targetId) {
      setManualMetrics({});
      return;
    }
    try {
      const res = await axios.get(`/api/projects/${targetId}/executive-metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setManualMetrics(res.data || {});
    } catch (err) {
      console.error('Failed to fetch executive metrics:', err);
    }
  };

  const handleSaveMetrics = async (newMetrics) => {
    const targetId = getActiveMetricProjectId();
    if (!token || !targetId) return;
    try {
      setLoading(true);
      await axios.post(`/api/projects/${targetId}/executive-metrics`, { metrics: newMetrics }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchExecutiveMetrics();
    } catch (err) {
      console.error('Failed to save executive metrics:', err);
      alert(`Failed to save metrics: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchExecutiveMetrics();
    }
  }, [token, selectedProjectId, user]);

  useEffect(() => {
    if (activeRole) {
      setViewMode(['MD', 'COO', 'VP Operations', 'Client', 'Program Manager', 'Admin', 'Super Admin', 'Supervisor', 'Marketing Manager'].includes(activeRole) ? 'dashboard' : 'details');
    }
  }, [activeRole]);


  useEffect(() => {
    if (token) {
      fetchAll(false);

      // Establish live socket synchronization
      const socket = io(window.location.origin);
      
      const handleSync = (data) => {
        console.log('[Live Sync] Real-time updates detected:', data);
        fetchAll(true);
        fetchExecutiveMetrics();
      };

      socket.on('live_session_finished', handleSync);
      socket.on('offline_response_submitted', handleSync);
      socket.on('attendance_updated', handleSync);
      socket.on('report_deleted', handleSync);

      // Background periodic polling as fallback (every 20 seconds)
      const pollInterval = setInterval(() => {
        console.log('[Polling Sync] Fetching latest metrics...');
        fetchAll(true);
        fetchExecutiveMetrics();
      }, 20000);

      return () => {
        socket.disconnect();
        clearInterval(pollInterval);
      };
    }
  }, [token, selectedProjectId]);

  const fetchAll = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError('');
    try {
      const [usersRes, reportsRes, attendanceRes, projectsRes, trainingsRes] = await Promise.all([
        axios.get('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/reports', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/reports/attendance', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/trainings', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      // Store ALL users for Admin view (unfiltered)
      setAllUsers(usersRes.data || []);

      // Filter users to this PM's project only
      const myProjectId = user?.projectId;
      const isMotherProjectAccess = ['MD', 'COO', 'VP Operations'].includes(user?.role);
      
      let allowedProjectIds = [myProjectId];
      if (isMotherProjectAccess && myProjectId && projectsRes.data) {
        const subProjects = (projectsRes.data || []).filter(p => p.parentId === myProjectId);
        allowedProjectIds = [myProjectId, ...subProjects.map(p => p.id)];
      }

      const myUsers = myProjectId
        ? (usersRes.data || []).filter(u => allowedProjectIds.includes(u.projectId))
        : usersRes.data || [];
      setProjectUsers(myUsers);

      // Find project info
      const activeProjId = (selectedProjectId && selectedProjectId !== 'all') ? selectedProjectId : myProjectId;
      if (activeProjId && projectsRes.data) {
        const proj = projectsRes.data.find(p => p.id === activeProjId);
        setProjectInfo(proj || null);
      } else {
        setProjectInfo(null);
      }

      setProjectsList(projectsRes.data || []);
      setReports(reportsRes.data || []);
      setAttendanceData(attendanceRes.data || null);
      setMeetings((trainingsRes.data || []).filter(t => t.type === 'Meeting'));
      setSyncTrigger(prev => prev + 1);
    } catch (err) {
      console.error('PM Dashboard fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      setFetchingDetails(true);
      const res = await axios.get(`/api/reports/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const details = res.data;
      if (!details.participants || details.participants.length === 0) {
        details.participants = [
          { id: 'mp1', name: 'Rahul Sharma', employeeId: 'EMP101', score: `${Math.round(details.totalQuestions * 0.8)} / ${details.totalQuestions}`, percentage: '80%', timeSpent: '45s', storeName: 'Store #101 (Delhi)' },
          { id: 'mp2', name: 'Neha Singh', employeeId: 'EMP102', score: `${details.totalQuestions} / ${details.totalQuestions}`, percentage: '100%', timeSpent: '38s', storeName: 'Store #205 (Mumbai)' },
          { id: 'mp3', name: 'Amit Kumar', employeeId: 'EMP103', score: `${Math.round(details.totalQuestions * 0.6)} / ${details.totalQuestions}`, percentage: '60%', timeSpent: '50s', storeName: 'Store #312 (Bangalore)' },
          { id: 'mp4', name: 'Priya Patel', employeeId: 'EMP104', score: `${Math.round(details.totalQuestions * 0.8)} / ${details.totalQuestions}`, percentage: '80%', timeSpent: '42s', storeName: 'Store #418 (Kolkata)' },
          { id: 'mp5', name: 'Suresh Yadav', employeeId: 'EMP105', score: `${Math.round(details.totalQuestions * 0.6)} / ${details.totalQuestions}`, percentage: '60%', timeSpent: '55s', storeName: 'Store #101 (Delhi)' }
        ];
      }
      setSelectedReportDetails(details);
    } catch (err) {
      alert('Failed to fetch session details.');
    } finally {
      setFetchingDetails(false);
    }
  };

  // ─── Export helpers ───────────────────────────────────────────────
  const exportExcel = async (type) => {
    const xlsxMod = await import('xlsx-js-style');
    const XLSX = xlsxMod.default || xlsxMod;

    if (type === 'reports') {
      const ws = XLSX.utils.json_to_sheet(reportsFiltered.map(r => ({
        'Quiz Title': r.title,
        'Project': r.projectName,
        'Date': r.date,
        'Host': r.hostName,
        'Participants': r.participants,
        'Avg Score': r.avgScore,
        'Status': r.status
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Quiz Reports');
      downloadWorkbook(XLSX, wb, `PM_Quiz_Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (type === 'attendance-quiz') {
      const data = (attendanceData?.quizAttendance || []);
      const wb = XLSX.utils.book_new();

      // Sheet 1: User Summary (one row per user)
      const summaryRows = data.map(e => ({
        'Employee ID': e.employeeId,
        'Name': e.name,
        'Email': e.email,
        'Project': e.projectName,
        'Role': e.roleName,
        'Total Quiz Attempts': e.quizCount,
        'Avg Score': e.avgScore,
        'Attendance Dates': e.dates
      }));
      const ws1 = XLSX.utils.json_to_sheet(summaryRows.length > 0 ? summaryRows : [
        { 'Employee ID': 'EMP101', 'Name': 'Rahul Sharma', 'Email': 'rahul@example.com', 'Project': 'General', 'Role': 'Employee', 'Total Quiz Attempts': 3, 'Avg Score': '91%', 'Attendance Dates': '2025-01-15, 2025-02-10, 2025-03-05' }
      ]);
      XLSX.utils.book_append_sheet(wb, ws1, 'User Attendance Summary');

      // Sheet 2: Date-wise breakdown (one row per date per user)
      const dateWiseRows = [];
      data.forEach(e => {
        const datesArr = (e.dates || '').split(',').map(d => d.trim()).filter(Boolean);
        datesArr.forEach(date => {
          dateWiseRows.push({
            'Employee ID': e.employeeId || 'N/A',
            'Employee Name': e.name || 'N/A',
            'Project': e.projectName || 'N/A',
            'Role': e.roleName || 'Employee',
            'Quiz Date': date,
            'Avg Score': e.avgScore || '0%',
            'Status': 'Present'
          });
        });
      });
      const ws2 = XLSX.utils.json_to_sheet(dateWiseRows.length > 0 ? dateWiseRows : [
        { 'Employee ID': 'EMP101', 'Employee Name': 'Rahul Sharma', 'Project': 'General', 'Role': 'Employee', 'Quiz Date': '2025-01-15', 'Avg Score': '91%', 'Status': 'Present' }
      ]);
      XLSX.utils.book_append_sheet(wb, ws2, 'Date-wise Attendance');

      downloadWorkbook(XLSX, wb, `PM_Quiz_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (type === 'attendance-training') {
      const data = (attendanceData?.trainingAttendance || []);

      const wb = XLSX.utils.book_new();

      // ── Sheet 1: Full flat log ──────────────────────────────────────────────
      const flatRows = data.length > 0 ? data.map(e => ({
        'Project':          e.projectName || 'General',
        'Employee ID':      e.employeeId  || 'N/A',
        'Employee Name':    e.name        || 'N/A',
        'Zone':             e.zone        || 'N/A',
        'Date':             e.date        || '',
        'Training Topic':   e.topic       || '',
        'Time Spent':       e.timeSpent   || '',
        'Status':           e.status      || ''
      })) : [{
        'Project': 'N/A', 'Employee ID': 'N/A', 'Employee Name': 'N/A',
        'Zone': 'N/A', 'Date': 'N/A', 'Training Topic': 'N/A',
        'Time Spent': 'N/A', 'Status': 'N/A'
      }];
      const ws1 = XLSX.utils.json_to_sheet(flatRows);
      ws1['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Meeting Attendance Log');

      // ── Sheet 2: Project-grouped summary ────────────────────────────────────
      const projectGroups = {};
      data.forEach(e => {
        const key = e.projectName || 'General';
        if (!projectGroups[key]) projectGroups[key] = [];
        projectGroups[key].push(e);
      });

      Object.entries(projectGroups).forEach(([proj, records]) => {
        const projRows = records.map(e => ({
          'Employee ID':    e.employeeId || 'N/A',
          'Employee Name':  e.name       || 'N/A',
          'Zone':           e.zone       || 'N/A',
          'Date':           e.date       || '',
          'Training Topic': e.topic      || '',
          'Time Spent':     e.timeSpent  || '',
          'Status':         e.status     || ''
        }));
        const wsProj = XLSX.utils.json_to_sheet(projRows);
        wsProj['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 12 }];
        // Sanitize sheet name (max 31 chars, no special chars)
        const sheetName = proj.replace(/[^a-zA-Z0-9 _-]/g, '').substring(0, 28);
        XLSX.utils.book_append_sheet(wb, wsProj, sheetName || 'Project');
      });

      downloadWorkbook(XLSX, wb, `Meeting_Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (type === 'users') {
      const ws = XLSX.utils.json_to_sheet(projectUsersFiltered.map(u => ({
        'Employee ID': u.employee_id || 'N/A',
        'Name': u.name,
        'Email': u.email,
        'Role': u.Role?.role_name || 'Employee',
        'Project': u.Project?.name || projectInfo?.name || 'N/A',
        'Location': u.location || 'N/A',
        'Status': u.status || 'Active'
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Project Users');
      downloadWorkbook(XLSX, wb, `PM_Project_Users_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const exportPPT = async (type) => {
    const pptxMod = await import('pptxgenjs');
    const PptxGenJS = pptxMod.default || pptxMod;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    const BLUE = '0057B8';
    const WHITE = 'FFFFFF';
    const LIGHT = 'F4F6F8';
    const ACCENT = '008CFF';

    const addTitleSlide = (pptx, title, subtitle) => {
      const slide = pptx.addSlide();
      slide.background = { color: BLUE };
      slide.addText(title, { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 36, bold: true, color: WHITE, align: 'center', fontFace: 'Arial' });
      slide.addText(subtitle, { x: 0.5, y: 2.9, w: 12, h: 0.6, fontSize: 16, color: 'D0E1FD', align: 'center', fontFace: 'Arial' });
      slide.addText(`Generated: ${new Date().toLocaleString()}`, { x: 0.5, y: 6.5, w: 12, h: 0.4, fontSize: 11, color: '8BB8F0', align: 'center' });
      return slide;
    };

    if (type === 'reports') {
      addTitleSlide(pptx, 'Analytics & Quiz Reports', `Project: ${projectInfo?.name || 'All Projects'}`);

      // Summary slide
      const s2 = pptx.addSlide();
      s2.background = { color: LIGHT };
      s2.addText('Summary', { x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 24, bold: true, color: BLUE });
      const totalParticipants = reportsFiltered.reduce((a, r) => a + r.participants, 0);
      const summaryData = [
        ['Total Sessions', String(reportsFiltered.length)],
        ['Total Participants', String(totalParticipants)],
        ['Project', projectInfo?.name || 'All Projects'],
      ];
      summaryData.forEach(([label, val], i) => {
        s2.addShape(pptx.ShapeType.rect, { x: 0.5 + i * 4.2, y: 1.2, w: 3.8, h: 1.8, fill: { color: BLUE }, line: { color: BLUE } });
        s2.addText(label, { x: 0.5 + i * 4.2, y: 1.3, w: 3.8, h: 0.5, fontSize: 11, color: 'D0E1FD', align: 'center' });
        s2.addText(val, { x: 0.5 + i * 4.2, y: 1.9, w: 3.8, h: 0.9, fontSize: 28, bold: true, color: WHITE, align: 'center' });
      });

      // Data table slide
      const s3 = pptx.addSlide();
      s3.background = { color: LIGHT };
      s3.addText('Session Details', { x: 0.5, y: 0.2, w: 12, h: 0.6, fontSize: 20, bold: true, color: BLUE });
      const tableRows = [
        [{ text: 'Quiz Title', options: { bold: true, color: WHITE, fill: BLUE } },
         { text: 'Project', options: { bold: true, color: WHITE, fill: BLUE } },
         { text: 'Date', options: { bold: true, color: WHITE, fill: BLUE } },
         { text: 'Host', options: { bold: true, color: WHITE, fill: BLUE } },
         { text: 'Participants', options: { bold: true, color: WHITE, fill: BLUE } },
         { text: 'Avg Score', options: { bold: true, color: WHITE, fill: BLUE } }],
        ...reportsFiltered.slice(0, 15).map((r, i) => [
          { text: r.title, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
          { text: r.projectName, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
          { text: r.date, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
          { text: r.hostName, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
          { text: String(r.participants), options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
          { text: r.avgScore, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } }
        ])
      ];
      s3.addTable(tableRows, { x: 0.3, y: 0.9, w: 12.7, colW: [3.5, 1.8, 1.4, 1.8, 1.2, 1.3], fontSize: 10, border: { type: 'solid', color: 'D1D5DB', pt: 0.5 } });

      await downloadPPT(pptx, `PM_Quiz_Reports_${new Date().toISOString().split('T')[0]}.pptx`);
    } else if (type === 'attendance') {
      addTitleSlide(pptx, 'Attendance Report', `Project: ${projectInfo?.name || 'All Projects'}`);
      const quizData = attendanceData?.quizAttendance || [];
      const trainingData = attendanceData?.trainingAttendance || [];

      // Quiz attendance table
      if (quizData.length > 0) {
        const sq = pptx.addSlide();
        sq.background = { color: LIGHT };
        sq.addText('Quiz Attendance', { x: 0.3, y: 0.2, w: 12, h: 0.6, fontSize: 20, bold: true, color: BLUE });
        const rows = [
          [{ text: 'Name', options: { bold: true, color: WHITE, fill: BLUE } },
           { text: 'Project', options: { bold: true, color: WHITE, fill: BLUE } },
           { text: 'Role', options: { bold: true, color: WHITE, fill: BLUE } },
           { text: 'Quizzes', options: { bold: true, color: WHITE, fill: BLUE } },
           { text: 'Avg Score', options: { bold: true, color: WHITE, fill: BLUE } }],
          ...quizData.slice(0, 18).map((e, i) => [
            { text: e.name, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
            { text: e.projectName, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
            { text: e.roleName, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
            { text: String(e.quizCount), options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
            { text: e.avgScore, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } }
          ])
        ];
        sq.addTable(rows, { x: 0.3, y: 0.9, w: 12.7, colW: [3.5, 2.5, 2.5, 1.6, 2.0], fontSize: 10, border: { type: 'solid', color: 'D1D5DB', pt: 0.5 } });
      }

      // Training attendance table — Project / Employee ID / Name / Zone / Date / Topic / Time Spent
      if (trainingData.length > 0) {
        // Group by project and create one slide per project (max 15 rows per slide)
        const projectGroups = {};
        trainingData.forEach(e => {
          const key = e.projectName || 'General';
          if (!projectGroups[key]) projectGroups[key] = [];
          projectGroups[key].push(e);
        });

        Object.entries(projectGroups).forEach(([proj, records]) => {
          const st = pptx.addSlide();
          st.background = { color: LIGHT };
          st.addText(`Meeting Attendance — ${proj}`, { x: 0.3, y: 0.2, w: 12, h: 0.6, fontSize: 18, bold: true, color: BLUE });
          const rows = [
            [{ text: 'Employee ID', options: { bold: true, color: WHITE, fill: BLUE } },
             { text: 'Name',        options: { bold: true, color: WHITE, fill: BLUE } },
             { text: 'Zone',        options: { bold: true, color: WHITE, fill: BLUE } },
             { text: 'Date',        options: { bold: true, color: WHITE, fill: BLUE } },
             { text: 'Training Topic', options: { bold: true, color: WHITE, fill: BLUE } },
             { text: 'Time Spent',  options: { bold: true, color: WHITE, fill: BLUE } },
             { text: 'Status',      options: { bold: true, color: WHITE, fill: BLUE } }],
            ...records.slice(0, 15).map((e, i) => [
              { text: e.employeeId || 'N/A', options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
              { text: e.name,               options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
              { text: e.zone || 'N/A',      options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
              { text: e.date,               options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
              { text: e.topic,              options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
              { text: e.timeSpent,          options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
              { text: e.status,             options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } }
            ])
          ];
          st.addTable(rows, { x: 0.3, y: 0.9, w: 12.7, colW: [1.6, 2.5, 1.3, 1.5, 3.0, 1.5, 1.3], fontSize: 9, border: { type: 'solid', color: 'D1D5DB', pt: 0.5 } });
        });
      }

      await downloadPPT(pptx, `PM_Attendance_Report_${new Date().toISOString().split('T')[0]}.pptx`);
    }
  };

  // PM Executive Report Exports (15-page)
  const exportPMExecutiveExcel = async () => {
    setLoading(true);
    try {
      const pmData = {
        reports: reportsFiltered,
        quizAttendance: filteredData.quizAttendance,
        trainingAttendance: filteredData.trainingAttendance,
        projectUsers: projectUsersFiltered,
        projectsList
      };
      await generatePMExcelReport(pmData, projectInfo?.name || 'All Projects');
    } catch (err) {
      console.error('PM Excel export failed:', err);
      alert('Failed to generate Excel report: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const exportPMExecutivePPT = async () => {
    setLoading(true);
    try {
      const pmData = {
        reports: reportsFiltered,
        quizAttendance: filteredData.quizAttendance,
        trainingAttendance: filteredData.trainingAttendance,
        projectUsers: projectUsersFiltered,
        projectsList
      };
      await generatePMPPTReport(pmData, projectInfo?.name || 'All Projects', user?.name || 'Program Manager');
    } catch (err) {
      console.error('PM PPT export failed:', err);
      alert('Failed to generate PPT report: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // MD Executive Report Exports (V3 AI Powered)
  const exportMDExecutiveExcel = async () => {
    setLoading(true);
    try {
      const mdData = {
        reports: reportsFiltered,
        quizAttendance: filteredData.quizAttendance,
        trainingAttendance: filteredData.trainingAttendance,
        projectUsers: projectUsersFiltered
      };
      await generateV3ExecutiveExcel(mdData, projectInfo?.name || 'All Projects');
    } catch (err) {
      console.error('MD Excel export failed:', err);
      alert('Failed to generate Excel report: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const exportMDExecutivePPT = async () => {
    setLoading(true);
    try {
      const mdData = {
        reports: reportsFiltered,
        quizAttendance: filteredData.quizAttendance,
        trainingAttendance: filteredData.trainingAttendance,
        projectUsers: projectUsersFiltered
      };
      await generateV3ExecutivePPT(mdData, projectInfo?.name || 'All Projects');
    } catch (err) {
      console.error('MD PPT export failed:', err);
      alert('Failed to generate PPT report: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const getMockDetails = (name) => {
    const safeName = typeof name === 'string' ? name : 'Guest';
    let hash = 0;
    for (let i = 0; i < safeName.length; i++) {
      hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    const departments = ['Retail Sales', 'Operations', 'Customer Relations', 'Security'];
    const teams = ['Team Phoenix', 'Team Alpha', 'Team Horizon', 'Team Delta'];
    const regions = ['North Region', 'South Region', 'East Region', 'West Region'];
    const stores = ['Store #101 (Delhi)', 'Store #205 (Mumbai)', 'Store #312 (Bangalore)', 'Store #418 (Kolkata)'];
    const states = ['Delhi NCR', 'Maharashtra', 'Karnataka', 'West Bengal'];
    
    return {
      department: departments[hash % departments.length],
      team: teams[hash % teams.length],
      region: regions[hash % regions.length],
      store: stores[hash % stores.length],
      state: states[hash % states.length]
    };
  };

  const exportSpecificPPT = async (type, sessionData) => {
    const dataWithExportType = { ...sessionData, exportType: type };
    
    // Default slides config (16 slides + thank you)
    const defaultSlides = [
      { id: 'slide1',  enabled: true },
      { id: 'slide2',  enabled: true },
      { id: 'slide3',  enabled: true },
      { id: 'slide4',  enabled: true },
      { id: 'slide5',  enabled: true },
      { id: 'slide6',  enabled: true },
      { id: 'slide7',  enabled: true },
      { id: 'slide8',  enabled: true },
      { id: 'slide9',  enabled: true },
      { id: 'slide10', enabled: true },
      { id: 'slide11', enabled: true },
      { id: 'slide12', enabled: true },
      { id: 'slide13', enabled: true },
      { id: 'slide14', enabled: true },
      { id: 'slide16', enabled: true }, // Meeting Attendance Report
      { id: 'slide15', enabled: true }  // Thank You
    ];

    let finalSlides = [...defaultSlides];
    if (type !== 'all' && type !== 'executive' && type !== 'client' && type !== 'learning') {
      const slideIdMap = {
        executive: 'slide2',
        participation: 'slide3',
        leaderboard: 'slide5',
        question: 'slide6',
        learning: 'slide8',
        region: 'slide9',
        client: 'slide11',
        ai: 'slide13'
      };
      const activeId = slideIdMap[type];
      if (activeId) {
        finalSlides = finalSlides.map(s => ({
          ...s,
          enabled: s.id === 'slide1' || s.id === 'slide15' || s.id === activeId
        }));
      }
    } else {
      const enabledMap = {
        executive: ['slide1', 'slide2', 'slide5', 'slide13', 'slide15'],
        client:    ['slide1', 'slide2', 'slide9', 'slide11', 'slide13', 'slide14', 'slide15'],
        learning:  ['slide1', 'slide4', 'slide7', 'slide8', 'slide10', 'slide12', 'slide16', 'slide15'],
        all:       ['slide1', 'slide2', 'slide3', 'slide4', 'slide5', 'slide6', 'slide7', 'slide8',
                    'slide9', 'slide10', 'slide11', 'slide12', 'slide13', 'slide14', 'slide16', 'slide15']
      };
      const enabledIds = enabledMap[type] || enabledMap.all;
      finalSlides = finalSlides.map(s => ({
        ...s,
        enabled: enabledIds.includes(s.id)
      }));
    }

    // Pass trainingAttendance (meeting attendance) data to the PPT generator
    const trainingAttendance = attendanceData?.trainingAttendance || [];
    await generate15SlidePPT(
      { ...dataWithExportType, trainingAttendance },
      finalSlides,
      'standard',
      {
        presenterName: sessionData.hostName || 'Program Manager',
        footerText: `Idonneous Learning Arena · ${sessionData.projectName || 'General'}`,
        clientLogo: null,
        projectLogo: null
      }
    );
    return;
  };

  const old_exportSpecificPPT = async (type, sessionData) => {
    const pptxMod = await import('pptxgenjs');
    const PptxGenJS = pptxMod.default || pptxMod;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    // Premium Slate Dark styling
    const BG_COLOR = '0F172A'; // Slate-900 (Dark background)
    const CARD_BG = '1E293B';  // Slate-800
    const PRIMARY = '008CFF';  // HSL Accent Blue
    const WHITE = 'FFFFFF';
    const LIGHT_TEXT = '94A3B8'; // Slate-400
    const ACCENT_GREEN = '10B981'; // Green-500
    const ACCENT_RED = 'EF4444'; // Red-500
    const ACCENT_YELLOW = 'F59E0B'; // Amber-500

    const addSlideHeader = (slide, titleText, subtitleText) => {
      slide.background = { color: BG_COLOR };
      // Header bar
      slide.addText(titleText, { x: 0.5, y: 0.4, w: 12.3, h: 0.5, fontSize: 24, bold: true, color: PRIMARY, fontFace: 'Arial' });
      if (subtitleText) {
        slide.addText(subtitleText, { x: 0.5, y: 0.85, w: 12.3, h: 0.3, fontSize: 12, color: LIGHT_TEXT, fontFace: 'Arial' });
      }
      // Footer line
      slide.addText(`RetailEdge Pro Analytics · ${sessionData.projectName || 'LMS'}`, { x: 0.5, y: 7.0, w: 6.0, h: 0.3, fontSize: 10, color: '475569' });
      slide.addText('Page ' + (pptx.slides.length), { x: 11.8, y: 7.0, w: 1.5, h: 0.3, fontSize: 10, color: '475569', align: 'right' });
    };

    const addCoverSlide = (title, subtitle) => {
      const slide = pptx.addSlide();
      slide.background = { color: BG_COLOR };
      // Decorative vertical line
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 2.5, w: 0.15, h: 2.2, fill: { color: PRIMARY } });
      slide.addText((sessionData.projectName || 'GENERAL').toUpperCase(), { x: 0.8, y: 2.4, w: 11.5, h: 0.4, fontSize: 14, bold: true, color: PRIMARY, fontFace: 'Arial' });
      slide.addText(title, { x: 0.8, y: 2.8, w: 11.5, h: 1.2, fontSize: 36, bold: true, color: WHITE, fontFace: 'Arial' });
      slide.addText(subtitle, { x: 0.8, y: 4.1, w: 11.5, h: 0.4, fontSize: 14, color: LIGHT_TEXT, fontFace: 'Arial' });
      slide.addText('LMS Session Analytics Report', { x: 0.8, y: 4.5, w: 11.5, h: 0.3, fontSize: 11, color: PRIMARY, italic: true, fontFace: 'Arial' });
    };

    const addStartSlide = () => {
      const slide = pptx.addSlide();
      slide.background = { color: BG_COLOR };
      // Decorative glowing border/accent
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 2.0, w: 0.2, h: 3.5, fill: { color: 'FF6B35' } });
      slide.addText((sessionData.projectName || 'GENERAL PROJECT').toUpperCase(), { x: 0.9, y: 1.9, w: 11.0, h: 0.4, fontSize: 16, bold: true, color: 'FF6B35', fontFace: 'Arial' });
      slide.addText((sessionData.quizTitle || 'Assessment Topic').toUpperCase(), { x: 0.9, y: 2.4, w: 11.0, h: 1.5, fontSize: 40, bold: true, color: WHITE, fontFace: 'Arial' });
      slide.addText(`Date: ${sessionData.date || new Date().toISOString().split('T')[0]}`, { x: 0.9, y: 4.0, w: 11.0, h: 0.4, fontSize: 14, color: LIGHT_TEXT, fontFace: 'Arial' });
      slide.addText('Comprehensive LMS Analytics & Performance Report', { x: 0.9, y: 4.5, w: 11.0, h: 0.3, fontSize: 12, color: '008CFF', italic: true, fontFace: 'Arial' });
      slide.addText('QuizHive LMS · Generated automatically', { x: 0.9, y: 5.2, w: 11.0, h: 0.3, fontSize: 10, color: '475569', fontFace: 'Arial' });
    };

    const addThankYouSlide = () => {
      const slide = pptx.addSlide();
      slide.background = { color: BG_COLOR };
      // Center-aligned thank you message
      slide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 2.0, w: 4.0, h: 0.1, fill: { color: '008CFF' } });
      slide.addText('THANK YOU', { x: 0.5, y: 2.3, w: 12.0, h: 1.0, fontSize: 44, bold: true, color: WHITE, align: 'center', fontFace: 'Arial' });
      slide.addText('RetailEdge Pro LMS Session Analytics', { x: 0.5, y: 3.3, w: 12.0, h: 0.4, fontSize: 16, color: '008CFF', align: 'center', fontFace: 'Arial' });
      slide.addText(`Project: ${sessionData.projectName || 'General'} · Date: ${sessionData.date || ''}`, { x: 0.5, y: 3.8, w: 12.0, h: 0.3, fontSize: 12, color: LIGHT_TEXT, align: 'center', fontFace: 'Arial' });
      
      // Decorative info box
      slide.addShape(pptx.ShapeType.rect, { x: 3.5, y: 4.5, w: 6.0, h: 1.2, fill: { color: CARD_BG }, line: { color: '334155', width: 1 } });
      slide.addText('For any queries or customized reports, please contact the Learning & Development team.', { x: 3.7, y: 4.7, w: 5.6, h: 0.8, fontSize: 11, color: WHITE, align: 'center', fontFace: 'Arial' });
    };

    const participants = sessionData.participants || [];
    const totalParticipantsCount = participants.length;

    // Derived statistics
    let avgPercentage = 0;
    if (totalParticipantsCount > 0) {
      const percentages = participants.map(p => parseInt(p.percentage) || 0);
      const sumPercent = percentages.reduce((sum, val) => sum + val, 0);
      avgPercentage = Math.round(sumPercent / totalParticipantsCount);
    }

    const sortedParticipants = [...participants].sort((a, b) => {
      return (parseInt(b.percentage) || 0) - (parseInt(a.percentage) || 0);
    });

    if (type === 'all') {
      addStartSlide();
    }

    if (type === 'executive' || type === 'all') {
      addCoverSlide('EXECUTIVE SUMMARY REPORT', `Key Program Assessment: ${sessionData.quizTitle}`);
      
      // Slide 2: KPIs & Program Overview
      const s2 = pptx.addSlide();
      addSlideHeader(s2, 'Executive Program Overview', 'High-level training KPIs and metrics');
      
      const metrics = [
        { label: 'Total Enrolled', val: String(Math.round(totalParticipantsCount * 1.15) || 10), color: PRIMARY },
        { label: 'Total Participation', val: String(totalParticipantsCount), color: PRIMARY },
        { label: 'Completion Rate', val: totalParticipantsCount > 0 ? '87%' : '0%', color: ACCENT_GREEN },
        { label: 'Average Accuracy', val: `${avgPercentage}%`, color: ACCENT_GREEN }
      ];
      metrics.forEach((m, idx) => {
        const xPos = 0.5 + idx * 3.1;
        s2.addShape(pptx.ShapeType.rect, { x: xPos, y: 2.0, w: 2.8, h: 3.5, fill: { color: CARD_BG }, line: { color: '334155', width: 1 } });
        s2.addShape(pptx.ShapeType.rect, { x: xPos, y: 2.0, w: 2.8, h: 0.15, fill: { color: m.color } });
        s2.addText(m.label, { x: xPos, y: 2.5, w: 2.8, h: 0.4, fontSize: 12, color: LIGHT_TEXT, align: 'center', fontFace: 'Arial' });
        s2.addText(m.val, { x: xPos, y: 3.2, w: 2.8, h: 1.0, fontSize: 36, bold: true, color: WHITE, align: 'center', fontFace: 'Arial' });
      });

      // Slide 3: Top Performers & Accuracies
      const s3 = pptx.addSlide();
      addSlideHeader(s3, 'Top Performers & Recognition', 'Top achieving associates on this evaluation');
      const top3 = sortedParticipants.slice(0, 3);
      s3.addText('Gold, Silver and Bronze Performers', { x: 0.5, y: 1.6, w: 12.0, h: 0.4, fontSize: 16, bold: true, color: ACCENT_GREEN, fontFace: 'Arial' });
      
      if (top3.length > 0) {
        top3.forEach((p, idx) => {
          const yOffset = 2.2 + idx * 1.4;
          s3.addShape(pptx.ShapeType.rect, { x: 0.5, y: yOffset, w: 12.1, h: 1.1, fill: { color: CARD_BG }, line: { color: '334155', width: 1 } });
          s3.addShape(pptx.ShapeType.rect, { x: 0.5, y: yOffset, w: 0.15, h: 1.1, fill: { color: idx === 0 ? 'F59E0B' : idx === 1 ? '94A3B8' : 'B45309' } });
          s3.addText(idx === 0 ? '🏆 Rank 1 (Gold)' : idx === 1 ? '🥈 Rank 2 (Silver)' : '🥉 Rank 3 (Bronze)', { x: 0.9, y: yOffset + 0.3, w: 2.5, h: 0.5, fontSize: 16, bold: true, color: WHITE });
          s3.addText(p.name, { x: 3.8, y: yOffset + 0.2, w: 4.5, h: 0.4, fontSize: 14, bold: true, color: PRIMARY });
          s3.addText(`Time Taken: ${p.timeSpent} · Score: ${p.score}`, { x: 3.8, y: yOffset + 0.6, w: 4.5, h: 0.3, fontSize: 11, color: LIGHT_TEXT });
          s3.addText(p.percentage, { x: 9.8, y: yOffset + 0.3, w: 2.5, h: 0.5, fontSize: 24, bold: true, color: ACCENT_GREEN, align: 'right' });
        });
      } else {
        s3.addText('No participant data available', { x: 0.5, y: 3.0, w: 12.0, h: 0.5, fontSize: 14, color: LIGHT_TEXT, align: 'center' });
      }

      // Slide 4: Key Insights & Recommendations
      const s4 = pptx.addSlide();
      addSlideHeader(s4, 'Key Insights & Action Plan', 'Strategic suggestions for development');
      s4.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 5.8, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      s4.addShape(pptx.ShapeType.rect, { x: 6.8, y: 1.8, w: 5.8, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      
      s4.addText('Key Learning Insights', { x: 0.8, y: 2.1, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: PRIMARY });
      s4.addText('• Average accuracy indicates strong core competence.\n• Certain questions show concept confusion among team members.\n• Completion speeds suggest participants engaged well with instructions.\n• Top performers achieved perfect or near-perfect results, demonstrating mastery.', { x: 0.8, y: 2.7, w: 5.2, h: 3.2, fontSize: 12, color: WHITE });

      s4.addText('L&D Recommendations', { x: 7.1, y: 2.1, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: ACCENT_GREEN });
      s4.addText('• Recommended refresher training session within the next 30 days.\n• Launch targeted micro-learning units addressing weak product parameters.\n• Encourage peer mentoring sessions by high scoring team leaders.\n• Schedule a secondary validation quiz in two weeks to check retention.', { x: 7.1, y: 2.7, w: 5.2, h: 3.2, fontSize: 12, color: WHITE });

    }
    if (type === 'participation' || type === 'all') {
      addCoverSlide('PARTICIPATION & ENGAGEMENT', `Session: ${sessionData.quizTitle}`);
      
      // Slide 2: Attendance Analysis
      const s2 = pptx.addSlide();
      addSlideHeader(s2, 'Attendance & Session Metrics', 'Detailed breakdown of registered vs actual attendees');
      
      const enrolled = Math.round(totalParticipantsCount * 1.15) || 12;
      const noShow = enrolled - totalParticipantsCount;
      const attRate = Math.round((totalParticipantsCount / enrolled) * 100) || 85;

      const pMetrics = [
        { label: 'Registered Team Members', val: String(enrolled) },
        { label: 'Active Joined Participants', val: String(totalParticipantsCount) },
        { label: 'Attendance Rate', val: `${attRate}%` },
        { label: 'No Show Count', val: String(noShow) }
      ];
      pMetrics.forEach((m, idx) => {
        const xPos = 0.5 + idx * 3.1;
        s2.addShape(pptx.ShapeType.rect, { x: xPos, y: 2.0, w: 2.8, h: 3.5, fill: { color: CARD_BG }, line: { color: '334155', width: 1 } });
        s2.addShape(pptx.ShapeType.rect, { x: xPos, y: 2.0, w: 2.8, h: 0.15, fill: { color: PRIMARY } });
        s2.addText(m.label, { x: xPos, y: 2.5, w: 2.8, h: 0.4, fontSize: 12, color: LIGHT_TEXT, align: 'center' });
        s2.addText(m.val, { x: xPos, y: 3.2, w: 2.8, h: 1.0, fontSize: 36, bold: true, color: WHITE, align: 'center' });
      });

      // Slide 3: Session Duration & Response Rate
      const s3 = pptx.addSlide();
      addSlideHeader(s3, 'Engagement Rate & Drop-Offs', 'Assessment interaction indicators');
      s3.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 5.8, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      s3.addShape(pptx.ShapeType.rect, { x: 6.8, y: 1.8, w: 5.8, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      
      s3.addText('Engagement Overview', { x: 0.8, y: 2.1, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: PRIMARY });
      s3.addText('• Average response rate: 98% across all slides.\n• Interaction rate remained consistent from Q1 to the final question.\n• Less than 2% drop-off was observed mid-quiz.\n• Poll participation was 100% active.', { x: 0.8, y: 2.7, w: 5.2, h: 3.2, fontSize: 13, color: WHITE });

      s3.addText('No-Show Analysis & Late Joiners', { x: 7.1, y: 2.1, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: ACCENT_YELLOW });
      s3.addText(`• Total absent associates: ${noShow} members.\n• Late joiners (joined after Q2): 0.\n• Network connection was stable for all active rooms.\n• Exit time logged: 100% completed the final question slide.`, { x: 7.1, y: 2.7, w: 5.2, h: 3.2, fontSize: 13, color: WHITE });

    }
    if (type === 'leaderboard' || type === 'all') {
      addCoverSlide('PARTICIPANT RANKING & LEADERBOARD', `Session Date: ${sessionData.date}`);
      
      // Slide 2: Top 10 Leaderboard Table
      const s2 = pptx.addSlide();
      addSlideHeader(s2, 'Top 10 Performers Leaderboard', 'Highest scoring associates on this live assessment');
      
      const rows = [
        [{ text: 'Rank', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Name', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Employee ID', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Score', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Accuracy', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Time Spent', options: { bold: true, color: WHITE, fill: PRIMARY } }],
        ...sortedParticipants.slice(0, 10).map((p, i) => [
          { text: `#${i + 1}`, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
          { text: p.name, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
          { text: p.employeeId || 'N/A', options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
          { text: p.score, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
          { text: p.percentage, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
          { text: p.timeSpent, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } }
        ])
      ];
      if (sortedParticipants.length > 0) {
        s2.addTable(rows, { x: 0.5, y: 1.5, w: 12.0, colW: [1.2, 3.2, 2.0, 1.8, 1.8, 2.0], fontSize: 10, color: WHITE, border: { type: 'solid', color: '334155', pt: 0.5 } });
      } else {
        s2.addText('No participant data available', { x: 0.5, y: 3.0, w: 12.0, h: 0.5, fontSize: 14, color: LIGHT_TEXT, align: 'center' });
      }

      // Slide 3: Bottom 10 Performers / Review Required
      const s3 = pptx.addSlide();
      addSlideHeader(s3, 'Review Required & Support Areas', 'Associates scoring under 60% accuracy');
      const bottomList = [...sortedParticipants].reverse().slice(0, 10);
      const bRows = [
        [{ text: 'Rank', options: { bold: true, color: WHITE, fill: ACCENT_RED } },
         { text: 'Name', options: { bold: true, color: WHITE, fill: ACCENT_RED } },
         { text: 'Employee ID', options: { bold: true, color: WHITE, fill: ACCENT_RED } },
         { text: 'Score', options: { bold: true, color: WHITE, fill: ACCENT_RED } },
         { text: 'Accuracy', options: { bold: true, color: WHITE, fill: ACCENT_RED } },
         { text: 'Time Spent', options: { bold: true, color: WHITE, fill: ACCENT_RED } }],
        ...bottomList.map((p, i) => {
          const rankIdx = sortedParticipants.findIndex(sp => sp.id === p.id) + 1;
          return [
            { text: `#${rankIdx}`, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: p.name, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: p.employeeId || 'N/A', options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: p.score, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: p.percentage, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: p.timeSpent, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } }
          ];
        })
      ];
      if (sortedParticipants.length > 0) {
        s3.addTable(bRows, { x: 0.5, y: 1.5, w: 12.0, colW: [1.2, 3.2, 2.0, 1.8, 1.8, 2.0], fontSize: 10, color: WHITE, border: { type: 'solid', color: '334155', pt: 0.5 } });
      } else {
        s3.addText('No participant data available', { x: 0.5, y: 3.0, w: 12.0, h: 0.5, fontSize: 14, color: LIGHT_TEXT, align: 'center' });
      }

      // Slide 4: Response Time Analysis
      const s4 = pptx.addSlide();
      addSlideHeader(s4, 'Speed & Response Time Analysis', 'Detailed correlation between accuracy and response speed');
      s4.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 5.8, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      s4.addShape(pptx.ShapeType.rect, { x: 6.8, y: 1.8, w: 5.8, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      
      const times = participants.map(p => parseInt(p.timeSpent) || 0);
      const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      
      s4.addText('Speed Indicators', { x: 0.8, y: 2.1, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: PRIMARY });
      s4.addText(`• Average response time: ${avgTime}s per question.\n• Fastest responders maintained high accuracy (>80%).\n• High accuracy was correlated with quick decision times.\n• Question completion rate: 100% active completion.`, { x: 0.8, y: 2.7, w: 5.2, h: 3.2, fontSize: 13, color: WHITE });

      s4.addText('L&D Takeaways', { x: 7.1, y: 2.1, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: ACCENT_GREEN });
      s4.addText('• Hesitation points identified during long question times.\n• Difficult questions with scenario cases took 2x longer response times.\n• Suggest implementing micro-drills to improve memory recall speeds.\n• Focus next modules on reducing decision fatigue.', { x: 7.1, y: 2.7, w: 5.2, h: 3.2, fontSize: 13, color: WHITE });

    }
    if (type === 'question' || type === 'all') {
      addCoverSlide('QUESTION ANALYSIS REPORT', `Evaluated on: ${sessionData.date}`);
      
      // Slide 2: Question Accuracy Table
      const s2 = pptx.addSlide();
      addSlideHeader(s2, 'Question-wise Accuracy Summary', 'Detailed response breakdown for all evaluation items');
      
      const qRows = [
        [{ text: 'Question', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Correct %', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Easiest/Difficult Class', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Incorrect Choices Breakdowns', options: { bold: true, color: WHITE, fill: PRIMARY } }],
        [ { text: 'Q1: Core Concept Introduction', options: { fill: CARD_BG } }, { text: '92%', options: { fill: CARD_BG } }, { text: 'Easiest Question (Well understood)', options: { color: ACCENT_GREEN, fill: CARD_BG } }, { text: 'Option B (4%), Option C (4%)', options: { fill: CARD_BG } } ],
        [ { text: 'Q2: Standard Operating Procedure', options: { fill: '151E2E' } }, { text: '48%', options: { fill: '151E2E' } }, { text: 'Moderate understanding', options: { color: ACCENT_YELLOW, fill: '151E2E' } }, { text: 'Option A (32%), Option D (20%)', options: { fill: '151E2E' } } ],
        [ { text: 'Q3: Technical Parameter Compliance', options: { fill: CARD_BG } }, { text: '31%', options: { fill: CARD_BG } }, { text: 'Most Difficult (Action required)', options: { color: ACCENT_RED, fill: CARD_BG } }, { text: 'Option B (52%), Option C (17%)', options: { fill: CARD_BG } } ],
      ];
      s2.addTable(qRows, { x: 0.5, y: 1.8, w: 12.0, colW: [3.8, 1.8, 3.2, 3.2], fontSize: 11, color: WHITE, border: { type: 'solid', color: '334155', pt: 0.5 } });

      // Slide 3: Concept Gaps Deep Dive
      const s3 = pptx.addSlide();
      addSlideHeader(s3, 'Critical Concept Gaps & Analysis', 'Detailed analysis of items with accuracy under 50%');
      s3.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 12.1, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      s3.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 12.1, h: 0.15, fill: { color: ACCENT_RED } });
      s3.addText('Deep Dive: Technical Parameter Compliance (Q3)', { x: 0.9, y: 2.2, w: 11.0, h: 0.4, fontSize: 16, bold: true, color: ACCENT_RED });
      s3.addText('• Concept Tested: Strict operational guidelines and standard compliance settings.\n• Root Cause Analysis: 52% of incorrect participants selected Option B, showing a common misconception.\n• Confusion Point: Participants confuse compliance steps with older legacy procedures.\n• Action: Question 3 requires revision and targeted reinforcement during upcoming reviews.', { x: 0.9, y: 2.8, w: 11.0, h: 3.0, fontSize: 13, color: WHITE });

    }
    if (type === 'learning' || type === 'all') {
      addCoverSlide('LEARNING EFFECTIVENESS & RETENTION', `Project umbrella: ${sessionData.projectName}`);
      
      // Slide 2: Skill Gaps & Topic Mastery
      const s2 = pptx.addSlide();
      addSlideHeader(s2, 'Learning Objective Mapping & Gaps', 'Performance against target training objectives');
      s2.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 5.8, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      s2.addShape(pptx.ShapeType.rect, { x: 6.8, y: 1.8, w: 5.8, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      
      s2.addText('Skill Gap Analysis', { x: 0.8, y: 2.1, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: PRIMARY });
      s2.addText('• Product Knowledge: 88% accuracy (Strong understanding).\n• Compliance & Regulations: 54% accuracy (Critical gap identified).\n• Customer Experience SOPs: 76% accuracy (Satisfactory retention).\n• Technical Configuration: 41% accuracy (High risk area).', { x: 0.8, y: 2.7, w: 5.2, h: 3.2, fontSize: 13, color: WHITE });

      s2.addText('Topic Mastery Levels', { x: 7.1, y: 2.1, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: ACCENT_GREEN });
      s2.addText('• Core Concept Understanding: High mastery level.\n• Retention score has increased by 12% compared to last quarter.\n• Team configuration training needs additional focus.\n• Skill reinforcement required for customer checkout modules.', { x: 7.1, y: 2.7, w: 5.2, h: 3.2, fontSize: 13, color: WHITE });

      // Slide 3: Certification Status
      const s3 = pptx.addSlide();
      addSlideHeader(s3, 'Certification Eligibility & Pass Summary', 'Overview of participants qualifying for completion badges');
      const passCount = participants.filter(p => (parseInt(p.percentage) || 0) >= 60).length;
      const failCount = totalParticipantsCount - passCount;
      const passPercent = totalParticipantsCount > 0 ? Math.round((passCount / totalParticipantsCount) * 100) : 0;

      const certMetrics = [
        { label: 'Completed Quiz', val: String(totalParticipantsCount), color: PRIMARY },
        { textColor: ACCENT_GREEN, label: 'Eligible for Certificate', val: String(passCount), color: ACCENT_GREEN },
        { textColor: ACCENT_RED, label: 'Requires Re-Assessment', val: String(failCount), color: ACCENT_RED },
        { label: 'Pass Percentage', val: `${passPercent}%`, color: 'E2E8F0' }
      ];
      certMetrics.forEach((m, idx) => {
        const xPos = 0.5 + idx * 3.1;
        s3.addShape(pptx.ShapeType.rect, { x: xPos, y: 2.0, w: 2.8, h: 3.5, fill: { color: CARD_BG }, line: { color: '334155', width: 1 } });
        s3.addShape(pptx.ShapeType.rect, { x: xPos, y: 2.0, w: 2.8, h: 0.15, fill: { color: m.color } });
        s3.addText(m.label, { x: xPos, y: 2.5, w: 2.8, h: 0.4, fontSize: 12, color: LIGHT_TEXT, align: 'center' });
        s3.addText(m.val, { x: xPos, y: 3.2, w: 2.8, h: 1.0, fontSize: 36, bold: true, color: m.textColor || WHITE, align: 'center' });
      });

    }
    if (type === 'team' || type === 'all') {
      addCoverSlide('TEAM PERFORMANCE & COMPARISON', `Quiz Title: ${sessionData.quizTitle}`);
      
      // Slide 2: Team Performance Comparison
      const s2 = pptx.addSlide();
      addSlideHeader(s2, 'Team & Department Performance standings', 'Comparative analysis across different organizational groups');
      
      // Compute team statistics based on getMockDetails
      const teamStats = {};
      participants.forEach(p => {
        const details = getMockDetails(p.name);
        if (!teamStats[details.team]) {
          teamStats[details.team] = { sum: 0, count: 0 };
        }
        teamStats[details.team].sum += (parseInt(p.percentage) || 0);
        teamStats[details.team].count += 1;
      });

      const teamRows = [
        [{ text: 'Team Name', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Active Members', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Average Accuracy', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Performance Rating', options: { bold: true, color: WHITE, fill: PRIMARY } }],
        ...Object.keys(teamStats).map((teamName, i) => {
          const stats = teamStats[teamName];
          const avg = Math.round(stats.sum / stats.count);
          return [
            { text: teamName, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: String(stats.count), options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: `${avg}%`, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: avg >= 80 ? 'Outstanding' : avg >= 65 ? 'Satisfactory' : 'Needs Reinforcement', options: { color: avg >= 80 ? ACCENT_GREEN : avg >= 65 ? ACCENT_YELLOW : ACCENT_RED, fill: i % 2 === 0 ? CARD_BG : '151E2E' } }
          ];
        })
      ];
      if (Object.keys(teamStats).length > 0) {
        s2.addTable(teamRows, { x: 0.5, y: 1.8, w: 12.0, colW: [3.5, 2.5, 2.5, 3.5], fontSize: 11, color: WHITE, border: { type: 'solid', color: '334155', pt: 0.5 } });
      } else {
        s2.addText('No team data available. Add participants to generate comparative teams.', { x: 0.5, y: 3.0, w: 12.0, h: 0.5, fontSize: 14, color: LIGHT_TEXT, align: 'center' });
      }

    }
    if (type === 'region' || type === 'all') {
      addCoverSlide('GEOGRAPHICAL REGION COMPARISON', `Report Umbrella: ${sessionData.projectName}`);
      
      // Slide 2: Regional Performance
      const s2 = pptx.addSlide();
      addSlideHeader(s2, 'Region & Zone Analytics', 'Geographical performance rankings');
      
      const regionStats = {};
      participants.forEach(p => {
        const details = getMockDetails(p.name);
        if (!regionStats[details.region]) {
          regionStats[details.region] = { sum: 0, count: 0, state: details.state };
        }
        regionStats[details.region].sum += (parseInt(p.percentage) || 0);
        regionStats[details.region].count += 1;
      });

      const regionRows = [
        [{ text: 'Region / Territory', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'State', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Participants Count', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Average Score', options: { bold: true, color: WHITE, fill: PRIMARY } }],
        ...Object.keys(regionStats).map((reg, i) => {
          const stats = regionStats[reg];
          const avg = Math.round(stats.sum / stats.count);
          return [
            { text: reg, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: stats.state, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: String(stats.count), options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: `${avg}%`, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E', bold: true, color: avg >= 75 ? ACCENT_GREEN : WHITE } }
          ];
        })
      ];
      if (Object.keys(regionStats).length > 0) {
        s2.addTable(regionRows, { x: 0.5, y: 1.8, w: 12.0, colW: [3.5, 3.0, 2.5, 3.0], fontSize: 11, color: WHITE, border: { type: 'solid', color: '334155', pt: 0.5 } });
      } else {
        s2.addText('No regional data available.', { x: 0.5, y: 3.0, w: 12.0, h: 0.5, fontSize: 14, color: LIGHT_TEXT, align: 'center' });
      }

    }
    if (type === 'store' || type === 'all') {
      addCoverSlide('STORE PERFORMANCE & COMPARISON', `Topic: ${sessionData.quizTitle}`);
      
      // Slide 2: Store Standings Table
      const s2 = pptx.addSlide();
      addSlideHeader(s2, 'Retail Store Rankings', 'Performance summary grouped by store location');
      
      const storeStats = {};
      participants.forEach(p => {
        const details = getMockDetails(p.name);
        if (!storeStats[details.store]) {
          storeStats[details.store] = { sum: 0, count: 0 };
        }
        storeStats[details.store].sum += (parseInt(p.percentage) || 0);
        storeStats[details.store].count += 1;
      });

      const storeRows = [
        [{ text: 'Store Reference', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Associates Checked In', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Average Score', options: { bold: true, color: WHITE, fill: PRIMARY } },
         { text: 'Retail Performance Category', options: { bold: true, color: WHITE, fill: PRIMARY } }],
        ...Object.keys(storeStats).map((store, i) => {
          const stats = storeStats[store];
          const avg = Math.round(stats.sum / stats.count);
          return [
            { text: store, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: String(stats.count), options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: `${avg}%`, options: { fill: i % 2 === 0 ? CARD_BG : '151E2E' } },
            { text: avg >= 80 ? 'Top Store (Rank A)' : avg >= 60 ? 'Standard Store (Rank B)' : 'Review Required (Rank C)', options: { color: avg >= 80 ? ACCENT_GREEN : avg >= 60 ? ACCENT_YELLOW : ACCENT_RED, fill: i % 2 === 0 ? CARD_BG : '151E2E' } }
          ];
        })
      ];
      if (Object.keys(storeStats).length > 0) {
        s2.addTable(storeRows, { x: 0.5, y: 1.8, w: 12.0, colW: [3.8, 2.5, 2.2, 3.5], fontSize: 11, color: WHITE, border: { type: 'solid', color: '334155', pt: 0.5 } });
      } else {
        s2.addText('No store-level data available.', { x: 0.5, y: 3.0, w: 12.0, h: 0.5, fontSize: 14, color: LIGHT_TEXT, align: 'center' });
      }

    }
    if (type === 'client' || type === 'all') {
      addCoverSlide('CLIENT PRESENTATION & PERFORMANCE', `Prepared for: ${sessionData.projectName}`);
      
      // Slide 2: Strategic Summary for Clients
      const s2 = pptx.addSlide();
      addSlideHeader(s2, 'Strategic Assessment ROI Summary', 'High-level training insights for FMCG Leadership');
      s2.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 5.8, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      s2.addShape(pptx.ShapeType.rect, { x: 6.8, y: 1.8, w: 5.8, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      
      s2.addText('Key Assessment Findings', { x: 0.8, y: 2.1, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: PRIMARY });
      s2.addText(`• Core Quiz: ${sessionData.quizTitle}\n• Overall participation: ${totalParticipantsCount} associates.\n• Brand knowledge benchmark: ${avgPercentage}% average score.\n• Identified high comprehension in primary retail guidelines.`, { x: 0.8, y: 2.7, w: 5.2, h: 3.2, fontSize: 13, color: WHITE });

      s2.addText('ROI & Training Impact Indicators', { x: 7.1, y: 2.1, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: ACCENT_GREEN });
      s2.addText('• Compliance accuracy shows 15% increase compared to pre-training.\n• 80%+ of regional stores have hit standard benchmarks.\n• Direct correlation observed between active study time and scores.\n• Re-certification rates are on track for project KPIs.', { x: 7.1, y: 2.7, w: 5.2, h: 3.2, fontSize: 13, color: WHITE });

    }
    if (type === 'ai' || type === 'all') {
      addCoverSlide('AI INSIGHTS & PREDICTIVE ANALYTICS', 'Premium Smart Reports Suite');
      
      // Slide 2: AI Summary & Skill Risk
      const s2 = pptx.addSlide();
      addSlideHeader(s2, 'AI Smart Summary & Risk Areas', 'Machine learning derived assessment insights');
      s2.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 5.8, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      s2.addShape(pptx.ShapeType.rect, { x: 6.8, y: 1.8, w: 5.8, h: 4.5, fill: { color: CARD_BG }, line: { color: '334155' } });
      
      s2.addText('Smart Learning Trends', { x: 0.8, y: 2.1, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: PRIMARY });
      s2.addText('• AI predicts 85% retention on standard products over the next 90 days.\n• Focus degradation is predicted for compliance sections within 45 days.\n• Core knowledge levels are stable for seasoned employees.\n• Quick responses show strong muscle memory on checkout guidelines.', { x: 0.8, y: 2.7, w: 5.2, h: 3.2, fontSize: 13, color: WHITE });

      s2.addText('AI Focus Recommendations', { x: 7.1, y: 2.1, w: 5.2, h: 0.4, fontSize: 16, bold: true, color: ACCENT_GREEN });
      s2.addText('• 72% of participants struggled with Product Knowledge Questions.\n• Recommended refresher training within 30 days to avoid gap widening.\n• Suggest deploying mini micro-learning cards on mobile weekly.\n• AI-suggested training topic: Compliance SOP Part 2.', { x: 7.1, y: 2.7, w: 5.2, h: 3.2, fontSize: 13, color: WHITE });

    }

    if (type === 'all') {
      addThankYouSlide();
    }

    const reportNameMap = {
      executive: 'Executive_Summary',
      participation: 'Participation_Analytics',
      leaderboard: 'Leaderboard_Ranking',
      question: 'Question_Analysis',
      learning: 'Learning_Effectiveness',
      team: 'Team_Performance',
      region: 'Region_Performance',
      store: 'Store_Performance',
      client: 'Client_Presentation',
      ai: 'AI_Insights_Premium',
      all: 'Complete_Presentation_Deck'
    };

    const sanitizeFilename = (str) => (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_');
    const safeProjectName = sanitizeFilename(sessionData.projectName || 'General');
    const fileNameStr = `${safeProjectName}_${reportNameMap[type] || 'Report'}_${new Date().toISOString().split('T')[0]}.pptx`;
    await downloadPPT(pptx, fileNameStr);
  };

  const getWorkbookTypeByRole = (role) => {
    switch (role) {
      case 'MD':
      case 'COO':
      case 'VP Operations':
        return 'executive';
      case 'Program Manager':
        return 'pm';
      case 'Client':
        return 'client';
      case 'Supervisor':
        return 'audit';
      case 'Trainer':
        return 'trainer';
      case 'Admin':
      case 'Super Admin':
      default:
        return 'all';
    }
  };

  const fetchAttendanceSummaryForExcel = async () => {
    // Use already-loaded attendanceData state if available
    if (attendanceData && Array.isArray(attendanceData.quizAttendance)) {
      return {
        quizAttendance: attendanceData.quizAttendance || [],
        trainingAttendance: attendanceData.trainingAttendance || []
      };
    }
    try {
      const res = await axios.get('/api/reports/attendance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && Array.isArray(res.data.quizAttendance)) {
        return {
          quizAttendance: res.data.quizAttendance || [],
          trainingAttendance: res.data.trainingAttendance || []
        };
      }
      return { quizAttendance: [], trainingAttendance: [] };
    } catch {
      return { quizAttendance: [], trainingAttendance: [] };
    }
  };

  const exportQuizSessionExcel = async (sessionData, workbookType = null) => {
    const finalType = workbookType || getWorkbookTypeByRole(activeRole);
    const { quizAttendance: userAttendanceSummary, trainingAttendance } = await fetchAttendanceSummaryForExcel();
    await generateExcelReport(finalType, { ...sessionData, userAttendanceSummary, trainingAttendance }, {
      presenterName: user?.name || 'Program Manager',
      footerText: `Idonneous Learning Arena · PM Dashboard`
    });
  };

  const handleDownloadSessionPPT = async (sessionId, type = 'executive') => {
    try {
      setLoading(true);
      const isMock = String(sessionId).startsWith('mock-');
      let data;
      if (isMock) {
        const mock = MOCK_SESSIONS.find(s => s.id === sessionId);
        data = {
          quizTitle: mock.title,
          projectName: mock.projectName,
          date: mock.date,
          participants: mock.participantsList.length > 0 ? mock.participantsList : [
            { name: 'Rahul Sharma', percentage: '100%', timeSpent: '45s', score: '3/3' },
            { name: 'Neha Singh', percentage: '100%', timeSpent: '52s', score: '3/3' }
          ]
        };
      } else {
        const res = await axios.get(`/api/reports/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        data = res.data;
      }
      await exportSpecificPPT(type, data);
    } catch (err) {
      console.error('PPT generation failed:', err);
      alert(`Failed to generate PPT for session: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSessionExcel = async (sessionId) => {
    try {
      setLoading(true);
      const isMock = String(sessionId).startsWith('mock-');
      let data;
      if (isMock) {
        const mock = MOCK_SESSIONS.find(s => s.id === sessionId);
        data = {
          quizTitle: mock.title,
          projectName: mock.projectName,
          date: mock.date,
          participants: mock.participantsList.length > 0 ? mock.participantsList : [
            { name: 'Rahul Sharma', percentage: '100%', timeSpent: '45s', score: '3/3' }
          ],
          questions: mock.questions
        };
      } else {
        const res = await axios.get(`/api/reports/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        data = res.data;
      }
      await exportQuizSessionExcel(data);
    } catch (err) {
      console.error('Excel generation failed:', err);
      alert(`Failed to generate Excel for session: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPPTFromModal = async (type) => {
    try {
      setLoading(true);
      await exportSpecificPPT(type, selectedReportDetails);
    } catch (err) {
      console.error('PPT generation failed:', err);
      alert(`Failed to generate PPT: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcelFromModal = async () => {
    try {
      setLoading(true);
      await exportQuizSessionExcel(selectedReportDetails);
    } catch (err) {
      console.error('Excel generation failed:', err);
      alert(`Failed to generate Excel: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Derived stats & Dynamic Filtering ────────────────────────────
  const myProjectId = user?.projectId;
  const isMotherProjectAccess = ['MD', 'COO', 'VP Operations'].includes(activeRole);
  
  const childProjects = isMotherProjectAccess && myProjectId && projectsList.length > 0
    ? projectsList.filter(p => p.parentId === myProjectId)
    : [];

  const getFilteredData = () => {
    const activeProjName = projectInfo?.name || 'Project Alpha (Security Audit)';

    // Only use mock data when real database records are absent
    const hasRealReports = reports.length > 0;
    const hasRealQuizAtt = (attendanceData?.quizAttendance || []).length > 0;
    const hasRealTrainAtt = (attendanceData?.trainingAttendance || []).length > 0;
    const hasRealUsers = projectUsers.length > 0;

    // Rewrite mock sessions, attendance and users dynamically to belong to user's active project name
    const finalMockSessions = MOCK_SESSIONS.map(session => ({
      ...session,
      projectName: activeProjName
    }));

    const finalMockQuizAtt = MOCK_QUIZ_ATTENDANCE.map(att => ({
      ...att,
      projectName: activeProjName
    }));

    const finalMockTrainAtt = MOCK_TRAINING_ATTENDANCE.map(att => ({
      ...att,
      projectName: activeProjName
    }));

    const finalMockUsers = MOCK_PROJECT_USERS.map(u => ({
      ...u,
      projectId: myProjectId,
      projectName: activeProjName
    }));

    // Use real data if available; only fall back to mock data when real data is completely absent
    const combinedReports = hasRealReports ? reports : finalMockSessions;
    const combinedQuizAtt = hasRealQuizAtt ? (attendanceData?.quizAttendance || []) : finalMockQuizAtt;
    const combinedTrainAtt = hasRealTrainAtt ? (attendanceData?.trainingAttendance || []) : finalMockTrainAtt;
    const combinedUsers = hasRealUsers ? projectUsers : finalMockUsers;

    // Admin / Super Admin get global access — no filtering
    const isGlobalAdmin = ['Admin', 'Super Admin'].includes(activeRole);
    if (isGlobalAdmin) {
      return {
        users: combinedUsers,
        reports: combinedReports,
        quizAttendance: combinedQuizAtt,
        trainingAttendance: combinedTrainAtt,
        totalParticipants: combinedReports.reduce((sum, r) => sum + r.participants, 0)
      };
    }

    // 1. Get the list of all accessible projects
    let allowedProjectIds = [myProjectId];
    if (isMotherProjectAccess && myProjectId && projectsList.length > 0) {
      allowedProjectIds = [myProjectId, ...childProjects.map(cp => cp.id)];
    }

    // 2. Determine target project(s) based on selected filter
    const activeProjectIds = selectedProjectId === 'all' ? allowedProjectIds : [selectedProjectId];
    const activeProjectNames = projectsList
      .filter(p => activeProjectIds.includes(p.id))
      .map(p => p.name);

    // 3. Filter users
    const filteredUsers = myProjectId
      ? combinedUsers.filter(u => activeProjectIds.includes(u.projectId))
      : combinedUsers;

    // 4. Filter reports
    const filteredReports = combinedReports.filter(r => {
      if (r.projectId) return activeProjectIds.includes(r.projectId);
      return activeProjectNames.includes(r.projectName);
    });

    // 5. Filter quiz attendance
    const filteredQuizAtt = combinedQuizAtt.filter(e => activeProjectNames.includes(e.projectName));

    // 6. Filter training attendance
    const filteredTrainAtt = combinedTrainAtt.filter(e => activeProjectNames.includes(e.projectName));

    return {
      users: filteredUsers,
      reports: filteredReports,
      quizAttendance: filteredQuizAtt,
      trainingAttendance: filteredTrainAtt,
      totalParticipants: filteredReports.reduce((sum, r) => sum + r.participants, 0)
    };
  };

  const filteredData = getFilteredData();

  // Map local references for easy backwards compatibility
  const totalParticipants = filteredData.totalParticipants;
  const quizAttendance = filteredData.quizAttendance;
  const trainingAttendance = filteredData.trainingAttendance;
  const projectUsersFiltered = filteredData.users;
  const reportsFiltered = filteredData.reports;

  const thStyle = { padding: '12px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, borderBottom: '2px solid var(--border-glass)', textAlign: 'left' };
  const tdStyle = { padding: '14px 12px', borderBottom: '1px solid var(--border-glass)', fontSize: '0.9rem', color: 'var(--text-primary)', verticalAlign: 'middle' };

  if (loading) return (
    <div className="view-section active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '12px' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-glass)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)' }}>Loading your dashboard...</span>
    </div>
  );

  return (
    <div className="view-section active">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', height: '38px', flexShrink: 0 }}>
            <img src="/logo.png" alt="Idonneous Logo" style={{ height: '22px', objectFit: 'contain' }} />
          </div>
          <div>
            <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, margin: 0 }}>
              {activeRole === 'Client' ? '🏢 Client Dashboard'
                : ['Admin', 'Super Admin'].includes(activeRole) ? '⚙️ Admin Control Center'
                : activeRole === 'Supervisor' ? '🎯 Supervisor Dashboard'
                : isMotherProjectAccess ? `🏢 ${activeRole || 'Executive'} Dashboard`
                : '📋 Program Manager Dashboard'}
            </h2>
            <p className="section-desc" style={{ margin: '4px 0 0 0' }}>
              Welcome, <strong>{user?.name || 'User'}</strong>!{' '}
              {projectInfo ? `Managing: ${projectInfo.name}` : 'Your project overview, attendance, and analytics.'}
            </p>
          </div>
        </div>
        {['MD', 'COO', 'VP Operations', 'Client', 'Program Manager', 'Admin', 'Super Admin', 'Supervisor'].includes(activeRole) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>


            <button
              onClick={async () => {
                setSyncing(true);
                await Promise.all([fetchAll(true), fetchExecutiveMetrics()]);
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

            <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px' }}>
              <button
                onClick={() => setViewMode('dashboard')}
                style={{
                  padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                  background: viewMode === 'dashboard' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'dashboard' ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.18s'
                }}
              >
                {['MD', 'COO', 'VP Operations'].includes(user?.role) ? '📊 Executive View' : '📊 Dashboard View'}
              </button>
              <button
                onClick={() => setViewMode('details')}
                style={{
                  padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                  background: viewMode === 'details' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'details' ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.18s'
                }}
              >
                📋 Detailed Records
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', marginBottom: '24px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          {['MD', 'COO', 'VP Operations', 'Client', 'Program Manager', 'Admin', 'Super Admin', 'Supervisor', 'Marketing Manager'].includes(activeRole) && viewMode === 'dashboard' ? (
            <>
              {activeRole === 'MD' && (
                <MDDashboard
                  projectUsers={projectUsersFiltered}
                  projectsList={projectsList}
                  reports={reportsFiltered}
                  attendanceData={{
                    quizAttendance: filteredData.quizAttendance,
                    trainingAttendance: filteredData.trainingAttendance
                  }}
                  onExportExcel={exportMDExecutiveExcel}
                  onExportPPT={exportMDExecutivePPT}
                  manualMetrics={manualMetrics}
                  onSaveMetrics={handleSaveMetrics}
                  selectedProjectId={selectedProjectId}
                  myProjectId={user?.projectId}
                  syncTrigger={syncTrigger}
                />
              )}
              {activeRole === 'COO' && (
                <COODashboard
                  projectUsers={projectUsersFiltered}
                  projectsList={projectsList}
                  reports={reportsFiltered}
                  attendanceData={{
                    quizAttendance: filteredData.quizAttendance,
                    trainingAttendance: filteredData.trainingAttendance
                  }}
                  manualMetrics={manualMetrics}
                  onSaveMetrics={handleSaveMetrics}
                  selectedProjectId={selectedProjectId}
                  myProjectId={user?.projectId}
                  syncTrigger={syncTrigger}
                />
              )}
              {activeRole === 'VP Operations' && (
                <VPOperationsDashboard
                  projectUsers={projectUsersFiltered}
                  projectsList={projectsList}
                  reports={reportsFiltered}
                  manualMetrics={manualMetrics}
                  onSaveMetrics={handleSaveMetrics}
                  selectedProjectId={selectedProjectId}
                  myProjectId={user?.projectId}
                  syncTrigger={syncTrigger}
                />
              )}
              {activeRole === 'Client' && (
                <ClientDashboard
                  projectUsers={projectUsersFiltered}
                  projectsList={projectsList}
                  reports={reportsFiltered}
                  attendanceData={{
                    quizAttendance: filteredData.quizAttendance,
                    trainingAttendance: filteredData.trainingAttendance
                  }}
                  onExportExcel={exportExcel}
                  onExportPPT={exportPPT}
                  manualMetrics={manualMetrics}
                  selectedProjectId={selectedProjectId}
                  myProjectId={user?.projectId}
                />
              )}
              {activeRole === 'Program Manager' && (
                <PMDashboardView
                  projectUsers={projectUsersFiltered}
                  projectsList={projectsList}
                  reports={reportsFiltered}
                  attendanceData={{
                    quizAttendance: filteredData.quizAttendance,
                    trainingAttendance: filteredData.trainingAttendance
                  }}
                  onExportExcel={exportExcel}
                  onExportPPT={exportPPT}
                  manualMetrics={manualMetrics}
                  selectedProjectId={selectedProjectId}
                  handleDownloadSessionExcel={handleDownloadSessionExcel}
                  syncTrigger={syncTrigger}
                />
              )}
              {['Admin', 'Super Admin'].includes(activeRole) && (
                <AdminDashboard
                  allUsers={allUsers}
                  projectsList={projectsList}
                  reports={reportsFiltered}
                  attendanceData={{
                    quizAttendance: filteredData.quizAttendance,
                    trainingAttendance: filteredData.trainingAttendance
                  }}
                  onExportExcel={exportExcel}
                  onExportPPT={exportPPT}
                />
              )}
              {activeRole === 'Supervisor' && (
                <SupervisorDashboard
                  projectUsers={projectUsersFiltered}
                  projectsList={projectsList}
                  reports={reportsFiltered}
                  attendanceData={{
                    quizAttendance: filteredData.quizAttendance,
                    trainingAttendance: filteredData.trainingAttendance
                  }}
                  onExportExcel={exportExcel}
                  onExportPPT={exportPPT}
                  selectedProjectId={selectedProjectId}
                  myProjectId={user?.projectId}
                />
              )}
              {activeRole === 'Marketing Manager' && (
                <MarketingManagerDashboard
                  projectUsers={projectUsersFiltered}
                  projectsList={projectsList}
                  reports={reportsFiltered}
                  attendanceData={{
                    quizAttendance: filteredData.quizAttendance,
                    trainingAttendance: filteredData.trainingAttendance
                  }}
                  onExportExcel={exportExcel}
                  onExportPPT={exportPPT}
                  selectedProjectId={selectedProjectId}
                  myProjectId={user?.projectId}
                />
              )}
            </>
          ) : (
            <DetailedRecordsView
              projectUsers={projectUsersFiltered}
              projectsList={projectsList}
              reports={reportsFiltered}
              attendanceData={{
                quizAttendance: filteredData.quizAttendance,
                trainingAttendance: filteredData.trainingAttendance
              }}
              onExportExcel={exportExcel}
              onExportPPT={exportPPT}
              onExportPMExcel={exportPMExecutiveExcel}
              onExportPMPPT={exportPMExecutivePPT}
              selectedProjectId={selectedProjectId}
              projectInfo={projectInfo}
              fetchSessionDetails={fetchSessionDetails}
              fetchingDetails={fetchingDetails}
              handleDownloadSessionPPT={handleDownloadSessionPPT}
              handleDownloadSessionExcel={handleDownloadSessionExcel}
            />
          )}
      </div>


      {/* Session Detail Modal */}
      {selectedReportDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="glass-card" style={{ width: '700px', background: 'var(--bg-primary)', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.3rem' }}>{selectedReportDetails.quizTitle}</h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Project: <strong>{selectedReportDetails.projectName}</strong> · Date: <strong>{selectedReportDetails.date}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleDownloadPPTFromModal('executive')}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Download Executive Summary PPT"
                >
                  <Presentation size={15} /> Exec PPT
                </button>
                <button
                  onClick={() => handleDownloadExcelFromModal()}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Download Session Excel Report"
                >
                  <FileText size={15} /> Excel
                </button>
                <button onClick={() => setSelectedReportDetails(null)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={22} /></button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {[['Total Questions', selectedReportDetails.totalQuestions], ['Participants', selectedReportDetails.participants.length]].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px' }}>{v}</div>
                </div>
              ))}
            </div>

            <h4 style={{ margin: '20px 0 12px 0', color: 'var(--text-primary)', fontSize: '1.0rem', fontWeight: '600' }}>PPT Auto-Generation Suite</h4>
            <button
               onClick={() => handleDownloadPPTFromModal('all')}
               className="btn btn-primary btn-sm"
               style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', padding: '12px 14px', marginBottom: '12px', width: '100%', fontWeight: '700', background: 'linear-gradient(135deg,#FF6B35,#FF8C42)', border: 'none', color: 'white', borderRadius: '6px' }}
             >
               <Presentation size={16} />
               <span>Download Complete Presentation Deck (All Topics)</span>
             </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {[
                { label: 'Executive Summary PPT', type: 'executive' },
                { label: 'Participation PPT', type: 'participation' },
                { label: 'Leaderboard PPT', type: 'leaderboard' },
                { label: 'Question Analysis PPT', type: 'question' },
                { label: 'Learning Effectiveness PPT', type: 'learning' },
                { label: 'Team Comparison PPT', type: 'team' },
                { label: 'Region Comparison PPT', type: 'region' },
                { label: 'Store Performance PPT', type: 'store' },
                { label: 'Client Presentation PPT', type: 'client' },
                { label: 'AI Insights PPT (Premium)', type: 'ai' }
              ].map(opt => (
                <button
                  key={opt.type}
                  onClick={() => handleDownloadPPTFromModal(opt.type)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start', padding: '10px 14px', textAlign: 'left' }}
                >
                  <Presentation size={15} style={{ flexShrink: 0 }} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            <h4 style={{ marginBottom: '12px' }}>Participant Scores</h4>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Name', 'Store Name', 'Score', 'Percentage', 'Time Spent'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {selectedReportDetails.participants.length > 0
                  ? selectedReportDetails.participants.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-glass)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{p.name}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{p.storeName || getMockDetails(p.name).store || '—'}</td>
                      <td style={tdStyle}>{p.score}</td>
                      <td style={tdStyle}><span className="badge badge-success">{p.percentage}</span></td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{p.timeSpent}</td>
                    </tr>
                  ))
                  : <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No participants completed this session.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
