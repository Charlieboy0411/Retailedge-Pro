import React, { useEffect, useState, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Clock, Trophy, Award, CheckCircle2, AlertCircle, Radio, Sparkles } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const SHELFY_TIPS = [
  '💡 Review your answer carefully — you can revise it before the timer expires!',
  '🏆 Accuracy on configured question points determines the Leaderboard standings.',
  '📦 Product Knowledge and SOP precision boost your overall score.',
  '🎯 Points are strictly determined by the trainer for each question.',
  '🔥 Participate actively in every session for top ranking!',
];

let socket;

export default function LiveQuiz() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);

  const cleanCode = (roomCode || '').replace(/\s+/g, '');

  const getDeviceId = () => {
    let id = localStorage.getItem('qh_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('qh_device_id', id);
    }
    return id;
  };

  const getSavedSession = () => {
    try {
      const raw = localStorage.getItem(`qh_session_${cleanCode}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const saved = getSavedSession() || {};

  const playerName   = location.state?.playerName   || saved.name || currentUser?.name || 'Learner';
  const playerAvatar = location.state?.avatar       || saved.avatar || '🙂';
  const playerEmpId  = location.state?.employeeId   || saved.employeeId || '';
  const playerZone   = location.state?.zone         || saved.zone || '';
  const playerMobile = location.state?.mobileNumber || saved.mobileNumber || '';
  const playerDevice = location.state?.deviceId     || saved.deviceId || getDeviceId();

  const [status, setStatus] = useState('waiting');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submittedAnswer, setSubmittedAnswer] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState('idle'); // idle, submitting, confirmed, rejected
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [submissionError, setSubmissionError]   = useState('');
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
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(null);
  const [questionPoints, setQuestionPoints] = useState(100);
  const [tipIndex, setTipIndex] = useState(0);
  const [isServerConfirmed, setIsServerConfirmed] = useState(false);
  const [tappedReaction, setTappedReaction] = useState(null);
  const [quizTotalQuestions, setQuizTotalQuestions] = useState(null);
  const [joinError, setJoinError] = useState('');

  const EMOJIS_POOL = ['😊', '😎', '🤩', '🥳', '🦁', '🦊', '🐨', '🦖', '🚀', '🎨', '🎯', '⚡', '🌈', '👾', '🐼', '🐯', '🤖', '👑', '🔥', '🦄'];
  const getSmileyForName = (name) => {
    if (!name) return '😊';
    let hash = 0;
    for (let idx = 0; idx < name.length; idx++) {
      hash += name.charCodeAt(idx);
    }
    return EMOJIS_POOL[hash % EMOJIS_POOL.length];
  };

  useEffect(() => {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    let currentPartId = participantId;

    const onConnect = () => {
      setJoinError('');
      socket.emit('participant_join', {
        roomCode: cleanCode,
        name: playerName,
        avatar: playerAvatar,
        employeeId: playerEmpId,
        zone: playerZone,
        mobileNumber: playerMobile,
        deviceId: playerDevice,
      });
    };

    const onDisconnect = () => {
      setIsServerConfirmed(false);
    };

    const onError = (msg) => {
      setIsServerConfirmed(false);
      setJoinError(typeof msg === 'string' ? msg : msg?.message || 'Failed to connect to room');
    };

    const onJoinedSession = (data) => {
      setJoinError('');
      setIsServerConfirmed(true);
      currentPartId = data.participantId;
      setParticipantId(data.participantId);
      if (data.score !== undefined) setMyScore(data.score);
      if (data.avatar) setMyAvatar(data.avatar);
      if (data.session) {
        if (data.session.status === 'active' && data.session.currentQuestion) {
          setCurrentQuestion(data.session.currentQuestion);
          setStatus('question');
          setQuestionStartTime(Date.now());
        }
      }
      try {
        localStorage.setItem(`qh_session_${cleanCode}`, JSON.stringify({
          participantId: data.participantId,
          name: playerName,
          avatar: data.avatar || playerAvatar,
          employeeId: playerEmpId,
          zone: data.zone || playerZone,
          mobileNumber: playerMobile,
          deviceId: playerDevice,
          score: data.score || 0,
        }));
      } catch (e) {}
    };

    const onParticipantJoined = (data) => {
      setParticipants(prev => {
        if (prev.find(p => p.id === data.id)) return prev;
        return [...prev, data];
      });
    };

    const onNewQuestion = (data) => {
      const q = data.question || data;
      setCurrentQuestion(q);
      setSelectedAnswer(null);
      setSubmittedAnswer(null);
      setSubmissionStatus('idle');
      setSubmissionMessage('');
      setSubmissionError('');
      setLiveAnswers([]);
      setStatus('question');
      setTimeLeft(data.duration || q.time_limit || 20);
      setQuestionStartTime(Date.now());
      setAnswerRevealed(false);
      setCorrectAnswer(null);
      setCorrectAnswerIndex(null);
      setQuestionPoints(q.points !== undefined && q.points !== null ? Number(q.points) : 100);
    };

    const onAnswerReceived = (data) => {
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

    const onAnswerConfirmed = (data) => {
      setSubmissionStatus('confirmed');
      if (data && data.answer) {
        setSubmittedAnswer(data.answer);
      } else if (selectedAnswer) {
        setSubmittedAnswer(selectedAnswer);
      }
      setSubmissionMessage(data?.message || (data?.isRevision ? 'Updated answer recorded' : 'Answer submitted — you may change it before the timer ends'));
      if (data && data.totalScore !== undefined) {
        setMyScore(data.totalScore);
      }
    };

    const onAnswerRejected = (data) => {
      setSubmissionStatus('rejected');
      setSubmissionError(data?.reason || data?.error || 'Failed to record answer. Please try again.');
    };

    const onAnswerRevealed = (data) => {
      setAnswerRevealed(true);
      if (data?.correctAnswer !== undefined) setCorrectAnswer(data.correctAnswer);
      if (data?.correctAnswerIndex !== undefined) setCorrectAnswerIndex(data.correctAnswerIndex);
      if (data?.questionPoints !== undefined) setQuestionPoints(data.questionPoints);
      setStatus('revealed');
    };

    const onLeaderboardUpdate = (data) => {
      const list = Array.isArray(data) ? data : data?.leaderboard || [];
      setLeaderboard(list);
      if (status !== 'ended') setStatus('leaderboard');
      const me = list.find(p => p.id === (currentPartId || participantId));
      if (me && me.score !== undefined) {
        setMyScore(me.score);
      }
    };

    const onLobbyReset = () => {
      setStatus('waiting');
      setCurrentQuestion(null);
      setSelectedAnswer(null);
      setSubmittedAnswer(null);
      setSubmissionStatus('idle');
      setSubmissionMessage('');
      setSubmissionError('');
      setLiveAnswers([]);
      setAnswerRevealed(false);
      setCorrectAnswer(null);
      setCorrectAnswerIndex(null);
    };

    const onQuizEnded = (data) => {
      setStatus('ended');
      if (data?.leaderboard) setLeaderboard(data.leaderboard);
      if (data?.totalQuestions) setQuizTotalQuestions(data.totalQuestions);
    };

    const onSessionCompleted = (data) => {
      setStatus('ended');
      if (data?.leaderboard) setLeaderboard(data.leaderboard);
      if (data?.totalQuestions) setQuizTotalQuestions(data.totalQuestions);
    };

    const onTimerTick = ({ remaining }) => setTimeLeft(remaining);
    const onTimerExpired = () => {
      setTimeLeft(0);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('error', onError);
    socket.on('joined_session', onJoinedSession);
    socket.on('participant_joined', onParticipantJoined);
    socket.on('new_question', onNewQuestion);
    socket.on('answer_received', onAnswerReceived);
    socket.on('answer_confirmed', onAnswerConfirmed);
    socket.on('answer_rejected', onAnswerRejected);
    socket.on('answer_revealed', onAnswerRevealed);
    socket.on('leaderboard_update', onLeaderboardUpdate);
    socket.on('lobby_reset', onLobbyReset);
    socket.on('quiz_ended', onQuizEnded);
    socket.on('session_completed', onSessionCompleted);
    socket.on('timer_tick', onTimerTick);
    socket.on('timer_expired', onTimerExpired);

    return () => {
      if (socket) socket.disconnect();
    };
  }, [cleanCode, playerName, playerAvatar, playerEmpId, playerZone, playerMobile, playerDevice]);

  useEffect(() => {
    const iv = setInterval(() => setTipIndex(i => (i + 1) % SHELFY_TIPS.length), 4500);
    return () => clearInterval(iv);
  }, []);

  const getOptions = (question) => {
    if (!question || !question.options) return [];
    if (Array.isArray(question.options)) return question.options;
    if (typeof question.options === 'string') {
      try { return JSON.parse(question.options); } catch { return []; }
    }
    return [];
  };

  const isCorrectOpt = (opt, index) => {
    if (!currentQuestion) return false;
    if (currentQuestion.type === 'poll') return true;
    if (correctAnswerIndex !== null && correctAnswerIndex !== undefined && index === correctAnswerIndex) return true;
    const authoritative = (correctAnswer !== null && correctAnswer !== undefined) ? correctAnswer : currentQuestion?.correct_answer;
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

  const submitAnswer = (answerText) => {
    if (!answerText || status === 'revealed' || (timeLeft <= 0 && status !== 'waiting') || submissionStatus === 'submitting') return;
    setSubmissionStatus('submitting');
    setSubmissionError('');
    const timeTaken = Date.now() - questionStartTime;
    if (socket && currentQuestion) {
      socket.emit('submit_answer', {
        roomCode: cleanCode,
        participantId,
        questionId: currentQuestion.id,
        answer: answerText,
        timeTaken,
      });
    }
  };

  const sendEmojiReaction = (emoji) => {
    setTappedReaction(emoji);
    setTimeout(() => setTappedReaction(null), 800);
    if (socket && cleanCode) {
      socket.emit('emoji_reaction', { roomCode: cleanCode, emoji });
    }
  };

  // Resolve personal result for final rank
  const myParticipant = leaderboard.find(p => p.id === participantId) ||
    (participantId ? null : leaderboard.find(p => p.name === playerName));
  const myRank = myParticipant ? (myParticipant.rank || (leaderboard.indexOf(myParticipant) + 1)) : null;
  const myFinalScore = myParticipant ? (myParticipant.score || 0) : myScore;
  const myCorrect = myParticipant?.correctCount ?? null;
  const totalQ = myParticipant?.totalQuestions || quizTotalQuestions || (currentQuestion ? 1 : null);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh',
      width: '100vw',
      background: '#F8FAFC',
      color: '#0F172A',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes popIn {
          0% { transform: translate(-50%, 10px) scale(0.7); opacity: 0; }
          60% { transform: translate(-50%, -8px) scale(1.15); opacity: 1; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }
      `}</style>

      {/* Floating feedback for tapped emoji */}
      {tappedReaction && (
        <div style={{
          position: 'fixed',
          bottom: '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#FFFFFF',
          border: '1.5px solid #CBD5E1',
          borderRadius: '24px',
          padding: '6px 16px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
          fontSize: '1.6rem',
          zIndex: 200,
          animation: 'popIn 0.3s ease-out'
        }}>
          {tappedReaction}
        </div>
      )}

      {/* ─── WAITING LOBBY STATE (Light Enterprise) ─── */}
      {status === 'waiting' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '440px', padding: '36px 24px', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '20px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: '20px', marginBottom: '20px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Learning Arena</span>
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>Ready for Session</h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '24px' }}>The trainer will initiate the live quiz shortly.</p>

            {joinError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #F87171', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', color: '#991B1B', fontSize: '0.85rem', textAlign: 'center' }}>
                {joinError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '2px', fontWeight: 700 }}>PIN</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2563EB', fontFamily: 'monospace' }}>{cleanCode}</span>
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '2px', fontWeight: 700 }}>Status</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                  {joinError ? (
                    <span style={{ color: '#EF4444' }}>Error</span>
                  ) : isServerConfirmed ? (
                    <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> Connected
                    </span>
                  ) : (
                    <span style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #F59E0B', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} /> Connecting...
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', background: '#F8FAFC', padding: '10px 18px', borderRadius: '24px', margin: '0 auto 24px', width: 'fit-content', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '1.3rem' }}>{myAvatar}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Associate: <strong style={{ color: '#2563EB' }}>{playerName}</strong></span>
            </div>

            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '12px', padding: '14px', textAlign: 'left' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', marginBottom: '4px' }}>Pro Tip</div>
              <div style={{ fontSize: '0.82rem', color: '#78350F', lineHeight: 1.4 }}>{SHELFY_TIPS[tipIndex]}</div>
            </div>

          </div>
        </div>
      )}

      {/* ─── ACTIVE QUESTION / REVEALED STATES (Light Enterprise) ─── */}
      {['question', 'answered', 'revealed'].includes(status) && currentQuestion && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
          
          {/* Header Bar */}
          <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>{myAvatar}</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playerName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '4px 8px', fontSize: '0.78rem', fontWeight: 700, color: '#2563EB' }}>
                {questionPoints} pts
              </div>
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 700, color: '#065F46' }}>
                {myScore} pts
              </div>
              {timeLeft > 0 && status === 'question' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: timeLeft <= 5 ? '#FEF2F2' : '#FFFBEB',
                  border: `1px solid ${timeLeft <= 5 ? '#F87171' : '#FCD34D'}`,
                  color: timeLeft <= 5 ? '#DC2626' : '#B45309',
                  padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800
                }}>
                  <Clock size={13} />
                  <span>{timeLeft}s</span>
                </div>
              )}
            </div>
          </div>

          {/* Question Content */}
          <div style={{
            flex: 1,
            padding: '20px 16px 130px',
            maxWidth: '600px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              padding: '20px 18px',
              borderRadius: '16px',
              marginBottom: '20px',
              textAlign: 'center',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              width: '100%',
              boxSizing: 'border-box',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#0F172A',
                margin: 0,
                lineHeight: 1.45,
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
              }}>
                {currentQuestion.text}
              </h2>
            </div>

            {/* Options Selection */}
            {(() => {
              const isLocked = status === 'revealed' || (timeLeft <= 0 && status !== 'waiting');
              const hasUnsavedChanges = submittedAnswer !== null && selectedAnswer !== submittedAnswer && selectedAnswer !== null;

              return (
                <>
                  {['mcq', 'multi_select', 'true_false', 'poll'].includes(currentQuestion.type) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      {getOptions(currentQuestion).map((opt, i) => {
                        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                        const letter = letters[i] || '?';
                        const isSelected = selectedAnswer === opt;
                        const isSubmitted = submittedAnswer === opt;
                        const isCorrect = isCorrectOpt(opt, i);

                        let btnBg = '#FFFFFF';
                        let btnBorder = '#E2E8F0';
                        let btnColor = '#0F172A';
                        let badgeText = null;

                        if (status === 'revealed') {
                          if (isCorrect) {
                            btnBg = '#ECFDF5';
                            btnBorder = '#10B981';
                            btnColor = '#065F46';
                            badgeText = isSubmitted ? `Your Choice · Correct (+${questionPoints} pts)` : 'Correct Answer';
                          } else if (isSubmitted) {
                            btnBg = '#FEF2F2';
                            btnBorder = '#EF4444';
                            btnColor = '#991B1B';
                            badgeText = 'Your Choice · Incorrect (0 pts)';
                          } else {
                            btnBg = '#F8FAFC';
                            btnBorder = '#E2E8F0';
                            btnColor = '#94A3B8';
                          }
                        } else if (isSelected) {
                          btnBg = '#EFF6FF';
                          btnBorder = '#2563EB';
                          btnColor = '#1D4ED8';
                          badgeText = isSubmitted ? 'Submitted Answer' : 'Selected Choice';
                        }

                        return (
                          <button
                            key={i}
                            id={`option-btn-${i}`}
                            disabled={isLocked || submissionStatus === 'submitting'}
                            onClick={() => {
                              if (!isLocked && submissionStatus !== 'submitting') {
                                setSelectedAnswer(opt);
                                if (submissionError) setSubmissionError('');
                              }
                            }}
                            style={{
                              minHeight: '54px',
                              padding: '14px 16px',
                              borderRadius: '12px',
                              background: btnBg,
                              border: `2px solid ${btnBorder}`,
                              color: btnColor,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              fontSize: '0.98rem',
                              fontWeight: 600,
                              cursor: (isLocked || submissionStatus === 'submitting') ? 'default' : 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s ease',
                              width: '100%',
                              boxSizing: 'border-box',
                              boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.1)' : '0 2px 6px rgba(15, 23, 42, 0.03)'
                            }}
                          >
                            <span style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '6px',
                              background: status === 'revealed' ? (isCorrect ? '#10B981' : (isSubmitted ? '#EF4444' : '#E2E8F0')) : (isSelected ? '#2563EB' : '#F1F5F9'),
                              color: status === 'revealed' ? (isCorrect || isSubmitted ? '#FFFFFF' : '#64748B') : (isSelected ? '#FFFFFF' : '#475569'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              flexShrink: 0
                            }}>
                              {letter}
                            </span>
                            <span style={{
                              flex: 1,
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              lineHeight: 1.35
                            }}>
                              {opt}
                              {badgeText && (
                                <span style={{
                                  display: 'block',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  marginTop: '2px',
                                  color: status === 'revealed' ? (isCorrect ? '#065F46' : '#DC2626') : (isSubmitted ? '#2563EB' : '#D97706')
                                }}>
                                  {badgeText}
                                </span>
                              )}
                            </span>
                            {status === 'revealed' && isCorrect && <CheckCircle2 size={20} color="#10B981" style={{ flexShrink: 0 }} />}
                            {status === 'revealed' && isSubmitted && !isCorrect && <AlertCircle size={20} color="#EF4444" style={{ flexShrink: 0 }} />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Explicit Submit Answer Button & Feedback States */}
                  {status !== 'revealed' && (
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <button
                        id="submit-answer-btn"
                        disabled={isLocked || submissionStatus === 'submitting' || !selectedAnswer || (submissionStatus === 'confirmed' && !hasUnsavedChanges)}
                        onClick={() => {
                          if (selectedAnswer) submitAnswer(selectedAnswer);
                        }}
                        style={{
                          width: '100%',
                          padding: '16px',
                          borderRadius: '12px',
                          border: 'none',
                          fontSize: '1.02rem',
                          fontWeight: 800,
                          cursor: (isLocked || submissionStatus === 'submitting' || !selectedAnswer || (submissionStatus === 'confirmed' && !hasUnsavedChanges)) ? 'not-allowed' : 'pointer',
                          background: isLocked
                            ? '#94A3B8'
                            : (hasUnsavedChanges
                              ? '#D97706'
                              : (submissionStatus === 'confirmed' && !hasUnsavedChanges
                                ? '#10B981'
                                : (selectedAnswer ? '#2563EB' : '#CBD5E1'))),
                          color: (isLocked || (!selectedAnswer && submissionStatus !== 'confirmed')) ? '#64748B' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          boxShadow: (!isLocked && selectedAnswer && (hasUnsavedChanges || submissionStatus !== 'confirmed')) ? '0 4px 16px rgba(37, 99, 235, 0.3)' : 'none',
                          transition: 'all 0.2s ease',
                          minHeight: '52px'
                        }}
                      >
                        {isLocked ? (
                          <span>Time expired — answers locked</span>
                        ) : submissionStatus === 'submitting' ? (
                          <>
                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2.5px solid #FFFFFF', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                            <span>Submitting...</span>
                          </>
                        ) : hasUnsavedChanges ? (
                          <span>Submit Revised Answer</span>
                        ) : submissionStatus === 'confirmed' ? (
                          <>
                            <CheckCircle2 size={18} color="#FFFFFF" />
                            <span>Answer Submitted</span>
                          </>
                        ) : selectedAnswer ? (
                          <span>Submit Answer</span>
                        ) : (
                          <span>Select an answer</span>
                        )}
                      </button>

                      {hasUnsavedChanges && !isLocked && (
                        <div style={{
                          background: '#FFFBEB',
                          border: '1px solid #FCD34D',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          color: '#B45309',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textAlign: 'center'
                        }}>
                          ⚠️ You selected a different answer. Tap <strong>Submit Revised Answer</strong> before time expires!
                        </div>
                      )}

                      {submissionStatus === 'confirmed' && !hasUnsavedChanges && (
                        <div style={{
                          background: '#ECFDF5',
                          border: '1px solid #10B981',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          color: '#065F46',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}>
                          <CheckCircle2 size={16} />
                          <span>{submissionMessage || 'Answer submitted — you may change it before the timer ends'}</span>
                        </div>
                      )}

                      {submissionStatus === 'rejected' && (
                        <div style={{
                          background: '#FEF2F2',
                          border: '1px solid #F87171',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          color: '#991B1B',
                          fontSize: '0.88rem',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Submission failed — retry while time remains</div>
                          <div style={{ fontSize: '0.8rem', marginBottom: '8px' }}>{submissionError}</div>
                          {!isLocked && selectedAnswer && (
                            <button
                              onClick={() => submitAnswer(selectedAnswer)}
                              style={{
                                background: '#EF4444',
                                color: '#FFF',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 16px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Retry Submission
                            </button>
                          )}
                        </div>
                      )}

                      {isLocked && (
                        <div style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          color: '#64748B',
                          fontSize: '0.88rem',
                          textAlign: 'center'
                        }}>
                          Time expired — answers locked. Waiting for host to reveal results...
                        </div>
                      )}
                    </div>
                  )}

                  {status === 'revealed' && (
                    <div style={{
                      marginTop: '20px',
                      background: '#ECFDF5',
                      border: '1px solid #10B981',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: '#065F46', fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>
                        ✓ Correct Answer Revealed
                      </div>
                      <div style={{ color: '#475569', fontSize: '0.85rem' }}>
                        Configured Question Value: <strong style={{ color: '#D97706' }}>{questionPoints} points</strong>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── LEADERBOARD / PODIUM STATE & FINAL PERSONAL RANK (Phase 6) ─── */}
      {(status === 'leaderboard' || status === 'ended') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '460px', textAlign: 'center' }}>
            
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '6px' }}>🏆</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
              {status === 'ended' ? 'Session Completed' : 'Current Standings'}
            </h2>

            {/* Final Personal Result Card (Phase 6 Authoritative Display) */}
            {status === 'ended' && (
              <div style={{
                background: '#EFF6FF',
                border: '2px solid #2563EB',
                borderRadius: '16px',
                padding: '22px 18px',
                marginBottom: '24px',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.1)'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                  Your Official Result
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0F172A', margin: '4px 0' }}>
                  {myRank ? `Your Final Rank: #${myRank}` : 'Your Final Rank: N/A'}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563EB', marginBottom: '10px' }}>
                  Your Score: {myFinalScore} points
                </div>
                {myCorrect !== null && totalQ && (
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#065F46', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '5px 14px', borderRadius: '20px', width: 'fit-content', margin: '0 auto 10px' }}>
                    ✓ Correct Answers: {myCorrect} of {totalQ}
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', lineHeight: 1.4 }}>
                  {myRank === 1
                    ? '👑 Champion Performance! You achieved the top ranking in this session.'
                    : myRank && myRank <= 3
                      ? '🌟 Podium Finish! Outstanding knowledge execution.'
                      : '👏 Solid effort! Review session highlights to strengthen your competencies.'}
                </div>
              </div>
            )}

            {/* Standings List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {leaderboard.slice(0, 5).map((p, i) => {
                const isMe = p.id === participantId || (p.name === playerName && !participantId);
                return (
                  <div
                    key={p.id || i}
                    style={{
                      background: isMe ? '#EFF6FF' : '#FFFFFF',
                      border: `1.5px solid ${isMe ? '#2563EB' : '#E2E8F0'}`,
                      borderRadius: '12px', padding: '12px 18px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, color: i === 0 ? '#D97706' : '#64748B', width: '28px' }}>#{p.rank || (i + 1)}</span>
                      <span>{getSmileyForName(p.name)}</span>
                      <span style={{ fontWeight: isMe ? 800 : 600, color: isMe ? '#1D4ED8' : '#0F172A' }}>
                        {p.name} {isMe && <span style={{ fontSize: '0.72rem', background: '#2563EB', color: '#FFFFFF', padding: '2px 8px', borderRadius: '10px', marginLeft: '6px' }}>YOU</span>}
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#2563EB' }}>{p.score} pts</span>
                  </div>
                );
              })}

              {/* Outside top 5 participant personal row */}
              {status === 'ended' && myRank && myRank > 5 && myParticipant && (
                <>
                  <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem', margin: '2px 0' }}>• • •</div>
                  <div
                    style={{
                      background: '#EFF6FF',
                      border: '2px solid #2563EB',
                      borderRadius: '12px', padding: '12px 18px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, color: '#2563EB', width: '28px' }}>#{myRank}</span>
                      <span>{getSmileyForName(myParticipant.name)}</span>
                      <span style={{ fontWeight: 800, color: '#1D4ED8' }}>
                        {myParticipant.name}
                        <span style={{ fontSize: '0.72rem', background: '#2563EB', color: '#FFFFFF', padding: '2px 8px', borderRadius: '10px', marginLeft: '6px' }}>YOU</span>
                      </span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#2563EB' }}>{myFinalScore} pts</span>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─── FLOATING REACTION BAR (Light Enterprise) ─── */}
      {status !== 'ended' && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          background: '#FFFFFF', border: '1.5px solid #E2E8F0',
          borderRadius: '30px', padding: '6px 14px', display: 'flex', gap: '10px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)', zIndex: 100
        }}>
          {['👍', '❤️', '🔥', '🎉', '👏'].map(emoji => (
            <button
              key={emoji}
              onClick={() => sendEmojiReaction(emoji)}
              style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', padding: '2px', transition: 'transform 0.15s ease' }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
