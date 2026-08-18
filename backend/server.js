require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ─── Serve built React frontend ───────────────────────────────────────────────
const DIST_PATH = path.join(__dirname, '..', 'frontend', 'dist');
app.use((req, res, next) => {
  res.setHeader('bypass-tunnel-reminder', 'true');
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
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
  const forwardedProto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  
  let detectedPublicUrl = null;
  if (forwardedHost && !forwardedHost.startsWith('127.0.0.1') && !forwardedHost.startsWith('localhost') && !forwardedHost.startsWith('172.31.')) {
    detectedPublicUrl = `${forwardedProto}://${forwardedHost}`;
  }

  const ip = getLanIp();
  const port = process.env.PORT || 5000;
  const lanUrl = `http://${ip}:${port}`;

  const finalUrl = publicTunnelUrl || detectedPublicUrl || lanUrl;

  res.json({
    url: finalUrl,
    lanUrl: lanUrl,
    publicUrl: publicTunnelUrl || detectedPublicUrl,
    mode: (publicTunnelUrl || detectedPublicUrl) ? 'public' : 'lan',
    tunnelStatus: tunnelStatus,
    lanIp: ip,
    port: port
  });
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

  // ── Auto-start public tunnel only if in dev and not disabled ──
  if (process.env.ENABLE_TUNNEL === 'true' || (process.env.NODE_ENV !== 'production' && process.env.DISABLE_TUNNEL !== 'true')) {
    startTunnel(PORT).catch(err => console.warn('[Tunnel] Could not initialize tunnel:', err.message));
  } else {
    console.log('ℹ️ Public tunnel skipped (running in production / standard network mode).');
  }
});

let tunnelProcess = null;

async function startTunnel(port) {
  try {
    const localtunnel = require('localtunnel');
    console.log('\n🌐 Initializing optional development tunnel...');

    const sub = `retailedge-${Math.random().toString(36).substring(2, 7)}`;
    const tunnel = await localtunnel({ port: port, subdomain: sub });
    tunnelProcess = tunnel;

    publicTunnelUrl = tunnel.url;
    tunnelStatus = 'active';
    console.log(`\n✅ PUBLIC TUNNEL ACTIVE (via localtunnel)`);
    console.log(`   Join URL: ${publicTunnelUrl}\n`);

    tunnel.on('close', () => {
      console.log(`[Localtunnel] Tunnel closed.`);
      publicTunnelUrl = null;
      tunnelStatus = 'connecting';
      tunnelProcess = null;
    });

    tunnel.on('error', (err) => {
      console.warn('[Localtunnel] Tunnel error (non-fatal):', err.message);
      try { tunnel.close(); } catch(e) {}
      publicTunnelUrl = null;
      tunnelProcess = null;
    });

  } catch (err) {
    tunnelStatus = 'failed';
    console.warn(`\n⚠️ Localtunnel failed to start (server will continue normally on local/LAN): ${err.message}`);
  }
}

// Prevent any unhandled network drops from killing the server
process.on('uncaughtException', (err) => {
  console.error('[Process] Caught exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Process] Handled promise rejection:', reason?.message || reason);
});

