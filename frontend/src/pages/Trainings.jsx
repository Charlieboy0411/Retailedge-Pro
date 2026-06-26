import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Play, FileText, Presentation, Image as ImageIcon, Music, CheckCircle2, Circle, Plus, Trash2, ShieldAlert, Video, ExternalLink } from 'lucide-react';
import CalendarWidget from '../components/CalendarWidget';

export default function Trainings() {
  const { token, user } = useContext(AuthContext);

  const backendUrl = '';
  const [trainings, setTrainings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [searchParams] = useSearchParams();
  const trainingIdParam = searchParams.get('id');

  // Meeting Attendance States
  const [isAttendingMeeting, setIsAttendingMeeting] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState(null);
  const [meetingElapsed, setMeetingElapsed] = useState(0);

  // New Training Form
  const [newTraining, setNewTraining] = useState({
    title: '', description: '', type: 'Video', url: '', duration: '', projectId: '', scheduledAt: ''
  });

  const isTrainee = !['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager'].includes(user?.role);
  const canManage = ['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager'].includes(user?.role);


  useEffect(() => {
    fetchTrainings();
    if (canManage) {
      fetchProjects();
    }
  }, [token]);

  useEffect(() => {
    if (newTraining.type === 'Meeting') {
      setNewTraining(prev => {
        const isCurrentUrlJitsi = !prev.url || prev.url.includes('meet.jit.si');
        if (!isCurrentUrlJitsi) {
          return prev;
        }

        const selectedProj = projects.find(p => p.id === prev.projectId);
        const cleanProjName = selectedProj ? selectedProj.name : 'training';
        const slug = cleanProjName.toLowerCase().replace(/[^a-z]/g, '');
        const part1 = (slug.substring(0, 3) || 'qzh').padEnd(3, 'a');
        
        const pool = 'abcdefghijklmnopqrstuvwxyz';
        const rand = (len) => Array.from({ length: len }, () => pool[Math.floor(Math.random() * pool.length)]).join('');
        
        const part2 = ((slug.substring(3, 5) || '') + rand(4)).substring(0, 4);
        const part3 = rand(3);
        const meetLink = `https://meet.jit.si/QuizHive-${part1}-${part2}-${part3}`;
        
        return { ...prev, url: meetLink };
      });
    }
  }, [newTraining.type, newTraining.projectId, projects]);

  const fetchTrainings = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/trainings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrainings(response.data);
      if (response.data.length > 0) {
        const matching = trainingIdParam 
          ? response.data.find(t => String(t.id) === String(trainingIdParam))
          : null;
        setSelectedTraining(matching || response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch trainings', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    }
  };

  const handleCreateTraining = async (e) => {
    e.preventDefault();
    try {
      let formattedUrl = newTraining.url.trim();
      if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      await axios.post(`${backendUrl}/api/trainings`, { ...newTraining, url: formattedUrl }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsCreating(false);
      setNewTraining({ title: '', description: '', type: 'Video', url: '', duration: '', projectId: '', scheduledAt: '' });
      fetchTrainings();
    } catch (error) {
      console.error('Failed to create training', error);
      alert('Failed to upload training material.');
    }
  };

  const handleDeleteTraining = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await axios.delete(`${backendUrl}/api/trainings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedTraining?.id === id) {
        setSelectedTraining(null);
      }
      fetchTrainings();
    } catch (error) {
      console.error('Failed to delete training', error);
    }
  };

  const handleToggleComplete = async (training) => {
    const nextCompleted = !training.completed;
    try {
      await axios.post(`${backendUrl}/api/trainings/${training.id}/progress`, 
        { completed: nextCompleted },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setTrainings(trainings.map(t => 
        t.id === training.id ? { ...t, completed: nextCompleted } : t
      ));
      if (selectedTraining?.id === training.id) {
        setSelectedTraining({ ...selectedTraining, completed: nextCompleted });
      }

      // Check if all complete to show claim prompt
      fetchTrainings();
    } catch (error) {
      console.error('Failed to update progress', error);
    }
  };

  const handleClaimCertificate = async () => {
    if (!user.projectId) {
      alert("You must be assigned to a project to claim a certificate.");
      return;
    }
    try {
      const response = await axios.post(`${backendUrl}/api/certificates/claim`, 
        { projectId: user.projectId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("🎉 Congratulations! Your certificate has been issued.");
    } catch (error) {
      console.error('Failed to claim certificate', error);
      alert(error.response?.data?.error || "Unable to claim certificate.");
    }
  };

  const lastSyncTimeRef = useRef(Date.now());

  const handleStartMeeting = async (trainingId, url) => {
    const startTime = Date.now();
    lastSyncTimeRef.current = startTime;
    setIsAttendingMeeting(true);
    setMeetingStartTime(startTime);
    setMeetingElapsed(0);
    localStorage.setItem(`meeting_start_${trainingId}`, String(startTime));

    // Open URL in new window/tab immediately (mobile-friendly, supports Google Meet)
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    const sendProgress = async (lat, lng) => {
      try {
        await axios.post(`${backendUrl}/api/trainings/${trainingId}/progress`,
          { completed: false, timeSpent: 1, latitude: lat, longitude: lng },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (e) {
        console.error('Could not record meeting join:', e);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendProgress(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn('Geolocation failed or denied, recording default location check-in:', error);
          sendProgress(null, null);
        },
        { timeout: 5000 }
      );
    } else {
      sendProgress(null, null);
    }
  };

  const handleEndMeeting = async (trainingId) => {
    const storedStart = localStorage.getItem(`meeting_start_${trainingId}`);
    const startTime = meetingStartTime || (storedStart ? parseInt(storedStart) : null);
    
    const now = Date.now();
    const finalDelta = Math.max(Math.floor((now - lastSyncTimeRef.current) / 1000), 0);
    const totalElapsed = startTime ? Math.floor((now - startTime) / 1000) : 0;

    setIsAttendingMeeting(false);
    setMeetingStartTime(null);
    setMeetingElapsed(0);
    localStorage.removeItem(`meeting_start_${trainingId}`);

    try {
      await axios.post(`${backendUrl}/api/trainings/${trainingId}/progress`,
        { completed: true, timeSpent: finalDelta },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTrainings();
      const mins = Math.floor(totalElapsed / 60);
      const secs = totalElapsed % 60;
      alert(`✅ Attendance recorded! You attended for ${mins > 0 ? `${mins}m ` : ''}${secs}s.`);
    } catch (error) {
      console.error('Failed to save meeting progress', error);
      alert('⚠️ Could not save attendance. Please try again.');
    }
  };

  const handleSelectTraining = async (t) => {
    if (isAttendingMeeting && selectedTraining) {
      await handleEndMeeting(selectedTraining.id);
    }
    setSelectedTraining(t);
    setActiveSlide(0);
  };

  // Recover from page refresh: check localStorage for any active meeting
  useEffect(() => {
    if (selectedTraining?.type === 'Meeting') {
      const stored = localStorage.getItem(`meeting_start_${selectedTraining.id}`);
      if (stored && !isAttendingMeeting) {
        setMeetingStartTime(parseInt(stored));
        lastSyncTimeRef.current = Date.now(); // start syncing from the refresh point onwards
        setIsAttendingMeeting(true);
      }
    }
  }, [selectedTraining]);

  // Combined meeting elapsed timer and periodic auto-save (every 10s)
  useEffect(() => {
    let interval;
    if (isAttendingMeeting && selectedTraining) {
      lastSyncTimeRef.current = Date.now();
      
      interval = setInterval(async () => {
        const now = Date.now();
        
        // Update local elapsed timer
        if (meetingStartTime) {
          setMeetingElapsed(Math.floor((now - meetingStartTime) / 1000));
        }
        
        // Calculate delta since last sync and check if >= 10 seconds
        const deltaSeconds = Math.floor((now - lastSyncTimeRef.current) / 1000);
        if (deltaSeconds >= 10) {
          lastSyncTimeRef.current = now;
          try {
            await axios.post(`${backendUrl}/api/trainings/${selectedTraining.id}/progress`,
              { completed: false, timeSpent: deltaSeconds },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (e) {
            console.error('Periodic attendance sync error:', e);
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAttendingMeeting, selectedTraining, meetingStartTime, token]);

  const getIcon = (type) => {
    switch (type) {
      case 'Video': return <Play size={18} color="var(--primary)" />;
      case 'PDF': return <FileText size={18} color="#EF4444" />;
      case 'PPT': return <Presentation size={18} color="#F59E0B" />;
      case 'Image': return <ImageIcon size={18} color="#10B981" />;
      case 'Audio': return <Music size={18} color="#8B5CF6" />;
      case 'Meeting': return <Video size={18} color="#10B981" />;
      default: return <FileText size={18} />;
    }
  };

  // Mock PPT slide contents
  const pptSlides = [
    { title: "Slide 1: Overview", content: "Welcome to the training course. Please click Next to read through the slides." },
    { title: "Slide 2: Secure Access Policies", content: "1. Always check the URL of your login pages.\n2. Ensure multi-factor authentication is configured correctly on your device.\n3. Report unusual password resets immediately." },
    { title: "Slide 3: Email Threats & Social Attacks", content: "Do not open links from unverified external emails. Report phishing attempts immediately to your manager." },
    { title: "Slide 4: Incident Response Checklist", content: "1. Lock your workstation when away.\n2. Do not insert unverified USB drives.\n3. If suspicious, disconnect WiFi and notify support." },
    { title: "Slide 5: Summary", content: "You have reviewed all key policy points. Mark this training course completed using the checkbox below." }
  ];

  const totalTrainings = trainings.length;
  const completedTrainings = trainings.filter(t => t.completed).length;
  const progressPercent = totalTrainings > 0 ? Math.round((completedTrainings / totalTrainings) * 100) : 0;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="view-section active" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header */}
      <div className="section-header" style={{ flexShrink: 0 }}>
        <div>
          <h2 className="section-title">LMS Training System</h2>
          <p className="section-desc">Explore courses, study materials, and build professional skills.</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
            <Plus size={18} /> Add Training Material
          </button>
        )}
      </div>

      {/* Progress Section for Trainee */}
      {isTrainee && user?.projectId && (
        <div className="glass-card" style={{ marginBottom: '24px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ flex: 1, marginRight: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 600 }}>
              <span>Project Training Progress</span>
              <span>{progressPercent}% Complete ({completedTrainings}/{totalTrainings})</span>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '10px', height: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
              <div style={{ background: 'linear-gradient(90deg, #2563EB 0%, #10B981 100%)', width: `${progressPercent}%`, height: '100%', transition: 'width 0.4s ease' }}></div>
            </div>
          </div>
          {progressPercent === 100 && (
            <button className="btn btn-primary" onClick={handleClaimCertificate} style={{ background: '#10B981', borderColor: '#10B981', animation: 'pulse 2s infinite' }}>
              Claim Certificate 🎓
            </button>
          )}
        </div>
      )}

      {/* Main Workspace Layout - responsive stacked on mobile */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, overflow: 'hidden', flexWrap: 'wrap' }}>
        
        {/* Left Side: Course Modules List */}
        <div className="glass-card" style={{ width: '280px', minWidth: '220px', flex: '0 0 auto', display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto', maxHeight: '100%' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Modules & Chapters</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {trainings.map((t) => (
              <div 
                key={t.id}
                onClick={() => handleSelectTraining(t)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: selectedTraining?.id === t.id ? 'var(--primary-glow)' : 'var(--bg-tertiary)',
                  border: `1px solid ${selectedTraining?.id === t.id ? 'var(--primary)' : 'var(--border-glass)'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  {getIcon(t.type)}
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: selectedTraining?.id === t.id ? 600 : 400, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {t.type === 'Meeting' && t.scheduledAt 
                        ? `${new Date(t.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} • Meeting`
                        : `${t.duration} • ${t.type}`}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isTrainee && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleComplete(t); }} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {t.completed ? (
                        <CheckCircle2 size={18} color="#10B981" />
                      ) : (
                        <Circle size={18} color="var(--text-muted)" />
                      )}
                    </button>
                  )}
                  {canManage && (
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteTraining(t.id, t.title); }}
                      style={{ background: 'none', border: 'none', color: 'var(--error, #ef4444)', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {trainings.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '32px 0' }}>
                No training materials assigned to your project.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Material Detail and Player */}
        <div className="glass-card" style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
          {selectedTraining ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Player / Viewer panel */}
              <div style={{ background: '#0F172A', borderRadius: '12px', border: '1px solid var(--border-glass)', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px', position: 'relative' }}>
                
                {selectedTraining.type === 'Video' && (
                  <video key={selectedTraining.id} controls src={selectedTraining.url} style={{ width: '100%', maxHeight: '400px', borderRadius: '8px' }} />
                )}

                {selectedTraining.type === 'PDF' && (
                  <div style={{ width: '100%', height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1E293B', borderRadius: '8px' }}>
                    <FileText size={64} color="#EF4444" style={{ marginBottom: '16px' }} />
                    <p style={{ color: 'white', fontWeight: 500, marginBottom: '16px' }}>PDF Document: {selectedTraining.title}</p>
                    <a href={selectedTraining.url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                      Open Document in New Tab
                    </a>
                  </div>
                )}

                {selectedTraining.type === 'PPT' && (
                  <div style={{ width: '100%', height: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#1E293B', padding: '24px', borderRadius: '8px', color: 'white' }}>
                    <div>
                      <span className="badge badge-warning" style={{ marginBottom: '8px' }}>{pptSlides[activeSlide].title}</span>
                      <p style={{ fontSize: '1.2rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{pptSlides[activeSlide].content}</p>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Slide {activeSlide + 1} of {pptSlides.length}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" disabled={activeSlide === 0} onClick={() => setActiveSlide(activeSlide - 1)}>Prev</button>
                        <button className="btn className=btn-primary btn-sm" disabled={activeSlide === pptSlides.length - 1} onClick={() => setActiveSlide(activeSlide + 1)}>Next</button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTraining.type === 'Meeting' && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* Scheduled date badge */}
                    {selectedTraining.scheduledAt && (
                      <div style={{ background: 'rgba(37,99,235,0.1)', padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(37,99,235,0.3)', color: '#60A5FA', fontSize: '0.9rem', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}>
                        🗓️ Scheduled: {new Date(selectedTraining.scheduledAt).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                      </div>
                    )}

                    {/* Attendance status / Join meeting */}
                    {isAttendingMeeting ? (
                      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', background: 'rgba(30,41,59,0.7)', border: '1px solid var(--border-glass)', borderRadius: '12px', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#10B981', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                            <span style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Meeting Session Active</span>
                          </div>
                          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'white', letterSpacing: '1px', marginTop: '6px' }}>
                            {Math.floor(meetingElapsed / 60).toString().padStart(2, '0')}:{(meetingElapsed % 60).toString().padStart(2, '0')}
                          </div>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '480px', margin: 0, lineHeight: '1.5' }}>
                          The live training meeting is running in another browser tab. Feel free to switch to it and participate. We are tracking your attendance automatically in the background.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', marginTop: '8px' }}>
                          <button
                            type="button"
                            onClick={() => window.open(selectedTraining.url, '_blank', 'noopener,noreferrer')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-glass)',
                              borderRadius: '8px',
                              padding: '10px 20px',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'all 0.2s'
                            }}
                          >
                            <ExternalLink size={16} /> Re-open Meeting Link
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEndMeeting(selectedTraining.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#EF4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '10px 24px',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'all 0.2s'
                            }}
                          >
                            ■ Leave Meeting & Save Attendance
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', background: 'rgba(30,41,59,0.4)', border: '1px solid var(--border-glass)', borderRadius: '12px', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Meeting Source</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', color: '#10B981', wordBreak: 'break-all' }}>{selectedTraining.url}</span>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '440px', margin: 0, lineHeight: '1.5' }}>
                          Click the join button below to open Google Meet in a new tab. Your attendance duration will be tracked in real-time until you complete the session.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', marginTop: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedTraining.url);
                              alert('Link copied to clipboard!');
                            }}
                            style={{
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-glass)',
                              borderRadius: '8px',
                              padding: '10px 20px',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                              transition: 'all 0.2s'
                            }}
                          >
                            Copy Link
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartMeeting(selectedTraining.id, selectedTraining.url)}
                            style={{
                              background: '#10B981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '10px 28px',
                              fontSize: '0.95rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'all 0.2s'
                            }}
                          >
                            📹 Join Meeting & Start Track
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!['Video', 'PDF', 'PPT', 'Meeting'].includes(selectedTraining.type) && (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <p>Training material source loaded successfully.</p>
                    <a href={selectedTraining.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{selectedTraining.url}</a>
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: 'var(--text-primary)' }}>{selectedTraining.title}</h3>
                  <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{selectedTraining.description || 'No description provided.'}</p>
                  
                  {selectedTraining.Project && (
                    <span className="badge badge-success">Project: {selectedTraining.Project.name}</span>
                  )}
                </div>

                {isTrainee && (
                  <button 
                    onClick={() => handleToggleComplete(selectedTraining)}
                    className={`btn ${selectedTraining.completed ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ gap: '8px' }}
                  >
                    {selectedTraining.completed ? (
                      <>
                        <CheckCircle2 size={16} /> Completed
                      </>
                    ) : (
                      <>
                        Mark as Completed
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column' }}>
              <ShieldAlert size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p>No training courses available.</p>
            </div>
          )}
        </div>
      </div>


      {/* Add Training Modal */}
      {isCreating && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div className="glass-card" style={{ width: '450px', background: 'var(--bg-primary)' }}>
            <h3 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>Upload Training Material</h3>
            <form onSubmit={handleCreateTraining}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Material Title *</label>
                <input 
                  type="text" 
                  value={newTraining.title}
                  onChange={(e) => setNewTraining({ ...newTraining, title: e.target.value })}
                  placeholder="e.g. Cybersecurity Foundations"
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Description</label>
                <textarea 
                  value={newTraining.description}
                  onChange={(e) => setNewTraining({ ...newTraining, description: e.target.value })}
                  placeholder="Short summary of material contents..."
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', minHeight: '60px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Material Type</label>
                  <select 
                    value={newTraining.type}
                    onChange={(e) => setNewTraining({ ...newTraining, type: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    <option value="Video">Video Player</option>
                    <option value="PDF">PDF Reader</option>
                    <option value="PPT">PPT Slideshow</option>
                    <option value="Image">Static Image</option>
                    <option value="Audio">Audio Player</option>
                    <option value="Meeting">Google Meet Session</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Duration</label>
                  <input 
                    type="text" 
                    value={newTraining.duration}
                    onChange={(e) => setNewTraining({ ...newTraining, duration: e.target.value })}
                    placeholder={newTraining.type === 'Meeting' ? "e.g. 1 hour" : "e.g. 15 mins"}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {newTraining.type === 'Meeting' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Meeting Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    value={newTraining.scheduledAt}
                    onChange={(e) => setNewTraining({ ...newTraining, scheduledAt: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {newTraining.type === 'Meeting' ? "Meeting URL (Auto-generated room, or paste custom Google Meet link) *" : "URL / File Location *"}
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={newTraining.url}
                    onChange={(e) => setNewTraining({ ...newTraining, url: e.target.value })}
                    placeholder={newTraining.type === 'Meeting' ? "https://meet.google.com/abc-defg-hij" : "https://example.com/video.mp4"}
                    style={{ flex: 1, padding: '10px', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    required
                  />
                  {newTraining.type === 'Meeting' && newTraining.url && (
                    <button 
                      type="button" 
                      onClick={() => {
                        navigator.clipboard.writeText(newTraining.url);
                        alert("Meeting link copied to clipboard!");
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0 12px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      Copy
                    </button>
                  )}
                </div>
                {newTraining.type === 'Meeting' && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                    * A working Jitsi room is generated automatically. Feel free to replace it with a real Google Meet URL.
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Assign to Project</label>
                <select 
                  value={newTraining.projectId}
                  onChange={(e) => setNewTraining({ ...newTraining, projectId: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <option value="">-- No Project (Global) --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Upload Material</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
