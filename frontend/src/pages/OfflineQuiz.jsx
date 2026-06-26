import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Clock, Check, Award, Play, ShieldAlert, User, Fingerprint, MapPin } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const ZONES = ['North', 'East', 'West', 'South'];

// ─── Design Tokens (standalone — never inherits from app theme) ───────────────
const C = {
  bg:          '#F8FAFC',      // page background (light grey-blue)
  card:        '#FFFFFF',      // card background (white card)
  cardAlt:     '#EEF2F7',      // slightly darker light background
  border:      '#E2E8F0',
  borderHover: '#CBD5E1',
  accent:      '#2563EB',      // royal blue brand (Primary Royal Blue)
  accentGlow:  'rgba(37,99,235,0.15)',
  accentBg:    'rgba(37,99,235,0.06)',
  accentBgSel: 'rgba(37,99,235,0.12)',
  green:       '#22C55E',      // Success Green
  greenBg:     'rgba(34,197,94,0.08)',
  greenBorder: 'rgba(34,197,94,0.2)',
  red:         '#EF4444',
  redBg:       'rgba(239,68,68,0.08)',
  amber:       '#F59E0B',      // Warning Amber (Gold)
  amberBg:     'rgba(245,158,11,0.08)',
  textPrimary: '#1E293B',      // Text Dark
  textSub:     '#475569',
  textMuted:   '#94A3B8',
  inputBg:     '#FFFFFF',
  optionBg:    '#F8FAFC',
  optionBgSel: 'rgba(37,99,235,0.12)',
};


