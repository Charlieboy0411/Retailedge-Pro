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
    const ip   = getLanIp();
    const port = process.env.PORT || 5000;
    res.json({ url: `http://${ip}:${port}`, mode: 'lan', tunnelStatus });
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

const { spawn } = require('child_process');
let tunnelProcess = null;

async function startTunnel(port) {
  console.log('\n🌐 Starting public Cloudflare tunnel (so participants can join via mobile data)...');

  try {
    // Spawn cloudflared tunnel pointing to the local port
    const child = spawn('npx', ['--yes', 'cloudflared', 'tunnel', '--url', `http://localhost:${port}`], {
      shell: true
    });
    tunnelProcess = child;

    let urlFound = false;

    child.stderr.on('data', (data) => {
      const output = data.toString();
      // Look for trycloudflare.com URL in stderr output
      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !urlFound) {
        urlFound = true;
        publicTunnelUrl = match[0];
        tunnelStatus = 'active';
        console.log(`\n✅ PUBLIC TUNNEL ACTIVE (via Cloudflare)`);
        console.log(`   Join URL: ${publicTunnelUrl}`);
        console.log(`   Participants can join from any network (mobile data, other Wi-Fi, etc.)\n`);
      }
    });

    child.on('close', (code) => {
      console.log(`[Cloudflared] Process exited with code ${code}. Reconnecting in 10s...`);
      publicTunnelUrl = null;
      tunnelStatus = 'connecting';
      tunnelProcess = null;
      setTimeout(() => startTunnel(port), 10000);
    });

    child.on('error', (err) => {
      console.error('[Cloudflared] Process error:', err);
    });

    process.on('SIGINT', () => {
      if (tunnelProcess) {
        tunnelProcess.kill();
      }
      process.exit(0);
    });

  } catch (err) {
    tunnelStatus = 'failed';
    console.warn(`\n⚠️  Cloudflare Tunnel failed to start: ${err.message}`);
    console.warn('   Retrying in 15 seconds...');
    console.warn('   OR manually set a tunnel URL via: POST /api/set-tunnel-url { url: "..." }\n');
    setTimeout(() => startTunnel(port), 15000);
  }
}
