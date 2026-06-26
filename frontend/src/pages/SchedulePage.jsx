import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Video, Clock, 
  ExternalLink, RefreshCw, BookOpen, AlertCircle, Play, CheckCircle2, 
  Circle, Users, Trophy, Award, MapPin, ClipboardList, Plus, X, Mail
} from 'lucide-react';
import { io } from 'socket.io-client';

export default function SchedulePage() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [activeTab, setActiveTab] = useState('meetings');

  // Calendar States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);

  // Modal for scheduling meetings (for Trainer/PM/Admin)
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isSuccessView, setIsSuccessView] = useState(false);
  const [isUrlCustom, setIsUrlCustom] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    projectId: '',
    scheduledAt: '',
    url: '',
    inviteeIds: [],
    platform: 'google_meet'
  });

  const canManage = ['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager'].includes(user?.role);
  const isTrainee = !canManage;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const makeDateStr = (day) => {
    if (!day) return '';
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Fetch all training modules and meetings
  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      
      const trainingsRes = await axios.get('/api/trainings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(trainingsRes.data || []);

      if (canManage) {
        const [projRes, usersRes] = await Promise.all([
          axios.get('/api/projects', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/api/users', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setProjects(projRes.data || []);
        setUsersList(usersRes.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch schedule data', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData(false);

      // Setup live socket updates
      const socket = io(window.location.origin);
      const handleSync = () => {
        fetchData(true);
      };

      socket.on('attendance_updated', handleSync);
      socket.on('live_session_finished', handleSync);

      return () => {
        socket.disconnect();
      };
    }
  }, [token, user]);

  // Handle Jitsi/Google Meet link auto generation
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
          const meetLink = `https://meet.jit.si/QuizHive-${part1}-${part2}-${part3}`;
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

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!meetingForm.title.trim() || !meetingForm.scheduledAt || !meetingForm.url.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      await axios.post('/api/trainings', {
        ...meetingForm,
        type: 'Meeting'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsSuccessView(true);
      fetchData(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to schedule training meeting.");
    }
  };

  // Filter items based on selected project
  const filteredItems = items.filter(item => {
    if (selectedProjectId === 'all') return true;
    return item.projectId === selectedProjectId || item.Project?.id === selectedProjectId;
  });

  const meetings = filteredItems.filter(item => item.type === 'Meeting');
  const courseMaterials = filteredItems.filter(item => item.type !== 'Meeting');

  // Calendar lookup map
  const itemsByDate = filteredItems.reduce((map, item) => {
    if (!item.scheduledAt) return map;
    const dateStr = new Date(item.scheduledAt).toISOString().split('T')[0];
    if (!map[dateStr]) map[dateStr] = [];
    map[dateStr].push(item);
    return map;
  }, {});

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const selectedDateItems = itemsByDate[selectedDateStr] || [];

  return (
    <div className="view-section active" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', gap: '24px', paddingBottom: '32px' }}>
      
      {/* Page Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', flexShrink: 0 }}>
        <div>
          <h2 className="section-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, margin: 0 }}>
            📅 Training & Meeting Schedule
          </h2>
          <p className="section-desc" style={{ margin: '4px 0 0 0' }}>
            Broad month calendar and summary list of scheduled live webinars, offline quizzes, and training courses.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Sync Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={loading || syncing}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '38px', borderRadius: '10px', fontWeight: 600, fontSize: '0.82rem' }}
          >
            <RefreshCw size={15} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            Sync Schedule
          </button>

          {/* Project Filter (if manager/trainer/admin) */}
          {canManage && (
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                height: '38px'
              }}
            >
              <option value="all">🌐 All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>📁 {p.name}</option>
              ))}
            </select>
          )}

          {/* Schedule Button */}
          {canManage && (
            <button
              onClick={() => {
                setIsSuccessView(false);
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
                setIsMeetingModalOpen(true);
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '38px', borderRadius: '10px', fontWeight: 600, fontSize: '0.82rem' }}
            >
              <Plus size={16} /> Schedule Class
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', flexDirection: 'column', gap: '12px' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading schedule details...</span>
        </div>
      ) : (
        <>
          {/* Calendar & Selected Day Detail (Grid Layout) */}
          <div style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: '24px', alignItems: 'stretch' }}>
            
            {/* Broad Month Calendar */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarIcon size={20} color="#F36F21" />
                  {monthNames[month]} {year}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    onClick={handlePrevMonth}
                    style={{ background: 'rgba(0,0,0,0.03)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={handleNextMonth}
                    style={{ background: 'rgba(0,0,0,0.03)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Day Titles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dLabel, idx) => (
                  <div key={idx} style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {dLabel.substring(0, 3)}
                  </div>
                ))}
              </div>

              {/* Monthly Days Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '100px', gap: '8px' }}>
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} style={{ background: 'rgba(0,0,0,0.01)', borderRadius: '12px' }} />;
                  }

                  const dateStr = makeDateStr(day);
                  const dayItems = itemsByDate[dateStr] || [];
                  const isSelected = dateStr === selectedDateStr;
                  const isToday = new Date().toISOString().split('T')[0] === dateStr;

                  return (
                    <div
                      key={`day-${day}`}
                      onClick={() => setSelectedDateStr(dateStr)}
                      style={{
                        borderRadius: '12px',
                        padding: '8px',
                        background: isSelected 
                          ? 'var(--primary-glow)' 
                          : isToday 
                            ? 'rgba(37, 99, 235, 0.05)' 
                            : 'var(--bg-tertiary)',
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : isToday ? 'rgba(37, 99, 235, 0.3)' : 'var(--border-glass)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'stretch',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseOver={e => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--text-muted)';
                      }}
                      onMouseOut={e => {
                        if (!isSelected) e.currentTarget.style.borderColor = isToday ? 'rgba(37, 99, 235, 0.3)' : 'var(--border-glass)';
                      }}
                    >
                      {/* Day Number */}
                      <span style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: (isSelected || isToday) ? 800 : 600, 
                        color: isSelected ? 'var(--primary)' : isToday ? '#2563EB' : 'var(--text-primary)',
                        marginBottom: '4px'
                      }}>
                        {day}
                      </span>

                      {/* Day Scheduled List (Broad labels directly inside grid cells!) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflow: 'hidden' }}>
                        {dayItems.slice(0, 2).map((item, iIdx) => (
                          <div 
                            key={iIdx}
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: item.type === 'Meeting' ? 'rgba(243,111,33,0.1)' : 'rgba(0,200,150,0.1)',
                              color: item.type === 'Meeting' ? '#F36F21' : '#00C896',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              border: `1px solid ${item.type === 'Meeting' ? 'rgba(243,111,33,0.2)' : 'rgba(0,200,150,0.2)'}`
                            }}
                            title={item.title}
                          >
                            {item.type === 'Meeting' ? '🎥' : '📚'} {item.title}
                          </div>
                        ))}
                        {dayItems.length > 2 && (
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center', marginTop: '2px' }}>
                            + {dayItems.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Detail Panel */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                  Selected Date Details
                </h4>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {new Date(selectedDateStr).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedDateItems.length > 0 ? (
                  selectedDateItems.map((item) => {
                    const isMeeting = item.type === 'Meeting';
                    const timeStr = item.scheduledAt 
                      ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';
                    
                    return (
                      <div 
                        key={item.id} 
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-glass)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isMeeting ? 'rgba(243,111,33,0.1)' : 'rgba(0,200,150,0.1)',
                            color: isMeeting ? '#F36F21' : '#00C896',
                            fontWeight: 700,
                            border: `1px solid ${isMeeting ? 'rgba(243,111,33,0.25)' : 'rgba(0,200,150,0.25)'}`
                          }}>
                            {item.type}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {item.Project?.name || 'Global Project'}
                          </span>
                        </div>

                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {item.title}
                        </h4>

                        {item.description && (
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            {item.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                          {isMeeting ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              <Clock size={13} color="#F36F21" /> {timeStr}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              Duration: {item.duration || 'N/A'}
                            </span>
                          )}

                          {isMeeting ? (
                            item.url && (
                              <button 
                                onClick={() => navigate(`/trainings?id=${item.id}`)}
                                className="btn btn-primary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.78rem' }}
                              >
                                <Video size={12} /> Join Class
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => navigate(`/trainings?id=${item.id}`)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.78rem' }}
                            >
                              <Play size={12} /> Open Module
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '48px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                    <CalendarIcon size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic' }}>No webinars or training modules scheduled for this date.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Broader Summary Section below Calendar */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '1.15rem' }}>
                  📋 Summary of Meetings & Training Courses
                </h3>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Complete catalog breakdown for your assigned workspace
                </p>
              </div>

              {/* Tab selector */}
              <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <button
                  onClick={() => setActiveTab('meetings')}
                  style={{
                    padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                    background: activeTab === 'meetings' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'meetings' ? 'white' : 'var(--text-secondary)',
                    transition: 'all 0.18s'
                  }}
                >
                  🎥 Meetings & Webinars ({meetings.length})
                </button>
                <button
                  onClick={() => setActiveTab('courses')}
                  style={{
                    padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                    background: activeTab === 'courses' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'courses' ? 'white' : 'var(--text-secondary)',
                    transition: 'all 0.18s'
                  }}
                >
                  📚 Training Material ({courseMaterials.length})
                </button>
              </div>
            </div>

            {/* Tab Panels */}
            {activeTab === 'meetings' ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
                      <th style={{ padding: '12px 8px' }}>Project Name</th>
                      <th style={{ padding: '12px 8px' }}>Topic / Webinar</th>
                      <th style={{ padding: '12px 8px' }}>Scheduled Date & Time</th>
                      <th style={{ padding: '12px 8px' }}>Platform</th>
                      <th style={{ padding: '12px 8px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.length > 0 ? (
                      meetings.map((m) => {
                        const dateObj = m.scheduledAt ? new Date(m.scheduledAt) : null;
                        const dateFormatted = dateObj 
                          ? dateObj.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                          : 'N/A';
                        
                        let platformLabel = 'Jitsi Meet';
                        if (m.url?.includes('meet.google.com')) platformLabel = 'Google Meet';
                        else if (m.url?.includes('zoom.us')) platformLabel = 'Zoom';

                        return (
                          <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                            <td style={{ padding: '14px 8px', fontWeight: 600 }}>{m.Project?.name || 'Global / Common'}</td>
                            <td style={{ padding: '14px 8px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.title}</div>
                              {m.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{m.description}</div>}
                            </td>
                            <td style={{ padding: '14px 8px', color: 'var(--text-primary)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={12} color="#F36F21" /> {dateFormatted}
                              </div>
                            </td>
                            <td style={{ padding: '14px 8px' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: 'rgba(243,111,33,0.08)',
                                color: '#F36F21',
                                fontWeight: 700,
                                border: '1px solid rgba(243,111,33,0.15)'
                              }}>
                                {platformLabel}
                              </span>
                            </td>
                            <td style={{ padding: '14px 8px' }}>
                              <button 
                                onClick={() => navigate(`/trainings?id=${m.id}`)}
                                className="btn btn-primary btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.75rem' }}
                              >
                                <Video size={12} /> Join Session
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No scheduled training meetings found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
                      <th style={{ padding: '12px 8px' }}>Project Name</th>
                      <th style={{ padding: '12px 8px' }}>Material / Course</th>
                      <th style={{ padding: '12px 8px' }}>Type</th>
                      <th style={{ padding: '12px 8px' }}>Duration</th>
                      <th style={{ padding: '12px 8px' }}>Status</th>
                      <th style={{ padding: '12px 8px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseMaterials.length > 0 ? (
                      courseMaterials.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                          <td style={{ padding: '14px 8px', fontWeight: 600 }}>{c.Project?.name || 'Global / Common'}</td>
                          <td style={{ padding: '14px 8px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.title}</div>
                            {c.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{c.description}</div>}
                          </td>
                          <td style={{ padding: '14px 8px' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'rgba(0,200,150,0.08)',
                              color: '#00C896',
                              fontWeight: 700,
                              border: '1px solid rgba(0,200,150,0.15)'
                            }}>
                              {c.type}
                            </span>
                          </td>
                          <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>{c.duration || 'Self-paced'}</td>
                          <td style={{ padding: '14px 8px' }}>
                            {c.completed ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#00C896', fontWeight: 700, fontSize: '0.78rem' }}>
                                <CheckCircle2 size={14} /> Completed
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem' }}>
                                <Circle size={14} /> Assigned
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 8px' }}>
                            <button 
                              onClick={() => navigate(`/trainings?id=${c.id}`)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.75rem' }}
                            >
                              <Play size={12} /> Launch Module
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No training courses or modules available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create New Meeting Modal (Trainer/Admin/PM helper) */}
      {isMeetingModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="glass-card" style={{ width: '650px', background: 'var(--bg-primary)', maxHeight: '90vh', overflowY: 'auto', padding: '32px', borderRadius: '16px' }}>
            
            {!isSuccessView ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600 }}>Schedule Live Training Class</h3>
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
                      placeholder="e.g. Q2 Product Shelf Placement Webinar"
                      required
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Description</label>
                    <textarea 
                      value={meetingForm.description} 
                      onChange={e => setMeetingForm({...meetingForm, description: e.target.value})} 
                      placeholder="Specify agenda or outline..."
                      rows={3}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  {/* Project Selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Select Project</label>
                      <select 
                        value={meetingForm.projectId} 
                        onChange={e => handleProjectChange(e.target.value)} 
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                      >
                        <option value="">-- General / Global --</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Date & Time *</label>
                      <input 
                        type="datetime-local" 
                        value={meetingForm.scheduledAt} 
                        onChange={e => setMeetingForm({...meetingForm, scheduledAt: e.target.value})} 
                        required
                        style={{ width: '100%', padding: '11px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Platform Selection */}
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

                  {/* Meeting URL */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Meeting URL *
                    </label>
                    <input 
                      type="text" 
                      value={meetingForm.url} 
                      onChange={e => {
                        setIsUrlCustom(true);
                        setMeetingForm({...meetingForm, url: e.target.value});
                      }} 
                      placeholder="https://meet.google.com/abc-defg-hij"
                      required
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }} 
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                      * A fully functional meeting link is generated by default. You can also replace it with a custom Google Calendar link.
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setIsMeetingModalOpen(false); setIsUrlCustom(false); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={16} /> Schedule & Invite
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✉️</div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 700 }}>Training Scheduled Successfully!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '450px', margin: '0 auto 24px' }}>
                  The training meeting has been successfully booked. Email invitations containing the join URL have been sent to all assigned project members.
                </p>
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
                  Close & Back to Schedule
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
