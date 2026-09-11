import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { 
  Play, Users, SkipForward, Square, Trophy, ArrowLeft, ArrowRight, 
  Settings, Maximize2, Minimize, ChevronLeft, ChevronRight, Award, 
  Check, Clock, Sparkles, Shield, Radio, CheckCircle2, AlertCircle,
  Copy, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import QRCode from 'qrcode';

let socket;

export default function HostControlRoom() {
  const EMOJIS_POOL = ['😊', '😎', '🤩', '🥳', '🦁', '🦊', '🐨', '🦖', '🚀', '🎨', '🎯', '⚡', '🌈', '👾', '🐼', '🐯', '🤖', '👑', '🔥', '🦄'];
  const getSmileyForName = (name) => {
    if (!name) return '😊';
    let hash = 0;
    for (let idx = 0; idx < name.length; idx++) {
      hash += name.charCodeAt(idx);
    }
    return EMOJIS_POOL[hash % EMOJIS_POOL.length];
  };

  const { quizId } = useParams();
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const isLocalHost = typeof window !== 'undefined' && (['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) || window.location.hostname.endsWith('.local'));
  const querySessionName = new URLSearchParams(window.location.search).get('sessionName') || '';
  const [sessionName, setSessionName] = useState(querySessionName);
  const [copiedLink, setCopiedLink] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState('waiting'); // waiting, active, ended
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Quiz Flow States
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [showQuestionLeaderboard, setShowQuestionLeaderboard] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrError, setQrError] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
  const [liveAnswers, setLiveAnswers] = useState([]);
  const [joinBaseUrl, setJoinBaseUrl] = useState(window.location.origin);
  const [joinMode, setJoinMode] = useState('lan');
  const [lanBaseUrl, setLanBaseUrl] = useState('');
  const [useLanQr, setUseLanQr] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  // Participant connection metrics
  const [metrics, setMetrics] = useState({ total: 0, waiting: 0, active: 0, disconnected: 0, rejoined: 0 });

  // Timer States
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionDuration, setQuestionDuration] = useState(20);

  // Layout States
  const [showControlsSidebar, setShowControlsSidebar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef   = useRef(null);
  const sessionStarted  = useRef(false);
  const roomCodeRef     = useRef('');

  // Fetch public tunnel URL (or LAN fallback)
  useEffect(() => {
    if (!isLocalHost) {
      setJoinBaseUrl(window.location.origin);
      setJoinMode('public');
      return;
    }

    const fetchJoinUrl = () => {
      axios.get('/api/join-url')
        .then(res => {
          if (res.data?.url) {
            setJoinBaseUrl(res.data.url);
            setJoinMode(res.data.mode || 'public');
          }
        })
        .catch(() => {});
    };

    const fetchHostIp = () => {
      axios.get('/api/host-ip')
        .then(res => {
          if (res.data?.ip) {
            setLanBaseUrl(`http://${res.data.ip}:5173`);
          }
        })
        .catch(() => {});
    };

    fetchJoinUrl();
    fetchHostIp();

    const interval = setInterval(fetchJoinUrl, 5000);
    return () => clearInterval(interval);
  }, [isLocalHost]);

  // QR fallback timer — only triggers if roomCode actually exists and QR failed to render
  useEffect(() => {
    if (qrDataUrl) {
      setQrError(false);
      setQrLoading(false);
      return;
    }
    if (roomCode) {
      const timer = setTimeout(() => {
        if (!qrDataUrl) {
          setQrError(true);
          setQrLoading(false);
        }
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [qrDataUrl, roomCode]);

  // Helper to emit host_start_quiz reliably
  const emitHostStartQuiz = (targetSocket) => {
    const s = targetSocket || socket;
    if (!s || !s.connected || roomCodeRef.current) return;
    const currentUser = user || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null);
    const authToken = token || localStorage.getItem('jwt') || localStorage.getItem('token');
    s.emit('host_start_quiz', {
      quizId: quizId,
      hostId: currentUser?.id,
      hostName: currentUser?.name || 'Authorized Trainer',
      token: authToken,
      sessionName: sessionName || null
    });
  };

  // Fetch Quiz details and initialize socket
  useEffect(() => {
    fetchQuiz();

    const authToken = token || localStorage.getItem('jwt') || localStorage.getItem('token');
    socket = io(window.location.origin, {
      auth: { token: authToken },
      query: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      const code = roomCodeRef.current;
      if (code) {
        socket.emit('host_rejoin_room', { roomCode: code, quizId: quizId });
      } else {
        emitHostStartQuiz(socket);
      }
    });

    // Canonical session creation event (with legacy fallback)
    const handleSessionCreated = (data) => {
      if (data && data.roomCode) {
        setRoomCode(data.roomCode);
        roomCodeRef.current = data.roomCode;
        setSessionId(data.sessionId);
        if (data.sessionName && !sessionName) {
          setSessionName(data.sessionName);
        }
        if (data.participants && data.participants.length > 0) {
          setParticipants(data.participants);
        }
        if (data.metrics) setMetrics(data.metrics);
        generateQr(data.roomCode);
      }
    };
    socket.on('session_created', handleSessionCreated);
    socket.on('session_started', handleSessionCreated);

    socket.on('error', (err) => {
      console.warn('[HostControlRoom] Socket error:', err);
    });

    // Safety retry interval if connected but roomCode not yet assigned
    const retryTimer = setInterval(() => {
      if (socket && socket.connected && !roomCodeRef.current) {
        emitHostStartQuiz(socket);
      }
    }, 2000);

    socket.on('participant_metrics', (data) => {
      setMetrics(data);
    });

    socket.on('participant_joined', (data) => {
      setParticipants(prev => {
        const exists = prev.find(p => p.id === data.id);
        if (exists) {
          return prev.map(p => p.id === data.id ? { ...p, ...data, disconnected: false } : p);
        }
        return [...prev, { ...data, disconnected: false }];
      });
    });

    socket.on('participant_disconnected', (data) => {
      setParticipants(prev =>
        prev.map(p => (p.id === data.participantId || p.socketId === data.socketId)
          ? { ...p, disconnected: true }
          : p
        )
      );
    });

    socket.on('participant_reconnected', (data) => {
      setParticipants(prev =>
        prev.map(p => p.id === data.participantId
          ? { ...p, socketId: data.socketId, disconnected: false }
          : p
        )
      );
    });

    // Canonical new question event
    const handleNewQuestion = (data) => {
      setStatus('active');
      setCurrentQuestionIndex(data.questionIndex);
      setTimeLeft(data.duration || data.time_limit || 20);
      setQuestionDuration(data.duration || data.time_limit || 20);
      setAnswerRevealed(false);
      setShowQuestionLeaderboard(false);
      setLiveAnswers([]);
    };
    socket.on('new_question', handleNewQuestion);

    socket.on('timer_tick', (data) => {
      setTimeLeft(data.remaining);
    });

    socket.on('timer_expired', () => {
      setTimeLeft(0);
    });

    // Canonical answer received event (deduplicated by participantId: 1 participant = 1 vote)
    const handleAnswer = (data) => {
      if (!data || !data.participantId) return;
      setLiveAnswers(prev => {
        const idx = prev.findIndex(a => a.participantId === data.participantId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = data;
          return updated;
        }
        return [...prev, data];
      });
    };
    socket.on('answer_received', handleAnswer);

    socket.on('answer_revealed', (data) => {
      setAnswerRevealed(true);
      if (data?.leaderboard && data.leaderboard.length > 0) {
        setLeaderboard(data.leaderboard);
      }
    });

    socket.on('leaderboard_update', (data) => {
      setLeaderboard(data.leaderboard || data || []);
    });

    socket.on('quiz_ended', (data) => {
      setStatus('ended');
      setShowQuestionLeaderboard(true);
      setLeaderboard(data?.leaderboard || []);
    });

    // Canonical reaction event
    const handleReaction = (data) => {
      const id = Date.now() + Math.random();
      const x = Math.floor(Math.random() * 80) + 10;
      const duration = Math.floor(Math.random() * 2) + 2.5;
      const scale = (Math.random() * 0.4 + 0.8).toFixed(2);
      
      setFloatingEmojis(prev => [...prev, { id, emoji: data.emoji, x, duration, scale }]);
      setTimeout(() => {
        setFloatingEmojis(prev => prev.filter(e => e.id !== id));
      }, duration * 1000 + 200);
    };
    socket.on('emoji_received', handleReaction);

    return () => {
      clearInterval(retryTimer);
      if (socket) socket.disconnect();
    };
  }, [quizId]);

  // Regenerate QR code if roomCode, joinBaseUrl, useLanQr, or lanBaseUrl changes
  useEffect(() => {
    if (roomCode) {
      generateQr(roomCode);
    }
  }, [roomCode, joinBaseUrl, useLanQr, lanBaseUrl]);

  const generateQr = async (code) => {
    if (!code) return;
    try {
      setQrError(false);
      setQrLoading(true);
      const effectiveBase = (useLanQr && lanBaseUrl)
        ? lanBaseUrl
        : (joinBaseUrl || (typeof window !== 'undefined' ? window.location.origin : ''));
      const joinUrl = `${effectiveBase}/join?code=${code}`;

      const qrMethod = QRCode?.toDataURL ? QRCode : (QRCode?.default || QRCode);
      // Step 1: Try Canvas toDataURL
      try {
        if (qrMethod && typeof qrMethod.toDataURL === 'function') {
          const dataUrl = await qrMethod.toDataURL(joinUrl, {
            margin: 2,
            width: 220,
            color: {
              dark: '#0F172A',
              light: '#FFFFFF'
            }
          });
          if (dataUrl) {
            setQrDataUrl(dataUrl);
            setQrLoading(false);
            setQrError(false);
            return;
          }
        }
      } catch (canvasErr) {
        console.warn('Canvas toDataURL failed, attempting SVG fallback:', canvasErr);
      }

      // Step 2: Fallback to SVG string generation (pure vector math, no canvas context required)
      try {
        if (qrMethod && typeof qrMethod.toString === 'function') {
          const svgString = await qrMethod.toString(joinUrl, {
            type: 'svg',
            margin: 2,
            width: 220,
            color: {
              dark: '#0F172A',
              light: '#FFFFFF'
            }
          });
          if (svgString) {
            const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
            setQrDataUrl(svgDataUrl);
            setQrLoading(false);
            setQrError(false);
            return;
          }
        }
      } catch (svgErr) {
        console.warn('SVG toString QR fallback failed:', svgErr);
      }

      // If both methods fail
      setQrError(true);
      setQrLoading(false);
    } catch (err) {
      console.error('QR generation error:', err);
      setQrError(true);
      setQrLoading(false);
    }
  };

  const fetchQuiz = async () => {
    try {
      const authToken = token || localStorage.getItem('jwt') || localStorage.getItem('token');
      const response = await axios.get(`/api/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setQuiz(response.data);
      if (!roomCodeRef.current && socket && socket.connected) {
        emitHostStartQuiz(socket);
      }
    } catch (error) {
      console.error('Failed to fetch quiz', error);
      navigate('/dashboard');
    }
  };

  const activeQuestion = quiz && currentQuestionIndex >= 0 ? quiz.questions[currentQuestionIndex] : null;

  const handleNextQuestion = () => {
    if (!quiz || !quiz.questions) return;
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < quiz.questions.length) {
      socket.emit('host_next_question', {
        roomCode,
        sessionId,
        question: quiz.questions[nextIdx],
        questionIndex: nextIdx,
        totalQuestions: quiz.questions.length
      });
    } else {
      socket.emit('host_end_session', { roomCode });
    }
  };

  const handleLogicalNext = () => {
    if (status === 'waiting') {
      handleNextQuestion();
      return;
    }
    if (status === 'active') {
      if (!answerRevealed) {
        revealAnswer();
      } else if (!showQuestionLeaderboard) {
        handleShowLeaderboard();
      } else {
        handleNextQuestion();
      }
    }
  };

  const handleLogicalPrev = () => {
    if (showQuestionLeaderboard) {
      setShowQuestionLeaderboard(false);
    } else if (answerRevealed) {
      setAnswerRevealed(false);
    } else if (currentQuestionIndex > 0) {
      handleJumpToQuestion(currentQuestionIndex - 1);
    }
  };

  const handleJumpToQuestion = (idx) => {
    if (!quiz || !quiz.questions) return;
    socket.emit('host_next_question', {
      roomCode,
      sessionId,
      question: quiz.questions[idx],
      questionIndex: idx,
      totalQuestions: quiz.questions.length
    });
  };

  const revealAnswer = () => {
    socket.emit('host_reveal_answer', {
      roomCode,
      questionId: activeQuestion?.id,
      questionIndex: currentQuestionIndex
    });
  };

  const handleShowLeaderboard = () => {
    setShowQuestionLeaderboard(true);
    socket.emit('host_show_leaderboard', {
      roomCode,
      sessionId,
      questionIndex: currentQuestionIndex
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const getOptions = (question) => {
    if (!question) return [];
    if (['mcq', 'poll', 'multi_select'].includes(question.type)) {
      if (Array.isArray(question.options)) return question.options;
      if (typeof question.options === 'string') {
        try { return JSON.parse(question.options); } catch { return []; }
      }
    }
    if (question.type === 'true_false') {
      return ['True', 'False'];
    }
    return [];
  };

  const isCorrectOpt = (opt) => {
    if (!activeQuestion) return false;
    if (activeQuestion.type === 'poll') return true;
    if (Array.isArray(activeQuestion.correct_answer)) {
      return activeQuestion.correct_answer.includes(opt);
    }
    return activeQuestion.correct_answer === opt;
  };

  const getOptionVotes = (opt) => {
    return liveAnswers.filter(a => {
      if (Array.isArray(a.answer)) return a.answer.includes(opt);
      return a.answer === opt;
    }).length;
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!quiz) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1220', color: '#FFFFFF' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid #2563EB', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#93C5FD' }}>Initializing Host Command Center...</h2>
        </div>
      </div>
    );
  }

  const formattedRoomCode = roomCode ? roomCode.replace(/(\d{3})(\d{3})/, '$1 $2') : 'Preparing...';

  return (
    <div ref={containerRef} style={{ height: '100vh', width: '100vw', display: 'flex', background: '#0B1220', color: '#FFFFFF', overflow: 'hidden', position: 'relative', fontFamily: 'Manrope, Inter, sans-serif' }}>
      
      {/* ─── LEFT SIDEBAR (Dark Navy #0F172A) ─── */}
      <aside style={{
        width: '320px', background: '#0F172A', borderRight: '1px solid #1E293B',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '36px 24px', flexShrink: 0, zIndex: 10, justifyContent: 'space-between'
      }}>
        {/* Brand & QR Container */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
            <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              RETAILEDGE
            </span>
            <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: '#2563EB' }}>
              PRO
            </span>
          </div>

          {/* QR Code White Card */}
          <div style={{
            background: '#FFFFFF', padding: '16px', borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)', display: 'flex',
            flexDirection: 'column', alignItems: 'center', marginBottom: '16px'
          }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code to Join" style={{ width: '180px', height: '180px', display: 'block' }} />
            ) : qrError ? (
              <div style={{ width: '180px', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#EF4444', textAlign: 'center', padding: '10px' }}>
                <AlertCircle size={32} style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>QR Code Unavailable</span>
                <span style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '10px', lineHeight: 1.3 }}>Use Session PIN or direct Join link below</span>
                <button
                  id="retry-qr-btn"
                  onClick={() => generateQr(roomCodeRef.current || roomCode)}
                  style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Retry QR
                </button>
              </div>
            ) : (
              <div style={{ width: '180px', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748B', gap: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #2563EB', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Generating QR...</span>
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textAlign: 'center', marginBottom: '14px' }}>
            Scan with smartphone camera to join
          </div>

          {/* Room PIN Display */}
          <div style={{ background: '#162033', border: '1px solid #1E293B', borderRadius: '12px', padding: '12px 20px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
              Session PIN
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#2563EB', letterSpacing: '3px', fontFamily: 'monospace' }}>
              {formattedRoomCode}
            </div>
            {roomCode && (
              <button
                id="copy-join-link-btn"
                onClick={() => {
                  const effectiveBase = (useLanQr && lanBaseUrl)
                    ? lanBaseUrl
                    : (joinBaseUrl || (typeof window !== 'undefined' ? window.location.origin : ''));
                  const fullLink = `${effectiveBase}/join?code=${roomCode}`;
                  navigator.clipboard.writeText(fullLink);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  background: copiedLink ? '#065F46' : 'rgba(37, 99, 235, 0.15)',
                  border: `1px solid ${copiedLink ? '#10B981' : 'rgba(37, 99, 235, 0.4)'}`,
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: copiedLink ? '#34D399' : '#93C5FD',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Live Join Link'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics Counter */}
        <div style={{ width: '100%', background: '#162033', borderRadius: '12px', border: '1px solid #1E293B', padding: '14px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', textAlign: 'center' }}>
            Live Participant Roster
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: '#0F172A', borderRadius: '8px', padding: '8px', textAlign: 'center', border: '1px solid #1E293B' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06B6D4' }}>{Math.max(metrics.total || 0, participants.length)}</div>
              <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600 }}>Total Joined</div>
            </div>
            <div style={{ background: '#0F172A', borderRadius: '8px', padding: '8px', textAlign: 'center', border: '1px solid #1E293B' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>{Math.max(metrics.active || 0, participants.filter(p => !p.disconnected).length)}</div>
              <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600 }}>Active Now</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN PRESENTATION CANVAS ─── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '36px 48px', overflow: 'hidden', position: 'relative' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => navigate('/dashboard')}
              style={{
                width: '40px', height: '40px', borderRadius: '50%', background: '#162033',
                border: '1px solid #1E293B', color: '#FFFFFF', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer'
              }}
              title="Exit Presenter Room"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {status === 'waiting' && 'Live Arena Lobby'}
              {status === 'active' && !showQuestionLeaderboard && `Question ${currentQuestionIndex + 1} of ${quiz.questions.length}`}
              {(showQuestionLeaderboard || status === 'ended') && 'Session Leaderboard'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#162033', border: '1px solid #1E293B', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, color: '#10B981' }}>
              <Users size={16} />
              <span>{participants.length} Learners</span>
            </div>
          </div>
        </div>

        {/* Dynamic Presentation Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: '90px' }}>
          
          {/* A. WAITING LOBBY */}
          {status === 'waiting' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(37, 99, 235, 0.12)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Radio size={32} />
              </div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '12px' }}>
                Waiting for Participants to Connect
              </h1>
              <p style={{ fontSize: '1.05rem', color: '#94A3B8', maxWidth: '600px', marginBottom: '36px', lineHeight: 1.6 }}>
                Learners can scan the QR code on the left or visit{' '}
                <a
                  href={roomCode ? `${(useLanQr && lanBaseUrl) ? lanBaseUrl : joinBaseUrl}/join?code=${roomCode}` : '#'}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#06B6D4', textDecoration: 'underline', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>{((useLanQr && lanBaseUrl) ? lanBaseUrl : joinBaseUrl).replace(/^https?:\/\//, '')}/join</span>
                  <ExternalLink size={14} />
                </a>
                {' '}and enter PIN <strong style={{ color: '#2563EB', fontSize: '1.3rem', letterSpacing: '2px', fontFamily: 'monospace' }}>{formattedRoomCode}</strong>
              </p>

              {/* Connected Participant Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxWidth: '800px', justifyContent: 'center' }}>
                {participants.map((p, i) => (
                  <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#162033', border: '1px solid #1E293B', padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>
                    <span>{p.avatar || getSmileyForName(p.name)}</span>
                    <span>{p.name}</span>
                  </div>
                ))}
                {participants.length === 0 && (
                  <div style={{ color: '#64748B', fontStyle: 'italic', fontSize: '0.95rem' }}>
                    No learners joined yet...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* B. ACTIVE QUESTION CANVAS */}
          {status === 'active' && !showQuestionLeaderboard && activeQuestion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
              
              {/* Question Header Card */}
              <div style={{ background: '#111827', border: '1px solid #1E293B', borderRadius: '16px', padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', margin: 0, lineHeight: 1.3, flex: 1 }}>
                  {activeQuestion.text}
                </h1>
                {activeQuestion.time_limit && !answerRevealed && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: timeLeft <= 5 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: `1.5px solid ${timeLeft <= 5 ? '#EF4444' : '#F59E0B'}`,
                    color: timeLeft <= 5 ? '#EF4444' : '#F59E0B',
                    padding: '8px 16px', borderRadius: '12px', fontSize: '1.3rem', fontWeight: 800
                  }}>
                    <Clock size={20} />
                    <span>{timeLeft}s</span>
                  </div>
                )}
              </div>

              {/* Options Listing / Response Distribution */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {getOptions(activeQuestion).map((opt, i) => {
                  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                  const letter = letters[i] || '?';
                  const isCorrect = isCorrectOpt(opt);
                  const votes = getOptionVotes(opt);
                  const percentage = liveAnswers.length > 0 ? Math.round((votes / liveAnswers.length) * 100) : 0;

                  return (
                    <div
                      key={i}
                      style={{
                        background: '#111827',
                        border: `1.5px solid ${answerRevealed ? (isCorrect ? '#10B981' : '#1E293B') : '#1E293B'}`,
                        borderRadius: '12px', padding: '16px 20px',
                        display: 'flex', flexDirection: 'column', gap: '10px',
                        boxShadow: answerRevealed && isCorrect ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                          <span style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: answerRevealed ? (isCorrect ? '#10B981' : '#1E293B') : '#2563EB',
                            color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.85rem', fontWeight: 800
                          }}>
                            {letter}
                          </span>
                          <span>{opt}</span>
                          {answerRevealed && isCorrect && (
                            <CheckCircle2 size={18} color="#10B981" />
                          )}
                        </div>
                        {answerRevealed && (
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isCorrect ? '#10B981' : '#94A3B8' }}>
                            {percentage}% ({votes} {votes === 1 ? 'vote' : 'votes'})
                          </div>
                        )}
                      </div>

                      {/* Live Distribution Progress Bar */}
                      {answerRevealed && (
                        <div style={{ width: '100%', height: '8px', background: '#0B1220', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{
                              width: `${percentage}%`, height: '100%',
                              background: isCorrect ? '#10B981' : '#3B82F6',
                              borderRadius: '4px', transition: 'width 0.6s ease'
                            }} 
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* C. LEADERBOARD / PODIUM */}
          {(showQuestionLeaderboard || status === 'ended') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Trophy size={32} />
              </div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '32px', textAlign: 'center' }}>
                {status === 'ended' ? 'Final Session Champions' : 'Interim Leaderboard Standings'}
              </h1>

              {/* Top 3 Podium Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: '16px', width: '100%', marginBottom: '28px', alignItems: 'flex-end' }}>
                {/* Rank 2: Silver */}
                {leaderboard[1] && (
                  <div style={{ background: '#111827', border: '2px solid #94A3B8', borderRadius: '14px', padding: '20px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🥈</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Rank 2</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '6px 0 2px' }}>{leaderboard[1].name}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#93C5FD' }}>{leaderboard[1].score} pts</div>
                  </div>
                )}

                {/* Rank 1: Gold */}
                {leaderboard[0] && (
                  <div style={{ background: '#162033', border: '2.5px solid #F59E0B', borderRadius: '16px', padding: '28px 20px', textAlign: 'center', boxShadow: '0 10px 30px rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '4px' }}>👑</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase' }}>Champion · Rank 1</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFFFFF', margin: '8px 0 2px' }}>{leaderboard[0].name}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#F59E0B' }}>{leaderboard[0].score} pts</div>
                  </div>
                )}

                {/* Rank 3: Bronze */}
                {leaderboard[2] && (
                  <div style={{ background: '#111827', border: '2px solid #D97706', borderRadius: '14px', padding: '20px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🥉</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>Rank 3</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '6px 0 2px' }}>{leaderboard[2].name}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#93C5FD' }}>{leaderboard[2].score} pts</div>
                  </div>
                )}
              </div>

              {/* Ranks 4+ Table */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leaderboard.slice(3, 10).map((p, i) => (
                  <div key={p.id || i} style={{ background: '#111827', border: '1px solid #1E293B', borderRadius: '10px', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', width: '24px' }}>#{i + 4}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#93C5FD' }}>{p.score} pts</span>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* ─── FLOATING BOTTOM CONTROLS TOOLBAR ─── */}
        <div style={{
          position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#111827', border: '1px solid #1E293B', borderRadius: '16px',
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)', zIndex: 100
        }}>
          <button 
            onClick={() => {
              if (window.confirm("End the live quiz session?")) {
                socket.emit('host_end_session', { roomCode });
                navigate('/dashboard');
              }
            }} 
            style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EF4444', border: 'none', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            title="Stop Session"
          >
            <Square size={14} fill="#FFFFFF" />
          </button>

          <div style={{ width: '1px', height: '20px', background: '#1E293B' }} />

          <button 
            onClick={handleLogicalPrev} 
            disabled={status === 'waiting'}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: '#162033', border: '1px solid #1E293B', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', opacity: status === 'waiting' ? 0.3 : 1 }}
          >
            <ArrowLeft size={14} /> Prev
          </button>

          <button 
            onClick={handleLogicalNext}
            disabled={!roomCode}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px',
              background: !roomCode ? '#334155' : '#2563EB',
              border: 'none', color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700,
              cursor: !roomCode ? 'not-allowed' : 'pointer',
              opacity: !roomCode ? 0.6 : 1,
              boxShadow: !roomCode ? 'none' : '0 2px 10px rgba(37, 99, 235, 0.4)'
            }}
            title={!roomCode ? "Preparing Live Arena..." : status === 'waiting' ? "Start Session" : "Next Action"}
          >
            <span>{!roomCode ? 'Preparing Live Arena...' : status === 'waiting' ? 'Start Session' : !answerRevealed ? 'Reveal Answer' : !showQuestionLeaderboard ? 'Leaderboard' : 'Next Question'}</span>
            <ArrowRight size={14} />
          </button>

          <div style={{ width: '1px', height: '20px', background: '#1E293B' }} />

          <button 
            onClick={toggleFullscreen}
            style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#162033', border: '1px solid #1E293B', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            title="Toggle Fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        </div>

      </main>
    </div>
  );
}
