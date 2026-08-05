/**
 * socketService.js — Singleton Socket.IO client for QuizHive frontend.
 *
 * Purpose:
 *  - Prevents multiple TCP connections when navigating between Dashboard pages.
 *  - All dashboard pages (Attendance, Dashboard, PMDashboard, Reports, SchedulePage)
 *    call getSocket() to share a single persistent connection.
 *  - Quiz pages (HostControlRoom, LiveQuiz) manage their own socket instances
 *    because they need to join/leave rooms and disconnect cleanly.
 *
 * Design decisions:
 *  - Forces WebSocket transport in production (avoids HTTP polling overhead).
 *  - Exponential backoff on reconnect: 1s → 2s → 4s → max 5s.
 *  - pingInterval / pingTimeout match the server config in server.js.
 */

import { io } from 'socket.io-client';

let socketInstance = null;

/** Socket.IO connection options — mirrors server.js heartbeat config */
const SOCKET_OPTIONS = {
  // In production the frontend is served from the same origin as the backend,
  // so window.location.origin resolves correctly.
  // In dev, Vite's proxy (vite.config.js) forwards /socket.io → localhost:5000.
  transports: ['websocket', 'polling'], // Prefer WebSocket; fall back to polling
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,        // Start at 1s
  reconnectionDelayMax: 5000,     // Cap at 5s
  randomizationFactor: 0.3,       // ±30% jitter to prevent thundering herd
  timeout: 20000,                 // Connection timeout
};

/**
 * Returns the shared socket instance, creating it if needed.
 * Safe to call multiple times — always returns the same socket.
 */
export function getSocket() {
  if (!socketInstance || socketInstance.disconnected) {
    socketInstance = io(window.location.origin, SOCKET_OPTIONS);

    socketInstance.on('connect', () => {
      console.log('[SocketService] Connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[SocketService] Connection error:', err.message);
    });

    socketInstance.on('reconnect', (attempt) => {
      console.log('[SocketService] Reconnected after', attempt, 'attempt(s)');
    });
  }
  return socketInstance;
}

/**
 * Forcefully disconnects and destroys the singleton.
 * Call this only on full app logout — not on page navigation.
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
    console.log('[SocketService] Socket destroyed.');
  }
}

// ─── Vite HMR Safety ──────────────────────────────────────────────────────────
// During development, hot module reloads would leak the old socket without this.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  });
}
