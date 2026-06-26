import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Play, Users, SkipForward, Square, Trophy, ArrowLeft, ArrowRight, Settings, Maximize2, Minimize, ChevronLeft, ChevronRight, Award, Check, Clock } from 'lucide-react';
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
  const [liveAnswers, setLiveAnswers] = useState([]);
  const [joinBaseUrl, setJoinBaseUrl] = useState(''); // public tunnel or LAN IP
  const [joinMode, setJoinMode] = useState('lan');    // 'public' | 'lan'
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  // Participant connection metrics (PRD trainer dashboard)
  const [metrics, setMetrics] = useState({ total: 0, waiting: 0, active: 0, disconnected: 0, rejoined: 0 });

  // Timer States
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionDuration, setQuestionDuration] = useState(20);

  // Layout States
  const [showControlsSidebar, setShowControlsSidebar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const sessionStarted = useRef(false); // guard: only call host_start_quiz once per mount

  // Fetch public tunnel URL (or LAN fallback) — poll every 5s until tunnel is up
  useEffect(() => {
    const fetchJoinUrl = () => {
      axios.get('/api/join-url')
        .then(res => {
          if (res.data && res.data.url) {
            setJoinBaseUrl(res.data.url);
            setJoinMode(res.data.mode || 'lan');
          }
        })
        .catch(() => {
          // Fallback: use current window hostname
          setJoinBaseUrl(`${window.location.protocol}//${window.location.hostname}:${window.location.port}`);
          setJoinMode('lan');
        });
    };
    fetchJoinUrl();
    // Poll every 5 seconds — the tunnel URL arrives ~2-4s after server start
    const pollInterval = setInterval(fetchJoinUrl, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (roomCode && joinBaseUrl) {
      QRCode.toDataURL(`${joinBaseUrl}/join?code=${roomCode}`, {
        width: 200,
        margin: 1,
        color: {
          dark: '#050816',
          light: '#FFFFFF'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Failed to generate QR code', err));
    }
  }, [roomCode, joinBaseUrl]);

  useEffect(() => {
    // 1. Fetch Quiz Data
    axios.get('/api/quizzes', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const target = res.data.find(q => q.id === quizId);
        if (target) setQuiz(target);
      });

    // 2. Initialize Socket connection
    socket = io(window.location.origin);

    socket.on('connect', () => {
      console.log('Connected to QuizEngine');
      // Only start a new session once per component mount — prevents duplicate sessions
      // on HMR hot-reloads or socket reconnections.
      if (!sessionStarted.current) {
        sessionStarted.current = true;
        socket.emit('host_start_quiz', { quizId, hostId: user.id });
      } else if (roomCode) {
        // Rejoin the existing room on reconnect (host recovers after network blip)
        socket.emit('host_rejoin_room', { roomCode });
      }
    });

    socket.on('session_created', (data) => {
      setRoomCode(data.roomCode);
      setSessionId(data.sessionId);
      if (data.recovered) {
        setStatus(data.status);
        if (data.currentQuestionIndex !== undefined) {
          setCurrentQuestionIndex(data.currentQuestionIndex);
        }
        if (data.participants) {
          setParticipants(data.participants);
        }
      }
    });

    socket.on('participant_joined', (participant) => {
      setParticipants(prev => {
        const exists = prev.find(p => p.id === participant.id);
        if (exists) {
          return prev.map(p => p.id === participant.id ? { ...p, disconnected: false } : p);
        }
        return [...prev, participant];
      });
    });

    socket.on('answer_received', (data) => {
      console.log('Answer received:', data);
      setLiveAnswers(prev => [...prev, data]);
    });

    socket.on('leaderboard_update', (data) => {
      setLeaderboard(data);
    });

    socket.on('emoji_received', (data) => {
      if (data && data.emoji) {
        const id = Date.now() + Math.random().toString();
        const x = Math.random() * 80 + 10;
        const duration = Math.random() * 2 + 2;
        const scale = Math.random() * 0.5 + 0.8;
        setFloatingEmojis(prev => [...prev, { id, emoji: data.emoji, x, duration, scale }]);
        setTimeout(() => {
          setFloatingEmojis(prev => prev.filter(e => e.id !== id));
        }, duration * 1000);
      }
    });

    socket.on('participant_metrics', (data) => {
      setMetrics(data);
    });

    socket.on('participant_disconnected', ({ participantId }) => {
      setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, disconnected: true } : p));
    });

    return () => {
      socket.disconnect();
    };
  }, [quizId, user.id, token]);

  // Timer Countdown Effect
  useEffect(() => {
    let timer;
    if (status === 'active' && currentQuestionIndex >= 0 && quiz?.questions) {
      const currentQuestion = quiz.questions[currentQuestionIndex];
      const limit = currentQuestion?.time_limit || 20; // default 20s
      setTimeLeft(limit);
      setQuestionDuration(limit);
      
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentQuestionIndex, status, quiz]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard Navigation Controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        handleLogicalNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleLogicalPrev();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quiz, currentQuestionIndex, status, answerRevealed, showQuestionLeaderboard, roomCode, sessionId]);

  const getOptions = (question) => {
    if (!question || !question.options) return [];
    if (Array.isArray(question.options)) return question.options;
    if (typeof question.options === 'string') {
      try {
        return JSON.parse(question.options);
      } catch (e) {
        console.error('Failed to parse options', e);
        return [];
      }
    }
    return [];
  };

  const handleNextQuestion = () => {
    if (!quiz || !quiz.questions) return;
    const nextIndex = currentQuestionIndex + 1;
    
    setAnswerRevealed(false);
    setShowQuestionLeaderboard(false);
    setLiveAnswers([]);

    if (nextIndex >= quiz.questions.length) {
      setStatus('ended');
      socket.emit('host_show_leaderboard', { roomCode, sessionId });
      socket.emit('host_end_session', { roomCode });
      return;
    }

    setCurrentQuestionIndex(nextIndex);
    setStatus('active');
    
    const nextQuestion = quiz.questions[nextIndex];
    socket.emit('host_next_question', { 
      roomCode, 
      sessionId, 
      question: nextQuestion, 
      questionIndex: nextIndex, 
      totalQuestions: quiz.questions.length 
    });
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setAnswerRevealed(false);
      setShowQuestionLeaderboard(false);
      setLiveAnswers([]);
      setCurrentQuestionIndex(prevIndex);
      setStatus('active');
      const prevQuestion = quiz.questions[prevIndex];
      socket.emit('host_next_question', { 
        roomCode, 
        sessionId, 
        question: prevQuestion, 
        questionIndex: prevIndex, 
        totalQuestions: quiz.questions.length 
      });
    } else if (currentQuestionIndex === 0) {
      // Go back to waiting screen
      setAnswerRevealed(false);
      setShowQuestionLeaderboard(false);
      setLiveAnswers([]);
      setCurrentQuestionIndex(-1);
      setStatus('waiting');
      socket.emit('host_reset_lobby', { roomCode });
    }
  };

  const handleJumpToQuestion = (idx) => {
    if (!quiz || !quiz.questions) return;
    setAnswerRevealed(false);
    setShowQuestionLeaderboard(false);
    setLiveAnswers([]);
    setCurrentQuestionIndex(idx);
    setStatus('active');
    const question = quiz.questions[idx];
    socket.emit('host_next_question', { 
      roomCode, 
      sessionId, 
      question, 
      questionIndex: idx, 
      totalQuestions: quiz.questions.length 
    });
  };

  const handleShowLeaderboard = () => {
    socket.emit('host_show_leaderboard', { roomCode, sessionId });
    setShowQuestionLeaderboard(true);
  };

  const revealAnswer = () => {
    setAnswerRevealed(true);
    socket.emit('host_reveal_answer', { roomCode, questionId: activeQuestion?.id });
  };

  // Keyboard & unified Next Flow handler
  const handleLogicalNext = () => {
    if (!quiz || !quiz.questions) return;
    
    if (status === 'waiting') {
      handleNextQuestion();
    } else if (status === 'active') {
      const q = quiz.questions[currentQuestionIndex];
      const hasCorrectAnswer = q && q.correct_answer && q.type !== 'poll' && q.type !== 'word_cloud' && q.type !== 'rating';
      
      if (!answerRevealed && hasCorrectAnswer) {
        revealAnswer();
      } else if (!showQuestionLeaderboard) {
        handleShowLeaderboard();
      } else {
        handleNextQuestion();
      }
    } else if (status === 'ended') {
      navigate('/dashboard');
    }
  };

  const handleLogicalPrev = () => {
    if (showQuestionLeaderboard) {
      setShowQuestionLeaderboard(false);
    } else if (answerRevealed) {
      setAnswerRevealed(false);
    } else {
      handlePrevQuestion();
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.error('Error enabling fullscreen', err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Option calculations
  const getOptionVotes = (opt) => {
    let count = 0;
    liveAnswers.forEach(ans => {
      const answerValue = ans.answer;
      if (typeof answerValue === 'string') {
        if (answerValue.startsWith('[') && answerValue.endsWith(']')) {
          try {
            const parsed = JSON.parse(answerValue);
            if (Array.isArray(parsed) && parsed.includes(opt)) {
              count++;
            }
          } catch(e) {
            if (answerValue === opt) count++;
          }
        } else {
          const splitAns = answerValue.split(',').map(s => s.trim());
          if (splitAns.includes(opt)) {
            count++;
          }
        }
      } else if (answerValue === opt) {
        count++;
      }
    });
    return count;
  };

  const isCorrectOpt = (opt) => {
    if (!quiz || currentQuestionIndex < 0 || currentQuestionIndex >= quiz.questions.length) return false;
    const question = quiz.questions[currentQuestionIndex];
    const correct = question.correct_answer;
    if (!correct || question.type === 'poll') return false;
    try {
      const parsed = JSON.parse(correct);
      if (Array.isArray(parsed)) return parsed.includes(opt);
    } catch (err) {}
    return correct.split(',').map(s => s.trim()).includes(opt);
  };

  const getFormattedRoomCode = (code) => {
    if (!code) return '---';
    const clean = code.replace('#', '');
    if (clean.length === 6) {
      return `${clean.substring(0, 3)} ${clean.substring(3)}`;
    }
    return clean;
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  if (!quiz) return <div style={{ padding: '40px', textAlign: 'center', color: '#F5F7FA' }}>Loading Quiz Data...</div>;

  const formattedRoomCode = getFormattedRoomCode(roomCode);
  const activeQuestion = quiz.questions && quiz.questions[currentQuestionIndex];
  
  // Circumference calculation for Pulse Ring timer
  const radius = 35;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = questionDuration > 0 ? circumference - (timeLeft / questionDuration) * circumference : circumference;

  // Generate confetti elements for final slide
  const colorsList = ['#3DB9FF', '#7B61FF', '#00D68F', '#FF9F43', '#ffffff', '#a855f7'];
  const confettiList = Array.from({ length: 65 }).map((_, i) => {
    const left = Math.random() * 100 + '%';
    const delay = Math.random() * 5 + 's';
    const duration = (Math.random() * 3 + 2.5) + 's';
    const color = colorsList[Math.floor(Math.random() * colorsList.length)];
    const size = (Math.random() * 8 + 6) + 'px';
    const rotation = Math.random() * 360 + 'deg';
    return (
      <div key={i} className="confetti" style={{
        left,
        animationDelay: delay,
        animationDuration: duration,
        backgroundColor: color,
        width: size,
        height: size,
        transform: `rotate(${rotation})`,
      }} />
    );
  });

  return (
    <div ref={containerRef} className="host-presenter-container">
      <div className="command-grid-overlay"></div>
      <div className="command-glow-center"></div>
      
      {/* Custom Styles Injection */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-110vh) rotate(25deg) translateX(30px);
            opacity: 0;
          }
        }

        .host-presenter-container {
          font-family: 'Outfit', 'Inter', var(--font-body), sans-serif;
          height: 100vh;
          display: flex;
          background-color: #0A1128;
          color: #FFFFFF;
          overflow: hidden;
          width: 100vw;
          position: relative;
        }

        .command-grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(255, 152, 0, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 152, 0, 0.03) 1px, transparent 1px);
          background-size: 30px 30px;
          pointer-events: none;
          z-index: 1;
        }

        .command-glow-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(255, 152, 0, 0.05) 0%, transparent 70%);
          pointer-events: none;
          z-index: 1;
        }

        .left-sidebar {
          width: 320px;
          background-color: #0F1A36;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px 24px;
          border-right: 2px solid rgba(255, 152, 0, 0.2);
          box-sizing: border-box;
          height: 100%;
          justify-content: flex-start;
          flex-shrink: 0;
          z-index: 5;
          box-shadow: 5px 0 25px rgba(0,0,0,0.3);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: transparent;
          padding: 48px 64px 0 64px;
          box-sizing: border-box;
          height: 100%;
          overflow: hidden;
          position: relative;
          z-index: 5;
        }

        .btn-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 1px solid rgba(255, 152, 0, 0.3);
          background: #0F1A36;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: #FF9800;
        }

        .btn-circle:hover {
          background: rgba(255, 152, 0, 0.1);
          color: #FF5722;
          border-color: #FF5722;
          transform: scale(1.05);
          box-shadow: 0 0 12px rgba(255, 152, 0, 0.3);
        }

        .bottom-toolbar {
          position: absolute;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #0F1A36;
          border-radius: 18px;
          padding: 10px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          z-index: 1000;
          transition: all 0.3s ease;
          border: 2px solid rgba(255, 152, 0, 0.3);
        }

        .toolbar-btn {
          background: transparent;
          border: none;
          color: #FFFFFF;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .toolbar-btn:hover {
          color: #FF9800;
          background-color: rgba(255, 152, 0, 0.1);
        }

        .toolbar-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .toolbar-btn.stop {
          background-color: #EF4444;
          color: #ffffff;
          width: 38px;
          height: 38px;
          padding: 0;
          border-radius: 10px;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
        }

        .toolbar-btn.stop:hover {
          background-color: #dc2626;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.6);
        }

        .toolbar-select {
          background-color: #0A1128;
          border: 1px solid rgba(255, 152, 0, 0.3);
          color: #FFFFFF;
          padding: 8px 14px;
          border-radius: 10px;
          outline: none;
          font-size: 0.9rem;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .toolbar-select:hover {
          border-color: #FF9800;
        }

        .toolbar-select option {
          background-color: #0F1A36;
          color: #FFFFFF;
        }

        .qr-card-edgepro {
          background: #0A1128;
          padding: 24px;
          border-radius: 24px;
          border: 2px dashed #FF9800;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          margin-bottom: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: 100%;
        }

        .qr-inner-frame {
          background: #ffffff;
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(255, 152, 0, 0.1);
        }

        .sales-rep-card {
          padding: 14px 28px;
          background: #0F1A36;
          border: 1.5px solid rgba(255, 152, 0, 0.2);
          border-radius: 20px;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-size: 1.15rem;
          font-weight: 600;
          transition: all 0.3s ease;
          animation: float 4s ease-in-out infinite;
        }
        
        .sales-rep-card:hover {
          border-color: #FF9800;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(255, 152, 0, 0.25);
        }

        .status-dot-active {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #8BCF00;
          box-shadow: 0 0 8px #8BCF00;
          animation: pulse 1.5s infinite;
        }

        .status-dot-disconnected {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #EF4444;
          box-shadow: 0 0 8px #EF4444;
        }

        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.8; }
        }

        .stopwatch-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #0F1A36;
          border: 2px solid #FF9800;
          padding: 12px 24px;
          border-radius: 24px;
          color: #FF9800;
          font-family: 'Courier New', Courier, monospace;
          font-size: 1.6rem;
          font-weight: bold;
          flex-shrink: 0;
          box-shadow: 0 0 15px rgba(255, 152, 0, 0.2);
        }

        .retail-shelf-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
          padding: 24px 10px;
          box-sizing: border-box;
          position: relative;
        }

        .retail-shelf-container::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 10px;
          right: 10px;
          height: 8px;
          background: linear-gradient(90deg, transparent, rgba(255, 152, 0, 0.5), transparent);
          border-radius: 4px;
          box-shadow: 0 4px 10px rgba(255, 152, 0, 0.3);
        }

        .retail-shelf-item {
          display: flex;
          align-items: center;
          gap: 20px;
          font-size: 1.35rem;
          color: #FFFFFF;
          background: #0F1A36;
          border: 1.5px solid rgba(255, 152, 0, 0.2);
          padding: 18px 28px;
          border-radius: 20px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          cursor: default;
          transition: all 0.3s ease;
          position: relative;
        }

        .retail-shelf-item:hover {
          border-color: #FF9800;
          box-shadow: 0 6px 20px rgba(255, 152, 0, 0.15);
        }

        .price-tag-badge {
          background: #FF9800;
          color: #0A1128;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 1.1rem;
          position: relative;
          display: inline-block;
          clip-path: polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%);
          padding-right: 20px;
        }

        .price-tag-badge::after {
          content: "";
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          background: #0A1128;
          border-radius: 50%;
        }

        .kpi-progress-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          background: #0F1A36;
          padding: 24px;
          border-radius: 24px;
          border: 2px solid rgba(255, 152, 0, 0.2);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }

        .kpi-progress-bg {
          flex: 1;
          height: 16px;
          background-color: #0A1128;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(255, 152, 0, 0.15);
        }

        .kpi-progress-fill {
          height: 100%;
          border-radius: 8px;
          transition: width 0.8s cubic-bezier(0.1, 0.8, 0.2, 1);
        }

        .kpi-fill-correct {
          background: linear-gradient(90deg, #8BCF00, #4CAF50);
          box-shadow: 0 0 10px rgba(139, 207, 0, 0.4);
        }

        .kpi-fill-incorrect {
          background: linear-gradient(90deg, #FF9800, #FF5722);
          box-shadow: 0 0 10px rgba(255, 152, 0, 0.4);
        }

        .sales-board-entry {
          padding: 18px 28px;
          border-radius: 16px;
          font-size: 1.35rem;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s ease;
          box-sizing: border-box;
          width: 100%;
        }

        .sales-board-top {
          background: linear-gradient(135deg, #FF9800 0%, #FF5722 100%);
          border: 2px solid #FFFFFF;
          color: #FFFFFF;
          box-shadow: 0 8px 24px rgba(255, 152, 0, 0.4);
        }

        .sales-board-regular {
          background: #0F1A36;
          border: 1.5px solid rgba(255, 152, 0, 0.2);
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .sales-board-regular:hover {
          border-color: #FF9800;
          transform: translateX(4px);
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
          }
          100% {
            transform: translateY(105vh) rotate(360deg);
          }
        }

        .confetti {
          position: absolute;
          top: -10px;
          z-index: 50;
          animation: confetti-fall 4s linear infinite;
          border-radius: 50%;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .floating-trophy {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      {/* Confetti overlay for final congratulations */}
      {status === 'ended' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 50 }}>
          {confettiList}
        </div>
      )}

      {/* ─── LEFT SIDEBAR ─── */}
      <div className="left-sidebar">
        {/* QR Code Container */}
        <div className="qr-card-edgepro">
          <div className="qr-inner-frame">
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="Scan to Join"
                style={{
                  width: '170px',
                  height: '170px',
                  display: 'block'
                }}
              />
            ) : (
              <div style={{ width: '170px', height: '170px', background: '#0A1128', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF9800' }}>
                Generating QR...
              </div>
            )}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 600, letterSpacing: '0.5px', textAlign: 'center' }}>
            Scan with phone camera
          </span>
          {/* Mode indicator */}
          {joinMode === 'public' ? (
            <span style={{ fontSize: '0.72rem', color: '#8BCF00', fontWeight: 700, textAlign: 'center', marginTop: '-6px',
              background: 'rgba(139,207,0,0.12)', border: '1px solid rgba(139,207,0,0.3)',
              borderRadius: '20px', padding: '3px 10px'
            }}>
              🌐 Public — any network
            </span>
          ) : (
            <span style={{ fontSize: '0.72rem', color: '#FF9800', fontWeight: 700, textAlign: 'center', marginTop: '-6px',
              background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.3)',
              borderRadius: '20px', padding: '3px 10px'
            }}>
              📡 LAN — same Wi-Fi only
            </span>
          )}
        </div>

        {/* Access Instructions */}
        <div style={{ textAlign: 'center', marginTop: 'auto', marginBottom: '16px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#FF9800', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Join the Live Quiz
          </p>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, wordBreak: 'break-all', lineHeight: 1.4 }}>
            {joinBaseUrl ? `${joinBaseUrl.replace(/^https?:\/\//, '')}/join` : '...'}
          </p>
          <p style={{ margin: '10px 0 0 0', fontSize: '2.4rem', color: '#FF9800', fontWeight: 900, letterSpacing: '2px' }}>
            #{formattedRoomCode}
          </p>
        </div>

        {/* ── Real-time Participant Metrics Bar ── */}
        {sessionId && (
          <div style={{
            width: '100%',
            background: '#0A1128',
            borderRadius: '18px',
            border: '1.5px solid rgba(255,152,0,0.2)',
            padding: '14px 12px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#FF9800', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '10px', textAlign: 'center' }}>
              Live Participants
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Joined',       value: metrics.total,       color: '#3DB9FF' },
                { label: 'Active',        value: metrics.active,      color: '#8BCF00' },
                { label: 'Disconnected',  value: metrics.disconnected, color: '#EF4444' },
                { label: 'Rejoined',      value: metrics.rejoined,    color: '#FF9800' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: '#0F1A36',
                  borderRadius: '12px',
                  padding: '10px 8px',
                  textAlign: 'center',
                  border: `1px solid ${color}33`,
                }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color }}>{value}</div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="main-content">
        
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '45px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button className="btn-circle" onClick={() => navigate('/dashboard')} title="Exit Presenter Room">
              <ChevronLeft size={24} />
            </button>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {status === 'waiting' && '🏆 Live Session'}
              {status === 'active' && !showQuestionLeaderboard && `🏆 Live quiz (${currentQuestionIndex + 1}/${quiz.questions.length})`}
              {(showQuestionLeaderboard || status === 'ended') && '🏆 Leaderboard'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FF9800', fontSize: '1.3rem', fontWeight: 700 }}>
            <span>{participants.length}</span>
            <Users size={22} />
          </div>
        </div>

        {/* Body content based on quiz status */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', overflowY: 'auto', paddingBottom: '120px', boxSizing: 'border-box' }}>
          
          {/* A. WAITING STATE */}
          {status === 'waiting' && (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
              <h1 style={{ 
                fontSize: '3.2rem', 
                fontWeight: 900, 
                background: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                margin: '0 0 32px 0', 
                textAlign: 'left' 
              }}>
                Join the Session!
              </h1>
              
              {/* Joined participants grid */}
              <div style={{ 
                flex: 1,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px 12px',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxHeight: '60vh',
                overflowY: 'auto',
                padding: '20px 0'
              }}>
                {participants.map((p, i) => (
                  <div key={p.id || i} className="sales-rep-card" style={{ opacity: p.disconnected ? 0.5 : 1, borderColor: p.disconnected ? 'rgba(239, 68, 68, 0.3)' : undefined }}>
                    <span style={{ marginRight: '8px', fontSize: '1.25rem' }}>{p.avatar || getSmileyForName(p.name)}</span>
                    <div className={p.disconnected ? "status-dot-disconnected" : "status-dot-active"}></div>
                    {p.name}
                  </div>
                ))}
                {participants.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#FF9800', fontSize: '1.5rem', width: '100%', marginTop: '64px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '16px', animation: 'float 3s ease-in-out infinite' }}>⏳</div>
                    Waiting for players to connect...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* B. ACTIVE QUESTION STATE */}
          {status === 'active' && !showQuestionLeaderboard && activeQuestion && (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              
              {/* Question Row with stopwatch-badge */}
              <div className="glass-card" style={{ 
                background: '#0F1A36', 
                border: '2px solid rgba(255, 152, 0, 0.3)', 
                padding: '28px', 
                borderRadius: '24px', 
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                marginBottom: '32px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '24px' 
              }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0, lineHeight: 1.3, flex: 1 }}>
                  {activeQuestion.text}
                </h1>
                {activeQuestion.time_limit && !answerRevealed && (
                  <div className="stopwatch-badge" style={{ color: timeLeft <= 5 ? '#EF4444' : '#FF9800', borderColor: timeLeft <= 5 ? '#EF4444' : '#FF9800' }}>
                    <Clock size={28} />
                    <span>{timeLeft}s</span>
                  </div>
                )}
              </div>

              {/* Media Preview if attached */}
              {activeQuestion.media_url && (
                <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'flex-start' }}>
                  {/\.(mp3|wav|ogg|aac|m4a)$/i.test(activeQuestion.media_url) ? (
                    <audio controls src={activeQuestion.media_url} style={{ width: '60%' }} />
                  ) : (
                    <img 
                      src={activeQuestion.media_url} 
                      alt="Question attachment" 
                      style={{ maxWidth: '50%', maxHeight: '200px', borderRadius: '12px', objectFit: 'contain', border: '1px solid rgba(255, 152, 0, 0.2)' }} 
                    />
                  )}
                </div>
              )}

              {/* Options Listing */}
              {['mcq', 'multi_select', 'true_false', 'poll'].includes(activeQuestion.type) && (
                <>
                  {!answerRevealed ? (
                    /* Retail Shelf Option Cards */
                    <div className="retail-shelf-container">
                      {getOptions(activeQuestion).map((opt, i) => {
                        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                        const letter = letters[i] || '?';
                        return (
                          <div key={i} className="retail-shelf-item">
                            <span className="price-tag-badge">{letter}</span>
                            <span style={{ fontWeight: 600 }}>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Displaying Results with KPI indicators */
                    <div className="kpi-progress-container">
                      {getOptions(activeQuestion).map((opt, i) => {
                        const votes = getOptionVotes(opt);
                        const percentage = liveAnswers.length > 0 ? Math.round((votes / liveAnswers.length) * 100) : 0;
                        const isCorrect = isCorrectOpt(opt);
                        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                        const letter = letters[i] || '?';
                        
                        return (
                          <div key={i} style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '12px', 
                            width: '100%',
                            background: '#0A1128',
                            padding: '16px 24px',
                            borderRadius: '16px',
                            border: isCorrect ? '2px solid #8BCF00' : '1px solid rgba(255, 152, 0, 0.2)',
                            boxShadow: isCorrect ? '0 0 15px rgba(139, 207, 0, 0.15)' : 'none'
                          }}>
                            {/* Option text and optional check badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.3rem', fontWeight: 700, color: '#FFFFFF' }}>
                              <span className="price-tag-badge" style={{ background: isCorrect ? '#8BCF00' : '#FF9800' }}>{letter}</span>
                              <span>{opt}</span>
                              {isCorrect && (
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(139, 207, 0, 0.1)',
                                  border: '2px solid #8BCF00',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#8BCF00',
                                  fontSize: '0.9rem',
                                  fontWeight: 'bold',
                                  flexShrink: 0
                                }}>
                                  ✓
                                </div>
                              )}
                            </div>
                            
                            {/* Option Progress Bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                              <div className="kpi-progress-bg">
                                <div 
                                  className={`kpi-progress-fill ${isCorrect ? 'kpi-fill-correct' : 'kpi-fill-incorrect'}`} 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span style={{ 
                                fontSize: '1.2rem', 
                                fontWeight: 'bold', 
                                color: isCorrect ? '#8BCF00' : '#FF9800', 
                                minWidth: '100px', 
                                textAlign: 'right' 
                              }}>
                                {percentage}% ({votes} {votes === 1 ? 'vote' : 'votes'})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Free Text / Word Cloud List */}
              {['open_text', 'word_cloud'].includes(activeQuestion.type) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', padding: '10px' }}>
                  {liveAnswers.map((ans, idx) => (
                    <div key={idx} style={{ 
                      padding: '20px 24px', 
                      background: '#0F1A36', 
                      border: '1.5px solid rgba(255, 152, 0, 0.25)', 
                      borderRadius: '16px', 
                      textAlign: 'left', 
                      fontSize: '1.35rem', 
                      fontWeight: 600, 
                      color: '#FFFFFF', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                    }}>
                      "{ans.answer}"
                    </div>
                  ))}
                  {liveAnswers.length === 0 && (
                    <p style={{ color: '#FF9800', fontStyle: 'italic', fontSize: '1.2rem' }}>Waiting for response stream...</p>
                  )}
                </div>
              )}

              {/* Rating Display */}
              {activeQuestion.type === 'rating' && (
                <div style={{ 
                  textAlign: 'center', 
                  background: '#0F1A36', 
                  padding: '40px', 
                  borderRadius: '24px', 
                  border: '2px solid rgba(255, 152, 0, 0.3)', 
                  maxWidth: '400px', 
                  margin: '40px auto 0 auto', 
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)' 
                }}>
                  {(() => {
                    let sum = 0;
                    let count = 0;
                    liveAnswers.forEach(ans => {
                      const val = parseFloat(ans.answer);
                      if (!isNaN(val)) {
                        sum += val;
                        count++;
                      }
                    });
                    const avg = count > 0 ? (sum / count).toFixed(1) : '0.0';
                    return (
                      <>
                        <h2 style={{ fontSize: '5rem', margin: '0 0 12px 0', color: '#FFFFFF', fontWeight: 800 }}>{avg}</h2>
                        <div style={{ fontSize: '3rem', color: '#FF9800', marginBottom: '16px', letterSpacing: '4px' }}>
                          {'★'.repeat(Math.round(parseFloat(avg))).padEnd(5, '☆')}
                        </div>
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>{liveAnswers.length} responses</p>
                      </>
                    );
                  })()}
                </div>
              )}

            </div>
          )}

          {/* C. INTERIM OR FINAL LEADERBOARD STATE */}
          {(showQuestionLeaderboard || status === 'ended') && (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
              
              {/* Floating Trophy Header */}
              <div className="trophy-container">
                <span className="floating-trophy" style={{ fontSize: '7rem', display: 'block', lineHeight: 1 }}>🏆</span>
              </div>

              {/* Leaderboard Title */}
              <h1 style={{ 
                fontSize: '2.8rem', 
                fontWeight: 900, 
                background: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                marginBottom: '40px', 
                textAlign: 'center' 
              }}>
                {status === 'ended' && leaderboard.length > 0
                  ? `Congratulations, ${leaderboard[0].name}!`
                  : `Leaderboard (${currentQuestionIndex + 1}/${quiz.questions.length})`}
              </h1>

              {/* Leaderboard Entries */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '750px', margin: '0 auto', boxSizing: 'border-box' }}>
                {leaderboard.slice(0, 5).map((p, i) => {
                  const isFirst = i === 0;
                  const responses = p.Responses || p.responses || [];
                  const correctCount = responses.filter(r => r.points_awarded > 0).length;
                  const totalTimeMs = responses.reduce((sum, r) => sum + (r.response_time || 0), 0);
                  const avgTimeSec = responses.length > 0 ? Math.round(totalTimeMs / responses.length / 1000) : 0;
                  
                  const showMetrics = status === 'ended';

                  return (
                    <div key={p.id} className={`sales-board-entry ${isFirst ? 'sales-board-top' : 'sales-board-regular'}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ 
                          color: isFirst ? '#FFFFFF' : '#FF9800', 
                          fontWeight: 900
                        }}>
                          #{i+1}
                        </span>
                        <span>{p.name}</span>
                        {isFirst && <span style={{ fontSize: '1.25rem' }}>👑</span>}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '1.2rem', fontWeight: 700 }}>
                        {showMetrics ? (
                          <>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isFirst ? '#FFFFFF' : '#8BCF00' }}>
                              ✓ {correctCount}/{quiz.questions.length}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9 }}>
                              ⏱ {formatTime(avgTimeSec)}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: isFirst ? '#FFFFFF' : '#FF9800' }}>{p.score} pts</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {leaderboard.length === 0 && (
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic', fontSize: '1.2rem', textAlign: 'center', marginTop: '24px' }}>
                    No scores recorded.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ─── FLOATING BOTTOM TOOLBAR (PRESENTER ONLY) ─── */}
        <div className="bottom-toolbar">
          
          {/* End presenting red button */}
          <button 
            className="toolbar-btn stop" 
            onClick={() => {
              if (window.confirm("Are you sure you want to stop presenting and end the session?")) {
                socket.emit('host_end_session', { roomCode });
                navigate('/dashboard');
              }
            }} 
            title="Stop Presenting"
          >
            <Square size={16} fill="#ffffff" stroke="none" />
          </button>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 152, 0, 0.2)' }} />

          {/* Prev Button */}
          <button 
            className="toolbar-btn" 
            onClick={handleLogicalPrev} 
            disabled={status === 'waiting'}
            title="Go Back"
          >
            <ArrowLeft size={16} /> Prev
          </button>

          {/* Trophy Leaderboard Toggle Button */}
          <button 
            className="toolbar-btn" 
            onClick={() => {
              if (status === 'active') {
                if (showQuestionLeaderboard) {
                  setShowQuestionLeaderboard(false);
                } else {
                  handleShowLeaderboard();
                }
              }
            }}
            disabled={status === 'waiting' || status === 'ended'}
            style={{ color: showQuestionLeaderboard ? '#8BCF00' : '#FFFFFF' }}
            title="Toggle Leaderboard"
          >
            <Award size={16} />
          </button>

          {/* Next Button */}
          <button 
            className="toolbar-btn" 
            onClick={handleLogicalNext}
            title="Next Step"
          >
            Next <ArrowRight size={16} />
          </button>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 152, 0, 0.2)' }} />

          {/* Quiz Question Jumper Select */}
          <select 
            value={currentQuestionIndex} 
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              if (idx === -1) {
                setAnswerRevealed(false);
                setShowQuestionLeaderboard(false);
                setLiveAnswers([]);
                setCurrentQuestionIndex(-1);
                setStatus('waiting');
                socket.emit('host_reset_lobby', { roomCode });
              } else {
                handleJumpToQuestion(idx);
              }
            }}
            className="toolbar-select"
            title="Select Question"
          >
            <option value={-1}>Waiting Screen</option>
            {quiz.questions.map((q, idx) => (
              <option key={q.id} value={idx}>
                {idx + 1}. {q.text.substring(0, 20)}{q.text.length > 20 ? '...' : ''}
              </option>
            ))}
          </select>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 152, 0, 0.2)' }} />

          {/* Settings button */}
          <button className="toolbar-btn" title="Settings" onClick={() => alert("Quiz session settings panel is not available in present mode.")}>
            <Settings size={16} />
          </button>

          {/* Fullscreen button */}
          <button className="toolbar-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
            <Maximize2 size={16} />
          </button>

          {/* Sidebar Toggle Button */}
          <button 
            className="toolbar-btn" 
            onClick={() => setShowControlsSidebar(prev => !prev)}
            style={{ color: showControlsSidebar ? '#FF9800' : '#FFFFFF' }}
            title="Toggle Right Controls"
          >
            {showControlsSidebar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

      </div>

      {/* ─── TOGGLEABLE RIGHT CONTROLS PANEL ─── */}
      {showControlsSidebar && (
        <div style={{ 
          width: '320px', 
          background: '#0F1A36', 
          borderLeft: '2px solid rgba(255, 152, 0, 0.2)', 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%',
          flexShrink: 0,
          zIndex: 50,
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 152, 0, 0.15)' }}>
            <h3 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 800 }}>Present Controls</h3>
            <p style={{ margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>Manual presentation operations</p>
          </div>

          {/* Action Buttons */}
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 152, 0, 0.15)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {status === 'active' && !answerRevealed && (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', background: '#FF9800', borderColor: '#FF9800', color: '#0A1128' }} 
                onClick={revealAnswer}
              >
                Reveal Answer
              </button>
            )}
            
            {status === 'active' && !showQuestionLeaderboard && (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', background: '#8BCF00', borderColor: '#8BCF00', color: '#FFFFFF' }} 
                onClick={handleShowLeaderboard}
              >
                Show Leaderboard
              </button>
            )}

            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', justifyContent: 'center', background: 'transparent', border: '1.5px solid rgba(255, 152, 0, 0.3)', color: '#FF9800' }} 
              onClick={() => {
                if (window.confirm("Are you sure you want to reset the entire quiz session?")) {
                  setStatus('waiting');
                  setCurrentQuestionIndex(-1);
                  setAnswerRevealed(false);
                  setShowQuestionLeaderboard(false);
                  setLiveAnswers([]);
                }
              }}
            >
              Reset Session
            </button>
          </div>

          {/* Participant Directory */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              Connected ({participants.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {participants.map((p, i) => (
                <div key={i} style={{ padding: '10px 14px', background: '#0A1128', borderRadius: '8px', border: '1px solid rgba(255, 152, 0, 0.15)', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 500 }}>
                  <div className="status-dot-active"></div>
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Floating Emojis Layer */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
        {floatingEmojis.map(e => (
          <span
            key={e.id}
            style={{
              position: 'absolute',
              bottom: '-50px',
              left: `${e.x}%`,
              fontSize: '2.5rem',
              animation: `floatUp ${e.duration}s cubic-bezier(0.08, 0.8, 0.2, 1) forwards`,
              transform: `scale(${e.scale})`,
            }}
          >
            {e.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
