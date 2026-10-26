import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LogIn, User, Hash, MapPin, AlertCircle, AlertTriangle, Video, Calendar, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function GuestJoin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const trainingId = searchParams.get('id');

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

  useEffect(() => {
    if (!trainingId) {
      setLoadingContext(false);
      setContextError('Invalid meeting link. No meeting ID was found. Please check your invitation URL.');
      return;
    }
    fetchJoinContext();
  }, [trainingId]);

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

      // Log user into LMS context automatically
      login(response.data.token, response.data.user);

      // Redirect to training module with autoJoin flag
      navigate(`/trainings?id=${trainingId}&autoJoin=true`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to join meeting. Please try again.');
      setSubmitting(false);
    }
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
      background: 'radial-gradient(ellipse at top, #1E293B 0%, #0B1120 70%)',
      color: 'white',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'rgba(30, 41, 59, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '24px',
        padding: '36px 32px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header Branding & Icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(59,130,246,0.15))',
            border: '1px solid rgba(59,130,246,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            color: '#60A5FA',
            boxShadow: '0 8px 16px rgba(37,99,235,0.2)'
          }}>
            <Video size={28} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em', color: '#F8FAFC' }}>
            Join Scheduled Meeting
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: 0, lineHeight: '1.45' }}>
            Verify your identity to join the interactive session and record authoritative attendance.
          </p>
        </div>

        {/* Loading Meeting Context */}
        {loadingContext && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', color: '#60A5FA' }} />
            <p style={{ fontSize: '0.9rem', margin: 0 }}>Connecting to session roster...</p>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Context Error Banner */}
        {contextError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#F87171',
            padding: '14px 16px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>Session Unavailable</div>
              <div>{contextError}</div>
              {trainingId && (
                <button
                  type="button"
                  onClick={() => fetchJoinContext()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#60A5FA',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: '8px',
                    fontWeight: 600,
                    textDecoration: 'underline'
                  }}
                >
                  Retry Connection
                </button>
              )}
            </div>
          </div>
        )}

        {/* Meeting Information Card */}
        {meetingContext && !loadingContext && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '0.82rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#93C5FD', fontWeight: 600, marginBottom: '4px' }}>
              <Calendar size={14} />
              <span>{meetingContext.title}</span>
            </div>
            <div style={{ color: '#94A3B8', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
              <span>Project: <strong style={{ color: '#E2E8F0' }}>{meetingContext.projectName}</strong></span>
              {meetingContext.scheduledAt && (
                <span>Date: <strong style={{ color: '#CBD5E1' }}>{new Date(meetingContext.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
              )}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#F87171',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        {/* Main Identity Form */}
        {!loadingContext && !contextError && (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                Full Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Charles Smith"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 16px 13px 44px',
                    borderRadius: '12px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    color: 'white',
                    outline: 'none',
                    fontSize: '0.95rem',
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
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                Employee ID <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Hash size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  onBlur={handleEmployeeIdBlur}
                  placeholder="e.g. 004821 or EMP1029"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 16px 13px 44px',
                    borderRadius: '12px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    color: 'white',
                    outline: 'none',
                    fontSize: '0.95rem',
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
                Preserves original identifier format and leading zeros.
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
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '6px' }}>
                Zone <span style={{ color: '#EF4444' }}>*</span>
              </label>

              {meetingContext?.zonesConfigured && meetingContext?.validZones?.length > 0 ? (
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                  <select
                    value={zone}
                    onChange={e => setZone(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '13px 16px 13px 44px',
                      borderRadius: '12px',
                      background: '#0F172A',
                      border: '1.5px solid rgba(255, 255, 255, 0.12)',
                      color: zone ? 'white' : '#94A3B8',
                      outline: 'none',
                      fontSize: '0.95rem',
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
                  padding: '14px 16px',
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: isFormValid
                  ? 'linear-gradient(135deg, #2563EB, #1D4ED8)'
                  : 'rgba(51, 65, 85, 0.6)',
                border: 'none',
                color: isFormValid ? 'white' : '#94A3B8',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: isFormValid ? 'pointer' : 'not-allowed',
                boxShadow: isFormValid ? '0 10px 20px -5px rgba(37,99,235,0.4)' : 'none',
                transition: 'all 0.2s',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Verifying & Joining...</span>
                </>
              ) : (
                <span>Join Meeting</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
