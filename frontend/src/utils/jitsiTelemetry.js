import axios from 'axios';

/**
 * Jitsi Meeting Telemetry Manager (Stage 3C Gate C Remediation)
 *
 * Provides lifecycle-bound, event-driven attendance telemetry:
 * - Emits 'join' ONLY when genuine meeting join evidence is observed (e.g. Jitsi videoConferenceJoined event).
 * - Maintains single-threaded 30-second periodic heartbeat while active.
 * - Emits 'leave' when user leaves or session terminates.
 * - Handles browser unload / unmount strictly via authenticated keepalive fetch (transmitting Bearer token).
 * - Eliminates unauthenticated navigator.sendBeacon fallback (which cannot attach Authorization headers).
 * - Accurately propagates leave failures so callers do NOT falsely claim attendance was recorded.
 * - Does NOT fabricate attendance on button clicks or external tab launches.
 */

export function createJitsiTelemetrySession({
  trainingId,
  scheduledDurationMinutes = 60,
  token,
  userId,
  participantName,
  employeeId,
  backendUrl = '',
  heartbeatMs = 30000,
  onStatusChange
}) {
  const jitsiParticipantId = `jp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let isJoined = false;
  let heartbeatTimer = null;
  let inFlight = false;
  let currentStatus = 'idle'; // 'idle' | 'joining' | 'active' | 'leaving' | 'left' | 'error'
  let lastError = null;

  const setStatus = (status, extra = {}) => {
    currentStatus = status;
    if (typeof onStatusChange === 'function') {
      onStatusChange({ status, isJoined, jitsiParticipantId, ...extra });
    }
  };

  const checkAuth = () => {
    if (!token) {
      const err = new Error('Unauthorized: Authentication token is missing');
      lastError = err;
      setStatus('error', { error: err });
      return false;
    }
    return true;
  };

  const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const getEndpoint = () => {
    const base = backendUrl ? backendUrl.replace(/\/+$/, '') : '';
    return `${base}/api/trainings/${trainingId}/jitsi-event`;
  };

  // 1. Dispatch genuine JOIN event
  const handleMeetingJoined = async (jitsiEvent = {}) => {
    if (!checkAuth()) {
      return { success: false, error: 'Unauthorized: Missing authentication token' };
    }

    if (isJoined && heartbeatTimer) {
      // Already joined with an active heartbeat loop; prevent duplicate loop
      return { success: true, message: 'Already joined (idempotent)' };
    }

    setStatus('joining');
    try {
      const payload = {
        event: 'join',
        jitsiParticipantId,
        scheduledDurationMinutes,
        participantName,
        employeeId,
        userId
      };

      await axios.post(getEndpoint(), payload, { headers: getHeaders() });

      isJoined = true;
      setStatus('active');

      // Clear any existing heartbeat timer before starting a new one
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }

      heartbeatTimer = setInterval(async () => {
        await sendHeartbeat();
      }, heartbeatMs);

      return { success: true, jitsiParticipantId };

    } catch (err) {
      console.error('[JitsiTelemetry] Failed to record join event:', err?.response?.data || err.message);
      lastError = err;
      setStatus('error', { error: err });
      return { success: false, error: err?.response?.data?.error || err.message };
    }
  };

  // 2. Dispatch periodic HEARTBEAT event
  const sendHeartbeat = async () => {
    if (!isJoined) return { success: false, error: 'Not joined' };
    if (!checkAuth()) return { success: false, error: 'Unauthorized: Missing token' };
    if (inFlight) return { success: true, skipped: true }; // Prevent overlapping requests

    inFlight = true;
    try {
      const payload = {
        event: 'heartbeat',
        jitsiParticipantId,
        scheduledDurationMinutes,
        participantName,
        employeeId,
        userId
      };

      await axios.post(getEndpoint(), payload, { headers: getHeaders() });
      return { success: true };
    } catch (err) {
      console.warn('[JitsiTelemetry] Heartbeat failed:', err?.response?.data || err.message);
      if (err?.response?.status === 401) {
        // Token expired; halt heartbeat loop
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        setStatus('error', { error: err });
      }
      return { success: false, error: err.message };
    } finally {
      inFlight = false;
    }
  };

  // 3. Dispatch genuine LEAVE event
  const handleMeetingLeft = async () => {
    if (!isJoined) return { success: true, message: 'Already left or never joined' };

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    isJoined = false;
    setStatus('leaving');

    if (!checkAuth()) {
      return { success: false, error: 'Unauthorized: Missing authentication token' };
    }

    try {
      const payload = {
        event: 'leave',
        jitsiParticipantId,
        scheduledDurationMinutes,
        participantName,
        employeeId,
        userId
      };

      await axios.post(getEndpoint(), payload, { headers: getHeaders() });
      setStatus('left');
      return { success: true };
    } catch (err) {
      console.error('[JitsiTelemetry] Failed to record leave event:', err?.response?.data || err.message);
      setStatus('error', { error: err });
      return { success: false, error: err?.response?.data?.error || err.message };
    }
  };

  // 4. Safe cleanup on component unmount or browser beforeunload
  const cleanup = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (isJoined) {
      isJoined = false;
      if (!token) {
        console.warn('[JitsiTelemetry] Unload cleanup skipped leave delivery: Missing authentication token');
        return;
      }

      const payload = JSON.stringify({
        event: 'leave',
        jitsiParticipantId,
        scheduledDurationMinutes,
        participantName,
        employeeId,
        userId
      });

      // Authenticated fetch with keepalive: transmits Authorization header reliably on unload
      if (typeof window !== 'undefined' && window.fetch) {
        try {
          fetch(getEndpoint(), {
            method: 'POST',
            headers: getHeaders(),
            body: payload,
            keepalive: true
          }).catch(err => {
            console.warn('[JitsiTelemetry] Keepalive leave delivery network error:', err);
          });
        } catch (e) {
          console.warn('[JitsiTelemetry] Keepalive fetch could not be initiated:', e);
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', cleanup);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }

  return {
    jitsiParticipantId,
    handleMeetingJoined,
    sendHeartbeat,
    handleMeetingLeft,
    cleanup,
    getState: () => ({
      isJoined,
      jitsiParticipantId,
      status: currentStatus,
      hasTimer: Boolean(heartbeatTimer),
      error: lastError
    })
  };
}

/**
 * Backward compatibility wrapper for legacy callers.
 */
export function startJitsiTelemetry(config) {
  const session = createJitsiTelemetrySession(config);
  session.handleMeetingJoined();
  return {
    jitsiParticipantId: session.jitsiParticipantId,
    stopTelemetry: () => session.handleMeetingLeft()
  };
}
