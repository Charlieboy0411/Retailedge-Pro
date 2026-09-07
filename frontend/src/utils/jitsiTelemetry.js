import React, { useEffect, useRef } from 'react';
import axios from 'axios';
import { X, ExternalLink, Users, Clock, Shield } from 'lucide-react';

/**
 * Jitsi Meeting Launcher & Telemetry Tracker.
 * Manages interval telemetry, rejoin counts, and live attendance tracking.
 */
export function startJitsiTelemetry({
  trainingId,
  participantName,
  employeeId,
  userId,
  scheduledDurationMinutes = 60,
  token
}) {
  const jitsiParticipantId = `jp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // 1. Dispatch JOIN event
  axios.post(`/api/trainings/${trainingId}/jitsi-event`, {
    event: 'join',
    participantName,
    employeeId,
    userId,
    jitsiParticipantId,
    scheduledDurationMinutes
  }, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  }).catch(err => console.error('Jitsi join event error:', err));

  // 2. Setup periodic HEARTBEAT every 30 seconds
  const heartbeatInterval = setInterval(() => {
    axios.post(`/api/trainings/${trainingId}/jitsi-event`, {
      event: 'heartbeat',
      participantName,
      employeeId,
      userId,
      jitsiParticipantId,
      scheduledDurationMinutes
    }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).catch(err => console.error('Jitsi heartbeat error:', err));
  }, 30000);

  // 3. Dispatch LEAVE event handler
  const endSession = () => {
    clearInterval(heartbeatInterval);
    // Use navigator.sendBeacon if possible, or sync fetch/axios
    const payload = JSON.stringify({
      event: 'leave',
      participantName,
      employeeId,
      userId,
      jitsiParticipantId,
      scheduledDurationMinutes
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(`/api/trainings/${trainingId}/jitsi-event`, new Blob([payload], { type: 'application/json' }));
    } else {
      axios.post(`/api/trainings/${trainingId}/jitsi-event`, JSON.parse(payload), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).catch(e => console.error('Jitsi leave error:', e));
    }
  };

  window.addEventListener('beforeunload', endSession);

  return {
    jitsiParticipantId,
    stopTelemetry: () => {
      window.removeEventListener('beforeunload', endSession);
      endSession();
    }
  };
}
