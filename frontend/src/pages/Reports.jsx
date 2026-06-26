import React, { useState, useEffect, useContext } from 'react';
import { 
  Download, Users, CheckCircle, BarChart2, AlertCircle, X, FileText, 
  Presentation, Trash2, RefreshCw, Search, Bell, Calendar, ChevronDown, 
  MapPin, Award, Heart, Sparkles, TrendingUp, Info, Play, Plus, MoreVertical, 
  Eye, Shield, Target, FileSpreadsheet, ChevronRight, Lock
} from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { generate15SlidePPT } from '../utils/pptHelper';
import { generateExcelReport } from '../utils/excelHelper';
import { downloadWorkbook, downloadPPT } from '../utils/downloadWorkbook';

export default function Reports() {
  const { token, user } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  
  const selectedRole = user?.role || 'Admin';

  const getWorkbookTypeByRole = (role) => {
    switch (role) {
      case 'MD':
      case 'COO':
      case 'VP Operations':
        return 'executive';
      case 'Program Manager':
      case 'T&D Manager':
      case 'Operation Manager':
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

  const getPPTTemplateByRole = (role) => {
    switch (role) {
      case 'MD':
      case 'COO':
      case 'VP Operations':
        return 'executive';
      case 'Client':
        return 'client';
      case 'Trainer':
      case 'Supervisor':
        return 'learning';
      case 'Program Manager':
      case 'T&D Manager':
      case 'Operation Manager':
        return 'executive';
      case 'Admin':
      case 'Super Admin':
      default:
        return 'all';
    }
  };

  const initialExcelType = getWorkbookTypeByRole(selectedRole);
  const initialPPTTemplate = getPPTTemplateByRole(selectedRole);

  const [dateFilter, setDateFilter] = useState('7 Days'); // 'Today' | '7 Days' | '30 Days' | 'Quarter' | 'Custom'
  const [dateRange, setDateRange] = useState('01 Jun 2026 - 05 Jun 2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPPTTemplate, setSelectedPPTTemplate] = useState(initialPPTTemplate); // Matches PPT export options
  const [activeSlideIndex, setActiveSlideIndex] = useState(0); // For slide preview panel
  const [activeMenuId, setActiveMenuId] = useState(null); // For session cards dropdown menu

  const [leaderboard, setLeaderboard] = useState([]);

  const handleDateFilterChange = (filterType) => {
    setDateFilter(filterType);
    const today = new Date();
    const formatDate = (date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    };

    if (filterType === 'Today') {
      const todayStr = formatDate(today);
      setDateRange(`${todayStr} - ${todayStr}`);
    } else if (filterType === '7 Days') {
      const past = new Date();
      past.setDate(today.getDate() - 6);
      setDateRange(`${formatDate(past)} - ${formatDate(today)}`);
    } else if (filterType === '30 Days') {
      const past = new Date();
      past.setDate(today.getDate() - 29);
      setDateRange(`${formatDate(past)} - ${formatDate(today)}`);
    } else if (filterType === 'Quarter') {
      const past = new Date();
      past.setDate(today.getDate() - 90);
      setDateRange(`${formatDate(past)} - ${formatDate(today)}`);
    } else if (filterType === 'Custom') {
      const startInput = prompt("Enter Start Date (e.g. 01 May 2026):", formatDate(new Date()));
      const endInput = prompt("Enter End Date (e.g. 05 Jun 2026):", formatDate(new Date()));
      if (startInput && endInput) {
        setDateRange(`${startInput} - ${endInput}`);
      }
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const dates = dateRange.split(' - ');
      const response = await axios.get('/api/reports/leaderboard', {
        params: {
          startDate: dates[0],
          endDate: dates[1]
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.length > 0) {
        const mapped = response.data.map((u, index) => {
          let bg = '#F1F5F9';
          let col = '#475569';
          if (index === 0) { bg = '#FEF08A'; col = '#A16207'; }
          else if (index === 1) { bg = '#E2E8F0'; col = '#475569'; }
          else if (index === 2) { bg = '#FFEDD5'; col = '#C2410C'; }
          return {
            rank: index + 1,
            name: u.name,
            score: u.score,
            completion: u.completion,
            bg,
            col
          };
        });
        setLeaderboard(mapped);
      } else {
        setLeaderboard([
          { rank: 1, name: 'Rahul Sharma', score: '95%', completion: '100%', bg: '#FEF08A', col: '#A16207' },
          { rank: 2, name: 'Neha Singh', score: '92%', completion: '100%', bg: '#E2E8F0', col: '#475569' },
          { rank: 3, name: 'Amit Kumar', score: '90%', completion: '100%', bg: '#FFEDD5', col: '#C2410C' },
          { rank: 4, name: 'Priya Patel', score: '88%', completion: '100%', bg: '#F1F5F9', col: '#475569' },
          { rank: 5, name: 'Suresh Yadav', score: '86%', completion: '100%', bg: '#F1F5F9', col: '#475569' }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard data', err);
      setLeaderboard([
        { rank: 1, name: 'Rahul Sharma', score: '95%', completion: '100%', bg: '#FEF08A', col: '#A16207' },
        { rank: 2, name: 'Neha Singh', score: '92%', completion: '100%', bg: '#E2E8F0', col: '#475569' },
        { rank: 3, name: 'Amit Kumar', score: '90%', completion: '100%', bg: '#FFEDD5', col: '#C2410C' },
        { rank: 4, name: 'Priya Patel', score: '88%', completion: '100%', bg: '#F1F5F9', col: '#475569' },
        { rank: 5, name: 'Suresh Yadav', score: '86%', completion: '100%', bg: '#F1F5F9', col: '#475569' }
      ]);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLeaderboard();
    }
  }, [token, dateRange]);
  
  // PPT & Excel Customizer States
  const [selectedTheme, setSelectedTheme] = useState('standard');
  const [selectedExcelType, setSelectedExcelType] = useState(initialExcelType);
  const [presenterName, setPresenterName] = useState(user?.name || 'Demo Trainer');
  const [footerText, setFooterText] = useState('');
  const [clientLogo, setClientLogo] = useState(null);
  const [projectLogo, setProjectLogo] = useState(null);
  const [generatorTab, setGeneratorTab] = useState('branding'); // 'branding' | 'slides'
  const [slideSettings, setSlideSettings] = useState([
    { id: 'slide1',  title: 'Cover Page',                   desc: 'Cover with title, date, trainer, and logo badges',                 enabled: true, notes: '' },
    { id: 'slide2',  title: 'Executive Summary',             desc: 'KPI cards (Participants, Average, Pass rates)',                    enabled: true, notes: '' },
    { id: 'slide3',  title: 'Participation Overview',        desc: 'Invited vs Attended funnel analysis',                              enabled: true, notes: '' },
    { id: 'slide4',  title: 'Quiz Performance Summary',      desc: 'Highest, Lowest, Median, and Pass benchmarks',                    enabled: true, notes: '' },
    { id: 'slide5',  title: 'Leaderboard',                  desc: 'Top 10 standings with gold/silver/bronze ranks',                   enabled: true, notes: '' },
    { id: 'slide6',  title: 'Question Analysis',            desc: 'Question-wise correctness & difficulty heat matrix',               enabled: true, notes: '' },
    { id: 'slide7',  title: 'Knowledge Gap Analysis',       desc: 'Concepts weakness details & remedial guidelines',                  enabled: true, notes: '' },
    { id: 'slide8',  title: 'Learning Effectiveness',       desc: 'Pre vs Post assessment index comparisons',                        enabled: true, notes: '' },
    { id: 'slide9',  title: 'Regional Performance',         desc: 'Territory statistics (North, East, West, South)',                  enabled: true, notes: '' },
    { id: 'slide10', title: 'Trainer Performance',          desc: 'Instructor session completion & feedback scores',                  enabled: true, notes: '' },
    { id: 'slide11', title: 'Certification Analysis',       desc: 'Workforce compliance status tracking',                             enabled: true, notes: '' },
    { id: 'slide12', title: 'Attendance Analytics',         desc: 'Webinar attendances vs quiz join drop-offs',                      enabled: true, notes: '' },
    { id: 'slide13', title: 'AI Insights & Recommendations',desc: 'Auto-commentary & AI-suggested training items',                   enabled: true, notes: '' },
    { id: 'slide14', title: 'Action Plan',                  desc: 'Corrective action plan, owner, and timeline grid',                 enabled: true, notes: '' },
    { id: 'slide16', title: 'Meeting Attendance Report',    desc: 'Project-wise training meeting attendance log (Employee/Zone/Date)', enabled: true, notes: '' },
    { id: 'slide15', title: 'Thank You Slide',              desc: 'Marketing services logo and support lines',                        enabled: true, notes: '' }
  ]);


  const handlePPTTemplateChange = (val) => {
    setSelectedPPTTemplate(val);
    const enabledMap = {
      executive: ['slide1', 'slide2', 'slide5', 'slide13', 'slide15'],
      client:    ['slide1', 'slide2', 'slide9', 'slide11', 'slide13', 'slide14', 'slide15'],
      learning:  ['slide1', 'slide4', 'slide7', 'slide8', 'slide10', 'slide12', 'slide16', 'slide15'],
      all:       ['slide1', 'slide2', 'slide3', 'slide4', 'slide5', 'slide6', 'slide7', 'slide8',
                  'slide9', 'slide10', 'slide11', 'slide12', 'slide13', 'slide14', 'slide16', 'slide15']
    };
    const enabledIds = enabledMap[val] || enabledMap.all;
    setSlideSettings(prev => prev.map(s => ({
      ...s,
      enabled: enabledIds.includes(s.id)
    })));
  };


  const moveSlide = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slideSettings.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...slideSettings];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSlideSettings(updated);
    if (activeSlideIndex === index) {
      setActiveSlideIndex(targetIndex);
    } else if (activeSlideIndex === targetIndex) {
      setActiveSlideIndex(index);
    }
  };

  const handleLogoUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (type === 'client') {
        setClientLogo(uploadEvent.target.result);
      } else {
        setProjectLogo(uploadEvent.target.result);
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Detailed report modal
  const [selectedReportDetails, setSelectedReportDetails] = useState(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [detailTab, setDetailTab] = useState('overview'); // 'overview' | 'participation' | 'questions' | 'gaps'
  const [passingScore, setPassingScore] = useState(70);

  // Structured Mock Sessions to merge with live DB reports
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

  // Presentation Slide Thumbnails
  const mockSlides = [
    { title: "Executive Summary", desc: "Overview of metrics and accuracies" },
    { title: "Participation Rate", desc: "Registered vs active learners list" },
    { title: "Performancestandings", desc: "Leaderboards and top ranking details" },
    { title: "Learning Gaps", desc: "Weak areas and Compliance highlights" },
    { title: "Recommendations", desc: "Action plan for refresher trainings" }
  ];

  useEffect(() => {
    if (token) {
      fetchReports(false);

      // Establish live socket synchronization
      const socket = io(window.location.origin);
      
      const handleSync = (data) => {
        console.log('[Live Sync] Real-time updates detected:', data);
        fetchReports(true);
      };

      socket.on('live_session_finished', handleSync);
      socket.on('offline_response_submitted', handleSync);
      socket.on('attendance_updated', handleSync);
      socket.on('report_deleted', handleSync);

      // Background periodic polling as fallback (every 20 seconds)
      const pollInterval = setInterval(() => {
        console.log('[Polling Sync] Fetching latest reports...');
        fetchReports(true);
      }, 20000);

      return () => {
        socket.disconnect();
        clearInterval(pollInterval);
      };
    }
  }, [token]);

  useEffect(() => {
    const initialTemplate = getPPTTemplateByRole(selectedRole);
    const enabledMap = {
      executive: ['slide1', 'slide2', 'slide5', 'slide13', 'slide15'],
      client: ['slide1', 'slide2', 'slide9', 'slide11', 'slide13', 'slide14', 'slide15'],
      learning: ['slide1', 'slide4', 'slide7', 'slide8', 'slide10', 'slide12', 'slide15'],
      all: ['slide1', 'slide2', 'slide3', 'slide4', 'slide5', 'slide6', 'slide7', 'slide8', 'slide9', 'slide10', 'slide11', 'slide12', 'slide13', 'slide14', 'slide15']
    };
    const enabledIds = enabledMap[initialTemplate] || enabledMap.all;
    setSlideSettings(prev => prev.map(s => ({
      ...s,
      enabled: enabledIds.includes(s.id)
    })));
  }, [selectedRole]);

  const fetchReports = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError('');
      const response = await axios.get('/api/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(response.data);
    } catch (err) {
      console.error('Failed to fetch reports', err);
      setError(err.response?.data?.error || 'Failed to fetch reports');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleFetchDetails = async (sessionId) => {
    if (String(sessionId).startsWith('mock-')) {
      const mock = MOCK_SESSIONS.find(s => s.id === sessionId);
      setSelectedReportDetails({
        id: mock.id,
        quizTitle: mock.title,
        projectName: mock.projectName,
        date: mock.date,
        totalQuestions: mock.questions.length || 3,
        participants: mock.participantsList.length > 0 ? mock.participantsList : [
          { id: 'mp1', name: 'Rahul Sharma', employeeId: 'EMP101', score: '3/3', percentage: '100%', timeSpent: '45s', storeName: 'Store #101 (Delhi)' },
          { id: 'mp2', name: 'Neha Singh', employeeId: 'EMP102', score: '3/3', percentage: '100%', timeSpent: '38s', storeName: 'Store #205 (Mumbai)' },
          { id: 'mp3', name: 'Amit Kumar', employeeId: 'EMP103', score: '2/3', percentage: '66%', timeSpent: '50s', storeName: 'Store #312 (Bangalore)' },
          { id: 'mp4', name: 'Priya Patel', employeeId: 'EMP104', score: '2/3', percentage: '66%', timeSpent: '42s', storeName: 'Store #418 (Kolkata)' },
          { id: 'mp5', name: 'Suresh Yadav', employeeId: 'EMP105', score: '2/3', percentage: '66%', timeSpent: '55s', storeName: 'Store #101 (Delhi)' }
        ],
        questions: mock.questions.length > 0 ? mock.questions : [
          { id: 'mq1', text: 'Core Brand Hex Code Value?', type: 'mcq', correct_answer: '#F36F21', options: ['#F36F21', '#071B36', '#2563EB', '#22C55E'] },
          { id: 'mq2', text: 'Operational guidelines apply to all stores.', type: 'true_false', correct_answer: 'True', options: ['True', 'False'] },
          { id: 'mq3', text: 'Name the primary brand font.', type: 'open_text', correct_answer: 'Poppins', options: [] }
        ]
      });
      setDetailTab('overview');
      return;
    }

    try {
      setFetchingDetails(true);
      const response = await axios.get(`/api/reports/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const details = response.data;
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
      setDetailTab('overview');
    } catch (err) {
      console.error('Failed to fetch session details', err);
      alert('Failed to fetch session details');
    } finally {
      setFetchingDetails(false);
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

  // PPTX Export Logic
  const exportSpecificPPT = async (type, sessionData) => {
    const dataWithExportType = { ...sessionData, exportType: type };
    
    // Determine enabled slides based on type
    let finalSlides = [...slideSettings];
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

    // Fetch meeting attendance data to populate slide16
    let trainingAttendance = [];
    if (finalSlides.some(s => s.id === 'slide16' && s.enabled)) {
      try {
        const { trainingAttendance: ta } = await fetchAttendanceSummaryForExcel();
        trainingAttendance = ta || [];
      } catch { /* ignore — slide will show empty state */ }
    }

    await generate15SlidePPT(
      { ...dataWithExportType, trainingAttendance },
      finalSlides,
      selectedTheme,
      { presenterName, footerText, clientLogo, projectLogo },
      passingScore
    );
  };


  // Helper: Fetch cross-user attendance summary for Excel reports
  const fetchAttendanceSummaryForExcel = async () => {
    try {
      const res = await axios.get('/api/reports/attendance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Returns { quizAttendance: [...], trainingAttendance: [...] } for managers
      // or { isEmployee: true, logs: [...], trainingLogs: [...] } for employees
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

  // Excel Export Logic
  const exportQuizSessionExcel = async (sessionData, workbookType = selectedExcelType) => {
    const { quizAttendance: userAttendanceSummary, trainingAttendance } = await fetchAttendanceSummaryForExcel();
    await generateExcelReport(workbookType, { ...sessionData, userAttendanceSummary, trainingAttendance }, {
      presenterName,
      footerText
    }, passingScore);
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
      alert(`Failed to generate Excel: ${err.message || err}`);
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

  const handleDeleteReport = async (sessionId) => {
    if (String(sessionId).startsWith('mock-')) {
      alert("Mock reports cannot be deleted in this simulation.");
      return;
    }
    if (!window.confirm('Are you sure you want to delete this report? This will permanently remove the session and all participant data.')) return;
    try {
      await axios.delete(`/api/reports/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReports();
    } catch (err) {
      console.error('Delete report failed:', err);
      alert(err.response?.data?.error || 'Failed to delete report');
    }
  };

  const handleExportExcel = async () => {
    const combinedReports = getFilteredReports();
    if (combinedReports.length === 0) { alert('No data to export.'); return; }
    try {
      setLoading(true);
      const xlsxMod = await import('xlsx-js-style');
      const XLSX = xlsxMod.default || xlsxMod;

      const wb = XLSX.utils.book_new();

      // Sheet 1: Quiz Sessions List
      const sessionsSheet = XLSX.utils.json_to_sheet(combinedReports.map(r => ({
        'Quiz Title': r.title,
        'Project': r.projectName,
        'Date': r.date,
        'Host': r.hostName,
        'Participants': r.participants,
        'Avg Score': r.avgScore,
        'Status': r.status
      })));
      XLSX.utils.book_append_sheet(wb, sessionsSheet, 'Quiz Sessions');

      // Sheet 2: User Attendance Summary (date-wise)
      const attendanceSummary = await fetchAttendanceSummaryForExcel();
      if (attendanceSummary.length > 0) {
        // Summary tab: one row per user
        const summaryRows = attendanceSummary.map(u => ({
          'Employee Name': u.name || 'N/A',
          'Employee ID': u.employeeId || 'N/A',
          'Project': u.projectName || 'N/A',
          'Role': u.roleName || 'Employee',
          'Total Quiz Attempts': u.quizCount || 0,
          'Avg Score': u.avgScore || '0%',
          'Attendance Dates': u.dates || 'No records'
        }));
        const attendanceSheet = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(wb, attendanceSheet, 'User Attendance Summary');

        // Date-wise breakdown tab: one row per date per user
        const dateWiseRows = [];
        attendanceSummary.forEach(u => {
          const datesArr = (u.dates || '').split(',').map(d => d.trim()).filter(Boolean);
          datesArr.forEach(date => {
            dateWiseRows.push({
              'Employee Name': u.name || 'N/A',
              'Employee ID': u.employeeId || 'N/A',
              'Project': u.projectName || 'N/A',
              'Role': u.roleName || 'Employee',
              'Quiz Date': date,
              'Avg Score': u.avgScore || '0%',
              'Status': 'Present'
            });
          });
        });
        if (dateWiseRows.length > 0) {
          const dateSheet = XLSX.utils.json_to_sheet(dateWiseRows);
          XLSX.utils.book_append_sheet(wb, dateSheet, 'Date-wise Attendance');
        }
      } else {
        // Fallback attendance sheet with mock data
        const fallbackSheet = XLSX.utils.json_to_sheet([
          { 'Employee Name': 'Rahul Sharma', 'Employee ID': 'EMP101', 'Project': 'General', 'Role': 'Employee', 'Total Quiz Attempts': 3, 'Avg Score': '91%', 'Attendance Dates': '2025-01-15, 2025-02-10, 2025-03-05' },
          { 'Employee Name': 'Neha Singh', 'Employee ID': 'EMP102', 'Project': 'General', 'Role': 'Employee', 'Total Quiz Attempts': 2, 'Avg Score': '88%', 'Attendance Dates': '2025-01-15, 2025-02-10' },
          { 'Employee Name': 'Amit Kumar', 'Employee ID': 'EMP103', 'Project': 'General', 'Role': 'Employee', 'Total Quiz Attempts': 4, 'Avg Score': '75%', 'Attendance Dates': '2025-01-15, 2025-02-10, 2025-02-25, 2025-03-05' }
        ]);
        XLSX.utils.book_append_sheet(wb, fallbackSheet, 'User Attendance Summary');
      }

      // Browser-safe download (avoids XLSX.writeFile FileSaver.js issues in Vite)
      downloadWorkbook(XLSX, wb, `Analytics_Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Excel export failed:', err);
      alert('Failed to export Excel. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPPT = async () => {
    const combinedReports = getFilteredReports();
    if (combinedReports.length === 0) { alert('No data to export.'); return; }
    try {
      setLoading(true);
      const pptxMod = await import('pptxgenjs');
      const PptxGenJS = pptxMod.default || pptxMod;
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      const BLUE = '0057B8', WHITE = 'FFFFFF', LIGHT = 'F4F6F8';

      const s1 = pptx.addSlide();
      s1.background = { color: BLUE };
      s1.addText('Analytics & Quiz Reports', { x: 0.5, y: 1.8, w: 12, h: 1, fontSize: 34, bold: true, color: WHITE, align: 'center' });
      s1.addText(`Generated: ${new Date().toLocaleString()}`, { x: 0.5, y: 3, w: 12, h: 0.5, fontSize: 13, color: 'D0E1FD', align: 'center' });

      const s2 = pptx.addSlide();
      s2.background = { color: LIGHT };
      s2.addText('Summary', { x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 24, bold: true, color: BLUE });
      const totalP = combinedReports.reduce((a, r) => a + r.participants, 0);
      [['Total Sessions', String(combinedReports.length)], ['Total Participants', String(totalP)]].forEach(([l, v], i) => {
        s2.addShape(pptx.ShapeType.rect, { x: 0.5 + i * 6.5, y: 1.2, w: 5.8, h: 1.8, fill: { color: BLUE } });
        s2.addText(l, { x: 0.5 + i * 6.5, y: 1.3, w: 5.8, h: 0.5, fontSize: 13, color: 'D0E1FD', align: 'center' });
        s2.addText(v, { x: 0.5 + i * 6.5, y: 1.9, w: 5.8, h: 0.9, fontSize: 30, bold: true, color: WHITE, align: 'center' });
      });

      const s3 = pptx.addSlide();
      s3.background = { color: LIGHT };
      s3.addText('Session Details', { x: 0.3, y: 0.2, w: 12, h: 0.6, fontSize: 20, bold: true, color: BLUE });
      const rows = [
        [{ text: 'Quiz Title', options: { bold: true, color: WHITE, fill: BLUE } },
         { text: 'Project', options: { bold: true, color: WHITE, fill: BLUE } },
         { text: 'Date', options: { bold: true, color: WHITE, fill: BLUE } },
         { text: 'Participants', options: { bold: true, color: WHITE, fill: BLUE } },
         { text: 'Avg Score', options: { bold: true, color: WHITE, fill: BLUE } }],
        ...combinedReports.slice(0, 18).map((r, i) => [
          { text: r.title, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
          { text: r.projectName, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
          { text: r.date, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
          { text: String(r.participants), options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } },
          { text: r.avgScore, options: { fill: i % 2 === 0 ? 'EAF0FA' : WHITE } }
        ])
      ];
      s3.addTable(rows, { x: 0.3, y: 0.9, w: 12.7, colW: [4, 2.5, 2, 1.5, 1.7], fontSize: 10, border: { type: 'solid', color: 'D1D5DB', pt: 0.5 } });
      await downloadPPT(pptx, `Analytics_Reports_${new Date().toISOString().split('T')[0]}.pptx`);
    } catch (err) {
      console.error('PPT export failed:', err);
      alert(`Failed to export PPT:\n${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Get reports merged with mockup templates filtered by search queries
  const getFilteredReports = () => {
    const formattedDb = reports.map(r => ({
      id: r.id,
      title: r.title,
      projectName: r.projectName || 'General',
      date: r.date || new Date().toISOString().split('T')[0],
      hostName: r.hostName || 'Trainer',
      participants: r.participants || 0,
      avgScore: r.avgScore || '0%',
      status: r.status || 'Finished'
    }));

    // Use real database sessions if available; fall back to mock sessions only when no real data exists
    const combined = formattedDb.length > 0 ? formattedDb : MOCK_SESSIONS;

    return combined.filter(r => 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.projectName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // KPI calculations based on selected date ranges
  const getKpis = () => {
    if (dateFilter === 'Today') {
      return {
        participants: '18', participantsGrowth: '+12% vs yesterday',
        trainings: '2', trainingsGrowth: '+5% vs yesterday',
        completion: '91%', completionGrowth: '+2% vs yesterday',
        score: '84%', scoreGrowth: '+4% vs yesterday',
        certs: '15', certsGrowth: '+15% vs yesterday',
        engagement: '4.7/5', engagementGrowth: '+5% vs yesterday'
      };
    } else if (dateFilter === '7 Days') {
      return {
        participants: '250', participantsGrowth: '+12% vs last 7 days',
        trainings: '24', trainingsGrowth: '+8% vs last 7 days',
        completion: '91%', completionGrowth: '+6% vs last 7 days',
        score: '84%', scoreGrowth: '+7% vs last 7 days',
        certs: '150', certsGrowth: '+15% vs last 7 days',
        engagement: '4.7/5', engagementGrowth: '+5% vs last 7 days'
      };
    } else {
      // 30 Days / Quarter / Custom
      return {
        participants: '1,250', participantsGrowth: '+18% vs last month',
        trainings: '96', trainingsGrowth: '+10% vs last month',
        completion: '88%', completionGrowth: '+5% vs last month',
        score: '81%', scoreGrowth: '+3% vs last month',
        certs: '820', certsGrowth: '+12% vs last month',
        engagement: '4.5/5', engagementGrowth: '+4% vs last month'
      };
    }
  };

  const kpis = getKpis();

  // Helper to render sparklines
  const renderSparkline = (color) => (
    <svg width="60" height="24" viewBox="0 0 60 24" style={{ overflow: 'visible' }}>
      <path
        d="M0,18 Q15,4 30,12 T60,6"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="60" cy="6" r="3.5" fill={color} />
    </svg>
  );

  return (
    <div style={{ padding: '24px', background: '#F8FAFC', minHeight: '100%', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box' }}>
      
      {/* ─── HEADER SECTION ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#071B36', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            Training Intelligence Center <span style={{ textShadow: '0 0 10px rgba(243,111,33,0.3)' }}>📈</span>
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Track engagement, performance, certification and learning outcomes.</p>
        </div>

        {/* Global Controls & Simulator Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Global Excel Export */}
          <button
            onClick={handleExportExcel}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#FFFFFF',
              border: '1px solid #E2E8F0', borderRadius: '10px', color: '#16A34A', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            <FileSpreadsheet size={14} />
            Export Excel
          </button>

          {/* Global PPT Export */}
          <button
            onClick={handleExportPPT}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#FFFFFF',
              border: '1px solid #E2E8F0', borderRadius: '10px', color: '#7C3AED', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            <Presentation size={14} />
            Export PPT
          </button>

          {/* Sync live data button */}
          <button
            onClick={async () => {
              setSyncing(true);
              await fetchReports(true);
              setSyncing(false);
            }}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#FFFFFF',
              border: '1px solid #E2E8F0', borderRadius: '10px', color: '#475569', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear' : 'none' }} />
            Sync
          </button>
        </div>
      </div>

      {/* ─── FILTERS & CONTROLS ROW ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '12px 18px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '8px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', width: '280px' }}>
          <Search size={15} color="#64748B" />
          <input 
            type="text" 
            placeholder="Search sessions, supervisors, trainings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', color: '#071B36', width: '100%' }}
          />
        </div>

        {/* Date Filters Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '8px', marginRight: '6px' }}>
            <Calendar size={14} color="#64748B" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#071B36' }}>{dateRange}</span>
          </div>

          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '3px' }}>
            {['Today', '7 Days', '30 Days', 'Quarter', 'Custom'].map(item => {
              const isActive = dateFilter === item;
              return (
                <button
                  key={item}
                  onClick={() => handleDateFilterChange(item)}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '0.75rem', fontWeight: 700,
                    cursor: 'pointer', background: isActive ? '#F36F21' : 'transparent', color: isActive ? 'white' : '#64748B',
                    transition: 'all 0.15s'
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 6 KPI CARDS GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* KPI 1: Participants */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Participants</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <Users size={16} />
            </div>
          </div>
          <strong style={{ fontSize: '1.45rem', fontWeight: 800, color: '#071B36', margin: '4px 0' }}>{kpis.participants}</strong>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22C55E', display: 'block', marginBottom: '8px' }}>{kpis.participantsGrowth}</span>
          <div style={{ marginTop: 'auto' }}>
            {renderSparkline('#2563EB')}
          </div>
        </div>

        {/* KPI 2: Trainings */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Trainings</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
              <Play size={16} />
            </div>
          </div>
          <strong style={{ fontSize: '1.45rem', fontWeight: 800, color: '#071B36', margin: '4px 0' }}>{kpis.trainings}</strong>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22C55E', display: 'block', marginBottom: '8px' }}>{kpis.trainingsGrowth}</span>
          <div style={{ marginTop: 'auto' }}>
            {renderSparkline('#7C3AED')}
          </div>
        </div>

        {/* KPI 3: Completion Rate */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Completion Rate</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
              <CheckCircle size={16} />
            </div>
          </div>
          <strong style={{ fontSize: '1.45rem', fontWeight: 800, color: '#071B36', margin: '4px 0' }}>{kpis.completion}</strong>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22C55E', display: 'block', marginBottom: '8px' }}>{kpis.completionGrowth}</span>
          <div style={{ marginTop: 'auto' }}>
            {renderSparkline('#16A34A')}
          </div>
        </div>

        {/* KPI 4: Average Score */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Average Score</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EA580C' }}>
              <Award size={16} />
            </div>
          </div>
          <strong style={{ fontSize: '1.45rem', fontWeight: 800, color: '#071B36', margin: '4px 0' }}>{kpis.score}</strong>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22C55E', display: 'block', marginBottom: '8px' }}>{kpis.scoreGrowth}</span>
          <div style={{ marginTop: 'auto' }}>
            {renderSparkline('#EA580C')}
          </div>
        </div>

        {/* KPI 5: Certificates Issued */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Certificates Issued</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <Shield size={16} />
            </div>
          </div>
          <strong style={{ fontSize: '1.45rem', fontWeight: 800, color: '#071B36', margin: '4px 0' }}>{kpis.certs}</strong>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22C55E', display: 'block', marginBottom: '8px' }}>{kpis.certsGrowth}</span>
          <div style={{ marginTop: 'auto' }}>
            {renderSparkline('#2563EB')}
          </div>
        </div>

        {/* KPI 6: Engagement Score */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Engagement Score</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
              <Heart size={16} />
            </div>
          </div>
          <strong style={{ fontSize: '1.45rem', fontWeight: 800, color: '#071B36', margin: '4px 0' }}>{kpis.engagement}</strong>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22C55E', display: 'block', marginBottom: '8px' }}>{kpis.engagementGrowth}</span>
          <div style={{ marginTop: 'auto' }}>
            {renderSparkline('#EF4444')}
          </div>
        </div>

      </div>

      {/* ─── ROW 1: PERFORMANCE TRENDS + AI INSIGHTS + REPORT GENERATOR ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Performance Trend Combined Chart Card */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#071B36', margin: 0 }}>Performance Trend</h3>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Combined participants, scores, and completion rate trend</span>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Chart Legend */}
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.68rem', fontWeight: 600, color: '#475569', marginRight: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#2563EB', borderRadius: '2px' }} /> Participants</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '1.5px', background: '#16A34A' }} /> Completion %</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '1.5px', background: '#EA580C' }} /> Avg Score</span>
              </div>

              <select style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
          </div>

          {/* High-Fidelity Combined Chart SVG */}
          <div style={{ flex: 1, height: '180px', minHeight: '180px', position: 'relative' }}>
            <svg viewBox="0 0 460 180" width="100%" height="100%" style={{ overflow: 'visible' }}>
              {/* Y Axis Gridlines */}
              <line x1="35" y1="15" x2="425" y2="15" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="35" y1="50" x2="425" y2="50" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="35" y1="85" x2="425" y2="85" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="35" y1="120" x2="425" y2="120" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="35" y1="155" x2="425" y2="155" stroke="#E2E8F0" strokeWidth="1.5" />

              {/* Y Labels Left (Participants 0 - 300) */}
              <text x="25" y="20" fill="#94A3B8" fontSize="8" textAnchor="end">300</text>
              <text x="25" y="55" fill="#94A3B8" fontSize="8" textAnchor="end">200</text>
              <text x="25" y="90" fill="#94A3B8" fontSize="8" textAnchor="end">100</text>
              <text x="25" y="125" fill="#94A3B8" fontSize="8" textAnchor="end">50</text>
              <text x="25" y="158" fill="#94A3B8" fontSize="8" textAnchor="end">0</text>

              {/* Y Labels Right (Percentages 0% - 100%) */}
              <text x="435" y="20" fill="#94A3B8" fontSize="8">100%</text>
              <text x="435" y="55" fill="#94A3B8" fontSize="8">75%</text>
              <text x="435" y="90" fill="#94A3B8" fontSize="8">50%</text>
              <text x="435" y="125" fill="#94A3B8" fontSize="8">25%</text>
              <text x="435" y="158" fill="#94A3B8" fontSize="8">0%</text>

              {/* X Labels (Dates) */}
              <text x="35" y="170" fill="#94A3B8" fontSize="8" textAnchor="middle">30 May</text>
              <text x="100" y="170" fill="#94A3B8" fontSize="8" textAnchor="middle">31 May</text>
              <text x="165" y="170" fill="#94A3B8" fontSize="8" textAnchor="middle">01 Jun</text>
              <text x="230" y="170" fill="#94A3B8" fontSize="8" textAnchor="middle">02 Jun</text>
              <text x="295" y="170" fill="#94A3B8" fontSize="8" textAnchor="middle">03 Jun</text>
              <text x="360" y="170" fill="#94A3B8" fontSize="8" textAnchor="middle">04 Jun</text>
              <text x="425" y="170" fill="#94A3B8" fontSize="8" textAnchor="middle">05 Jun</text>

              {/* Participants Bar Chart */}
              {/* May 30: 150 */}
              <rect x="23" y="85" width="24" height="70" rx="3" fill="#2563EB" fillOpacity="0.85" />
              {/* May 31: 170 */}
              <rect x="88" y="76" width="24" height="79" rx="3" fill="#2563EB" fillOpacity="0.85" />
              {/* Jun 01: 220 */}
              <rect x="153" y="53" width="24" height="102" rx="3" fill="#2563EB" fillOpacity="0.85" />
              {/* Jun 02: 180 */}
              <rect x="218" y="71" width="24" height="84" rx="3" fill="#2563EB" fillOpacity="0.85" />
              {/* Jun 03: 250 */}
              <rect x="283" y="39" width="24" height="116" rx="3" fill="#2563EB" fillOpacity="0.85" />
              {/* Jun 04: 200 */}
              <rect x="348" y="62" width="24" height="93" rx="3" fill="#2563EB" fillOpacity="0.85" />
              {/* Jun 05: 190 */}
              <rect x="413" y="67" width="24" height="88" rx="3" fill="#2563EB" fillOpacity="0.85" />

              {/* Completion Rate Line (Green) */}
              <path
                d="M 35,32 L 100,29 L 165,26 L 230,30 L 295,27 L 360,29 L 425,26"
                fill="none"
                stroke="#16A34A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="35" cy="32" r="3" fill="#16A34A" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="100" cy="29" r="3" fill="#16A34A" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="165" cy="26" r="3" fill="#16A34A" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="230" cy="30" r="3" fill="#16A34A" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="295" cy="27" r="3" fill="#16A34A" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="360" cy="29" r="3" fill="#16A34A" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="425" cy="26" r="3" fill="#16A34A" stroke="#FFFFFF" strokeWidth="1" />

              {/* Avg Score Line (Orange) */}
              <path
                d="M 35,54 L 100,50 L 165,37 L 230,46 L 295,40 L 360,43 L 425,37"
                fill="none"
                stroke="#EA580C"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="35" cy="54" r="3" fill="#EA580C" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="100" cy="50" r="3" fill="#EA580C" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="165" cy="37" r="3" fill="#EA580C" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="230" cy="46" r="3" fill="#EA580C" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="295" cy="40" r="3" fill="#EA580C" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="360" cy="43" r="3" fill="#EA580C" stroke="#FFFFFF" strokeWidth="1" />
              <circle cx="425" cy="37" r="3" fill="#EA580C" stroke="#FFFFFF" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* AI Insights Engine Card */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#071B36', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="#7C3AED" /> AI Insights
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Smart performance notifications</span>
            </div>
            <span style={{ fontSize: '0.62rem', background: '#F5F3FF', color: '#7C3AED', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>AI Powered</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* KPI insights */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', fontWeight: 500 }}>Strongest Topic</span>
                <strong style={{ fontSize: '0.78rem', color: '#071B36' }}>Product Knowledge (92% Accuracy)</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', fontWeight: 500 }}>Weakest Topic</span>
                <strong style={{ fontSize: '0.78rem', color: '#071B36' }}>Compliance Module (64% Accuracy)</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EA580C' }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', fontWeight: 500 }}>Most Difficult Question</span>
                <strong style={{ fontSize: '0.78rem', color: '#071B36' }}>Question #8 (32% Accuracy)</strong>
              </div>
            </div>

            {/* Recommendation Alert Box */}
            <div style={{ display: 'flex', gap: '10px', background: '#FFF7ED', border: '1px solid rgba(234,88,12,0.2)', padding: '12px', borderRadius: '10px', marginTop: '4px' }}>
              <Target size={20} color="#EA580C" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ fontSize: '0.78rem', color: '#EA580C', display: 'block', fontWeight: 700 }}>Recommended Action</strong>
                <p style={{ fontSize: '0.72rem', color: '#9A3412', margin: '2px 0 0 0', lineHeight: 1.3 }}>
                  Conduct Compliance SOP Refresher training to bridge knowledge gaps before audit assessments.
                </p>
              </div>
            </div>

            <button 
              onClick={() => alert("Loading detailed AI predictive metrics report...")}
              style={{
                width: '100%', border: 'none', background: '#F36F21', color: 'white', fontWeight: 700,
                fontSize: '0.8rem', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(243,111,33,0.2)'
              }}
            >
              View Detailed Analysis
            </button>
          </div>
        </div>

        {/* Report Generator Customizer Card */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', minWidth: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#071B36', margin: 0 }}>Report Generator</h3>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Create client presentation decks</span>
            </div>
            <span style={{ fontSize: '0.65rem', background: '#F0FDF4', color: '#16A34A', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>v1.0 Standard</span>
          </div>

          {/* Sub-tabs selector */}
          <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '4px', borderRadius: '8px', marginBottom: '12px' }}>
            <button 
              onClick={() => setGeneratorTab('branding')}
              style={{
                flex: 1, border: 'none', background: generatorTab === 'branding' ? '#FFFFFF' : 'transparent',
                color: generatorTab === 'branding' ? '#7C3AED' : '#475569', fontWeight: 700, fontSize: '0.75rem',
                padding: '6px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: generatorTab === 'branding' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              🎨 Branding & Theme
            </button>
            <button 
              onClick={() => setGeneratorTab('slides')}
              style={{
                flex: 1, border: 'none', background: generatorTab === 'slides' ? '#FFFFFF' : 'transparent',
                color: generatorTab === 'slides' ? '#7C3AED' : '#475569', fontWeight: 700, fontSize: '0.75rem',
                padding: '6px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: generatorTab === 'slides' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              📑 Slides Sequence ({slideSettings.filter(s => s.enabled).length})
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {generatorTab === 'branding' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {/* Template Selector dropdown */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Select Deck Template</label>
                  <select
                    value={selectedPPTTemplate}
                    onChange={(e) => handlePPTTemplateChange(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC',
                      fontSize: '0.75rem', fontWeight: 700, color: '#071B36', outline: 'none'
                    }}
                  >
                    <option value="executive">Executive PPT (Program summary)</option>
                    <option value="client">Client PPT (Business review)</option>
                    <option value="learning">Trainer PPT (Mastery outcomes)</option>
                    <option value="all">Leadership Deck (Complete summaries)</option>
                  </select>
                </div>

                {/* Excel Workbook Selector */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Select Excel Workbook Type</label>
                  <select
                    value={selectedExcelType}
                    onChange={(e) => setSelectedExcelType(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC',
                      fontSize: '0.75rem', fontWeight: 700, color: '#071B36', outline: 'none'
                    }}
                  >
                    <option value="all">Complete Workbook (All 13 Sheets)</option>
                    <option value="executive">Executive Workbook (Dashboard, Summary, AI Insights)</option>
                    <option value="trainer">Trainer Workbook (Performance, Gaps, Attendance)</option>
                    <option value="pm">Program Manager Workbook (Dashboard, Trainers, Regional)</option>
                    <option value="client">Client Workbook (Readiness, Certifications, Summary)</option>
                    <option value="audit">Audit Workbook (Attendance, Responses, Audit Logs)</option>
                  </select>
                </div>

                {/* Theme Selector */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Select PPT Visual Theme</label>
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC',
                      fontSize: '0.75rem', fontWeight: 700, color: '#071B36', outline: 'none'
                    }}
                  >
                    <option value="standard">Standard Theme (Idonneous Violet/Orange)</option>
                    <option value="client">Client Theme (Navy / Blue / Gold)</option>
                    <option value="corporate">Corporate Theme (Clean Slate & Teal)</option>
                    <option value="conference">Conference Theme (Premium Purple/Pink)</option>
                  </select>
                </div>

                {/* Presenter Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Presenter Name</label>
                  <input
                    type="text"
                    value={presenterName}
                    onChange={(e) => setPresenterName(e.target.value)}
                    placeholder="Enter presenter name..."
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC',
                      fontSize: '0.75rem', color: '#071B36', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Footer Text */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Footer Text</label>
                  <input
                    type="text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Custom footer text..."
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC',
                      fontSize: '0.75rem', color: '#071B36', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Logo uploads row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.65rem', fontWeight: 700, color: '#475569' }}>Client Logo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleLogoUpload(e, 'client')} 
                        id="client-logo-upload"
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="client-logo-upload" style={{
                        flex: 1, padding: '6px 10px', background: '#F8FAFC', border: '1px solid #D1D5DB', borderRadius: '6px',
                        fontSize: '0.65rem', fontWeight: 700, color: '#475569', cursor: 'pointer', textAlign: 'center', display: 'block'
                      }}>
                        {clientLogo ? '✔️ Uploaded' : '📁 Upload'}
                      </label>
                      {clientLogo && (
                        <button onClick={() => setClientLogo(null)} style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '2px' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.65rem', fontWeight: 700, color: '#475569' }}>Project Logo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleLogoUpload(e, 'project')} 
                        id="project-logo-upload"
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="project-logo-upload" style={{
                        flex: 1, padding: '6px 10px', background: '#F8FAFC', border: '1px solid #D1D5DB', borderRadius: '6px',
                        fontSize: '0.65rem', fontWeight: 700, color: '#475569', cursor: 'pointer', textAlign: 'center', display: 'block'
                      }}>
                        {projectLogo ? '✔️ Uploaded' : '📁 Upload'}
                      </label>
                      {projectLogo && (
                        <button onClick={() => setProjectLogo(null)} style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '2px' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                
                {/* Scrollable list of slide manager checkboxes */}
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px', background: '#F8FAFC' }} className="custom-scrollbar">
                  {slideSettings.map((slide, i) => (
                    <div 
                      key={slide.id}
                      onClick={() => setActiveSlideIndex(i)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px',
                        borderRadius: '6px', background: activeSlideIndex === i ? '#F0FDF4' : 'transparent',
                        border: activeSlideIndex === i ? '1px solid #BBF7D0' : '1px solid transparent',
                        cursor: 'pointer', marginBottom: '4px', transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={slide.enabled !== false} 
                          onChange={(e) => {
                            e.stopPropagation();
                            setSlideSettings(prev => prev.map((s, idx) => idx === i ? { ...s, enabled: e.target.checked } : s));
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#071B36', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {i + 1}. {slide.title}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => moveSlide(i, 'up')} 
                          disabled={i === 0}
                          style={{ border: 'none', background: '#E2E8F0', color: '#475569', borderRadius: '4px', padding: '2px 6px', fontSize: '0.6rem', cursor: i === 0 ? 'not-allowed' : 'pointer' }}
                        >
                          ▲
                        </button>
                        <button 
                          onClick={() => moveSlide(i, 'down')} 
                          disabled={i === slideSettings.length - 1}
                          style={{ border: 'none', background: '#E2E8F0', color: '#475569', borderRadius: '4px', padding: '2px 6px', fontSize: '0.6rem', cursor: i === slideSettings.length - 1 ? 'not-allowed' : 'pointer' }}
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Presenter Notes editor for selected slide */}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7C3AED' }}>
                      Presenter Notes: Slide {activeSlideIndex + 1}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: '#64748B', fontStyle: 'italic' }}>
                      ({slideSettings[activeSlideIndex]?.title})
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={slideSettings[activeSlideIndex]?.notes || ''}
                    onChange={(e) => {
                      const updatedNotes = e.target.value;
                      setSlideSettings(prev => prev.map((s, idx) => idx === activeSlideIndex ? { ...s, notes: updatedNotes } : s));
                    }}
                    placeholder="Enter custom speaker notes for this slide..."
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0',
                      fontSize: '0.72rem', background: '#F8FAFC', outline: 'none', resize: 'vertical', boxSizing: 'border-box'
                    }}
                  />
                </div>

              </div>
            )}

            {/* Bottom Generate presentation and workbook action buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <button 
                onClick={() => {
                  const targetSessionId = getFilteredReports()[0]?.id || 'mock-session-1';
                  handleDownloadSessionExcel(targetSessionId);
                }}
                disabled={loading}
                style={{
                  flex: 1, border: 'none', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white', fontWeight: 700,
                  fontSize: '0.8rem', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                }}
              >
                <FileSpreadsheet size={14} /> Generate Excel
              </button>
              <button 
                onClick={() => {
                  const targetSessionId = getFilteredReports()[0]?.id || 'mock-session-1';
                  handleDownloadSessionPPT(targetSessionId, selectedPPTTemplate);
                }}
                disabled={loading}
                style={{
                  flex: 1, border: 'none', background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', color: 'white', fontWeight: 700,
                  fontSize: '0.8rem', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(124,58,237,0.2)'
                }}
              >
                <Presentation size={14} /> Generate PPT
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ─── ROW 2: LEADERBOARD + TOPICS + REGIONAL MAP + CERTIFICATIONS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Leaderboard widget */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#071B36', margin: 0 }}>Leaderboard (Top 5)</h3>
            <a href="#view-all" onClick={(e) => { e.preventDefault(); alert("Opening full participant standings roster..."); }} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}>View All</a>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leaderboard.map(user => (
              <div key={user.rank} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%', background: user.bg, color: user.col,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800
                }}>
                  {user.rank}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#071B36', display: 'block' }}>{user.name}</span>
                  <span style={{ fontSize: '0.62rem', color: '#64748B' }}>Completion: {user.completion}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16A34A' }}>{user.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Topic Performance widget */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#071B36', margin: 0 }}>Topic Performance</h3>
            <a href="#view-all" onClick={(e) => { e.preventDefault(); alert("Opening detailed competency mapping analysis..."); }} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}>View All</a>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { topic: 'Product Knowledge', accuracy: 92, col: '#22C55E' },
              { topic: 'Retail SOP', accuracy: 88, col: '#22C55E' },
              { topic: 'Compliance', accuracy: 64, col: '#F97316' },
              { topic: 'Sales Process', accuracy: 78, col: '#F97316' },
              { topic: 'Customer Handling', accuracy: 81, col: '#22C55E' }
            ].map((t, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  <span>{t.topic}</span>
                  <strong style={{ color: t.col }}>{t.accuracy}%</strong>
                </div>
                <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${t.accuracy}%`, height: '100%', background: t.col, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Performance India Outline Heatmap widget */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#071B36', margin: 0 }}>Regional Performance</h3>
            <select style={{ padding: '2px 6px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.68rem', fontWeight: 700, color: '#475569' }}>
              <option>Zone Wise</option>
              <option>State Wise</option>
            </select>
          </div>

          {/* Abstract stylized regional heatmap map of India */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: '140px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <path 
                  d="M 200 20 L 220 50 L 280 100 L 340 100 L 360 120 L 300 150 L 280 180 L 260 250 L 200 360 L 180 360 L 140 250 L 100 160 L 80 150 L 100 100 L 140 60 Z" 
                  fill="#F4F5F7" stroke="#CBD5E1" strokeWidth="3" strokeLinejoin="round" 
                />
                <circle cx="200" cy="80" r="45" fill="#22C55E" opacity="0.8" />
                <circle cx="120" cy="160" r="45" fill="#FBBF24" opacity="0.8" />
                <circle cx="200" cy="180" r="45" fill="#22C55E" opacity="0.8" />
                <circle cx="280" cy="160" r="45" fill="#FBBF24" opacity="0.8" />
                <circle cx="200" cy="280" r="45" fill="#22C55E" opacity="0.8" />

                <text x="200" y="85" fill="#FFFFFF" fontSize="16" fontWeight="bold" textAnchor="middle">North: 91%</text>
                <text x="120" y="165" fill="#071B36" fontSize="16" fontWeight="bold" textAnchor="middle">West: 74%</text>
                <text x="200" y="185" fill="#FFFFFF" fontSize="16" fontWeight="bold" textAnchor="middle">Central: 88%</text>
                <text x="280" y="165" fill="#071B36" fontSize="16" fontWeight="bold" textAnchor="middle">East: 81%</text>
                <text x="200" y="285" fill="#FFFFFF" fontSize="16" fontWeight="bold" textAnchor="middle">South: 93%</text>
              </svg>
            </div>

            {/* Colors legend indicator */}
            <div style={{ display: 'flex', gap: '10px', fontSize: '0.62rem', fontWeight: 600, color: '#64748B', marginTop: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} /> 90%+</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FBBF24' }} /> 75%-89%</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F97316' }} /> 50%-74%</span>
            </div>
          </div>
        </div>

        {/* Certification Overview widget */}
        <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#071B36', margin: 0 }}>Certification Overview</h3>
            <span style={{ fontSize: '0.62rem', background: '#F0FDF4', color: '#16A34A', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Pass Rate 89%</span>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Donut Chart SVG */}
            <div style={{ width: '100px', height: '100px', position: 'relative', flexShrink: 0 }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#E2E8F0" strokeWidth="10" />
                {/* Issued Arc (89%) - circumference ≈ 238.7. 89% = 212.4 */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#22C55E" strokeWidth="10" strokeDasharray="238.7" strokeDashoffset="26.3" strokeLinecap="round" transform="rotate(-90 50 50)" />
                {/* Pending Arc (7%) - 7% = 16.7 */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#FBBF24" strokeWidth="10" strokeDasharray="238.7" strokeDashoffset="222.0" strokeLinecap="round" transform="rotate(230 50 50)" />
                {/* Failed Arc (4%) - 4% = 9.5 */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#EF4444" strokeWidth="10" strokeDasharray="238.7" strokeDashoffset="229.2" strokeLinecap="round" transform="rotate(256 50 50)" />
              </svg>
              {/* Center counter */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: '#071B36', display: 'block' }}>162</strong>
                <span style={{ fontSize: '0.5rem', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Total</span>
              </div>
            </div>

            {/* Donut chart legend list */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.68rem', fontWeight: 600 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} /> Issued</span>
                <strong style={{ color: '#071B36' }}>150 (89%)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FBBF24' }} /> Pending</span>
                <strong style={{ color: '#071B36' }}>12 (7%)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} /> Failed</span>
                <strong style={{ color: '#071B36' }}>8 (4%)</strong>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ─── BOTTOM ROW: RECENT QUIZ SESSIONS (INTERACTIVE CARDS) ─── */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', position: 'relative' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#071B36', margin: 0 }}>Recent Quiz Sessions</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Interactive analytics cards for past checks</span>
          </div>
          <a href="#view-all" onClick={(e) => { e.preventDefault(); alert("Opening all session archive..."); }} style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F36F21', textDecoration: 'none' }}>View All</a>
        </div>

        {loading ? (
          <p style={{ color: '#64748B', fontSize: '0.82rem', padding: '16px' }}>Loading reports data...</p>
        ) : getFilteredReports().length > 0 ? (
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {getFilteredReports().map((report) => {
              const isMock = String(report.id).startsWith('mock-');
              return (
                <div 
                  key={report.id} 
                  className="glass-card" 
                  style={{
                    background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px',
                    display: 'flex', flexDirection: 'column', position: 'relative', transition: 'all 0.15s'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#F36F21'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                >
                  
                  {/* Top header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ 
                      fontSize: '0.62rem', fontWeight: 800, color: '#F36F21', background: 'rgba(243,111,33,0.08)',
                      padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase'
                    }}>
                      {report.projectName}
                    </span>
                    
                    {/* Actions Menu Trigger */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {/* Quick Delete Action */}
                      {(selectedRole === 'Admin' || selectedRole === 'Super Admin' || selectedRole === 'Trainer') && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', transition: 'background 0.2s' }}
                          title="Delete Session"
                          onMouseOver={(e) => e.currentTarget.style.background = '#FEE2E2'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === report.id ? null : report.id)}
                        style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'background 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#F1F5F9'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Dropdown Options Popup */}
                      {activeMenuId === report.id && (
                        <div style={{
                          position: 'absolute', right: 0, top: '22px', background: '#FFFFFF', border: '1px solid #E2E8F0',
                          borderRadius: '8px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', zIndex: 50, width: '150px'
                        }}>
                          <button 
                            onClick={() => { setActiveMenuId(null); handleFetchDetails(report.id); }}
                            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '8px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#071B36', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Eye size={12} color="#64748B" /> View Analytics
                          </button>
                          
                          <button 
                            onClick={() => { setActiveMenuId(null); handleDownloadSessionPPT(report.id, getPPTTemplateByRole(selectedRole)); }}
                            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '8px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#071B36', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Presentation size={12} color="#64748B" /> Export PPT
                          </button>

                          <button 
                            onClick={() => { setActiveMenuId(null); handleDownloadSessionExcel(report.id); }}
                            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '8px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#071B36', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <FileText size={12} color="#64748B" /> Export Excel
                          </button>

                          {selectedRole === 'Admin' && (
                            <>
                              <div style={{ height: '1px', background: '#F1F5F9', margin: '4px 0' }} />
                              <button 
                                onClick={() => { setActiveMenuId(null); alert("Duplicating session metadata configurations..."); }}
                                style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '8px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#071B36', cursor: 'pointer' }}
                              >
                                Duplicate Quiz
                              </button>
                              <button 
                                onClick={() => { setActiveMenuId(null); alert("Quiz share link copied to clipboard!"); }}
                                style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '8px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#071B36', cursor: 'pointer' }}
                              >
                                Share Report
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#071B36', margin: '4px 0 10px 0', lineHeight: 1.3, minHeight: '36px' }}>
                    {report.title}
                  </h4>

                  {/* Stats list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #F1F5F9', paddingTop: '10px', marginBottom: '14px', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Date Hosted</span>
                      <strong style={{ color: '#475569' }}>{report.date}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Participants</span>
                      <strong style={{ color: '#071B36' }}>{report.participants}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748B' }}>Avg Score</span>
                      <strong style={{ color: '#16A34A' }}>{report.avgScore}</strong>
                    </div>
                  </div>

                  {/* Lower button row */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button 
                      onClick={() => handleFetchDetails(report.id)}
                      style={{
                        flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#FFFFFF',
                        fontSize: '0.72rem', fontWeight: 700, color: '#2563EB', cursor: 'pointer'
                      }}
                    >
                      View Analytics
                    </button>
                    
                    <button 
                      onClick={() => handleDownloadSessionPPT(report.id, getPPTTemplateByRole(selectedRole))}
                      style={{
                        padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#FFF5F0',
                        fontSize: '0.72rem', fontWeight: 700, color: '#F36F21', cursor: 'pointer'
                      }}
                      title="Quick Export PPT"
                    >
                      PPT
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#64748B', textAlign: 'center', padding: '32px', fontSize: '0.82rem' }}>No session reports matched your queries.</p>
        )}

        {/* Floating Orange '+' Quick Create Quiz Button (Fixed relative to the grid wrapper) */}
        {selectedRole !== 'Client' && (
          <a
            href="/builder"
            style={{
              position: 'absolute', bottom: '-20px', right: '24px', width: '48px', height: '48px', borderRadius: '50%',
              background: '#F36F21', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              boxShadow: '0 8px 20px rgba(243,111,33,0.35)', cursor: 'pointer', textDecoration: 'none', zIndex: 100,
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Create New Quiz Assessment"
          >
            <Plus size={22} />
          </a>
        )}

      </div>

      {/* ─── DETAILED SESSION REPORT MODAL (OVERLAY DIALOG) ─── */}
      {selectedReportDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="glass-card" style={{ width: '700px', background: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto', padding: '28px', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#071B36', fontSize: '1.25rem', fontWeight: 800 }}>{selectedReportDetails.quizTitle}</h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '0.78rem' }}>
                  Project: <strong>{selectedReportDetails.projectName}</strong> • Date: <strong>{selectedReportDetails.date}</strong>
                </p>
              </div>
              <button 
                onClick={() => setSelectedReportDetails(null)} 
                style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#94A3B8' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Quick stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Total Questions</span>
                <strong style={{ fontSize: '1.1rem', color: '#071B36', fontWeight: 800 }}>{selectedReportDetails.totalQuestions}</strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Participants</span>
                <strong style={{ fontSize: '1.1rem', color: '#071B36', fontWeight: 800 }}>{selectedReportDetails.participants.length}</strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Average Score</span>
                <strong style={{ fontSize: '1.1rem', color: '#16A34A', fontWeight: 800 }}>84%</strong>
              </div>
              <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Completion</span>
                <strong style={{ fontSize: '1.1rem', color: '#7C3AED', fontWeight: 800 }}>92%</strong>
              </div>
            </div>

            {/* Modal Tabs Selector */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '16px' }}>
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'participation', label: 'Participation' },
                { key: 'questions', label: 'Questions' },
                { key: 'gaps', label: 'Learning Gaps' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setDetailTab(tab.key)}
                  style={{
                    padding: '8px 16px', border: 'none', background: 'transparent', fontSize: '0.78rem', fontWeight: 700,
                    cursor: 'pointer', borderBottom: `2.5px solid ${detailTab === tab.key ? '#F36F21' : 'transparent'}`,
                    color: detailTab === tab.key ? '#F36F21' : '#64748B', transition: 'all 0.15s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content Scrollbox */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: '220px', maxHeight: '380px', paddingRight: '4px' }}>
              
              {/* TAB 1: OVERVIEW & EXPORTS */}
              {detailTab === 'overview' && (
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#071B36', fontWeight: 800 }}>PPT Auto-Generation Suite</h4>
                  
                  <button
                    onClick={() => handleDownloadPPTFromModal('all')}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '8px', border: 'none', color: 'white',
                      background: 'linear-gradient(135deg, #F36F21 0%, #E05A0E 100%)', fontWeight: 700, fontSize: '0.8rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      marginBottom: '16px', boxShadow: '0 4px 12px rgba(243,111,33,0.2)'
                    }}
                  >
                    <Presentation size={15} /> Download Complete Presentation Deck (All Topics)
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { label: 'Executive Summary PPT', type: 'executive' },
                      { label: 'Participation PPT', type: 'participation' },
                      { label: 'Leaderboard PPT', type: 'leaderboard' },
                      { label: 'Question Analysis PPT', type: 'question' },
                      { label: 'Learning Effectiveness PPT', type: 'learning' },
                      { label: 'Client Presentation PPT', type: 'client' },
                      { label: 'AI Insights PPT (Premium)', type: 'ai' }
                    ].map(opt => (
                      <button
                        key={opt.type}
                        onClick={() => handleDownloadPPTFromModal(opt.type)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px',
                          border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontSize: '0.78rem',
                          fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                        }}
                      >
                        <Presentation size={14} color="#7C3AED" style={{ flexShrink: 0 }} />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  <h4 style={{ margin: '16px 0 10px 0', fontSize: '0.85rem', color: '#071B36', fontWeight: 800 }}>Excel Data Export</h4>
                  <button
                    onClick={() => handleDownloadExcelFromModal()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid rgba(22,163,74,0.3)', background: '#F0FDF4', color: '#16A34A', fontSize: '0.78rem',
                      fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    <FileSpreadsheet size={15} /> Download Session Excel sheet (.xlsx)
                  </button>
                </div>
              )}

              {/* TAB 2: PARTICIPATION ROSTER */}
              {detailTab === 'participation' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>Passing Score Threshold:</label>
                    <select 
                      value={passingScore} 
                      onChange={(e) => setPassingScore(Number(e.target.value))}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.75rem', outline: 'none', background: '#FFFFFF', color: '#071B36', cursor: 'pointer' }}
                    >
                      <option value={50}>50%</option>
                      <option value={60}>60%</option>
                      <option value={70}>70%</option>
                      <option value={75}>75%</option>
                      <option value={80}>80%</option>
                      <option value={85}>85%</option>
                      <option value={90}>90%</option>
                      <option value={100}>100%</option>
                    </select>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                          <th style={{ padding: '8px 10px' }}>Name</th>
                          <th style={{ padding: '8px 10px' }}>Employee ID</th>
                          <th style={{ padding: '8px 10px' }}>Store Name</th>
                          <th style={{ padding: '8px 10px' }}>Score</th>
                          <th style={{ padding: '8px 10px' }}>Accuracy</th>
                          <th style={{ padding: '8px 10px' }}>Time Spent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReportDetails.participants.map((p, idx) => {
                          const pctStr = p.percentage || '0%';
                          const pctValue = parseInt(pctStr.replace('%', ''), 10) || 0;
                          
                          let bg = '#F0FDF4';
                          let col = '#16A34A'; // Green (Pass)
                          if (pctValue < passingScore) {
                            if (pctValue >= passingScore - 20) {
                              bg = '#FFF7ED';
                              col = '#EA580C'; // Orange (Close)
                            } else {
                              bg = '#FEF2F2';
                              col = '#EF4444'; // Red (Fail)
                            }
                          }

                          return (
                            <tr key={p.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '10px', color: '#071B36', fontWeight: 700 }}>{p.name}</td>
                              <td style={{ padding: '10px', color: '#64748B' }}>{p.employeeId || 'N/A'}</td>
                              <td style={{ padding: '10px', color: '#64748B' }}>{p.storeName || getMockDetails(p.name).store}</td>
                              <td style={{ padding: '10px', color: '#475569', fontWeight: 600 }}>{p.score || '—'}</td>
                              <td style={{ padding: '10px' }}>
                                <span style={{ background: bg, color: col, padding: '2px 8px', borderRadius: '4px', fontWeight: 700, transition: 'all 0.3s' }}>
                                  {pctStr}
                                </span>
                              </td>
                              <td style={{ padding: '10px', color: '#64748B' }}>{p.timeSpent || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: QUESTIONS EVALUATION */}
              {detailTab === 'questions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedReportDetails.questions.map((q, idx) => {
                    const diffTag = idx === 2 ? 'Hard' : idx === 1 ? 'Medium' : 'Easy';
                    const diffCol = idx === 2 ? '#EF4444' : idx === 1 ? '#F97316' : '#22C55E';
                    const diffBg = idx === 2 ? '#FEF2F2' : idx === 1 ? '#FFF7ED' : '#F0FDF4';

                    return (
                      <div key={q.id || idx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>Question {idx + 1} ({q.type})</span>
                          <span style={{ fontSize: '0.62rem', background: diffBg, color: diffCol, padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{diffTag}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#071B36', margin: '0 0 8px 0' }}>{q.text}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748B' }}>
                          <span>Correct Answer: <strong style={{ color: '#16A34A' }}>{q.correct_answer || '—'}</strong></span>
                          <span>Response Accuracy: <strong style={{ color: '#071B36' }}>{idx === 2 ? '31%' : idx === 1 ? '48%' : '92%'}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 4: LEARNING GAPS */}
              {detailTab === 'gaps' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)', padding: '12px', borderRadius: '10px' }}>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.78rem', color: '#EF4444', fontWeight: 800 }}>Technical Parameter Compliance Gap</h5>
                    <p style={{ fontSize: '0.72rem', color: '#991B1B', margin: 0, lineHeight: 1.3 }}>
                      Over 52% of incorrect participants selected secondary spacing parameter offsets, indicating confusion between old compliance guidelines and current SOP versions.
                    </p>
                    <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#EF4444', marginTop: '6px' }}>
                      Recommended Reinforcement Module: Compliance SOP Part 2
                    </span>
                  </div>

                  <div style={{ background: '#FFF7ED', border: '1px solid rgba(234,88,12,0.2)', padding: '12px', borderRadius: '10px' }}>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.78rem', color: '#EA580C', fontWeight: 800 }}>Product Knowledge Retention Trend</h5>
                    <p style={{ fontSize: '0.72rem', color: '#9A3412', margin: 0, lineHeight: 1.3 }}>
                      While overall score average is solid (90%), response time values suggest hesitation markers during scenario queries on layout configurations.
                    </p>
                    <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#EA580C', marginTop: '6px' }}>
                      Recommended Reinforcement Module: Product Layout Standardizing Check
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: '16px' }}>
              <button 
                onClick={() => setSelectedReportDetails(null)} 
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF',
                  fontSize: '0.78rem', fontWeight: 700, color: '#64748B', cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
