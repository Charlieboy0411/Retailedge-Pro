import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { 
  Play, Users, SkipForward, Square, Trophy, ArrowLeft, ArrowRight, 
  Settings, Maximize2, Minimize, ChevronLeft, ChevronRight, Award, 
  Check, Clock, Sparkles, Shield, Radio, CheckCircle2, AlertCircle,
  Copy, ExternalLink, Volume2, VolumeX
} from 'lucide-react';
import axios from 'axios';
import QRCode from 'qrcode';
import { copyTextToClipboard } from '../utils/clipboard';

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
  const [copiedPin, setCopiedPin] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState('waiting'); // waiting, active, ended
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Quiz Flow States
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState(null);
  const [revealedIndex, setRevealedIndex]   = useState(null);
  const [showQuestionLeaderboard, setShowQuestionLeaderboard] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrError, setQrError] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
  const [hostError, setHostError] = useState(null);
  const hostErrorRef = useRef(null);
  const [liveAnswers, setLiveAnswers] = useState([]);
  const [joinBaseUrl, setJoinBaseUrl] = useState(window.location.origin);
  const [joinMode, setJoinMode] = useState('lan');
  const [lanBaseUrl, setLanBaseUrl] = useState('');
  const [useLanQr, setUseLanQr] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const celebrationPlayedRef = useRef(false);

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

  // Audio Fanfare synthesizer (no external assets required, fully browser safe)
  const playCelebrationFanfare = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.14 }, // C5
        { freq: 659.25, time: 0.14, dur: 0.14 }, // E5
        { freq: 783.99, time: 0.28, dur: 0.18 }, // G5
        { freq: 1046.50, time: 0.46, dur: 0.45 }, // C6
      ];
      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);
        gain.gain.setValueAtTime(0.16, ctx.currentTime + n.time);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + n.time);
        osc.stop(ctx.currentTime + n.time + n.dur);
      });
    } catch (e) {
      // Audio autoplay blocked or unsupported
    }
  };

  // Check LAN mode
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

  // QR fallback timer
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
    if (!s || !s.connected || roomCodeRef.current || hostErrorRef.current) return;
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

    const handleSessionCreated = (data) => {
      if (data && data.roomCode) {
        setHostError(null);
        hostErrorRef.current = null;
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
      const msg = typeof err === 'string' ? err : (err?.message || 'Failed to start Live Arena session');
      setHostError(msg);
      hostErrorRef.current = msg;
      setQrLoading(false);
      setQrError(true);
    });

    const retryTimer = setInterval(() => {
      if (socket && socket.connected && !roomCodeRef.current && !hostErrorRef.current) {
        emitHostStartQuiz(socket);
      }
    }, 2000);

    socket.on('participant_metrics', (data) => {
      setMetrics(data);
    });

    socket.on('host_roster_sync', (data) => {
      if (data && Array.isArray(data.participants)) {
        setParticipants(data.participants);
      }
      if (data && data.metrics) {
        setMetrics(data.metrics);
      }
    });

    socket.on('participant_joined', (data) => {
      setParticipants(prev => {
        const exists = prev.find(p => p.id === data.id);
        if (exists) {
          return prev.map(p => p.id === data.id ? { ...p, ...data, disconnected: false, isOnline: true } : p);
        }
        return [...prev, { ...data, disconnected: false, isOnline: true }];
      });
    });

    socket.on('participant_disconnected', (data) => {
      setParticipants(prev =>
        prev.map(p => (p.id === data.participantId || p.socketId === data.socketId)
          ? { ...p, disconnected: true, isOnline: false }
          : p
        )
      );
    });

    socket.on('participant_reconnected', (data) => {
      setParticipants(prev =>
        prev.map(p => p.id === data.participantId
          ? { ...p, socketId: data.socketId, disconnected: false, isOnline: true }
          : p
        )
      );
    });

    const handleNewQuestion = (data) => {
      setStatus('active');
      setCurrentQuestionIndex(data.questionIndex);
      setTimeLeft(data.duration || data.time_limit || 20);
      setQuestionDuration(data.duration || data.time_limit || 20);
      setAnswerRevealed(false);
      setRevealedAnswer(null);
      setRevealedIndex(null);
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
      if (data?.correctAnswer !== undefined) setRevealedAnswer(data.correctAnswer);
      if (data?.correctAnswerIndex !== undefined) setRevealedIndex(data.correctAnswerIndex);
      if (data?.leaderboard && data.leaderboard.length > 0) {
        setLeaderboard(data.leaderboard);
      }
    });

    socket.on('leaderboard_update', (data) => {
      setLeaderboard(data.leaderboard || data || []);
    });

    const handleQuizEnded = (data) => {
      setStatus('ended');
      setShowQuestionLeaderboard(true);
      setLeaderboard(data?.leaderboard || []);
      if (!celebrationPlayedRef.current) {
        celebrationPlayedRef.current = true;
        playCelebrationFanfare();
      }
    };
    socket.on('quiz_ended', handleQuizEnded);
    socket.on('session_completed', handleQuizEnded);

    // Canonical reaction event: floating emoji with sender name
    const handleReaction = (data) => {
      if (!data || !data.emoji) return;
      const id = Date.now() + Math.random();
      const x = Math.floor(Math.random() * 70) + 15;
      const duration = 3.0;
      const scale = (Math.random() * 0.25 + 0.9).toFixed(2);
      
      setFloatingEmojis(prev => [...prev.slice(-14), { 
        id, 
        emoji: data.emoji, 
        senderName: data.senderName || 'Learner', 
        x, 
        duration, 
        scale 
      }]);

      setTimeout(() => {
        setFloatingEmojis(prev => prev.filter(e => e.id !== id));
      }, duration * 1000 + 100);
    };
    socket.on('emoji_received', handleReaction);

    return () => {
      clearInterval(retryTimer);
      if (socket) socket.disconnect();
    };
  }, [quizId]);

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
  const isLastQuestion = quiz && quiz.questions && currentQuestionIndex >= quiz.questions.length - 1;
  const isFinalLeaderboard = (isLastQuestion && showQuestionLeaderboard) || status === 'ended';

  const handleNextQuestion = () => {
    if (!quiz || !quiz.questions || status === 'ended') return;
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
    if (status === 'ended') {
      return; // Terminal state
    }
    if (status === 'active') {
      if (!answerRevealed) {
        revealAnswer();
      } else if (!showQuestionLeaderboard) {
        handleShowLeaderboard();
      } else if (isLastQuestion) {
        socket.emit('host_end_session', { roomCode });
      } else {
        handleNextQuestion();
      }
    }
  };

  const handleLogicalPrev = () => {
    if (status === 'ended') return;
    if (showQuestionLeaderboard) {
      setShowQuestionLeaderboard(false);
    } else if (answerRevealed) {
      setAnswerRevealed(false);
    } else if (currentQuestionIndex > 0) {
      handleJumpToQuestion(currentQuestionIndex - 1);
    }
  };

  const handleJumpToQuestion = (idx) => {
    if (!quiz || !quiz.questions || status === 'ended') return;
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

  const isCorrectOpt = (opt, index) => {
    if (!activeQuestion) return false;
    if (activeQuestion.type === 'poll') return true;
    if (revealedIndex !== null && revealedIndex !== undefined && index === revealedIndex) return true;
    const authoritative = (revealedAnswer !== null && revealedAnswer !== undefined) ? revealedAnswer : activeQuestion.correct_answer;
    if (!authoritative) return false;
    if (Array.isArray(authoritative)) {
      return authoritative.map(x => String(x).trim().toLowerCase()).includes(String(opt).trim().toLowerCase());
    }
    const authStr = String(authoritative).trim().toLowerCase();
    const optStr = String(opt).trim().toLowerCase();
    if (authStr === optStr) return true;
    if (authStr === String(index)) return true;
    return false;
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

  const getNextActionLabel = () => {
    if (!roomCode) return 'Preparing Live Arena...';
    if (status === 'waiting') return 'Start Session';
    if (status === 'ended') return 'Quiz Completed';
    if (!answerRevealed) return 'Reveal Answer';
    if (!showQuestionLeaderboard) return 'Leaderboard';
    if (isLastQuestion) return 'Complete Quiz';
    return 'Next Question';
  };

  if (!quiz) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', color: '#0F172A' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid #2563EB', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1E293B' }}>Initializing Host Command Center...</h2>
        </div>
      </div>
    );
  }

  const formattedRoomCode = roomCode ? roomCode.replace(/(\d{3})(\d{3})/, '$1 $2') : 'Preparing...';
  const effectiveBase = (useLanQr && lanBaseUrl)
    ? lanBaseUrl
    : ((joinBaseUrl && !joinBaseUrl.includes('172.31.')) ? joinBaseUrl : (typeof window !== 'undefined' ? window.location.origin : ''));
  const fullJoinLink = roomCode ? `${effectiveBase}/join?code=${roomCode}` : '';

  return (
    <div ref={containerRef} style={{ height: '100vh', width: '100vw', display: 'flex', background: '#F8FAFC', color: '#0F172A', overflow: 'hidden', position: 'relative', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Inline styles for keyframe animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.85);
          }
          15% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          80% {
            opacity: 0.95;
          }
          100% {
            opacity: 0;
            transform: translateY(-380px) scale(1.05);
          }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .confetti-particle { animation: none !important; display: none !important; }
        }
      `}</style>

      {/* Floating Reactions Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 9999
      }}>
        {floatingEmojis.map(item => (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              bottom: '80px',
              left: `${item.x}%`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
              animation: `floatUp ${item.duration}s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
              transform: `scale(${item.scale})`,
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{item.emoji}</span>
            {item.senderName && (
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B' }}>
                {item.senderName}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Confetti Celebration for Final Leaderboard */}
      {status === 'ended' && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50 }}>
          {Array.from({ length: 28 }).map((_, i) => {
            const colors = ['#2563EB', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];
            const bg = colors[i % colors.length];
            const left = `${(i * 3.6 + (i % 5) * 2) % 96}%`;
            const animDelay = `${(i * 0.16) % 3}s`;
            const animDuration = `${2.6 + (i % 4) * 0.5}s`;
            const size = 8 + (i % 3) * 4;
            return (
              <span
                key={i}
                className="confetti-particle"
                style={{
                  position: 'absolute',
                  top: '-20px',
                  left,
                  width: `${size}px`,
                  height: `${size * 0.75}px`,
                  background: bg,
                  borderRadius: i % 2 === 0 ? '2px' : '50%',
                  opacity: 0.85,
                  animation: `confettiFall ${animDuration} linear ${animDelay} infinite`
                }}
              />
            );
          })}
        </div>
      )}

      {/* Toast Feedback for Copied Link */}
      {copiedLink && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '28px',
          background: '#ECFDF5',
          color: '#065F46',
          border: '1.5px solid #10B981',
          borderRadius: '10px',
          padding: '12px 20px',
          fontSize: '0.85rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
          zIndex: 99999,
          pointerEvents: 'none'
        }}>
          <Check size={18} style={{ color: '#10B981' }} />
          <span>Live Arena Join Link Copied to Clipboard!</span>
        </div>
      )}

      {/* Toast Feedback for Copied PIN */}
      {copiedPin && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '28px',
          background: '#ECFDF5',
          color: '#065F46',
          border: '1.5px solid #10B981',
          borderRadius: '10px',
          padding: '12px 20px',
          fontSize: '0.85rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
          zIndex: 99999,
          pointerEvents: 'none'
        }}>
          <Check size={18} style={{ color: '#10B981' }} />
          <span>Session PIN ({formattedRoomCode}) Copied to Clipboard!</span>
        </div>
      )}

      {/* ─── LEFT SIDEBAR (Light Enterprise Corporate Card) ─── */}
      <aside style={{
        width: '320px', background: '#FFFFFF', borderRight: '1px solid #E2E8F0',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px', flexShrink: 0, zIndex: 10, justifyContent: 'space-between',
        boxShadow: '2px 0 16px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Brand & QR Container */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '22px' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: '1.15rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
              RETAILEDGE
            </span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: '1.15rem', color: '#2563EB' }}>
              PRO
            </span>
          </div>

          {/* QR Code White Card - Clickable to open join page */}
          <div 
            onClick={() => fullJoinLink && window.open(fullJoinLink, '_blank', 'noopener,noreferrer')}
            title={fullJoinLink ? "Click to open Live Arena Join page directly in a new tab" : "QR Code"}
            style={{
              background: '#FFFFFF', padding: '16px', borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)', display: 'flex',
              flexDirection: 'column', alignItems: 'center', marginBottom: '10px',
              cursor: fullJoinLink ? 'pointer' : 'default',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseEnter={(e) => { if (fullJoinLink) e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { if (fullJoinLink) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code to Join" style={{ width: '180px', height: '180px', display: 'block' }} />
            ) : hostError ? (
              <div style={{ width: '180px', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#EF4444', textAlign: 'center', padding: '8px' }}>
                <AlertCircle size={30} style={{ marginBottom: '6px' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>Session Blocked</span>
                <span style={{ fontSize: '0.68rem', color: '#64748B', marginBottom: '8px', lineHeight: 1.3 }}>{hostError}</span>
                <button
                  id="retry-qr-btn"
                  onClick={() => {
                    setHostError(null);
                    hostErrorRef.current = null;
                    setQrLoading(true);
                    setQrError(false);
                    emitHostStartQuiz(socket);
                  }}
                  style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Retry
                </button>
              </div>
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

          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>
            Scan with camera or <span onClick={() => fullJoinLink && window.open(fullJoinLink, '_blank', 'noopener,noreferrer')} style={{ color: '#2563EB', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}>open directly ↗</span>
          </div>

          {/* Room PIN Display */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 18px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
              Session PIN
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#2563EB', letterSpacing: '2px', fontFamily: 'monospace' }}>
              {formattedRoomCode}
            </div>
            {roomCode && (
              <>
                {/* Primary: Direct Open Button */}
                <button
                  id="open-join-link-btn"
                  onClick={() => fullJoinLink && window.open(fullJoinLink, '_blank', 'noopener,noreferrer')}
                  title="Directly opens the Live Arena Join page in a new tab"
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    background: '#2563EB',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 10px',
                    color: '#FFFFFF',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#1D4ED8'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#2563EB'}
                >
                  <ExternalLink size={14} />
                  <span>Open Join Link ↗</span>
                </button>

                {/* Secondary: Copy Link Button */}
                <button
                  id="copy-join-link-btn"
                  onClick={async () => {
                    await copyTextToClipboard(fullJoinLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  style={{
                    marginTop: '6px',
                    width: '100%',
                    background: copiedLink ? '#ECFDF5' : '#F1F5F9',
                    border: `1px solid ${copiedLink ? '#10B981' : '#CBD5E1'}`,
                    borderRadius: '8px',
                    padding: '7px 10px',
                    color: copiedLink ? '#065F46' : '#1E293B',
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
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Join Link'}</span>
                </button>

                {/* Direct Link Preview */}
                <div 
                  onClick={() => fullJoinLink && window.open(fullJoinLink, '_blank', 'noopener,noreferrer')}
                  title="Click to directly open join page in a new tab"
                  style={{ 
                    marginTop: '6px', padding: '6px 10px', background: '#FFFFFF', borderRadius: '6px', 
                    border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    gap: '6px', cursor: 'pointer', transition: 'border-color 0.2s' 
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2563EB'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
                >
                  <span 
                    title={fullJoinLink}
                    style={{ fontSize: '0.68rem', color: '#64748B', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', flex: 1 }}
                  >
                    {fullJoinLink.replace(/^https?:\/\//, '')}
                  </span>
                  <ExternalLink size={13} style={{ color: '#2563EB', flexShrink: 0 }} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Live Metrics Counter */}
        <div style={{ width: '100%', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '14px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', textAlign: 'center' }}>
            Live Participant Roster
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: '#FFFFFF', borderRadius: '8px', padding: '8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563EB' }}>{Math.max(metrics.total || 0, participants.length)}</div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>Total Joined</div>
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: '8px', padding: '8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>{Math.max(metrics.active || 0, participants.filter(p => !p.disconnected).length)}</div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>Active Now</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN PRESENTATION CANVAS (Light Enterprise Theme) ─── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '36px 48px', overflow: 'hidden', position: 'relative' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => navigate('/dashboard')}
              style={{
                width: '40px', height: '40px', borderRadius: '10px', background: '#FFFFFF',
                border: '1px solid #E2E8F0', color: '#1E293B', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
              }}
              title="Exit Presenter Room"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {status === 'waiting' && 'Live Arena Lobby'}
              {status === 'active' && !showQuestionLeaderboard && `Question ${currentQuestionIndex + 1} of ${quiz.questions.length}`}
              {(showQuestionLeaderboard || status === 'ended') && 'Session Leaderboard'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Sound Toggle */}
            <button
              onClick={() => {
                const nextVal = !soundEnabled;
                setSoundEnabled(nextVal);
                if (nextVal) playCelebrationFanfare();
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF',
                border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '20px',
                fontSize: '0.82rem', fontWeight: 600, color: soundEnabled ? '#2563EB' : '#64748B',
                cursor: 'pointer', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
              }}
              title={soundEnabled ? "Mute celebration fanfare" : "Enable celebration fanfare"}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span>{soundEnabled ? 'Fanfare On' : 'Sound Off'}</span>
            </button>

            {/* Learners Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, color: '#065F46' }}>
              <Users size={16} />
              <span>{participants.length} Learners</span>
            </div>
          </div>
        </div>

        {/* Dynamic Presentation Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: '90px' }}>
          
          {/* A. WAITING LOBBY */}
          {status === 'waiting' && (
            hostError ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '1px solid #FCA5A5' }}>
                  <AlertCircle size={32} />
                </div>
                <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#991B1B', marginBottom: '12px' }}>
                  Unable to Initialize Live Arena
                </h1>
                <p style={{ fontSize: '1rem', color: '#64748B', maxWidth: '560px', marginBottom: '28px', lineHeight: 1.6 }}>
                  {hostError}
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => navigate('/dashboard')}
                    style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Return to Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setHostError(null);
                      hostErrorRef.current = null;
                      setQrLoading(true);
                      setQrError(false);
                      emitHostStartQuiz(socket);
                    }}
                    style={{ background: '#FFFFFF', color: '#2563EB', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 24px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            ) : (
              participants.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '24px',
                    background: '#EFF6FF',
                    border: '1.5px solid #BFDBFE',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.08)'
                  }}>
                    <Radio size={40} />
                  </div>
                  <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0F172A', marginBottom: '12px', letterSpacing: '-0.02em' }}>
                    Live Presentation Lobby
                  </h1>
                  <p style={{ fontSize: '1.1rem', color: '#64748B', maxWidth: '540px', lineHeight: 1.6, margin: '0 0 32px 0' }}>
                    Scan the QR code on the sidebar or enter Session PIN to connect to the Live Arena.
                  </p>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '30px',
                    padding: '8px 24px',
                    color: '#2563EB',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />
                    <span>Awaiting learner connections...</span>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', padding: '10px 0', boxSizing: 'border-box' }}>
                  {/* Header status strip */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A' }}>
                        Connected Associates
                      </span>
                      <span style={{
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        color: '#2563EB',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        padding: '3px 12px',
                        borderRadius: '20px'
                      }}>
                        {participants.length}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>
                      Click <strong>Start Session</strong> below when all participants are ready
                    </div>
                  </div>

                  {/* Adaptive Participant Roster Canvas */}
                  {(() => {
                    const count = participants.length;
                    let gridStyle = {
                      display: 'grid',
                      gap: '16px',
                      width: '100%',
                      alignContent: 'center',
                      justifyContent: 'center',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))'
                    };
                    let nameSize = '2.1rem';
                    let avatarSize = '2.8rem';
                    let cardPadding = '22px 28px';
                    let cardMinHeight = '100px';

                    if (count <= 3) {
                      gridStyle.gridTemplateColumns = 'repeat(auto-fit, minmax(360px, 1fr))';
                      nameSize = '2.4rem';
                      avatarSize = '3.2rem';
                      cardPadding = '28px 36px';
                      cardMinHeight = '120px';
                    } else if (count <= 8) {
                      gridStyle.gridTemplateColumns = 'repeat(auto-fit, minmax(290px, 1fr))';
                      nameSize = '1.75rem';
                      avatarSize = '2.4rem';
                      cardPadding = '18px 24px';
                      cardMinHeight = '86px';
                    } else if (count <= 20) {
                      gridStyle.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';
                      nameSize = '1.3rem';
                      avatarSize = '1.8rem';
                      cardPadding = '14px 18px';
                      cardMinHeight = '68px';
                    } else {
                      gridStyle.gridTemplateColumns = 'repeat(auto-fill, minmax(170px, 1fr))';
                      nameSize = '1.05rem';
                      avatarSize = '1.4rem';
                      cardPadding = '10px 14px';
                      cardMinHeight = '52px';
                    }

                    return (
                      <div style={gridStyle}>
                        {participants.map((p, i) => (
                          <div
                            key={p.id || i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              background: p.disconnected ? '#F8FAFC' : '#FFFFFF',
                              border: `1.5px solid ${p.disconnected ? '#E2E8F0' : '#CBD5E1'}`,
                              borderRadius: '16px',
                              padding: cardPadding,
                              minHeight: cardMinHeight,
                              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
                              transition: 'all 0.2s ease',
                              boxSizing: 'border-box'
                            }}
                          >
                            <span style={{ fontSize: avatarSize, flexShrink: 0 }}>
                              {p.avatar || getSmileyForName(p.name)}
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, justifyContent: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  fontSize: nameSize,
                                  fontWeight: 800,
                                  color: p.disconnected ? '#94A3B8' : '#0F172A',
                                  letterSpacing: '-0.02em',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {p.name}
                                </span>
                                {p.disconnected ? (
                                  <span style={{
                                    fontSize: '0.68rem',
                                    background: '#FEE2E2',
                                    color: '#991B1B',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontWeight: 800,
                                    flexShrink: 0
                                  }}>
                                    Offline
                                  </span>
                                ) : (
                                  <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#10B981',
                                    display: 'inline-block',
                                    flexShrink: 0
                                  }} title="Online" />
                                )}
                              </div>
                              {(p.employeeId || p.zone || p.storeName) && (
                                <div style={{
                                  fontSize: count <= 8 ? '0.85rem' : '0.72rem',
                                  color: '#64748B',
                                  fontWeight: 600,
                                  marginTop: '4px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {[p.employeeId ? `ID: ${p.employeeId}` : '', (p.zone || p.storeName) ? `Zone: ${p.zone || p.storeName}` : ''].filter(Boolean).join(' • ')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )
            )
          )}

          {/* B. ACTIVE QUESTION CANVAS (Light Enterprise) */}
          {status === 'active' && !showQuestionLeaderboard && activeQuestion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '920px', margin: '0 auto', width: '100%' }}>
              
              {/* Question Header Card */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', boxShadow: '0 6px 20px rgba(15, 23, 42, 0.05)' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.35, flex: 1 }}>
                  {activeQuestion.text}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: '#EFF6FF',
                    border: '1.5px solid #BFDBFE',
                    color: '#2563EB',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 800
                  }}>
                    {activeQuestion.points ?? 100} Points
                  </div>
                  {activeQuestion.time_limit && !answerRevealed && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: timeLeft <= 5 ? '#FEF2F2' : '#FFFBEB',
                      border: `1.5px solid ${timeLeft <= 5 ? '#F87171' : '#FCD34D'}`,
                      color: timeLeft <= 5 ? '#DC2626' : '#B45309',
                      padding: '8px 16px', borderRadius: '12px', fontSize: '1.25rem', fontWeight: 800
                    }}>
                      <Clock size={20} />
                      <span>{timeLeft}s</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Options Listing / Response Distribution */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {getOptions(activeQuestion).map((opt, i) => {
                  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                  const letter = letters[i] || '?';
                  const isCorrect = isCorrectOpt(opt, i);
                  const votes = getOptionVotes(opt);
                  const percentage = liveAnswers.length > 0 ? Math.round((votes / liveAnswers.length) * 100) : 0;

                  return (
                    <div
                      key={i}
                      style={{
                        background: answerRevealed ? (isCorrect ? '#ECFDF5' : '#FFFFFF') : '#FFFFFF',
                        border: `2px solid ${answerRevealed ? (isCorrect ? '#10B981' : '#E2E8F0') : '#E2E8F0'}`,
                        borderRadius: '14px', padding: '16px 22px',
                        display: 'flex', flexDirection: 'column', gap: '10px',
                        boxShadow: answerRevealed && isCorrect ? '0 0 20px rgba(16, 185, 129, 0.2)' : '0 2px 8px rgba(15, 23, 42, 0.04)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '1.1rem', fontWeight: 700, color: answerRevealed && isCorrect ? '#065F46' : '#0F172A' }}>
                          <span style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: answerRevealed ? (isCorrect ? '#10B981' : '#F1F5F9') : '#2563EB',
                            color: answerRevealed ? (isCorrect ? '#FFFFFF' : '#64748B') : '#FFFFFF', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', fontWeight: 800
                          }}>
                            {letter}
                          </span>
                          <span>{opt}</span>
                          {answerRevealed && isCorrect && (
                            <CheckCircle2 size={22} color="#10B981" />
                          )}
                        </div>
                        {answerRevealed && (
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isCorrect ? '#065F46' : '#64748B' }}>
                            {percentage}% ({votes} {votes === 1 ? 'vote' : 'votes'})
                          </div>
                        )}
                      </div>

                      {/* Live Distribution Progress Bar */}
                      {answerRevealed && (
                        <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{
                              width: `${percentage}%`, height: '100%',
                              background: isCorrect ? '#10B981' : '#94A3B8',
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

          {/* C. LEADERBOARD / PODIUM (Light Enterprise) */}
          {(showQuestionLeaderboard || status === 'ended') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '840px', margin: '0 auto', width: '100%' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', border: '1px solid #FCD34D' }}>
                <Trophy size={30} />
              </div>
              <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0F172A', marginBottom: '28px', textAlign: 'center' }}>
                {status === 'ended' ? 'Final Session Champions' : 'Interim Leaderboard Standings'}
              </h1>

              {/* Top 3 Podium Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: '16px', width: '100%', marginBottom: '28px', alignItems: 'flex-end' }}>
                {/* Rank 2: Silver */}
                {leaderboard[1] && (
                  <div style={{ background: '#FFFFFF', border: '2px solid #CBD5E1', borderRadius: '16px', padding: '20px 16px', textAlign: 'center', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🥈</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Rank 2</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: '6px 0 2px' }}>{leaderboard[1].name}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563EB' }}>{leaderboard[1].score} pts</div>
                  </div>
                )}

                {/* Rank 1: Gold Champion */}
                {leaderboard[0] && (
                  <div style={{ background: '#FFFBEB', border: '2.5px solid #F59E0B', borderRadius: '18px', padding: '28px 20px', textAlign: 'center', boxShadow: '0 12px 30px rgba(245, 158, 11, 0.18)' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '4px' }}>👑</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>Champion · Rank 1</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0F172A', margin: '8px 0 2px' }}>{leaderboard[0].name}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#B45309' }}>{leaderboard[0].score} pts</div>
                  </div>
                )}

                {/* Rank 3: Bronze */}
                {leaderboard[2] && (
                  <div style={{ background: '#FFFFFF', border: '2px solid #FDBA74', borderRadius: '16px', padding: '20px 16px', textAlign: 'center', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🥉</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C2410C', textTransform: 'uppercase' }}>Rank 3</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: '6px 0 2px' }}>{leaderboard[2].name}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563EB' }}>{leaderboard[2].score} pts</div>
                  </div>
                )}
              </div>

              {/* Ranks 4+ Table */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leaderboard.slice(3, 10).map((p, i) => (
                  <div key={p.id || i} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', width: '24px' }}>#{i + 4}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#2563EB' }}>{p.score} pts</span>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* ─── FLOATING BOTTOM CONTROLS TOOLBAR (Light Enterprise) ─── */}
        <div style={{
          position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px',
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)', zIndex: 100
        }}>
          {/* Stop / End Session Button */}
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

          <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />

          {/* Prev Action Button */}
          <button 
            onClick={handleLogicalPrev} 
            disabled={status === 'waiting' || status === 'ended'}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px',
              background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#1E293B', fontSize: '0.82rem', fontWeight: 600,
              cursor: (status === 'waiting' || status === 'ended') ? 'not-allowed' : 'pointer',
              opacity: (status === 'waiting' || status === 'ended') ? 0.35 : 1
            }}
          >
            <ArrowLeft size={14} /> Prev
          </button>

          {/* Primary Action Button */}
          {status === 'ended' ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: '8px',
              background: '#10B981', color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 800,
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)'
            }}>
              <CheckCircle2 size={16} />
              <span>Quiz Completed</span>
            </div>
          ) : (
            <button 
              onClick={handleLogicalNext}
              disabled={!roomCode}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '8px',
                background: !roomCode ? '#94A3B8' : (isFinalLeaderboard ? '#10B981' : '#2563EB'),
                border: 'none', color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700,
                cursor: !roomCode ? 'not-allowed' : 'pointer',
                opacity: !roomCode ? 0.6 : 1,
                boxShadow: !roomCode ? 'none' : '0 2px 10px rgba(37, 99, 235, 0.35)'
              }}
              title={!roomCode ? "Preparing Live Arena..." : status === 'waiting' ? "Start Session" : isFinalLeaderboard ? "Complete Session" : "Next Action"}
            >
              <span>{getNextActionLabel()}</span>
              {isFinalLeaderboard ? <CheckCircle2 size={15} /> : <ArrowRight size={14} />}
            </button>
          )}

          {status === 'ended' && (
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px',
                background: '#2563EB', border: 'none', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
              }}
            >
              <span>Exit to Dashboard</span>
            </button>
          )}

          <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />

          {/* Fullscreen Button */}
          <button 
            onClick={toggleFullscreen}
            style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            title="Toggle Fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        </div>

      </main>
    </div>
  );
}
