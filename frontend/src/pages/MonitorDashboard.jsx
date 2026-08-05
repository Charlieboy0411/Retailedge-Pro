import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

/**
 * MonitorDashboard — Real-time system monitoring for administrators.
 *
 * Covers:
 *  - Active quiz rooms + per-room timer and participant counts
 *  - WebSocket connection totals and lifecycle counters
 *  - Security counters (late, dupe, flood, oversized, invalid-room rejections)
 *  - Node.js memory (heap used, heap total, RSS) with animated bars
 *  - Connection count sparkline (last 20 polls, 3-second auto-refresh)
 *  - Memory Leak Monitor: auto-captures a snapshot every 5 minutes (Validation 14)
 *    with visual leak-detection warning
 *  - Embedded Phase 1 + Validation 6–16 checklist
 *
 * Data source: GET /api/admin/stats (protected by ADMIN_MONITOR_TOKEN env var)
 */
export default function MonitorDashboard() {
  const { token, user } = useContext(AuthContext);

  // ─── Live stats ──────────────────────────────────────────────────────────────
  const [stats,    setStats]    = useState(null);
  const [history,  setHistory]  = useState([]);   // last 20 poll samples for sparkline
  const [latency,  setLatency]  = useState(null); // API roundtrip ms
  const [error,    setError]    = useState(null);
  const [paused,   setPaused]   = useState(false);

  // ─── Memory Leak Monitor (Validation 14) ─────────────────────────────────────
  const [snapshots,      setSnapshots]      = useState([]); // 5-min captures
  const [leakWarning,    setLeakWarning]    = useState(false);
  const [snapshotPaused, setSnapshotPaused] = useState(false);

  const intervalRef         = useRef(null);
  const snapshotIntervalRef = useRef(null);
  const latestStatsRef      = useRef(null); // keeps latest stats accessible inside interval

  const adminToken = import.meta.env.VITE_MONITOR_TOKEN || '';

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const t0 = Date.now();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (adminToken) headers['x-monitor-token'] = adminToken;

      const res = await axios.get('/api/admin/stats', { headers });
      const roundtrip = Date.now() - t0;
      latestStatsRef.current = res.data;
      setStats(res.data);
      setLatency(roundtrip);
      setError(null);
      setHistory(prev => {
        const next = [...prev, {
          ts:          new Date().toLocaleTimeString(),
          connections: res.data.totalSockets,
          memMB:       res.data.memoryMB,
          rooms:       res.data.activeRooms,
        }];
        return next.slice(-20);
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }, [token, adminToken]);

  // ─── Memory snapshot capture ──────────────────────────────────────────────────
  const captureSnapshot = useCallback(() => {
    const s = latestStatsRef.current;
    if (!s) return;
    const snap = {
      ts:           new Date().toLocaleTimeString(),
      heapMB:       s.memoryMB,
      totalMB:      s.memoryTotalMB,
      rssMB:        s.rssMemoryMB,
      sockets:      s.totalSockets,
      rooms:        s.activeRooms,
      timerCount:   s.rooms?.filter(r => r.timerActive).length ?? 0,
      participants: s.rooms?.reduce((acc, r) => acc + r.participantCount, 0) ?? 0,
    };

    setSnapshots(prev => {
      const next = [...prev, snap];
      // Leak detection: if last 3 snapshots show heap growing > 15% each time
      if (next.length >= 3) {
        const tail = next.slice(-3);
        const growing = tail[0].heapMB > 0 &&
          tail[1].heapMB > tail[0].heapMB * 1.15 &&
          tail[2].heapMB > tail[1].heapMB * 1.15;
        setLeakWarning(growing);
      }
      return next.slice(-50); // keep last 50 snapshots (≈4 hours at 5min interval)
    });
  }, []);

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStats();
    if (!paused) {
      intervalRef.current = setInterval(fetchStats, 3000);
    }
    return () => clearInterval(intervalRef.current);
  }, [fetchStats, paused]);

  useEffect(() => {
    if (!snapshotPaused) {
      snapshotIntervalRef.current = setInterval(captureSnapshot, 5 * 60 * 1000); // 5 minutes
    }
    return () => clearInterval(snapshotIntervalRef.current);
  }, [captureSnapshot, snapshotPaused]);

  // ─── Derived values ──────────────────────────────────────────────────────────
  const uptime = stats ? formatUptime(stats.uptimeSeconds) : '--';
  const totalParticipants = stats
    ? stats.rooms.reduce((sum, r) => sum + r.participantCount, 0)
    : 0;
  const activeTimers = stats ? stats.rooms.filter(r => r.timerActive).length : 0;
  const secTotal = stats
    ? (stats.monitor.totalLateRejections   +
       stats.monitor.totalDupeRejections   +
       stats.monitor.totalFloodRejections  +
       (stats.monitor.totalOversizedRejections || 0) +
       stats.monitor.totalInvalidRooms)
    : 0;

  // ─── Access guard ─────────────────────────────────────────────────────────────
  const isAdmin = user && ['admin', 'td_manager', 'super_admin'].includes(user.role?.toLowerCase());
  if (!isAdmin) {
    return (
      <div style={styles.noAccess}>
        <div style={styles.noAccessCard}>
          <div style={{ fontSize: '3rem' }}>🔒</div>
          <h2 style={{ color: '#FF9800', margin: '12px 0 8px' }}>Access Restricted</h2>
          <p style={{ color: '#8899BB' }}>Available to Admin and TD Manager roles only.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>⚡ Live System Monitor</h1>
          <p style={styles.subtitle}>
            Real-time QuizHive server telemetry · Auto-refresh every 3s
            {latency !== null && (
              <span style={{ color: latency < 100 ? '#8BCF00' : latency < 300 ? '#FF9800' : '#FF4444' }}>
                {' '}· API: <strong>{latency}ms</strong>
              </span>
            )}
          </p>
        </div>
        <div style={styles.headerActions}>
          <span className="mon-pill" style={{ background: error ? '#FF4444' : '#2E7D32', color: '#fff' }}>
            {error ? '● Error' : '● Live'}
          </span>
          <button className="mon-btn" onClick={() => setPaused(p => !p)}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button className="mon-btn" onClick={fetchStats}>↻ Refresh</button>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          ⚠️ {error}
          {error === 'Forbidden' && ' — Set VITE_MONITOR_TOKEN in your frontend .env to match the server ADMIN_MONITOR_TOKEN.'}
        </div>
      )}

      {/* ── KPI Row ── */}
      <div style={styles.kpiRow}>
        <KPICard icon="🏠" label="Active Rooms"        value={stats?.activeRooms ?? '--'}       color="#FF9800" />
        <KPICard icon="👥" label="Live Participants"   value={totalParticipants}                 color="#4FC3F7" />
        <KPICard icon="🔌" label="Total Sockets"       value={stats?.totalSockets ?? '--'}       color="#CE93D8" />
        <KPICard icon="⏱️" label="Timers Running"      value={activeTimers}                      color="#FFCC80" />
        <KPICard icon="💾" label="Heap Used"           value={stats ? `${stats.memoryMB} MB` : '--'} color="#80DEEA" />
        <KPICard icon="⏱️" label="Uptime"              value={uptime}                            color="#A5D6A7" />
        <KPICard icon="❓" label="Questions Delivered" value={stats?.monitor?.questionsDelivered ?? '--'} color="#FFAB91" />
        <KPICard icon="🛡️" label="Security Events"    value={secTotal}                          color={secTotal > 0 ? '#FF9800' : '#8BCF00'} />
      </div>

      {/* ── Active Rooms + Security Counters ── */}
      <div style={styles.rowDouble}>
        {/* Active Rooms */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🏠 Active Quiz Rooms</h2>
          {(!stats || stats.rooms.length === 0) ? (
            <div style={styles.emptyState}>No active rooms. Start a quiz to populate this panel.</div>
          ) : (
            <div style={styles.roomList}>
              {stats.rooms.map(room => (
                <div key={room.roomCode} style={styles.roomRow}>
                  <div style={styles.roomCode}>{room.roomCode}</div>
                  <div style={styles.roomMeta}>
                    <span className="mon-pill" style={{ background: '#1A2A4A' }}>
                      👥 {room.participantCount}
                    </span>
                    {room.timerActive ? (
                      <span className="mon-pill" style={{ background: '#7B3F00' }}>
                        ⏱ {room.timerRemaining}s
                      </span>
                    ) : (
                      <span className="mon-pill" style={{ background: '#1A3A1A' }}>⏸ idle</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Counters */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🛡️ Security Counters</h2>
          <div style={styles.counterGrid}>
            <Counter label="Connections"       value={stats?.monitor?.totalConnections ?? 0}          icon="🔗" color="#4FC3F7" />
            <Counter label="Disconnections"    value={stats?.monitor?.totalDisconnections ?? 0}       icon="❌" color="#FF8A80" />
            <Counter label="Answers Accepted"  value={stats?.monitor?.totalAnswers ?? 0}              icon="✅" color="#A5D6A7" />
            <Counter label="Late Rejections"   value={stats?.monitor?.totalLateRejections ?? 0}       icon="⏰" color="#FF9800" />
            <Counter label="Duplicate Answers" value={stats?.monitor?.totalDupeRejections ?? 0}       icon="🔁" color="#FF9800" />
            <Counter label="Flood Rejections"  value={stats?.monitor?.totalFloodRejections ?? 0}      icon="🌊" color="#FF4444" />
            <Counter label="Oversized Payloads" value={stats?.monitor?.totalOversizedRejections ?? 0} icon="📦" color="#FF4444" />
            <Counter label="Invalid Rooms"     value={stats?.monitor?.totalInvalidRooms ?? 0}         icon="🚫" color="#FF4444" />
          </div>
        </div>
      </div>

      {/* ── Memory + Sparkline ── */}
      <div style={styles.rowDouble}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>💾 Memory Usage</h2>
          {stats ? (
            <>
              <MemoryBar label="Heap Used"  value={stats.memoryMB}      max={stats.memoryTotalMB} color="#4FC3F7" />
              <MemoryBar label="Heap Total" value={stats.memoryTotalMB} max={stats.rssMemoryMB}   color="#CE93D8" />
              <MemoryBar label="RSS"        value={stats.rssMemoryMB}   max={512}                 color="#80DEEA" />
            </>
          ) : <div style={styles.emptyState}>Loading…</div>}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📈 Connection Trend (last {history.length} polls)</h2>
          {history.length === 0 ? (
            <div style={styles.emptyState}>Collecting data…</div>
          ) : (
            <>
              <Sparkline data={history.map(h => h.connections)} label="Sockets" color="#FF9800" />
              <Sparkline data={history.map(h => h.memMB)}       label="Heap MB" color="#4FC3F7" />
              <Sparkline data={history.map(h => h.rooms)}       label="Rooms"   color="#A5D6A7" />
              <div style={styles.xLabels}>
                <span>{history[0]?.ts}</span>
                <span style={{ color: '#8899BB' }}>→ now ({history[history.length - 1]?.ts})</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Memory Leak Monitor (Validation 14) ── */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ ...styles.cardTitle, margin: 0 }}>📊 Memory Leak Monitor <span style={{ fontSize: '0.7rem', color: '#8899BB', fontWeight: 400 }}>(Validation 14 — captures every 5 min)</span></h2>
            {leakWarning && (
              <div style={{ color: '#FF4444', fontSize: '0.82rem', marginTop: 6, fontWeight: 700 }}>
                ⚠️ POTENTIAL MEMORY LEAK: Heap has grown &gt;15% across 3 consecutive snapshots.
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="mon-btn" onClick={captureSnapshot}>📸 Capture Now</button>
            <button className="mon-btn" onClick={() => setSnapshotPaused(p => !p)}>
              {snapshotPaused ? '▶ Resume Auto' : '⏸ Pause Auto'}
            </button>
            <button className="mon-btn" onClick={() => { setSnapshots([]); setLeakWarning(false); }}>🗑 Clear</button>
          </div>
        </div>

        {snapshots.length === 0 ? (
          <div style={styles.emptyState}>
            First snapshot will be captured automatically in 5 minutes, or click "Capture Now" to start.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Time', 'Heap Used', 'Heap Total', 'RSS', 'Δ Heap', 'Sockets', 'Rooms', 'Timers', 'Participants', 'Status'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s, i) => {
                  const prev = i > 0 ? snapshots[i - 1] : null;
                  const delta = prev ? (s.heapMB - prev.heapMB).toFixed(1) : '—';
                  const deltaNum = prev ? s.heapMB - prev.heapMB : 0;
                  const isLeak = deltaNum > prev?.heapMB * 0.15;
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#0A1128' : '#0D1530' }}>
                      <td style={styles.td}>{s.ts}</td>
                      <td style={{ ...styles.td, color: '#4FC3F7' }}>{s.heapMB} MB</td>
                      <td style={{ ...styles.td, color: '#CE93D8' }}>{s.totalMB} MB</td>
                      <td style={{ ...styles.td, color: '#80DEEA' }}>{s.rssMB} MB</td>
                      <td style={{ ...styles.td, color: deltaNum > 0 ? '#FF9800' : '#8BCF00', fontWeight: 700 }}>
                        {delta !== '—' ? `${deltaNum > 0 ? '+' : ''}${delta} MB` : '—'}
                      </td>
                      <td style={styles.td}>{s.sockets}</td>
                      <td style={styles.td}>{s.rooms}</td>
                      <td style={styles.td}>{s.timerCount}</td>
                      <td style={styles.td}>{s.participants}</td>
                      <td style={{ ...styles.td, color: isLeak ? '#FF4444' : '#8BCF00', fontWeight: 700 }}>
                        {isLeak ? '⚠️ LEAK?' : '✅ OK'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Validation Checklist ── */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>✅ Pre-Phase 2 Production Sign-Off (Validations 1–16)</h2>
        <p style={{ color: '#8899BB', fontSize: '0.8rem', margin: '0 0 16px' }}>
          All rows must be ✅ before Phase 2 begins. Use this dashboard to verify each one.
        </p>
        <div style={styles.checklistGrid}>
          {CHECKLIST.map((item, i) => (
            <ChecklistItem key={i} {...item} />
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({ icon, label, value, color }) {
  return (
    <div className="kpi-card" style={{ borderTopColor: color }}>
      <div style={{ fontSize: '1.6rem' }}>{icon}</div>
      <div style={{ color, fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
      <div style={{ color: '#8899BB', fontSize: '0.72rem', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

function Counter({ icon, label, value, color }) {
  return (
    <div style={styles.counterItem}>
      <span style={{ fontSize: '1.3rem' }}>{icon}</span>
      <div>
        <div style={{ color, fontSize: '1.3rem', fontWeight: 700 }}>{value}</div>
        <div style={{ color: '#8899BB', fontSize: '0.7rem' }}>{label}</div>
      </div>
    </div>
  );
}

function MemoryBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100).toFixed(0) : 0;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: '#CCD6F6', fontSize: '0.82rem' }}>{label}</span>
        <span style={{ color, fontSize: '0.82rem', fontWeight: 700 }}>{value} MB ({pct}%)</span>
      </div>
      <div style={{ background: '#0A1128', borderRadius: 6, height: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.6s ease', opacity: 0.85 }} />
      </div>
    </div>
  );
}

function Sparkline({ data, label, color }) {
  const max = Math.max(...data, 1);
  const barW = Math.max(4, Math.floor(220 / Math.max(data.length, 1)));
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: '#8899BB', fontSize: '0.72rem', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 38 }}>
        {data.map((v, i) => (
          <div key={i} title={`${v}`} style={{
            width: barW,
            height: `${Math.max(3, (v / max) * 38)}px`,
            background: color,
            borderRadius: 2,
            opacity: 0.7 + (i / data.length) * 0.3,
            transition: 'height 0.3s ease',
          }} />
        ))}
      </div>
    </div>
  );
}

function ChecklistItem({ label, hint, severity, id }) {
  const colorMap = { critical: '#FF4444', warn: '#FF9800', info: '#4FC3F7' };
  return (
    <div style={styles.checklistItem}>
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: colorMap[severity] || '#8899BB', flexShrink: 0, marginTop: 4 }} />
      <div>
        <div style={{ color: '#CCD6F6', fontSize: '0.82rem', fontWeight: 600 }}>
          {id && <span style={{ color: '#8899BB', marginRight: 4 }}>[V{id}]</span>}
          {label}
        </div>
        {hint && <div style={{ color: '#556080', fontSize: '0.7rem', marginTop: 2 }}>{hint}</div>}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUptime(seconds) {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Validation Checklist (Validations 1–16) ──────────────────────────────────

const CHECKLIST = [
  { id: 1,  severity: 'critical', label: 'Multi-network test',          hint: 'Trainer + 3 devices on 4 different networks. Identical timers.' },
  { id: 2,  severity: 'critical', label: '20–50 participant stress test', hint: 'Join < 2s, propagation < 300ms, leaderboard < 500ms.' },
  { id: 3,  severity: 'critical', label: 'Network failure recovery (all 5 sub-scenarios)', hint: 'Host/participant disconnect, page refresh, browser close/reopen.' },
  { id: 4,  severity: 'warn',     label: 'Database integrity',           hint: 'SQL: scores = sum(points_awarded). All responses saved.' },
  { id: 5,  severity: 'warn',     label: 'Security rejection tests',     hint: 'Late, dupe, flood, oversized, invalid-room counters increment.' },
  { id: 6,  severity: 'warn',     label: 'Cross-browser compatibility',  hint: 'Chrome, Edge, Firefox, Safari iOS, Chrome Android. WS connects on all.' },
  { id: 7,  severity: 'warn',     label: 'Low bandwidth & high latency', hint: 'Slow 3G, 200–500ms latency, 2–5% packet loss. Questions arrive, reconnect succeeds.' },
  { id: 8,  severity: 'critical', label: 'Concurrent sessions (3+ rooms)', hint: 'No cross-room events. Leaderboards isolated. Timers independent.' },
  { id: 9,  severity: 'critical', label: 'Long duration session (2h, 100+ questions)', hint: 'Memory stable. CPU acceptable. Sockets don\'t leak.' },
  { id: 10, severity: 'warn',     label: 'Mobile behavior (lock/unlock, app switch, call)', hint: 'Auto-reconnect. Same question. Correct time. No duplicate answer.' },
  { id: 11, severity: 'critical', label: 'Trainer error handling',       hint: 'Accidental close, crash, tab crash, 30s disconnect. Session preserved.' },
  { id: 12, severity: 'warn',     label: 'API failure simulation',       hint: 'DB unavailable, report/cert fails. Graceful error. Quiz continues. Errors logged.' },
  { id: 13, severity: 'info',     label: 'File upload robustness',       hint: 'Large video/PDF, slow/interrupted upload. Progress shown. No crash.' },
  { id: 14, severity: 'critical', label: 'Memory leak monitoring (30–60 min)', hint: 'Use snapshot table above. Heap must stabilize. No ⚠️ LEAK? rows.' },
  { id: 15, severity: 'warn',     label: 'Analytics consistency',        hint: 'Dashboard KPI = DB = Excel = PPT = PDF. All outputs match source.' },
  { id: 16, severity: 'critical', label: 'Security audit (spoofing, JWT, replay, flood)', hint: 'All 6 attack vectors rejected. flood/oversized counters increment.' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page:    { minHeight: '100vh', background: '#060D1F', padding: '28px 24px', fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#CCD6F6' },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 14 },
  title:   { margin: 0, fontSize: '1.65rem', fontWeight: 800, background: 'linear-gradient(90deg, #FF9800, #FF5722)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { margin: '5px 0 0', fontSize: '0.82rem', color: '#8899BB' },
  headerActions: { display: 'flex', alignItems: 'center', gap: 8 },
  errorBanner: { background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.35)', borderRadius: 10, padding: '10px 16px', color: '#FF8A80', fontSize: '0.83rem', marginBottom: 22 },
  kpiRow:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14, marginBottom: 20 },
  rowDouble:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 },
  card:        { background: '#0F1A36', border: '1.5px solid rgba(255,152,0,0.14)', borderRadius: 18, padding: 22, boxShadow: '0 8px 28px rgba(0,0,0,0.32)', marginBottom: 18 },
  cardTitle:   { margin: '0 0 16px', fontSize: '0.97rem', fontWeight: 700, color: '#E0EAFF' },
  emptyState:  { color: '#556080', fontSize: '0.83rem', textAlign: 'center', padding: '22px 0' },
  roomList:    { display: 'flex', flexDirection: 'column', gap: 9 },
  roomRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 13px', background: '#0A1128', borderRadius: 9, border: '1px solid rgba(255,152,0,0.1)' },
  roomCode:    { fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 800, color: '#FF9800', letterSpacing: '0.12em' },
  roomMeta:    { display: 'flex', gap: 7 },
  counterGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 },
  counterItem: { display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', background: '#0A1128', borderRadius: 9, border: '1px solid rgba(255,152,0,0.07)' },
  xLabels:     { display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: '#556080', marginTop: 3 },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' },
  th:          { padding: '8px 12px', textAlign: 'left', color: '#8899BB', fontWeight: 600, borderBottom: '1px solid rgba(255,152,0,0.15)', whiteSpace: 'nowrap' },
  td:          { padding: '7px 12px', color: '#CCD6F6', whiteSpace: 'nowrap' },
  checklistGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 },
  checklistItem: { display: 'flex', gap: 9, padding: '9px 11px', background: '#0A1128', borderRadius: 7, border: '1px solid rgba(255,255,255,0.04)', alignItems: 'flex-start' },
  noAccess:    { minHeight: '100vh', background: '#060D1F', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  noAccessCard: { textAlign: 'center', padding: 40, background: '#0F1A36', borderRadius: 20, border: '1px solid rgba(255,152,0,0.2)' },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  .kpi-card { background:#0F1A36; border:1.5px solid rgba(255,152,0,0.14); border-top:3px solid; border-radius:15px; padding:18px 14px 14px; display:flex; flex-direction:column; gap:5px; box-shadow:0 4px 18px rgba(0,0,0,0.3); transition:transform .2s,box-shadow .2s; }
  .kpi-card:hover { transform:translateY(-2px); box-shadow:0 8px 26px rgba(0,0,0,0.4); }
  .mon-pill { display:inline-flex; align-items:center; padding:3px 10px; border-radius:99px; font-size:0.73rem; font-weight:600; }
  .mon-btn { background:#1A2A4A; border:1px solid rgba(255,152,0,0.22); border-radius:8px; color:#CCD6F6; padding:6px 13px; font-size:0.8rem; cursor:pointer; transition:all .2s; }
  .mon-btn:hover { background:rgba(255,152,0,0.13); border-color:#FF9800; color:#FF9800; }
  @media(max-width:900px) { .kpi-card{padding:12px 10px;} }
`;
