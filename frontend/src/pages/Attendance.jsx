import React, { useState, useEffect, useContext } from 'react';
import { Download, Calendar, Award, Clock, Users, ShieldAlert, BarChart2, CheckCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';

export default function Attendance() {
  const { token, user } = useContext(AuthContext);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('quizzes'); // quizzes or trainings
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedZone, setSelectedZone] = useState('All');
  
  // Project detail modal states
  const [selectedDetailProject, setSelectedDetailProject] = useState(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [modalDetailTab, setModalDetailTab] = useState('quizzes');

  const handleProjectClick = (projectName) => {
    setSelectedDetailProject(projectName);
    // Auto-select the matching tab based on which attendance view triggered the click
    setModalDetailTab(activeTab === 'trainings' ? 'trainings' : 'quizzes');
    setIsProjectModalOpen(true);
  };

  useEffect(() => {
    if (token) {
      fetchAttendance(false);

      // Establish live socket synchronization
      const socket = io(window.location.origin);
      
      const handleSync = (data) => {
        console.log('[Live Sync] Real-time updates detected:', data);
        fetchAttendance(true);
      };

      socket.on('live_session_finished', handleSync);
      socket.on('offline_response_submitted', handleSync);
      socket.on('attendance_updated', handleSync);
      socket.on('report_deleted', handleSync);

      // Background periodic polling as fallback (every 20 seconds)
      const pollInterval = setInterval(() => {
        console.log('[Polling Sync] Fetching latest attendance data...');
        fetchAttendance(true);
      }, 20000);

      return () => {
        socket.disconnect();
        clearInterval(pollInterval);
      };
    }
  }, [token]);

  const fetchAttendance = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError('');
      const response = await axios.get('/api/reports/attendance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceData(response.data);
    } catch (err) {
      console.error('Failed to fetch attendance', err);
      setError(err.response?.data?.error || 'Failed to fetch attendance data');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const projectsList = attendanceData 
    ? [...new Set([
        ...(attendanceData.quizAttendance || []).map(x => x.projectName),
        ...(attendanceData.trainingAttendance || []).map(x => x.projectName)
      ])].filter(Boolean).sort()
    : [];

  const zonesList = ['North', 'West', 'East', 'South'];

  const filteredQuizAttendance = (attendanceData?.quizAttendance || [])
    .filter(log => {
      const matchProj = selectedProject === 'All' || log.projectName === selectedProject;
      const matchZone = selectedZone === 'All' || log.zone === selectedZone;
      return matchProj && matchZone;
    });

  const filteredTrainingAttendance = (attendanceData?.trainingAttendance || [])
    .filter(log => {
      const matchProj = selectedProject === 'All' || log.projectName === selectedProject;
      const matchZone = selectedZone === 'All' || log.zone === selectedZone;
      return matchProj && matchZone;
    });

  const handleExportCSV = () => {
    if (!attendanceData || isEmployeeView) {
      alert("No data available to export.");
      return;
    }

    if (activeTab === 'quizzes') {
      const quizAttendance = filteredQuizAttendance;
      if (quizAttendance.length === 0) {
        alert("No quiz attendance data available to export.");
        return;
      }
      const headers = "Project,Employee ID,Employee Name,Zone,Date,Quiz Attempted,Avg Score";
      const rows = quizAttendance.map(e => `"${e.projectName}","${e.employeeId}","${e.name}","${e.zone || 'N/A'}","${e.dates}",${e.quizCount},"${e.avgScore}"`);
      
      const csvContent = headers + "\n" + rows.join("\n");
      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quizhive_quiz_attendance_report.csv`;
      link.setAttribute("download", `quizhive_quiz_attendance_report.csv`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } else {
      const trainingAttendance = filteredTrainingAttendance;
      if (trainingAttendance.length === 0) {
        alert("No training attendance data available to export.");
        return;
      }
      const headers = "Project,Employee ID,Employee Name,Zone,Date,Training Topic,Time Spent,Status";
      const rows = trainingAttendance.map(e => `"${e.projectName}","${e.employeeId}","${e.name}","${e.zone || 'N/A'}","${e.date}","${e.topic}","${e.timeSpent}","${e.status}"`);
      
      const csvContent = headers + "\n" + rows.join("\n");
      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `quizhive_training_attendance_report.csv`;
      link.setAttribute("download", `quizhive_training_attendance_report.csv`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  };


  const getZoneBadgeStyle = (zone) => {
    switch (zone) {
      case 'North':
        return { background: 'rgba(255,107,53,0.1)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.2)' };
      case 'West':
        return { background: 'rgba(0,200,150,0.1)', color: '#00C896', border: '1px solid rgba(0,200,150,0.2)' };
      case 'East':
        return { background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' };
      case 'South':
        return { background: 'rgba(46,168,255,0.1)', color: '#2EA8FF', border: '1px solid rgba(46,168,255,0.2)' };
      default:
        return { background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' };
    }
  };

  if (loading) {
    return (
      <div className="view-section active" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading attendance details...</p>
      </div>
    );
  }

  const isEmployeeView = attendanceData && attendanceData.isEmployee;

  return (
    <div className="view-section active" style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
      
      <div className="section-header">
        <div>
          <h2 className="section-title">Attendance Tracking</h2>
          <p className="section-desc">
            {isEmployeeView 
              ? "Track your presence, quiz completion, and training meeting history." 
              : "Monitor your team's quiz participation history, training meeting attendance, and completion rates."}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={async () => {
              setSyncing(true);
              await fetchAttendance(true);
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
          {!isEmployeeView && attendanceData && (
            <button className="btn btn-secondary" onClick={handleExportCSV} style={{ height: '38px' }}>
              <Download size={18} /> Export {activeTab === 'quizzes' ? 'Quiz' : 'Training'} Attendance (CSV)
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error, #ef4444)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <ShieldAlert size={20} /> {error}
        </div>
      )}

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('quizzes')} 
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'quizzes' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'quizzes' ? 'white' : 'var(--text-secondary)',
            border: activeTab === 'quizzes' ? '1px solid var(--primary)' : '1px solid transparent',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Quiz Attendance
        </button>
        <button 
          onClick={() => setActiveTab('trainings')} 
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: activeTab === 'trainings' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'trainings' ? 'white' : 'var(--text-secondary)',
            border: activeTab === 'trainings' ? '1px solid var(--primary)' : '1px solid transparent',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Google Meet Trainings
        </button>
      </div>

      {/* Smart Filters (Trainer/Manager only) */}
      {!isEmployeeView && attendanceData && (
        <div style={{ display: 'flex', gap: '16px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-glass)', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Filter by Project</label>
            <select 
              value={selectedProject} 
              onChange={e => setSelectedProject(e.target.value)} 
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-primary)', minWidth: '180px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Projects</option>
              {projectsList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Filter by Zone</label>
            <select 
              value={selectedZone} 
              onChange={e => setSelectedZone(e.target.value)} 
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)', color: 'var(--text-primary)', minWidth: '150px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Zones</option>
              {zonesList.map(z => <option key={z} value={z}>{z} Zone</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {isEmployeeView ? (
        <div className="dashboard-grid">
          <div className="glass-card stat-card">
            <div className="stat-info">
              <span className="stat-label">Total Days Present</span>
              <span className="stat-value">{attendanceData.summary.datesCount}</span>
            </div>
            <div className="stat-icon-wrapper primary" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
              <Calendar size={24} />
            </div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-info">
              <span className="stat-label">Quizzes Attempted</span>
              <span className="stat-value">{attendanceData.summary.quizCount}</span>
            </div>
            <div className="stat-icon-wrapper secondary" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
              <Award size={24} />
            </div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-info">
              <span className="stat-label">Meetings Attended</span>
              <span className="stat-value">{attendanceData.trainingLogs ? attendanceData.trainingLogs.length : 0}</span>
            </div>
            <div className="stat-icon-wrapper success" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>
              <Clock size={24} />
            </div>
          </div>
        </div>
      ) : (
        attendanceData && (
          activeTab === 'quizzes' ? (
            <div className="dashboard-grid">
              <div className="glass-card stat-card">
                <div className="stat-info">
                  <span className="stat-label">Employees Active</span>
                  <span className="stat-value">{filteredQuizAttendance.filter(u => u.quizCount > 0).length} / {Math.max(filteredQuizAttendance.length, 1)}</span>
                </div>
                <div className="stat-icon-wrapper primary" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                  <Users size={24} />
                </div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-info">
                  <span className="stat-label">Avg Quizzes per Employee</span>
                  <span className="stat-value">
                    {filteredQuizAttendance.length > 0 ? (filteredQuizAttendance.reduce((sum, u) => sum + u.quizCount, 0) / filteredQuizAttendance.length).toFixed(1) : 0}
                  </span>
                </div>
                <div className="stat-icon-wrapper secondary" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                  <Award size={24} />
                </div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-info">
                  <span className="stat-label">Overall Average Score</span>
                  <span className="stat-value">
                    {filteredQuizAttendance.length > 0 && filteredQuizAttendance.filter(u => u.quizCount > 0).length > 0
                      ? `${Math.round(
                          filteredQuizAttendance.filter(u => u.quizCount > 0).reduce((sum, u) => sum + parseInt(u.avgScore), 0) / 
                          filteredQuizAttendance.filter(u => u.quizCount > 0).length
                        )}%`
                      : '0%'}
                  </span>
                </div>
                <div className="stat-icon-wrapper success" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>
                  <BarChart2 size={24} />
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-grid">
              <div className="glass-card stat-card">
                <div className="stat-info">
                  <span className="stat-label">Trainees Engaged</span>
                  <span className="stat-value">{[...new Set(filteredTrainingAttendance.map(t => t.userId))].length}</span>
                </div>
                <div className="stat-icon-wrapper primary" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                  <Users size={24} />
                </div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-info">
                  <span className="stat-label">Total Session Attendances</span>
                  <span className="stat-value">{filteredTrainingAttendance.length}</span>
                </div>
                <div className="stat-icon-wrapper secondary" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                  <Award size={24} />
                </div>
              </div>
              <div className="glass-card stat-card">
                <div className="stat-info">
                  <span className="stat-label">Google Meet Topic Counts</span>
                  <span className="stat-value">{[...new Set(filteredTrainingAttendance.map(t => t.topic))].length}</span>
                </div>
                <div className="stat-icon-wrapper success" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>
                  <BarChart2 size={24} />
                </div>
              </div>
            </div>
          )
        )
      )}

      {/* Details Table */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '16px' }}>
          {isEmployeeView 
            ? (activeTab === 'quizzes' ? "Your Quiz Participation Log" : "Your Training Meeting Attendance Log")
            : (activeTab === 'quizzes' ? "Employee Quiz Attendance Log" : "Employee Training Meeting Attendance Log")}
        </h3>
        
        {isEmployeeView ? (
          activeTab === 'quizzes' ? (
            (attendanceData.logs || []).length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px' }}>Date</th>
                      <th style={{ padding: '12px' }}>Quiz Title</th>
                      <th style={{ padding: '12px' }}>Score</th>
                      <th style={{ padding: '12px' }}>Correct Percentage</th>
                      <th style={{ padding: '12px' }}>Time Spent</th>
                      <th style={{ padding: '12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attendanceData.logs || []).map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td style={{ padding: '16px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>{log.date}</td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-primary)' }}>{log.quizTitle}</td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{log.score}</td>
                        <td style={{ padding: '16px 12px' }}>
                          <span className="badge badge-primary" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(0, 140, 255, 0.2)' }}>
                            {log.percentage}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{log.timeSpent}</td>
                        <td style={{ padding: '16px 12px' }}>
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--success-glow)', color: 'var(--success)', border: '1px solid rgba(139, 207, 0, 0.2)' }}>
                            <CheckCircle size={14} /> {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>You haven't participated in any quizzes yet.</p>
            )
          ) : (
            (attendanceData.trainingLogs || []).length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px' }}>Date</th>
                      <th style={{ padding: '12px' }}>Training Topic</th>
                      <th style={{ padding: '12px' }}>Time Spent</th>
                      <th style={{ padding: '12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attendanceData.trainingLogs || []).map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td style={{ padding: '16px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>{log.date}</td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-primary)' }}>{log.topic}</td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{log.timeSpent}</td>
                        <td style={{ padding: '16px 12px' }}>
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--success-glow)', color: 'var(--success)', border: '1px solid rgba(139, 207, 0, 0.2)' }}>
                            <CheckCircle size={14} /> {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>You haven't attended any training meetings yet.</p>
            )
          )
        ) : (
          activeTab === 'quizzes' ? (
            filteredQuizAttendance.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px' }}>Project</th>
                      <th style={{ padding: '12px' }}>Employee ID</th>
                      <th style={{ padding: '12px' }}>Employee Name</th>
                      <th style={{ padding: '12px' }}>Zone</th>
                      <th style={{ padding: '12px' }}>Date</th>
                      <th style={{ padding: '12px' }}>Quiz Attempted</th>
                      <th style={{ padding: '12px' }}>Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuizAttendance.map((log) => (
                      <tr key={log.userId} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td 
                          style={{ padding: '16px 12px', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => handleProjectClick(log.projectName)}
                        >
                          {log.projectName}
                        </td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{log.employeeId}</td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>{log.name}</td>
                        <td style={{ padding: '16px 12px' }}>
                          <span style={{ 
                            ...getZoneBadgeStyle(log.zone),
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'inline-block'
                          }}>
                            {log.zone || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{log.dates}</td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-primary)', fontWeight: 600 }}>{log.quizCount}</td>
                        <td style={{ padding: '16px 12px' }}>
                          <span className={log.quizCount > 0 ? "badge badge-success" : "badge badge-primary"} style={{ background: log.quizCount > 0 ? 'var(--success-glow)' : 'var(--bg-tertiary)', color: log.quizCount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                            {log.quizCount > 0 ? log.avgScore : '0%'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>No employee quiz attendance logs match the active filters.</p>
            )
          ) : (
            filteredTrainingAttendance.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px' }}>Project</th>
                      <th style={{ padding: '12px' }}>Employee ID</th>
                      <th style={{ padding: '12px' }}>Employee Name</th>
                      <th style={{ padding: '12px' }}>Zone</th>
                      <th style={{ padding: '12px' }}>Date</th>
                      <th style={{ padding: '12px' }}>Training Topic</th>
                      <th style={{ padding: '12px' }}>Time Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrainingAttendance.map((log, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td
                          style={{ padding: '16px 12px', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => handleProjectClick(log.projectName)}
                        >
                          {log.projectName}
                        </td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{log.employeeId}</td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>{log.name}</td>
                        <td style={{ padding: '16px 12px' }}>
                          <span style={{ 
                            ...getZoneBadgeStyle(log.zone),
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'inline-block'
                          }}>
                            {log.zone || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{log.date}</td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>{log.topic}</td>
                        <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>{log.timeSpent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>No training meeting logs match the active filters.</p>
            )
          )
        )}
      </div>

      {/* Project Detail Drilldown Modal */}
      {isProjectModalOpen && selectedDetailProject && (() => {
        const modalTab = activeTab; // inherit active tab context
        const projQuizRows  = (attendanceData?.quizAttendance     || []).filter(x => x.projectName === selectedDetailProject);
        const projTrainRows = (attendanceData?.trainingAttendance || []).filter(x => x.projectName === selectedDetailProject);
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(6px)' }}>
            <div style={{ width: '860px', background: 'var(--bg-secondary)', maxHeight: '88vh', overflowY: 'auto', padding: '32px', borderRadius: '20px', border: '1px solid var(--border-glass)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', color: 'var(--text-primary)' }}>

              {/* Modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem' }}>📂 {selectedDetailProject}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Attendance drill-down — {projQuizRows.length} quiz · {projTrainRows.length} meeting record{projTrainRows.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => { setIsProjectModalOpen(false); setSelectedDetailProject(null); }}
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✕
                </button>
              </div>

              {/* Modal tab pills */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '14px' }}>
                {[
                  { key: 'quizzes',   label: `🏆 Quiz Attendance (${projQuizRows.length})` },
                  { key: 'trainings', label: `📹 Meeting Attendance (${projTrainRows.length})` }
                ].map(t => (
                  <button key={t.key}
                    onClick={() => setModalDetailTab(t.key)}
                    style={{
                      padding: '7px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                      background: modalDetailTab === t.key ? 'var(--primary)' : 'transparent',
                      color:      modalDetailTab === t.key ? '#fff' : 'var(--text-secondary)',
                      border:     modalDetailTab === t.key ? '1px solid var(--primary)' : '1px solid transparent',
                      transition: 'all 0.2s'
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Quiz Attendance table */}
              {modalDetailTab === 'quizzes' && (
                projQuizRows.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          <th style={{ padding: '10px 12px' }}>Employee ID</th>
                          <th style={{ padding: '10px 12px' }}>Name</th>
                          <th style={{ padding: '10px 12px' }}>Zone</th>
                          <th style={{ padding: '10px 12px' }}>Quiz Attempted</th>
                          <th style={{ padding: '10px 12px' }}>Avg Score</th>
                          <th style={{ padding: '10px 12px' }}>Dates</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projQuizRows.map(emp => (
                          <tr key={emp.userId} style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.88rem' }}>
                            <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{emp.employeeId}</td>
                            <td style={{ padding: '12px', fontWeight: 600 }}>{emp.name}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ ...getZoneBadgeStyle(emp.zone), padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>{emp.zone || 'N/A'}</span>
                            </td>
                            <td style={{ padding: '12px', fontWeight: 700 }}>{emp.quizCount}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ background: 'rgba(34,197,94,0.12)', color: '#15803D', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem' }}>{emp.avgScore}</span>
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{emp.dates}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>No quiz attendance records for this project.</p>
              )}

              {/* Meeting Attendance table */}
              {modalDetailTab === 'trainings' && (
                projTrainRows.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          <th style={{ padding: '10px 12px' }}>Name</th>
                          <th style={{ padding: '10px 12px' }}>Zone</th>
                          <th style={{ padding: '10px 12px' }}>Date</th>
                          <th style={{ padding: '10px 12px' }}>Training Topic</th>
                          <th style={{ padding: '10px 12px' }}>Time Spent</th>
                          <th style={{ padding: '10px 12px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projTrainRows.map((log, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '0.88rem' }}>
                            <td style={{ padding: '12px', fontWeight: 600 }}>{log.name}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ ...getZoneBadgeStyle(log.zone), padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>{log.zone || 'N/A'}</span>
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{log.date}</td>
                            <td style={{ padding: '12px', fontWeight: 500 }}>{log.topic}</td>
                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{log.timeSpent}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ background: log.status === 'Completed' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: log.status === 'Completed' ? '#15803D' : '#B45309', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>No meeting attendance records for this project.</p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
