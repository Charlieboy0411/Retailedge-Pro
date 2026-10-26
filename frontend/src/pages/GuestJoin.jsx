import React, { useState, useEffect, useContext, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  User,
  Hash,
  MapPin,
  AlertCircle,
  AlertTriangle,
  Video,
  Calendar,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  Clock,
  LogOut,
  RotateCcw,
  Check
} from 'lucide-react';
import { createJitsiTelemetrySession } from '../utils/jitsiTelemetry';
import { formatKolkataDateTime } from '../utils/dateTimeUtils';

export default function GuestJoin() {
  const [searchParams] = useSearchParams();
  const { login } = useContext(AuthContext);

  const trainingId = searchParams.get('id');

  // Form Fields
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [zone, setZone] = useState('');

  // Context loading state
  const [meetingContext, setMeetingContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [contextError, setContextError] = useState('');

  // Verified employee prefill hint
  const [matchedRecord, setMatchedRecord] = useState(null);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Post-Registration & Active Session State
  const [registeredAttendee, setRegisteredAttendee] = useState(null);
  const [isAttending, setIsAttending] = useState(false);
  const [attendedElapsed, setAttendedElapsed] = useState(0);
  const [hasLeft, setHasLeft] = useState(false);
  const [leftSummary, setLeftSummary] = useState(null);
  const [popupBlocked, setPopupBlocked] = useState(false);

  const telemetrySessionRef = useRef(null);
  const meetingWindowRef = useRef(null);
  const elapsedIntervalRef = useRef(null);

  // 1. Initial Load: Retrieve Join Context
  useEffect(() => {
    if (!trainingId) {
      setLoadingContext(false);
      setContextError('Invalid meeting link. No meeting ID was found. Please check your invitation URL.');
      return;
    }
    fetchJoinContext();

    // Check for cached active session in localStorage for seamless reconnection
    try {
      const cached = localStorage.getItem(`jitsi_guest_auth_${trainingId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.user && parsed.token && parsed.meeting) {
          setRegisteredAttendee(parsed);
          setName(parsed.user.name || '');
          setEmployeeId(parsed.user.employee_id || '');
          setZone(parsed.user.zone || '');
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached session:', e);
    }
  }, [trainingId]);

  // Clean up telemetry and timer on unmount
  useEffect(() => {
    return () => {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      if (telemetrySessionRef.current) {
        telemetrySessionRef.current.cleanup();
        telemetrySessionRef.current = null;
      }
    };
  }, []);

  const fetchJoinContext = async (empIdQuery = '') => {
    try {
      if (!empIdQuery) setLoadingContext(true);
      setContextError('');
      const url = empIdQuery
        ? `/api/trainings/${trainingId}/join-context?employeeId=${encodeURIComponent(empIdQuery)}`
        : `/api/trainings/${trainingId}/join-context`;
      const res = await axios.get(url);
      setMeetingContext(res.data);

      if (res.data.matchedEmployee) {
        setMatchedRecord(res.data.matchedEmployee);
        if (res.data.matchedEmployee.authoritativeZone) {
          setZone(res.data.matchedEmployee.authoritativeZone);
        }
        if (res.data.matchedEmployee.name && !name.trim()) {
          setName(res.data.matchedEmployee.name);
        }
      }
    } catch (err) {
      console.error('Failed to load meeting context:', err);
      setContextError(err.response?.data?.error || 'Unable to load meeting session. Please check your link or network connection.');
    } finally {
      setLoadingContext(false);
    }
  };

  const handleEmployeeIdBlur = () => {
    const cleanEmp = employeeId.trim();
    if (cleanEmp && trainingId) {
      fetchJoinContext(cleanEmp);
    }
  };

  // 2. Submit Attendee Registration Form
  const handleJoin = async (e) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanEmpId = employeeId.trim();
    const cleanZone = zone.trim();

    if (!cleanName || cleanName.length < 2) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }

    if (!cleanEmpId) {
      setError('Please enter your Employee ID.');
      return;
    }

    if (!cleanZone) {
      setError('Please select your authoritative zone.');
      return;
    }

    if (!trainingId) {
      setError('Invalid meeting link. No meeting ID found.');
      return;
    }

    if (!meetingContext?.zonesConfigured) {
      setError('Zones are not configured for this session. Please contact your Program Manager or Trainer.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await axios.post(`/api/trainings/${trainingId}/guest-join`, {
        name: cleanName,
        employeeId: cleanEmpId,
        zone: cleanZone
      });

      const { token, user, meeting } = response.data;

      // Update AuthContext
      login(token, user);

      const attendeeState = {
        token,
        user,
        meeting: meeting || {
          id: trainingId,
          title: meetingContext.title,
          description: meetingContext.description,
          url: meetingContext.url || (trainingId ? `https://meet.jit.si/QuizHive-${trainingId.slice(0, 8)}` : ''),
          scheduledAt: meetingContext.scheduledAt,
          projectName: meetingContext.projectName
        }
      };

      setRegisteredAttendee(attendeeState);

      // Persist verified registration in localStorage for recovery
      try {
        localStorage.setItem(`jitsi_guest_auth_${trainingId}`, JSON.stringify(attendeeState));
      } catch (err) {
        console.warn('LocalStorage save failed:', err);
      }

    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to verify attendee registration. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper: Parse Jitsi meeting room domain and room name
  const parseMeetingUrl = (urlStr) => {
    try {
      if (!urlStr) return { domain: 'meet.jit.si', roomName: `QuizHive-${trainingId?.slice(0, 8)}`, rawUrl: urlStr };
      const parsed = new URL(urlStr);
      const domain = parsed.host || 'meet.jit.si';
      const roomName = parsed.pathname.replace(/^\/+/, '');
      return { domain, roomName, rawUrl: urlStr };
    } catch {
      return { domain: 'meet.jit.si', roomName: `QuizHive-${trainingId?.slice(0, 8)}`, rawUrl: urlStr || '' };
    }
  };

  // 3. Initiate Telemetry Session
  const startActiveTelemetry = (attendeeInfo) => {
    const attendee = attendeeInfo || registeredAttendee;
    if (!attendee) return;

    if (telemetrySessionRef.current) {
      telemetrySessionRef.current.cleanup();
    }

    const telemetry = createJitsiTelemetrySession({
      trainingId,
      scheduledDurationMinutes: attendee.meeting?.duration || 60,
      token: attendee.token,
      userId: attendee.user.id,
      participantName: attendee.user.name,
      employeeId: attendee.user.employee_id,
      backendUrl: '',
      onStatusChange: ({ status }) => {
        if (status === 'left') {
          setIsAttending(false);
        }
      }
    });

    telemetrySessionRef.current = telemetry;
    telemetry.handleMeetingJoined();

    setIsAttending(true);
    setHasLeft(false);
    setLeftSummary(null);

    const startTime = Date.now();
    setAttendedElapsed(0);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    elapsedIntervalRef.current = setInterval(() => {
      setAttendedElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  };

  // 4. "Join in Browser" action (opens full-screen Jitsi tab)
  const handleJoinInBrowser = () => {
    if (!registeredAttendee) return;
    const { user, meeting } = registeredAttendee;
    const meetingInfo = parseMeetingUrl(meeting?.url);

    // Build URL with displayName and disable prejoin to directly join session
    let browserUrl = meetingInfo.rawUrl || `https://${meetingInfo.domain}/${meetingInfo.roomName}`;
    try {
      const urlObj = new URL(browserUrl);
      const hashParams = new URLSearchParams();
      hashParams.set('userInfo.displayName', user.name);
      hashParams.set('config.prejoinPageEnabled', 'false');
      hashParams.set('config.startWithAudioMuted', 'false');
      hashParams.set('config.disableDeepLinking', 'true');
      urlObj.hash = hashParams.toString();
      browserUrl = urlObj.toString();
    } catch (e) {
      browserUrl = `${browserUrl}#userInfo.displayName=${encodeURIComponent(user.name)}&config.prejoinPageEnabled=false`;
    }

    // Attempt to open in a full-screen browser window/tab
    const newTab = window.open(browserUrl, '_blank', 'noopener,noreferrer');
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
      setPopupBlocked(true);
    } else {
      setPopupBlocked(false);
      meetingWindowRef.current = newTab;
    }

    startActiveTelemetry(registeredAttendee);
  };

  // 5. "Open in Jitsi App" action (mobile deep-link)
  const handleOpenInApp = () => {
    if (!registeredAttendee) return;
    const { user, meeting } = registeredAttendee;
    const meetingInfo = parseMeetingUrl(meeting?.url);

    // Official Jitsi app URL scheme
    const appDeepLink = `org.jitsi.meet://${meetingInfo.domain}/${encodeURIComponent(meetingInfo.roomName)}#userInfo.displayName=${encodeURIComponent(user.name)}`;

    // Attempt app launch
    window.location.href = appDeepLink;

    // Start attendance telemetry so app joiners are counted as active
    startActiveTelemetry(registeredAttendee);
  };

  // 6. "Leave Meeting" action
  const handleLeaveMeeting = async () => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }

    const finalSecs = attendedElapsed;
    const mins = Math.floor(finalSecs / 60);
    const secs = finalSecs % 60;

    if (telemetrySessionRef.current) {
      await telemetrySessionRef.current.handleMeetingLeft();
      telemetrySessionRef.current.cleanup();
      telemetrySessionRef.current = null;
    }

    if (meetingWindowRef.current && !meetingWindowRef.current.closed) {
      try {
        meetingWindowRef.current.close();
      } catch {}
    }

    setIsAttending(false);
    setHasLeft(true);
    setLeftSummary({ minutes: mins, seconds: secs, totalSeconds: finalSecs });
  };

  const isFormValid =
    name.trim().length >= 2 &&
    employeeId.trim().length > 0 &&
    zone.trim().length > 0 &&
    meetingContext?.zonesConfigured &&
    !submitting;

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1E293B 0%, #0B1120 75%)',
      color: 'white',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 14px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'rgba(30, 41, 59, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '24px',
        padding: '30px 22px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        boxSizing: 'border-box'
      }}>

        {/* ─── STAGE 1: REGISTRATION FORM (When not yet registered) ─── */}
        {!registeredAttendee && (
          <>
            {/* Header Branding & Icon */}
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(59,130,246,0.15))',
                border: '1px solid rgba(59,130,246,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: '#60A5FA',
                boxShadow: '0 8px 16px rgba(37,99,235,0.2)'
              }}>
                <Video size={26} />
              </div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em', color: '#F8FAFC' }}>
                Join Scheduled Meeting
              </h1>
              <p style={{ color: '#94A3B8', fontSize: '0.84rem', margin: 0, lineHeight: '1.45' }}>
                Verify your attendee details to join the live session and record authoritative attendance.
              </p>
            </div>

            {/* Loading Meeting Context */}
            {loadingContext && (
              <div style={{ textAlign: 'center', padding: '28px 16px', color: '#94A3B8' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px', color: '#60A5FA' }} />
                <p style={{ fontSize: '0.88rem', margin: 0 }}>Connecting to meeting session...</p>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* Context Error Banner */}
            {contextError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#F87171',
                padding: '12px 14px',
                borderRadius: '12px',
                marginBottom: '18px',
                fontSize: '0.84rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{contextError}</span>
              </div>
            )}

            {/* Meeting Information Badge */}
            {meetingContext && !loadingContext && !contextError && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '14px 16px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#60A5FA', fontWeight: 700 }}>
                    Project Session
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(37,99,235,0.2)',
                    color: '#93C5FD',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontWeight: 600
                  }}>
                    {meetingContext.projectName}
                  </span>
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white', marginBottom: '4px', wordBreak: 'break-word' }}>
                  {meetingContext.title || 'Live Training Session'}
                </div>
                {meetingContext.scheduledAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94A3B8' }}>
                    <Calendar size={14} color="#94A3B8" />
                    <span>{formatKolkataDateTime(meetingContext.scheduledAt, { dateStyle: 'medium', timeStyle: 'short' })} (IST)</span>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#F87171',
                padding: '12px 14px',
                borderRadius: '12px',
                marginBottom: '18px',
                fontSize: '0.84rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            {/* Attendee Form */}
            {!loadingContext && !contextError && (
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Full Name */}
                <div>
                  <label htmlFor="guest-full-name" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                    Full Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                      id="guest-full-name"
                      type="text"
                      required
                      placeholder="e.g. Rajesh Kumar"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        borderRadius: '12px',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1.5px solid rgba(255, 255, 255, 0.12)',
                        color: 'white',
                        outline: 'none',
                        fontSize: '0.94rem',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#3B82F6'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                    />
                  </div>
                </div>

                {/* Employee ID */}
                <div>
                  <label htmlFor="guest-emp-id" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                    Employee ID <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Hash size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                      id="guest-emp-id"
                      type="text"
                      required
                      placeholder="e.g. 008942 or EMP-1049"
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      onBlur={handleEmployeeIdBlur}
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        borderRadius: '12px',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1.5px solid rgba(255, 255, 255, 0.12)',
                        color: 'white',
                        outline: 'none',
                        fontSize: '0.94rem',
                        fontFamily: 'monospace',
                        letterSpacing: '0.5px',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#3B82F6'}
                      onBlurCapture={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                    />
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '4px' }}>
                    Preserves exact identifier format and leading zeros.
                  </div>

                  {matchedRecord && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '6px',
                      color: '#34D399',
                      fontSize: '0.78rem',
                      fontWeight: 500
                    }}>
                      <CheckCircle2 size={13} />
                      <span>Authoritative Match: {matchedRecord.name} {matchedRecord.authoritativeZone ? `(Zone: ${matchedRecord.authoritativeZone})` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Zone Selection */}
                <div>
                  <label htmlFor="guest-zone-select" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                    Zone <span style={{ color: '#EF4444' }}>*</span>
                  </label>

                  {meetingContext?.zonesConfigured && meetingContext?.validZones?.length > 0 ? (
                    <div style={{ position: 'relative' }}>
                      <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                      <select
                        id="guest-zone-select"
                        value={zone}
                        onChange={e => setZone(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 42px',
                          borderRadius: '12px',
                          background: '#0F172A',
                          border: '1.5px solid rgba(255, 255, 255, 0.12)',
                          color: zone ? 'white' : '#94A3B8',
                          outline: 'none',
                          fontSize: '0.94rem',
                          appearance: 'none',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s',
                          boxSizing: 'border-box'
                        }}
                        onFocus={e => e.target.style.borderColor = '#3B82F6'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                      >
                        <option value="" style={{ background: '#0F172A', color: '#94A3B8' }}>-- Select Your Zone --</option>
                        {meetingContext.validZones.map(z => (
                          <option key={z} value={z} style={{ background: '#0F172A', color: 'white' }}>
                            {z}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      color: '#FBBF24',
                      fontSize: '0.82rem',
                      lineHeight: '1.45',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Zones Not Configured:</strong> Authoritative deployment zones are not configured for this project.
                        Please contact your Program Manager or Trainer to configure project zones before joining.
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Verification Button */}
                <button
                  type="submit"
                  disabled={!isFormValid}
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: isFormValid
                      ? 'linear-gradient(135deg, #2563EB, #1D4ED8)'
                      : 'rgba(51, 65, 85, 0.6)',
                    border: 'none',
                    color: isFormValid ? 'white' : '#94A3B8',
                    fontSize: '0.98rem',
                    fontWeight: 600,
                    cursor: isFormValid ? 'pointer' : 'not-allowed',
                    boxShadow: isFormValid ? '0 10px 20px -5px rgba(37,99,235,0.4)' : 'none',
                    transition: 'all 0.2s',
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxSizing: 'border-box'
                  }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Verifying Attendee...</span>
                    </>
                  ) : (
                    <span>Continue to Meeting</span>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* ─── STAGE 2: IN-PAGE ATTENDEE MEETING ROOM CONTROLLER (NO NESTED IFRAME) ─── */}
        {registeredAttendee && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Session Header Card */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '18px 20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Live Meeting Session
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  background: 'rgba(37,99,235,0.25)',
                  color: '#93C5FD',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  fontWeight: 600
                }}>
                  {registeredAttendee.meeting?.projectName || meetingContext?.projectName || 'Project'}
                </span>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px', color: '#F8FAFC', wordBreak: 'break-word' }}>
                {registeredAttendee.meeting?.title || meetingContext?.title || 'Interactive Session'}
              </h2>

              {registeredAttendee.meeting?.scheduledAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94A3B8' }}>
                  <Calendar size={14} color="#94A3B8" />
                  <span>{formatKolkataDateTime(registeredAttendee.meeting.scheduledAt, { dateStyle: 'medium', timeStyle: 'short' })} (IST)</span>
                </div>
              )}
            </div>

            {/* Verified Attendee Badge */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '14px',
              padding: '14px 16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34D399', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                <CheckCircle2 size={15} />
                <span>Verified Attendee Identity</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#94A3B8', fontSize: '0.72rem', display: 'block' }}>Name:</span>
                  <strong style={{ color: '#F1F5F9' }}>{registeredAttendee.user.name}</strong>
                </div>
                <div>
                  <span style={{ color: '#94A3B8', fontSize: '0.72rem', display: 'block' }}>Employee ID:</span>
                  <strong style={{ color: '#F1F5F9', fontFamily: 'monospace' }}>{registeredAttendee.user.employee_id}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#94A3B8', fontSize: '0.72rem', display: 'block' }}>Authoritative Zone:</span>
                  <strong style={{ color: '#60A5FA' }}>{registeredAttendee.user.zone}</strong>
                </div>
              </div>
            </div>

            {/* ── Sub-state A: Ready to Join (Not Yet In Meeting) ── */}
            {!isAttending && !hasLeft && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.86rem', color: '#94A3B8', margin: 0, textAlign: 'center', lineHeight: '1.45' }}>
                  Choose your preferred option to enter the meeting. Attendance telemetry begins immediately upon launch.
                </p>

                {/* Primary: Join in Browser */}
                <button
                  type="button"
                  id="btn-join-browser"
                  onClick={handleJoinInBrowser}
                  style={{
                    width: '100%',
                    minHeight: '52px',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 10px 22px -5px rgba(16, 185, 129, 0.45)',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                >
                  <Video size={20} />
                  <span>Join in Browser (Full Screen)</span>
                </button>

                {/* Secondary: Open in Jitsi App */}
                <button
                  type="button"
                  id="btn-join-app"
                  onClick={handleOpenInApp}
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(37, 99, 235, 0.15)',
                    border: '1.5px solid rgba(59, 130, 246, 0.4)',
                    color: '#93C5FD',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                >
                  <Smartphone size={18} />
                  <span>Open in Jitsi Meet App</span>
                </button>

                {/* Popup Blocked Notification */}
                {popupBlocked && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: '#FBBF24',
                    fontSize: '0.8rem',
                    textAlign: 'center'
                  }}>
                    Popup blocked by mobile browser?{' '}
                    <a
                      href={registeredAttendee.meeting?.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#60A5FA', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Tap here to open meeting directly
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* ── Sub-state B: Active Meeting In Progress ── */}
            {isAttending && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '16px',
                padding: '20px 18px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#10B981', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Live Attendance Active
                  </span>
                </div>

                <div style={{
                  fontSize: '2rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  color: 'white',
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '12px',
                  borderRadius: '12px',
                  letterSpacing: '1px'
                }}>
                  ⏱️ {Math.floor(attendedElapsed / 60).toString().padStart(2, '0')}:{(attendedElapsed % 60).toString().padStart(2, '0')}
                </div>

                <p style={{ color: '#94A3B8', fontSize: '0.82rem', margin: 0, lineHeight: '1.45' }}>
                  Your attendance telemetry is recording on the server. Keep this browser tab open in the background while participating.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                  {/* Re-open Meeting Tab */}
                  <button
                    type="button"
                    onClick={handleJoinInBrowser}
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'rgba(37, 99, 235, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      color: '#93C5FD',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <ExternalLink size={16} />
                    <span>Re-open Meeting Room Tab</span>
                  </button>

                  {/* Leave Meeting Button */}
                  <button
                    type="button"
                    id="btn-leave-meeting"
                    onClick={handleLeaveMeeting}
                    style={{
                      width: '100%',
                      minHeight: '48px',
                      padding: '12px 18px',
                      borderRadius: '12px',
                      background: '#EF4444',
                      border: 'none',
                      color: 'white',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 18px -4px rgba(239, 68, 68, 0.4)'
                    }}
                  >
                    <LogOut size={18} />
                    <span>■ Leave Meeting Room</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Sub-state C: Left Meeting Summary ── */}
            {hasLeft && leftSummary && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '16px',
                padding: '22px 18px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}>
                  <Check size={26} />
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'white' }}>
                  Attendance Persisted
                </h3>

                <p style={{ color: '#94A3B8', fontSize: '0.86rem', margin: 0, lineHeight: '1.45' }}>
                  You attended this session for{' '}
                  <strong style={{ color: '#34D399' }}>
                    {leftSummary.minutes > 0 ? `${leftSummary.minutes}m ` : ''}{leftSummary.seconds}s
                  </strong>. Your attendance record has been reconciled with project reporting.
                </p>

                <button
                  type="button"
                  onClick={handleJoinInBrowser}
                  style={{
                    width: '100%',
                    minHeight: '46px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    border: 'none',
                    color: 'white',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '6px'
                  }}
                >
                  <RotateCcw size={16} />
                  <span>Re-enter Meeting Room</span>
                </button>
              </div>
            )}

            {/* Switch Identity / Sign Out of Guest Session */}
            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(`jitsi_guest_auth_${trainingId}`);
                    localStorage.removeItem(`jitsi_active_session_${trainingId}`);
                  } catch {}
                  setRegisteredAttendee(null);
                  setIsAttending(false);
                  setHasLeft(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Change attendee details or join as another associate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