export default function OfflineQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);

  const [quizInfo, setQuizInfo]     = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers]       = useState([]);

  // Quiz states: 'entrance' | 'taking' | 'submitting' | 'result' | 'error'
  const [quizState, setQuizState] = useState('entrance');
  const [errorMsg, setErrorMsg]   = useState('');

  const [regForm, setRegForm] = useState({
    name: '', employeeId: '', zone: ''
  });

  const [timeLeft, setTimeLeft]           = useState(0);
  const timerRef                          = useRef(null);
  const questionStartTimeRef              = useRef(0);
  const submittedRef                      = useRef(false); // guard against double-submit on timer expiry

  const [selectedOpt, setSelectedOpt]   = useState(null);
  const [selectedOpts, setSelectedOpts] = useState([]);
  const [openTextAnswer, setOpenTextAnswer] = useState('');
  const [resultData, setResultData]     = useState(null);

  const getDeviceId = () => {
    let id = localStorage.getItem('qh_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('qh_device_id', id);
    }
    return id;
  };

  useEffect(() => {
    if (currentUser) {
      setRegForm(prev => ({
        ...prev,
        name:       currentUser.name        || '',
        employeeId: currentUser.employee_id || '',
        // zone is intentionally not pre-filled — learner must consciously select
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchBasicInfo = async () => {
      try {
        const res = await axios.get(`/api/quizzes/${quizId}/offline-details`);
        setQuizInfo(res.data);
        setQuestions(res.data.questions || []);
      } catch (err) {
        setQuizState('error');
        setErrorMsg(err.response?.data?.error || 'This quiz is not available offline or has expired.');
      }
    };
    fetchBasicInfo();
  }, [quizId]);

  // ─── Per-question timer ───────────────────────────────────────────────────
  // IMPORTANT: Do NOT add `timeLeft` to the dependency array.
  // Adding it causes interval stacking — a new interval fires every second,
  // creating a racing cascade that skips questions or submits prematurely.
  // Instead we read the question's time_limit directly from the questions array.
  useEffect(() => {
    if (quizState !== 'taking') return;
    const q = questions[currentIdx];
    if (!q) return;

    const limit = q.time_limit || 30;
    setTimeLeft(limit);                       // initialise display
    questionStartTimeRef.current = Date.now();
    submittedRef.current = false;             // reset guard for new question

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          // Guard: only auto-advance once per question even if interval fires twice
          if (!submittedRef.current) {
            submittedRef.current = true;
            handleNext(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [quizState, currentIdx]); // DO NOT add timeLeft or questions here

  const handleProceed = async (e) => {
    e.preventDefault();
    if (!regForm.name.trim())     { alert('Please enter your name.');        return; }
    if (!regForm.employeeId.trim()) { alert('Please enter your Employee ID.'); return; }
    if (!regForm.zone)            { alert('Please select your Zone.');        return; }

    setQuizState('submitting');
    setErrorMsg('');

    try {
      const eligRes = await axios.post(`/api/quizzes/${quizId}/offline-check-eligibility`, {
        employeeId: regForm.employeeId,
        userId: currentUser?.id,
      });

      if (!eligRes.data.eligible) {
        setQuizState('error');
        setErrorMsg(eligRes.data.message || 'You have already completed this quiz. One submission is allowed.');
        return;
      }

      const detailsRes = await axios.get(`/api/quizzes/${quizId}/offline-details`);
      setQuizInfo(detailsRes.data);
      const fetchedQuestions = detailsRes.data.questions || [];
      setQuestions(fetchedQuestions);

      if (fetchedQuestions.length === 0) {
        setQuizState('error');
        setErrorMsg('This quiz has no questions.');
        return;
      }

      setCurrentIdx(0);
      setAnswers([]);
      setQuizState('taking');
      initQuestion(0, fetchedQuestions);
    } catch (err) {
      setQuizState('error');
      setErrorMsg(err.response?.data?.error || 'Failed to initialize quiz. Please try again.');
    }
  };

  const initQuestion = (index, qList = questions) => {
    const q = qList[index];
    if (!q) return;
    setSelectedOpt(null);
    setSelectedOpts([]);
    setOpenTextAnswer('');
    // NOTE: timeLeft and timer are now managed entirely by the
    // useEffect above (keyed on quizState + currentIdx).
    // initQuestion only needs to reset answer state.
  };

  const getOptionsList = (q) => {
    if (!q || !q.options) return [];
    if (Array.isArray(q.options)) return q.options;
    if (typeof q.options === 'string') {
      try { return JSON.parse(q.options); } catch { return []; }
    }
    return [];
  };

  const handleNext = (isTimeExpired = false) => {
    const q = questions[currentIdx];
    if (!q) return;

    // Stop the timer immediately so it cannot double-fire
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let finalAnswer = '';
    if (q.type === 'multi_select') finalAnswer = selectedOpts;
    else if (q.type === 'open_text' || q.type === 'word_cloud') finalAnswer = openTextAnswer.trim();
    else finalAnswer = selectedOpt !== null ? selectedOpt : '';

    const timeSpent = Date.now() - questionStartTimeRef.current;
    const timeTaken = isTimeExpired ? (q.time_limit || 30) * 1000 : timeSpent;

    const newAnswers = [...answers, { questionId: q.id, answer: finalAnswer, timeTaken }];
    setAnswers(newAnswers);

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
      // Reset answer selection state for the next question
      setSelectedOpt(null);
      setSelectedOpts([]);
      setOpenTextAnswer('');
    } else {
      submitQuiz(newAnswers);
    }
  };

  const submitQuiz = async (completedAnswers) => {
    setQuizState('submitting');
    try {
      const res = await axios.post(`/api/quizzes/${quizId}/offline-submit`, {
        name:       regForm.name.trim(),
        employeeId: regForm.employeeId.trim(),
        storeName:  regForm.zone,   // zone stored in storeName column for DB compat
        zone:       regForm.zone,
        userId:     currentUser?.id || null,
        deviceId:   getDeviceId(),
        answers:    completedAnswers,
      });
      setResultData(res.data);
      setQuizState('result');
    } catch (err) {
      setQuizState('error');
      setErrorMsg(err.response?.data?.error || 'Failed to submit responses. Please check connection and try again.');
    }
  };

  // ─── Shared input style ────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: `1.5px solid ${C.border}`,
    background: C.inputBg,
    color: C.textPrimary,
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '0.8rem', color: C.textSub, marginBottom: '6px', fontWeight: 600,
  };

  // ─── ENTRANCE SCREEN ───────────────────────────────────────────────────────
  const renderEntrance = () => {
    const isTrainerOrAdmin = currentUser &&
      ['Trainer', 'Admin', 'Super Admin', 'Program Manager', 'Client'].includes(currentUser.role);

    if (isTrainerOrAdmin) {
      return (
        <div style={{ width: '100%', maxWidth: '480px', margin: 'auto', padding: '44px 32px', textAlign: 'center', background: C.card, borderRadius: '24px', border: `2px solid ${C.amberBg}`, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
          <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: `2px solid ${C.amber}` }}>
            <ShieldAlert size={32} color={C.amber} />
          </div>
          <h3 style={{ fontSize: '1.4rem', color: C.textPrimary, fontWeight: 700 }}>Host/Trainer View</h3>
          <p style={{ color: C.textSub, marginTop: '12px', fontSize: '0.9rem', lineHeight: 1.6 }}>
            You are logged in as a <strong style={{ color: C.amber }}>{currentUser.role}</strong>. This offline quiz link is for attendees/learners only. Hosts and administrators cannot submit responses.
          </p>
          <button onClick={() => {
            setQuizState('taking');
            initQuestion(0, questions);
          }} style={{ 
            marginTop: '20px', padding: '12px 24px', borderRadius: '10px', 
            background: C.amber, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700,
            boxShadow: `0 4px 12px ${C.amberBg}`
          }}>
            Preview Quiz
          </button>
          <p style={{ color: C.textMuted, fontSize: '0.8rem', marginTop: '14px' }}>Please close this tab to exit.</p>
        </div>
      );
    }

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: 'auto', padding: '32px', background: C.card, borderRadius: '24px', border: `1.5px solid ${C.border}`, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: C.accent, background: C.accentBg, padding: '5px 14px', borderRadius: '20px', border: `1px solid ${C.accentGlow}` }}>
            Offline Assessment
          </span>
          <h2 style={{ marginTop: '14px', color: C.textPrimary, fontSize: '1.75rem', fontWeight: 800, fontFamily: 'Poppins, sans-serif', lineHeight: 1.2 }}>
            {quizInfo?.title || 'Loading...'}
          </h2>
          <p style={{ color: C.textSub, fontSize: '0.88rem', marginTop: '8px', lineHeight: 1.5 }}>
            {quizInfo?.description || 'Get ready to start this quiz.'}
          </p>
          {quizInfo && (
            <div style={{ fontSize: '0.8rem', color: C.textMuted, marginTop: '10px' }}>
              Project: <strong style={{ color: C.textSub }}>{quizInfo.projectName}</strong>
              &nbsp;•&nbsp;
              Questions: <strong style={{ color: C.accent }}>{questions.length}</strong>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: C.border, marginBottom: '24px' }} />

        <form onSubmit={handleProceed} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Field 1: Your Name */}
          <div>
            <label style={labelStyle}><User size={13} /> Your Name <span style={{ color: C.accent }}>*</span></label>
            <input
              type="text"
              required
              placeholder="Enter your full name"
              value={regForm.name}
              onChange={e => setRegForm({ ...regForm, name: e.target.value })}
              style={inputStyle}
            />
          </div>

          {/* Field 2: Employee ID */}
          <div>
            <label style={labelStyle}><Fingerprint size={13} /> Employee ID <span style={{ color: C.accent }}>*</span></label>
            <input
              type="text"
              required
              placeholder="e.g. EMP12345"
              value={regForm.employeeId}
              onChange={e => setRegForm({ ...regForm, employeeId: e.target.value })}
              style={inputStyle}
            />
          </div>

          {/* Field 3: Zone dropdown */}
          <div>
            <label style={labelStyle}><MapPin size={13} /> Zone <span style={{ color: C.accent }}>*</span></label>
            <select
              required
              value={regForm.zone}
              onChange={e => setRegForm({ ...regForm, zone: e.target.value })}
              style={{
                ...inputStyle,
                cursor: 'pointer',
                appearance: 'auto',
              }}
            >
              <option value="">-- Select Zone --</option>
              {ZONES.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <button type="submit" style={{
            marginTop: '8px', width: '100%', padding: '15px', borderRadius: '12px',
            fontSize: '1rem', fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            background: `linear-gradient(135deg, ${C.accent}, #1D4ED8)`,
            border: 'none', cursor: 'pointer',
            boxShadow: `0 6px 20px ${C.accentGlow}`,
            transition: 'transform 0.15s',
          }}>
            <Play size={18} fill="white" /> Start Assessment
          </button>
        </form>
      </div>
    );
  };

  // ─── TAKING QUIZ SCREEN ────────────────────────────────────────────────────
  const renderActiveQuiz = () => {
    const q = questions[currentIdx];
    if (!q) return null;

    const options    = getOptionsList(q);
    const progressPct = ((currentIdx + 1) / questions.length) * 100;
    const isUrgent   = timeLeft <= 5;

    // Option button style factory
    // Option button style factory
const optBtn = (active) => ({
  width: '100%', padding: '14px 18px', borderRadius: '12px', textAlign: 'left',
  cursor: 'pointer', outline: 'none', transition: 'all 0.15s',
  fontSize: '0.95rem', fontWeight: active ? 700 : 500,
  color: active ? '#ffffff' : C.textPrimary,
  background: active ? C.accent : C.optionBg,
  border: `1.5px solid ${active ? C.accent : C.border}`,
  boxShadow: active ? `0 0 0 1px ${C.accent}` : 'none',
});;

    return (
      <div style={{ width: '100%', maxWidth: '640px', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Progress Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, padding: '14px 22px', borderRadius: '16px', border: `1px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: C.textMuted, marginBottom: '6px', fontWeight: 600, letterSpacing: '0.5px' }}>
              QUESTION {currentIdx + 1} / {questions.length}
            </div>
            <div style={{ width: '140px', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: C.accent, borderRadius: '4px', transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Timer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            background: isUrgent ? C.redBg : C.accentBg,
            border: `2px solid ${isUrgent ? C.red : C.accent}`,
            padding: '7px 16px', borderRadius: '20px',
            color: isUrgent ? C.red : C.accent,
            fontFamily: 'Courier New, monospace', fontWeight: 'bold', fontSize: '1.2rem',
            animation: isUrgent ? 'pulse 0.8s infinite' : 'none',
          }}>
            <Clock size={15} />
            00:{timeLeft < 10 ? '0' + timeLeft : timeLeft}
          </div>
        </div>

        {/* Question + Options */}
        <div style={{ background: C.card, padding: '28px', borderRadius: '22px', border: `1px solid ${C.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ color: C.textPrimary, fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.45, margin: 0 }}>
            {q.text}
          </h3>

          {/* MCQ / Poll */}
          {['mcq', 'poll'].includes(q.type) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {options.map((opt, i) => (
                <button key={i} onClick={() => setSelectedOpt(opt)} style={optBtn(selectedOpt === opt)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700,
                      background: selectedOpt === opt ? C.accent : 'rgba(255,255,255,0.08)',
                      color: selectedOpt === opt ? '#fff' : C.textMuted,
                      border: `1.5px solid ${selectedOpt === opt ? C.accent : C.border}`,
                    }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* True / False */}
          {q.type === 'true_false' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {['True', 'False'].map(opt => (
                <button key={opt} onClick={() => setSelectedOpt(opt)} style={{
                  ...optBtn(selectedOpt === opt),
                  textAlign: 'center', padding: '22px 16px', fontSize: '1.1rem', fontWeight: 700,
                }}>
                  {opt === 'True' ? '👍  True' : '👎  False'}
                </button>
              ))}
            </div>
          )}

          {/* Multi-select */}
          {q.type === 'multi_select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {options.map((opt, i) => {
                const isChecked = selectedOpts.includes(opt);
                return (
                  <button key={i} onClick={() => {
                    const next = isChecked ? selectedOpts.filter(o => o !== opt) : [...selectedOpts, opt];
                    setSelectedOpts(next);
                  }} style={{ ...optBtn(isChecked), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                        border: `2px solid ${isChecked ? C.accent : C.border}`,
                        background: isChecked ? C.accent : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                      </span>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Open Text / Word Cloud */}
          {['open_text', 'word_cloud'].includes(q.type) && (
            <textarea
              placeholder="Type your answer here..."
              value={openTextAnswer}
              onChange={e => setOpenTextAnswer(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px',
                border: `1.5px solid ${C.border}`, background: C.inputBg,
                color: C.textPrimary, minHeight: '120px', resize: 'none',
                outline: 'none', fontSize: '0.95rem', lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* Rating */}
          {q.type === 'rating' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', padding: '12px 0' }}>
              {[1, 2, 3, 4, 5].map(num => (
                <button key={num} onClick={() => setSelectedOpt(num)} style={{
                  width: '56px', height: '56px', borderRadius: '50%', fontWeight: 800,
                  fontSize: '1.25rem', cursor: 'pointer', outline: 'none',
                  color: '#fff',
                  background: selectedOpt === num ? `linear-gradient(135deg, ${C.accent}, #1D4ED8)` : C.optionBg,
                  border: `2px solid ${selectedOpt === num ? C.accent : C.border}`,
                  boxShadow: selectedOpt === num ? `0 0 14px ${C.accentGlow}` : 'none',
                  transition: 'all 0.15s',
                }}>
                  {num}
                </button>
              ))}
            </div>
          )}

          {/* Next / Submit button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button onClick={() => handleNext(false)} style={{
              padding: '12px 32px', borderRadius: '10px', fontWeight: 700,
              fontSize: '0.95rem', color: '#fff',
              background: `linear-gradient(135deg, ${C.accent}, #1D4ED8)`,
              border: 'none', cursor: 'pointer',
              boxShadow: `0 4px 16px ${C.accentGlow}`,
              transition: 'transform 0.15s',
            }}>
              {currentIdx + 1 === questions.length ? '✓ Submit Assessment' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── SUBMITTING SCREEN ─────────────────────────────────────────────────────
  const renderSubmitting = () => (
    <div style={{ textAlign: 'center', padding: '60px 32px' }}>
      <div style={{
        width: '52px', height: '52px', margin: '0 auto 24px auto',
        border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`,
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <h3 style={{ color: C.textPrimary, fontSize: '1.3rem', fontWeight: 700 }}>Submitting your answers...</h3>
      <p style={{ color: C.textSub, marginTop: '8px', fontSize: '0.9rem' }}>Please wait while your responses are graded.</p>
    </div>
  );

  // ─── RESULT SCREEN ─────────────────────────────────────────────────────────
  const renderResult = () => {
    const pct      = resultData?.percentage ?? 0;
    const isPassing = pct >= 60;

    return (
      <div style={{ width: '100%', maxWidth: '440px', margin: 'auto', padding: '44px 32px', textAlign: 'center', background: C.card, borderRadius: '24px', border: `2px solid ${C.greenBorder}`, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
        {/* Trophy icon */}
        <div style={{
          width: '84px', height: '84px', borderRadius: '50%', margin: '0 auto 24px auto',
          background: C.greenBg, border: `2px solid ${C.green}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 24px ${C.greenBorder}`,
        }}>
          <Check size={42} color={C.green} strokeWidth={2.5} />
        </div>

        <h2 style={{ fontSize: '1.85rem', color: C.textPrimary, fontWeight: 800, fontFamily: 'Poppins, sans-serif', margin: 0 }}>
          Assessment Completed!
        </h2>
        <p style={{ color: C.textSub, fontSize: '0.9rem', marginTop: '8px' }}>
          Your responses have been saved successfully.
        </p>

        {/* Score card */}
        {resultData && (
          <div style={{ background: 'rgba(0,200,150,0.05)', borderRadius: '18px', padding: '28px 24px', margin: '24px 0', border: `1.5px solid ${C.greenBorder}` }}>
            <div style={{ fontSize: '0.75rem', color: C.textMuted, letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
              Your Score
            </div>
            <div style={{ fontSize: '3.2rem', fontWeight: 900, color: C.green, fontFamily: 'Poppins, sans-serif', lineHeight: 1 }}>
              {resultData.score}
              <span style={{ fontSize: '1.4rem', color: C.textSub, fontWeight: 500 }}> / {resultData.totalQuestions}</span>
            </div>

            {/* Accuracy badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              marginTop: '14px', padding: '6px 16px', borderRadius: '20px',
              background: isPassing ? 'rgba(0,200,150,0.12)' : 'rgba(239,68,68,0.10)',
              border: `1px solid ${isPassing ? C.greenBorder : 'rgba(239,68,68,0.3)'}`,
              color: isPassing ? C.green : C.red,
              fontWeight: 700, fontSize: '0.9rem',
            }}>
              <Award size={15} /> {pct}% Accuracy
            </div>
          </div>
        )}

        <p style={{ color: C.textMuted, fontSize: '0.82rem', lineHeight: 1.6, marginTop: '6px' }}>
          ✅ You may now close this window.<br />Thank you for completing the assessment!
        </p>
      </div>
    );
  };

  // ─── ERROR SCREEN ──────────────────────────────────────────────────────────
  const renderError = () => (
    <div style={{ width: '100%', maxWidth: '440px', margin: 'auto', padding: '44px 32px', textAlign: 'center', background: C.card, borderRadius: '24px', border: `2px solid rgba(239,68,68,0.25)`, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
      <div style={{
        width: '68px', height: '68px', borderRadius: '50%', margin: '0 auto 20px auto',
        background: C.redBg, border: `2px solid ${C.red}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ShieldAlert size={32} color={C.red} />
      </div>
      <h3 style={{ fontSize: '1.4rem', color: C.textPrimary, fontWeight: 700 }}>Unable to Attend Quiz</h3>
      <p style={{ color: C.textSub, marginTop: '12px', fontSize: '0.9rem', lineHeight: 1.6 }}>{errorMsg}</p>
      <p style={{ color: C.textMuted, fontSize: '0.8rem', marginTop: '20px' }}>Please close this tab or contact your trainer.</p>
    </div>
  );

  // ─── PAGE SHELL ────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      background: C.bg, color: C.textPrimary,
      fontFamily: "'Outfit', 'Inter', sans-serif",
      position: 'relative', overflowX: 'hidden',
    }}>
      {/* Subtle grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${C.accentBg.replace('0.10','0.025')} 1px, transparent 1px),
                          linear-gradient(90deg, ${C.accentBg.replace('0.10','0.025')} 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }} />
      {/* Radial glow */}
      <div style={{
        position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px', pointerEvents: 'none',
        background: `radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 65%)`,
      }} />

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', zIndex: 5 }}>
        {quizState === 'entrance'   && renderEntrance()}
        {quizState === 'taking'     && renderActiveQuiz()}
        {quizState === 'submitting' && renderSubmitting()}
        {quizState === 'result'     && renderResult()}
        {quizState === 'error'      && renderError()}
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.65; transform:scale(0.94); } }
        input::placeholder, textarea::placeholder { color: rgba(30,41,59,0.5); }
        button:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
}
