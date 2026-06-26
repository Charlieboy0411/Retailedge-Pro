import React, { useEffect, useState, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Clock } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const SHELFY_TIPS = [
  '💡 Fastest responders earn bonus Arena Points!',
  '🏆 Top performer gets the Sales Champion badge.',
  '📦 Answer all questions for a Perfect Session badge.',
  '⚡ Under 5s response time = Fastest Finger badge!',
  '🎯 Zone leaderboard updates after every question.',
  '🔥 5 sessions in a row = Attendance Streak reward!',
];

let socket;

export default function LiveQuiz() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);

  const cleanCode = (roomCode || '').replace(/\s+/g, '');

  // Get device fingerprint
  const getDeviceId = () => {
    let id = localStorage.getItem('qh_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('qh_device_id', id);
    }
    return id;
  };

  // Load session from localStorage if present
  const getSavedSession = () => {
    try {
      const raw = localStorage.getItem(`qh_session_${cleanCode}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const saved = getSavedSession() || {};

  const playerName   = location.state?.playerName   || saved.name || currentUser?.name || 'Anonymous Learner';
  const playerAvatar  = location.state?.avatar        || saved.avatar || '🙂';
  const playerEmpId   = location.state?.employeeId   || saved.employeeId || '';
  const playerMobile  = location.state?.mobileNumber || saved.mobileNumber || '';
  const playerDevice  = location.state?.deviceId     || saved.deviceId || getDeviceId();

  const [status, setStatus] = useState('waiting'); // waiting, question, answered, revealed, leaderboard, ended
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [participantId, setParticipantId] = useState(saved.participantId || null);
  const [myScore, setMyScore] = useState(saved.score || 0);
  const [myAvatar, setMyAvatar] = useState(playerAvatar);
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [participants, setParticipants] = useState([]);
  const [liveAnswers, setLiveAnswers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [lobbyCountdown, setLobbyCountdown] = useState(60);

  const EMOJIS_POOL = ['😊', '😎', '🤩', '🥳', '🦁', '🦊', '🐨', '🦖', '🚀', '🎨', '🎯', '⚡', '🌈', '👾', '🐼', '🐯', '🤖', '👑', '🔥', '🦄'];
  const getSmileyForName = (name) => {
    if (!name) return '😊';
    let hash = 0;
    for (let idx = 0; idx < name.length; idx++) {
      hash += name.charCodeAt(idx);
    }
    return EMOJIS_POOL[hash % EMOJIS_POOL.length];
  };

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
    if (correctAnswer === null || correctAnswer === undefined) return false;
    const correctStr = String(correctAnswer);
    try {
      const parsed = JSON.parse(correctStr);
      if (Array.isArray(parsed)) return parsed.includes(opt);
    } catch (err) {}
    return correctStr.split(',').map(s => s.trim()).includes(String(opt));
  };

  // Rotate mascot tips every 4s
  useEffect(() => {
    const iv = setInterval(() => setTipIndex(i => (i + 1) % SHELFY_TIPS.length), 4000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    socket = io(window.location.origin);

    socket.on('connect', () => {
      const cleanCode = roomCode.replace(/\s+/g, '');
      socket.emit('participant_join', {
        roomCode: cleanCode,
        name: playerName,
        employeeId: playerEmpId,
        mobileNumber: playerMobile,
        avatar: playerAvatar,
        userId: currentUser?.id,
        deviceId: playerDevice,
      });
    });

    socket.on('joined_session', (data) => {
      setParticipantId(data.participantId);
      if (data.avatar) setMyAvatar(data.avatar);
      if (data.score !== undefined) setMyScore(data.score);
      if (data.participants) setParticipants(data.participants);

      // Save/update session in local storage
      const sessionData = {
        name: playerName,
        employeeId: playerEmpId,
        mobileNumber: playerMobile,
        avatar: data.avatar || playerAvatar,
        deviceId: playerDevice,
        participantId: data.participantId,
        score: data.score !== undefined ? data.score : 0
      };
      localStorage.setItem(`qh_session_${cleanCode}`, JSON.stringify(sessionData));
    });

    socket.on('participant_joined', (p) => {
      setParticipants(prev => {
        if (prev.find(item => item.id === p.id)) return prev;
        return [...prev, p];
      });
    });

    socket.on('new_question', (question) => {
      setCurrentQuestion(question);
      setSelectedAnswer(null);
      setLiveAnswers([]);
      setAnswerRevealed(false);
      setStatus('question');
      setTimeLeft(question.time_limit || 30);
      setQuestionStartTime(Date.now());
    });

    socket.on('answer_received', (data) => {
      setLiveAnswers(prev => [...prev, data]);
    });

    socket.on('answer_revealed', (data) => {
      setCorrectAnswer(data?.correctAnswer);
      setAnswerRevealed(true);
      setStatus('revealed');
    });

    socket.on('leaderboard_update', (data) => {
      setLeaderboard(data);
      setStatus('leaderboard');

      let currentPartId = participantId;
      try {
        const raw = localStorage.getItem(`qh_session_${cleanCode}`);
        if (raw) {
          currentPartId = JSON.parse(raw).participantId;
        }
      } catch (e) {}

      const me = data.find(p => p.id === (currentPartId || participantId || saved.participantId));
      if (me && me.score !== undefined) {
        setMyScore(me.score);
        try {
          const raw = localStorage.getItem(`qh_session_${cleanCode}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.score = me.score;
            localStorage.setItem(`qh_session_${cleanCode}`, JSON.stringify(parsed));
          }
        } catch (e) {}
      }
    });

    socket.on('lobby_reset', () => {
      setStatus('waiting');
      setCurrentQuestion(null);
      setSelectedAnswer(null);
      setLiveAnswers([]);
      setAnswerRevealed(false);
      setCorrectAnswer(null);
    });

    socket.on('quiz_ended', () => {
      setStatus('ended');
    });

    socket.on('error', (msg) => {
      alert(msg);
      navigate('/join');
    });

    return () => socket.disconnect();
  }, [roomCode, playerName, navigate, currentUser]);

  // Lobby countdown timer
  useEffect(() => {
    if (status === 'waiting') {
      const timer = setInterval(() => {
        setLobbyCountdown(prev => (prev > 1 ? prev - 1 : 60));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status]);

  // Timer Countdown Effect
  useEffect(() => {
    let timerId;
    if (status === 'question' && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerId);
            // Auto-reveal results when time expires
            revealResults();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [status, timeLeft]);

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

  const isSubmitDisabled = () => {
    if (!selectedAnswer) return true;
    if (currentQuestion?.type === 'multi_select') {
      return !Array.isArray(selectedAnswer) || selectedAnswer.length === 0;
    }
    if (typeof selectedAnswer === 'string') {
      return selectedAnswer.trim() === '';
    }
    return false;
  };

  const submitAnswer = (answerText) => {
    setStatus('answered');
    const timeTaken = Date.now() - questionStartTime;
    if (socket && currentQuestion) {
      socket.emit('submit_answer', {
        roomCode,
        participantId,
        questionId: currentQuestion.id,
        answer: answerText,
        timeTaken,
      });
    }
  };

  // Helper to reveal results when timer expires
  const revealResults = () => {
    if (currentQuestion) {
      setCorrectAnswer(currentQuestion.correctAnswer);
      setStatus('revealed');
    }
  };

  const sendEmojiReaction = (emoji) => {
    if (socket && roomCode) {
      const cleanCode = roomCode.replace(/\s+/g, '');
      socket.emit('emoji_reaction', { roomCode: cleanCode, emoji });
    }
  };

  // Generate Confetti
  const colorsList = ['#3DB9FF', '#7B61FF', '#00D68F', '#FF9F43', '#ffffff', '#a855f7'];
  const confettiList = Array.from({ length: 50 }).map((_, i) => {
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#081120',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Outfit', 'Inter', sans-serif"
    }}>
      {/* Custom Styles Injection */}
      <style>{`
        .command-grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(255, 107, 53, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 107, 53, 0.03) 1px, transparent 1px);
          background-size: 30px 30px;
          pointer-events: none;
          z-index: 1;
        }

        .command-glow-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(255, 107, 53, 0.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 1;
        }

        .sales-rep-card {
          padding: 10px 18px;
          background: #0F1A36;
          border: 1.5px solid rgba(255, 107, 53, 0.2);
          border-radius: 16px;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-size: 0.95rem;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        
        .sales-rep-card:hover {
          border-color: #FF6B35;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(255, 107, 53, 0.25);
        }

        .status-dot-active {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00C896;
          box-shadow: 0 0 8px #00C896;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.8; }
        }

        .stopwatch-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #0F1A36;
          border: 2px solid #FF6B35;
          padding: 8px 16px;
          border-radius: 20px;
          color: #FF6B35;
          font-family: 'Courier New', Courier, monospace;
          font-size: 1.25rem;
          font-weight: bold;
          flex-shrink: 0;
          box-shadow: 0 0 12px rgba(255, 107, 53, 0.2);
        }

        .retail-shelf-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          padding: 16px 0;
          box-sizing: border-box;
          position: relative;
        }

        .retail-shelf-container::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, transparent, rgba(255, 107, 53, 0.5), transparent);
          border-radius: 2px;
          box-shadow: 0 2px 6px rgba(255, 107, 53, 0.3);
        }

        .retail-shelf-item {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 1.1rem;
          color: #FFFFFF;
          background: #0F1A36;
          border: 1.5px solid rgba(255, 107, 53, 0.2);
          padding: 14px 20px;
          border-radius: 16px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          text-align: left;
          width: 100%;
          outline: none;
        }

        .retail-shelf-item:hover:not(:disabled) {
          border-color: #FF6B35;
          box-shadow: 0 6px 16px rgba(255, 107, 53, 0.15);
          background: rgba(255, 107, 53, 0.05);
        }

        .retail-shelf-item:disabled {
          cursor: not-allowed;
        }

        .price-tag-badge {
          background: #FF6B35;
          color: #081120;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 0.95rem;
          position: relative;
          display: inline-block;
          clip-path: polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%);
          padding-right: 16px;
        }

        .price-tag-badge::after {
          content: "";
          position: absolute;
          right: 5px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 4px;
          background: #081120;
          border-radius: 50%;
        }

        .kpi-progress-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          background: #0F1A36;
          padding: 20px;
          border-radius: 20px;
          border: 2px solid rgba(255, 107, 53, 0.25);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }

        .kpi-progress-bg {
          flex: 1;
          height: 12px;
          background-color: #081120;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid rgba(255, 107, 53, 0.15);
        }

        .kpi-progress-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.8s cubic-bezier(0.1, 0.8, 0.2, 1);
        }

        .kpi-fill-correct {
          background: linear-gradient(90deg, #00C896, #00A67D);
          box-shadow: 0 0 10px rgba(0, 200, 150, 0.4);
        }

        .kpi-fill-incorrect {
          background: linear-gradient(90deg, #FF6B35, #E04D1B);
          box-shadow: 0 0 10px rgba(255, 107, 53, 0.4);
        }

        .sales-board-entry {
          padding: 14px 20px;
          border-radius: 14px;
          font-size: 1.1rem;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s ease;
          box-sizing: border-box;
          width: 100%;
        }

        .sales-board-top {
          background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);
          border: 2px solid #FFFFFF;
          color: #FFFFFF;
          box-shadow: 0 8px 20px rgba(255, 107, 53, 0.35);
        }

        .sales-board-regular {
          background: #0F1A36;
          border: 1.5px solid rgba(255, 107, 53, 0.25);
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
          50% { transform: translateY(-8px); }
        }

        .floating-trophy {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      {/* Grid overlay & ambient glow */}
      <div className="command-grid-overlay" />
      <div className="command-glow-center" />

      {/* Confetti overlay for final podium */}
      {status === 'ended' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 40 }}>
          {confettiList}
        </div>
      )}

      {/* A. WAITING LOBBY STATE */}
      {status === 'waiting' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', overflowY: 'auto', zIndex: 5 }}>
          <div style={{ width: '100%', maxWidth: '460px', padding: '40px 32px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '2px solid rgba(255,107,53,0.25)', background: '#0F1A36', borderRadius: '24px' }}>
            <div style={{ marginBottom: '28px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#FF6B35', background: 'rgba(255,107,53,0.1)', padding: '6px 16px', borderRadius: '20px', border: '1px solid rgba(255,107,53,0.2)' }}>
                RetailEdge Pro Lobby
              </span>
              <h2 style={{ marginTop: '16px', color: 'white', fontSize: '2rem', fontWeight: '800', fontFamily: 'Poppins, sans-serif' }}>Waiting for Host...</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem' }}>
                The trainer will initiate the session shortly.
              </p>
            </div>

            {/* Join Code & Mock Countdown Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#0A1128', padding: '12px', borderRadius: '16px', border: '2px dashed rgba(255,107,53,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Room Code</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '2px', color: '#FF6B35', fontFamily: 'Courier New, monospace' }}>{roomCode}</span>
              </div>
              <div style={{ background: '#0A1128', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,107,53,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Est. Start</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#FF9800', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Clock size={14} />
                  00:{lobbyCountdown < 10 ? '0' + lobbyCountdown : lobbyCountdown}
                </span>
              </div>
            </div>

            {/* Player avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', background: 'rgba(255,107,53,0.05)', padding: '12px 18px', borderRadius: '30px', margin: '0 auto 28px', width: 'fit-content', border: '1px solid rgba(255,107,53,0.15)' }}>
              <span style={{ fontSize: '1.4rem' }}>{myAvatar}</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Associate: <strong style={{ color: '#FF6B35' }}>{playerName}</strong></span>
            </div>

            {/* Connected Participants List */}
            <div style={{ marginTop: '24px', marginBottom: '24px', textAlign: 'left' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 700, color: '#FF6B35', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Connected supervisors
              </h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px 8px',
                maxHeight: '150px',
                overflowY: 'auto',
                background: '#0A1128',
                padding: '12px',
                borderRadius: '16px',
                border: '1px solid rgba(255,107,53,0.15)',
                justifyContent: 'center'
              }}>
                {participants.map((p, i) => (
                  <div key={p.id || i} className="sales-rep-card" style={{ fontSize: '0.82rem', padding: '6px 12px', borderRadius: '10px' }}>
                    <span>{p.avatar || getSmileyForName(p.name)}</span>
                    <div className="status-dot-active" style={{ width: '6px', height: '6px' }} />
                    <span>{p.name}</span>
                  </div>
                ))}
                {participants.length === 0 && (
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Waiting for others to join...</span>
                )}
              </div>
            </div>

            {/* Shelfy mascot tip */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '12px', textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #FF6B35, #FF8C42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🛒</div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#FF6B35', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>Shelfy says</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>{SHELFY_TIPS[tipIndex]}</div>
              </div>
            </div>

            {/* Quiz Rules Panel */}
            <div style={{ textAlign: 'left', background: '#0A1128', padding: '20px', borderRadius: '16px', color: '#FFFFFF', border: '1px solid rgba(255,107,53,0.15)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 700, color: '#FF6B35', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assessment Rules</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>
                {[
                  'Each correct response awards exactly 1 point.',
                  'No negative marking for wrong answers.',
                  'Answer before the countdown timer runs out.',
                  'Leaderboard refreshes after every question.',
                ].map((rule, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#FF6B35', fontWeight: 'bold', flexShrink: 0 }}>•</span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B. INTERIM LEADERBOARD STATE */}
      {status === 'leaderboard' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', overflowY: 'auto', zIndex: 5 }}>
          <span className="floating-trophy" style={{ fontSize: '4rem', display: 'block', marginBottom: '12px' }}>🏆</span>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '24px',
            textAlign: 'center',
            fontFamily: 'Poppins, sans-serif'
          }}>
            Leaderboard Standing
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '420px' }}>
            {leaderboard.slice(0, 5).map((p, i) => {
              const isFirst = i === 0;
              const isMe = p.id === participantId;
              return (
                <div key={p.id} className={`sales-board-entry ${isFirst ? 'sales-board-top' : 'sales-board-regular'}`} style={{ border: isMe ? '2px solid #FF6B35' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, minWidth: '24px' }}>#{i + 1}</span>
                    <span>{getSmileyForName(p.name)}</span>
                    <span style={{ fontSize: '1rem', fontWeight: isMe ? 'bold' : 'normal' }}>{p.name} {isMe && '(You)'}</span>
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{p.score} pts</span>
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: '24px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Waiting for host to deploy next question...</p>
        </div>
      )}

      {/* C. FINAL ENDED PODIUM STATE */}
      {status === 'ended' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', overflowY: 'auto', zIndex: 5, position: 'relative' }}>
          <span className="floating-trophy" style={{ fontSize: '6rem', display: 'block' }}>🏆</span>
          
          <h2 style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginTop: '16px',
            textAlign: 'center',
            fontFamily: 'Poppins, sans-serif'
          }}>
            {leaderboard.length > 0 && leaderboard[0].id === participantId ? "You Are the Champion!" : "Quiz Ended!"}
          </h2>
          
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1.05rem', marginBottom: '32px', textAlign: 'center' }}>
            {leaderboard.length > 0 && leaderboard[0].id === participantId ? "Outstanding performance in the Arena! 🏆" : "Great job completing the assessment!"}
          </p>

          {leaderboard.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '420px', zIndex: 10 }}>
              <h3 style={{ fontSize: '0.85rem', color: '#FF6B35', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', textAlign: 'center' }}>Final Standing</h3>
              {leaderboard.slice(0, 5).map((p, i) => {
                const isFirst = i === 0;
                const isMe = p.id === participantId;
                return (
                  <div key={p.id} className={`sales-board-entry ${isFirst ? 'sales-board-top' : 'sales-board-regular'}`} style={{ border: isMe ? '2px solid #FF6B35' : undefined }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 900, minWidth: '24px' }}>#{i + 1}</span>
                      <span>{getSmileyForName(p.name)}</span>
                      <span style={{ fontSize: '1rem', fontWeight: isMe ? 'bold' : 'normal' }}>{p.name} {isMe && '(You)'}</span>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{p.score} pts</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* D. ACTIVE QUESTION / ANSWERED / REVEALED STATES */}
      {['question', 'answered', 'revealed'].includes(status) && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', zIndex: 5, overflowY: 'auto' }}>
          
          {/* Header */}
          {/* Live Dashboard Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0F1A36 0%, #0A1128 100%)',
            borderBottom: '2px solid rgba(255, 107, 53, 0.25)',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 10
          }}>
            {/* Top row: Greeting and Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>{myAvatar}</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Hi {playerName} 🏆
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '12px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 700, color: '#FF6B35' }}>
                  Rank: {(() => {
                    const myRankIndex = leaderboard.findIndex(p => p.id === participantId);
                    return myRankIndex >= 0 ? myRankIndex + 1 : '-';
                  })()}
                </div>
                <div style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.3)', borderRadius: '12px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 700, color: '#00C896' }}>
                  Points: {myScore}
                </div>
              </div>
            </div>
            
            {/* Bottom row: Question Progress & Timer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.7)' }}>
                {currentQuestion?.questionIndex !== undefined 
                  ? `Question ${currentQuestion.questionIndex + 1} of ${currentQuestion.totalQuestions || 10}` 
                  : `Room: ${roomCode}`}
              </span>
              {timeLeft > 0 && status === 'question' && (
                <div className="stopwatch-badge" style={{ color: timeLeft <= 5 ? '#EF4444' : '#FF6B35', borderColor: timeLeft <= 5 ? '#EF4444' : '#FF6B35', padding: '4px 10px', fontSize: '0.9rem', borderRadius: '12px' }}>
                  <Clock size={14} />
                  <span>{timeLeft}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Main Question Content */}
          <div style={{ flex: 1, padding: '24px 24px 120px 24px', display: 'flex', flexDirection: 'column', maxWidth: '600px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            {currentQuestion ? (
              <>
                {/* Question Text */}
                <div style={{ 
                  background: '#0F1A36', 
                  border: '2px solid rgba(255, 107, 53, 0.3)', 
                  padding: '24px', 
                  borderRadius: '20px', 
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  marginBottom: '28px',
                  textAlign: 'center'
                }}>
                  <h2 style={{ fontSize: '1.5rem', color: 'white', fontWeight: '700', margin: 0 }}>
                    {currentQuestion.text}
                  </h2>
                </div>

                {/* Media Preview */}
                {currentQuestion.media_url && (
                  <div style={{ marginBottom: '24px', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
                    {/\.(mp3|wav|ogg|aac|m4a)$/i.test(currentQuestion.media_url) ? (
                      <audio controls src={currentQuestion.media_url} style={{ width: '100%' }} />
                    ) : (
                      <img 
                        src={currentQuestion.media_url} 
                        alt="Question Media" 
                        style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', objectFit: 'contain', border: '2px solid rgba(255,107,53,0.2)' }} 
                      />
                    )}
                  </div>
                )}

                {/* --- 1. OPTION LISTING (BEFORE REVEAL) --- */}
                {['mcq', 'multi_select', 'true_false', 'poll'].includes(currentQuestion.type) && status !== 'revealed' && (
                  <div className="retail-shelf-container">
                    {getOptions(currentQuestion).map((opt, i) => {
                      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                      const letter = letters[i] || '?';
                      const isSelected = Array.isArray(selectedAnswer) 
                        ? selectedAnswer.includes(opt) 
                        : selectedAnswer === opt;
                      
                      return (
                        <button
                          key={i}
                          disabled={status === 'answered'}
                          onClick={() => {
                            if (status !== 'question') return;
                            if (currentQuestion.type === 'multi_select') {
                              const currentSelection = Array.isArray(selectedAnswer) ? selectedAnswer : [];
                              if (currentSelection.includes(opt)) {
                                setSelectedAnswer(currentSelection.filter(item => item !== opt));
                              } else {
                                setSelectedAnswer([...currentSelection, opt]);
                              }
                            } else {
                              setSelectedAnswer(opt);
                            }
                          }}
                          className="retail-shelf-item"
                          style={{
                            borderColor: isSelected ? '#FF6B35' : undefined,
                            background: isSelected ? 'rgba(255, 107, 53, 0.12)' : undefined,
                            boxShadow: isSelected ? '0 0 15px rgba(255, 107, 53, 0.3)' : undefined,
                            opacity: status === 'answered' && !isSelected ? 0.6 : 1,
                          }}
                        >
                          <span className="price-tag-badge" style={{ background: isSelected ? '#FF6B35' : 'rgba(255, 107, 53, 0.2)', color: isSelected ? '#081120' : '#FFFFFF' }}>{letter}</span>
                          <span style={{ fontWeight: 600 }}>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* --- 2. OPTION LISTING (REVEALED RESULTS) --- */}
                {['mcq', 'multi_select', 'true_false', 'poll'].includes(currentQuestion.type) && status === 'revealed' && (
                  <div className="kpi-progress-container">
                    {getOptions(currentQuestion).map((opt, i) => {
                      const votes = getOptionVotes(opt);
                      const percentage = liveAnswers.length > 0 ? Math.round((votes / liveAnswers.length) * 100) : 0;
                      const isCorrect = isCorrectOpt(opt);
                      const isMyChoice = Array.isArray(selectedAnswer) 
                        ? selectedAnswer.includes(opt) 
                        : selectedAnswer === opt;
                      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                      const letter = letters[i] || '?';
                      
                      return (
                        <div key={i} style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '12px', 
                          width: '100%',
                          background: '#0A1128',
                          padding: '14px 20px',
                          borderRadius: '16px',
                          border: isCorrect ? '2px solid #00C896' : (isMyChoice ? '1.5px dashed #FF6B35' : '1px solid rgba(255, 107, 53, 0.2)'),
                          boxShadow: isCorrect ? '0 0 12px rgba(0, 200, 150, 0.15)' : 'none'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', flexWrap: 'wrap' }}>
                            <span className="price-tag-badge" style={{ background: isCorrect ? '#00C896' : '#FF6B35' }}>{letter}</span>
                            <span>{opt}</span>
                            {isMyChoice && (
                              <span style={{ fontSize: '0.72rem', background: 'rgba(255, 107, 53, 0.15)', color: '#FF6B35', padding: '3px 8px', borderRadius: '10px', border: '1px solid rgba(255, 107, 53, 0.3)' }}>
                                Your Choice
                              </span>
                            )}
                            {isCorrect && (
                              <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(0, 200, 150, 0.1)',
                                border: '2px solid #00C896',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#00C896',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                flexShrink: 0
                              }}>
                                ✓
                              </div>
                            )}
                          </div>
                          
                          {/* Option Progress Bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                            <div className="kpi-progress-bg">
                              <div 
                                className={`kpi-progress-fill ${isCorrect ? 'kpi-fill-correct' : 'kpi-fill-incorrect'}`} 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span style={{ 
                              fontSize: '1rem', 
                              fontWeight: 'bold', 
                              color: isCorrect ? '#00C896' : '#FF6B35', 
                              minWidth: '80px', 
                              textAlign: 'right' 
                            }}>
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* --- 3. FREE TEXT/WORD CLOUD INPUTS --- */}
                {['open_text', 'word_cloud'].includes(currentQuestion.type) && status !== 'revealed' && (
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: '24px' }}>
                    <textarea
                      rows={3}
                      value={selectedAnswer || ''}
                      onChange={e => status === 'question' && setSelectedAnswer(e.target.value)}
                      placeholder={currentQuestion.type === 'word_cloud' ? "Type a word..." : "Type your answer here..."}
                      style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '16px',
                        border: '2px solid rgba(255,107,53,0.3)',
                        background: '#0F1A36',
                        color: 'white',
                        fontSize: '1.1rem',
                        resize: 'none',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      disabled={status === 'answered'}
                    />
                  </div>
                )}

                {/* --- 4. FREE TEXT/WORD CLOUD REVEALED STREAM --- */}
                {['open_text', 'word_cloud'].includes(currentQuestion.type) && status === 'revealed' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <h3 style={{ fontSize: '0.9rem', color: '#FF6B35', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Responses ({liveAnswers.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                      {liveAnswers.map((ans, idx) => {
                        const isMe = ans.participantId === participantId;
                        return (
                          <div key={idx} style={{ 
                            padding: '14px 18px', 
                            background: '#0F1A36', 
                            border: isMe ? '1.5px dashed #FF6B35' : '1px solid rgba(255, 107, 53, 0.15)', 
                            borderRadius: '12px', 
                            textAlign: 'left', 
                            fontSize: '1.05rem', 
                            fontWeight: 600, 
                            color: '#FFFFFF', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>"{ans.answer}"</span>
                            {isMe && <span style={{ fontSize: '0.7rem', color: '#FF6B35', fontWeight: 700, textTransform: 'uppercase' }}>You</span>}
                          </div>
                        );
                      })}
                      {liveAnswers.length === 0 && (
                        <p style={{ color: '#FF6B35', fontStyle: 'italic', fontSize: '1rem', textAlign: 'center' }}>No submissions yet.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* --- 5. RATING INPUT STATE --- */}
                {currentQuestion.type === 'rating' && status !== 'revealed' && (
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', margin: '24px 0' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => status === 'question' && setSelectedAnswer(star.toString())}
                        disabled={status === 'answered'}
                        style={{
                          fontSize: '3.5rem',
                          color: (() => {
                            const val = parseInt(selectedAnswer);
                            return (!isNaN(val) && val >= star) ? '#FF6B35' : 'rgba(255,255,255,0.2)';
                          })(),
                          transition: 'color 0.1s ease',
                          background: 'none',
                          border: 'none',
                          cursor: status === 'question' ? 'pointer' : 'default',
                          textShadow: (() => {
                            const val = parseInt(selectedAnswer);
                            return (!isNaN(val) && val >= star) ? '0 0 10px rgba(255,107,53,0.4)' : 'none';
                          })()
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                )}

                {/* --- 6. RATING REVEALED RESULTS STATE --- */}
                {currentQuestion.type === 'rating' && status === 'revealed' && (
                  <div style={{ 
                    textAlign: 'center', 
                    background: '#0F1A36', 
                    padding: '24px', 
                    borderRadius: '20px', 
                    border: '2px solid rgba(255, 107, 53, 0.3)', 
                    maxWidth: '360px', 
                    margin: '24px auto', 
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    width: '100%'
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
                      const avgNum = parseFloat(avg);
                      const roundedAvg = !isNaN(avgNum) ? Math.round(avgNum) : 0;
                      const displayStars = roundedAvg >= 0 ? '★'.repeat(roundedAvg).padEnd(5, '☆') : '☆☆☆☆☆';
                      return (
                        <>
                          <h2 style={{ fontSize: '3.5rem', margin: '0 0 8px 0', color: '#FFFFFF', fontWeight: 800 }}>{avg}</h2>
                          <div style={{ fontSize: '2rem', color: '#FF6B35', marginBottom: '12px', letterSpacing: '3px' }}>
                            {displayStars}
                          </div>
                          <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                            {liveAnswers.length} responses (Avg Rating)
                          </p>
                          {(() => {
                            const ratingNum = parseInt(selectedAnswer);
                            if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) return null;
                            return (
                              <p style={{ color: '#FF6B35', fontSize: '0.85rem', marginTop: '12px', fontWeight: 500 }}>
                                You rated: {'★'.repeat(ratingNum)}
                              </p>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Submit button (Question selection view) */}
                {status === 'question' && (
                  <button 
                    onClick={() => !isSubmitDisabled() && submitAnswer(
                      currentQuestion.type === 'multi_select' ? JSON.stringify(selectedAnswer) : selectedAnswer
                    )}
                    disabled={isSubmitDisabled()}
                    style={{ 
                      marginTop: '32px', 
                      padding: '16px', 
                      fontSize: '1.2rem', 
                      borderRadius: '24px',
                      background: !isSubmitDisabled() ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)' : 'rgba(255,255,255,0.1)',
                      color: !isSubmitDisabled() ? 'white' : 'rgba(255,255,255,0.3)',
                      border: 'none',
                      fontWeight: 'bold',
                      justifyContent: 'center',
                      cursor: !isSubmitDisabled() ? 'pointer' : 'not-allowed',
                      boxShadow: !isSubmitDisabled() ? '0 4px 15px rgba(255,107,53,0.4)' : 'none',
                      width: '100%',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    Submit Answer
                  </button>
                )}

                {/* Submitting Status (Answered state) */}
                {status === 'answered' && (
                  <div style={{ marginTop: 'auto', textAlign: 'center', padding: '20px', background: '#0F1A36', borderRadius: '16px', color: 'white', border: '2px dashed rgba(255,107,53,0.3)' }}>
                    <strong>Answer submitted!</strong> Waiting for host to reveal results...
                  </div>
                )}

                {/* Revealed Status Helper Text */}
                {status === 'revealed' && (
                  <div style={{ marginTop: 'auto', textAlign: 'center', padding: '16px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                    Trainer is reviewing results. Next screen will load shortly...
                  </div>
                )}
              </>
            ) : (
              <div style={{ margin: 'auto', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>No active question.</div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING REACTION BAR */}
      {status !== 'ended' && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 26, 54, 0.95)',
          border: '1.5px solid rgba(255, 107, 53, 0.3)',
          borderRadius: '30px',
          padding: '8px 16px',
          display: 'flex',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 10000,
          backdropFilter: 'blur(8px)',
        }}>
          {['👍', '❤️', '😂', '🎉', '😮', '🔥'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendEmojiReaction(emoji)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.6rem',
                cursor: 'pointer',
                padding: '4px',
                transition: 'transform 0.15s ease',
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(1.3)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
