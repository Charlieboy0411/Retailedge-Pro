require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const os = require('os');

const app = express();
const server = http.createServer(app);
// ─── Allowed origins ─────────────────────────────────────────────────────────
// In production set FRONTEND_URL to your exact domain (e.g. https://retailedge.com)
// In development all localhost variants are permitted.
const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5000', 'http://localhost:5173']
  : true; // true = allow all origins (development only)

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Prefer WebSocket; fall back to polling only if upgrade fails
  transports: ['websocket', 'polling'],
  // Heartbeat — matches frontend socketService.js options
  pingInterval: 25000,   // Server sends ping every 25s
  pingTimeout:  60000,   // Client has 60s to respond before disconnect
  upgradeTimeout: 10000, // Allow 10s for WS upgrade before falling back
});
app.set('io', io);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ─── Serve built React frontend ───────────────────────────────────────────────
const DIST_PATH = path.join(__dirname, '..', 'frontend', 'dist');
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});
app.use(express.static(DIST_PATH));


const authRoutes        = require('./routes/auth');
const quizRoutes        = require('./routes/quiz');
const userRoutes        = require('./routes/users');
const projectRoutes     = require('./routes/projects');
const reportRoutes      = require('./routes/reports');
const trainingRoutes    = require('./routes/trainings');
const certificateRoutes = require('./routes/certificates');
const escalationRoutes  = require('./routes/escalations');
const superadminRoutes  = require('./routes/superadmin');
const roleRoutes        = require('./routes/roles');
const clientRoutes      = require('./routes/clients');

app.use('/api/auth',         authRoutes);
app.use('/api/quizzes',      quizRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/projects',     projectRoutes);
app.use('/api/reports',      reportRoutes);
app.use('/api/trainings',    trainingRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/escalations',  escalationRoutes);
app.use('/api/superadmin',   superadminRoutes);
app.use('/api/roles',        roleRoutes);
app.use('/api/clients',      clientRoutes);

app.get('/health', async (req, res) => {
  try {
    const sequelize = require('./config/database');
    await sequelize.authenticate();
    res.json({ status: 'ok', message: 'QuizHive API is running', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed', error: error.message });
  }
});

// ─── LAN IP helper ───────────────────────────────────────────────────────────
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (const alias of iface) {
      if ((alias.family === 'IPv4' || alias.family === 4) && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

// ─── Tunnel URL store ─────────────────────────────────────────────────────────
let publicTunnelUrl = null;
let tunnelStatus    = 'connecting'; // 'connecting' | 'active' | 'failed'

// ─── Expose join URL for QR code generation ──────────────────────────────────
app.get('/api/join-url', (req, res) => {
  if (publicTunnelUrl) {
    res.json({ url: publicTunnelUrl, mode: 'public', tunnelStatus: 'active' });
  } else {
    const hostHeader = req.headers.host || '';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const isPublicHost = hostHeader && !hostHeader.includes('localhost') && !hostHeader.includes('127.0.0.1');

    if (isPublicHost) {
      res.json({ url: `${protocol}://${hostHeader}`, mode: 'public', tunnelStatus: 'direct' });
    } else {
      const ip   = getLanIp();
      const port = process.env.PORT || 5000;
      res.json({ url: `http://${ip}:${port}`, mode: 'lan', tunnelStatus });
    }
  }
});

// ─── Allow trainer to manually set a custom public URL ───────────────────────
// E.g., if using ngrok separately: POST /api/set-tunnel-url { url: "https://xyz.ngrok.io" }
app.post('/api/set-tunnel-url', (req, res) => {
  const { url } = req.body;
  if (url && url.startsWith('http')) {
    publicTunnelUrl = url.trim().replace(/\/$/, '');
    tunnelStatus    = 'active';
    console.log(`[Tunnel] Manually set public URL: ${publicTunnelUrl}`);
    res.json({ ok: true, url: publicTunnelUrl });
  } else {
    res.status(400).json({ error: 'Invalid URL' });
  }
});

// ─── Real-time Monitoring Endpoint ───────────────────────────────────────────
// Returns a live system snapshot: active rooms, sockets, memory, counters.
// Protected by ADMIN_MONITOR_TOKEN env var (set any secret string in .env).
// In dev, if ADMIN_MONITOR_TOKEN is unset, access is unrestricted.
app.get('/api/admin/stats', (req, res) => {
  const expectedToken = process.env.ADMIN_MONITOR_TOKEN;
  if (expectedToken) {
    const provided = req.headers['x-monitor-token'] || req.query.token;
    if (provided !== expectedToken) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const quizEngine = require('./sockets/quizEngine');
  const stats      = quizEngine.getStats();
  res.json({ ok: true, ts: new Date().toISOString(), ...stats });
});

// Legacy host-ip endpoint
app.get('/api/host-ip', (req, res) => {
  res.json({ ip: getLanIp() });
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(DIST_PATH, 'index.html'), {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
});


// ─── Socket engine ────────────────────────────────────────────────────────────
const quizEngine = require('./sockets/quizEngine');
quizEngine(io);

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', async () => {
  const lanIp = getLanIp();
  console.log(`\n✅ QuizHive Server running on port ${PORT}`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${lanIp}:${PORT}`);

  // ── Auto-start public tunnel (pointing to backend port 5000 which serves optimized production build) ──
  startTunnel(PORT);
});

// ─── SIGINT cleanup — registered once at startup (not inside startTunnel) ──────
// Previously this was inside startTunnel(), causing duplicate listeners on restarts.
let tunnelProcess = null;
process.once('SIGINT', () => {
  if (tunnelProcess) tunnelProcess.close();
  process.exit(0);
});

async function startTunnel(port) {
  if (process.env.DISABLE_TUNNEL === 'true' || process.env.NODE_ENV === 'production') {
    console.log('\n🌐 Localtunnel disabled. Set FRONTEND_URL env var for the public join URL.');
    tunnelStatus = 'disabled';
    return;
  }

  console.log('\n🌐 Starting public tunnel (so participants can join via mobile data)...');
  const localtunnel = require('localtunnel');

  try {
    const isLocal = process.platform === 'win32' || !process.env.RAILWAY_STATIC_URL;
    const requestedSubdomain = isLocal
      ? `retailedge-pro-${Math.random().toString(36).slice(2, 7)}`
      : 'retailedge-pro';

    const tunnel = await localtunnel({ port, subdomain: requestedSubdomain });
    tunnelProcess = tunnel;

    publicTunnelUrl = tunnel.url;
    tunnelStatus    = 'active';
    console.log(`\n✅ PUBLIC TUNNEL ACTIVE: ${publicTunnelUrl}`);
    console.log(`   Participants can join from any network (mobile data, other Wi-Fi, etc.)\n`);

    tunnel.on('close', () => {
      console.log('[Localtunnel] Tunnel closed. Reconnecting in 10s...');
      publicTunnelUrl = null;
      tunnelStatus    = 'connecting';
      tunnelProcess   = null;
      setTimeout(() => startTunnel(port), 10000);
    });

    tunnel.on('error', (err) => {
      console.error('[Localtunnel] Tunnel error:', err.message);
    });

  } catch (err) {
    tunnelStatus = 'failed';
    console.warn(`\n⚠️  Localtunnel failed: ${err.message}`);
    console.warn('   Retrying in 15s, or set a URL via: POST /api/set-tunnel-url { url: "..." }\n');
    setTimeout(() => startTunnel(port), 15000);
  }
}
