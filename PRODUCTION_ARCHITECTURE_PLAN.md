# RetailEdge Pro - Production-Ready Architecture Plan
## Senior Cloud Architect Analysis & Migration Strategy

**Prepared By**: Senior Cloud Architect, DevOps Engineer, SRE, Performance Engineer  
**Date**: 2026-06-23  
**Document Type**: Production Architecture Specification  
**Scope**: Application → Infrastructure → Database → Deployment → Cost Optimization

---

## EXECUTIVE SUMMARY

RetailEdge Pro is a **media-intensive, real-time quiz LMS** with 3 critical workloads:
1. **Live Quiz Sessions** (WebSocket, real-time)
2. **Media Generation** (Puppeteer PDFs, FFmpeg videos) - CPU/Memory intensive
3. **API & Database** (RESTful, CRUD operations)

**Current Architecture**: Single-server monolith (development-oriented)  
**Production Target**: Horizontally scalable, zero-downtime, cost-optimized  
**Growth Target**: Support 5x growth (100 → 500+ users) without major rewrites  

**Key Insight**: Media generation workloads MUST be separated from the main API tier to prevent application crashes during peak usage.

---

## PART A: APPLICATION ANALYSIS

### A.1 Application Workflow

```
USER JOURNEY: QuizHive Session Participation

[Participant Device]
      ↓
[Scan QR/Enter Code]
      ↓
[HTTP GET] /api/quizzes/:id/offline-details
      ↓
[Express Backend] Lookup quiz, return questions
      ↓
[React Frontend] Display "Ready to join?"
      ↓
[Participant] Types name + employee ID
      ↓
[HTTP POST] /api/quizzes/:id/offline-check-eligibility
      ↓
[Express Backend] Validate eligibility (DB lookup)
      ↓
[WebSocket] Connect to Socket.io
      ↓
[socket.emit] 'participant_joined'
      ↓
[Express Backend] Store in-memory tracking, add to room
      ↓
[Trainer Frontend] Shows "Participant X joined"
      ↓
[Trainer] Clicks "Next Question"
      ↓
[socket.emit] 'host_next_question'
      ↓
[Express Backend] Broadcast to room via Socket.io
      ↓
[All Participants] Receive question + timer via WebSocket
      ↓
[Participant] Selects answer
      ↓
[socket.emit] 'participant_response' {answer, timeSpent}
      ↓
[Express Backend] Validate, store in DB, calculate score
      ↓
[DB Write] INSERT into responses table
      ↓
[Express Backend] Broadcast updated leaderboard
      ↓
[Quiz Ends]
      ↓
[Express Backend] Aggregate all responses, calculate final scores
      ↓
[Background Task] Generate certificate (if training complete)
      ↓
[Puppeteer] Render PDF certificate
      ↓
[Nodemailer] Send email with attachment
      ↓
[AWS/SendGrid] Deliver email
```

### A.2 Frontend Technology Stack

```yaml
Framework: React 19.2.6
Build Tool: Vite 8.0.12
State Management: React Context + useState
Routing: React Router DOM 7.15.1

Real-Time: Socket.io Client 4.8.3
HTTP Client: Axios 1.16.1

Content Generation:
  - jsPDF 4.2.1 (PDF generation)
  - pptxgenjs 4.0.1 (PowerPoint)
  - html2canvas 1.4.1 (Screenshots)
  - exceljs 4.4.0 (Excel export)
  - xlsx + xlsx-js-style (Excel parsing)
  - qrcode 1.5.4 (QR codes)

UI/Visualization:
  - Framer Motion 12.40.0 (animations)
  - Lucide React 1.16.0 (icons)
  - Recharts 3.8.1 (charts/graphs)

Dev Server:
  - Port: 5173 (dev), 5000 (prod)
  - Proxying to backend via Vite config
  - Hot reload enabled
  - WebSocket proxy for Socket.io
```

### A.3 Backend Technology Stack

```yaml
Runtime: Node.js (v18+ required, v20+ recommended)
Framework: Express 5.2.1
Process Manager: None (node server.js) - RISK!

Real-Time: Socket.io 4.8.3
  - In-memory room tracking (NO Redis)
  - No distributed session store
  - Single-server only

Database: SQLite (file-based) → MUST MIGRATE TO PostgreSQL
ORM: Sequelize 6.37.8
  - No connection pooling configured
  - Lazy loading (N+1 risk)
  - No query optimization

Authentication: JWT (jsonwebtoken 9.0.3)
  - Hardcoded secret in config/constants.js
  - 24-hour expiry
  - No refresh tokens

Password Hashing: bcrypt 6.0.0
  - Saltworks: 10 rounds

File Uploads: multer 2.2.0
  - Local filesystem only
  - No S3 integration
  - 5MB limit per file

Media Generation:
  - Puppeteer 25.1.0 (headless browser, PDF/screenshots)
  - FFmpeg 2.1.3 (video encoding)
  - @ffmpeg-installer/ffmpeg (bundled)

Email: Nodemailer 8.0.11
  - SMTP or Ethereal mock
  - No queue system (blocking!)
  - Transporter cached globally

Networking: CORS 2.8.6
  - Allows all origins (*)
  - SECURITY RISK!

Monitoring: None (console.log only)
Error Handling: Basic try/catch, no structured logging
Rate Limiting: NONE
Request Validation: NONE
```

### A.4 Database Technology

**Current: SQLite**
```
File: /backend/quizhive.sqlite
Type: File-based relational database
Connections: 1 (single-process)
Concurrency: File-level locking
Performance: OK for <100 concurrent users
Scaling: CANNOT SCALE
```

**Tables** (15+ models):
- User, Role, Project, Client
- Quiz, Question, Session, Participant, Response
- Training, TrainingProgress, Certificate
- Escalation, AuditLog, UserQuery, ExecutiveMetric
- OfflineSyncDevice

**Limitations**:
- ❌ Cannot handle concurrent writes (file locks)
- ❌ No built-in replication
- ❌ Limited to single machine
- ❌ Poor performance on 1GB+ databases
- ❌ No user/permission system
- ❌ No connection pooling

### A.5 WebSocket Usage (Socket.io)

```
Connection Type: Persistent TCP (WebSocket with fallback)
Transport: Socket.io 4.8.3 on Express server

Patterns Used:
  1. Room-based broadcasting (quiz sessions)
  2. Direct socket events (participant responses)
  3. In-memory tracking (no Redis)

Events Implemented:
  [HOST → Trainer]
  - host_start_quiz(quizId, hostId) → Returns roomCode, sessionId
  - host_next_question(roomCode, question, questionIndex)
  - host_skip_question(roomCode)
  - host_show_leaderboard(roomCode)
  - host_end_session(roomCode)
  - host_request_rejoin(roomCode, participantId)
  - host_set_question_timer(roomCode, timeLimit)
  - host_participant_metrics(roomCode) → broadcast waiting/active/disconnected count
  
  [PARTICIPANT ← Learner]
  - participant_joined(roomCode, participantData)
  - participant_response(participantId, questionId, answer, timeSpent)
  - participant_score_updated(participantId, score)
  - participant_disconnected(participantId)
  - participant_rejoin_request(participantId, deviceId)

Broadcasting:
  - io.to(roomCode).emit(...) → All in room
  - socket.emit(...) → Single socket
  - io.emit(...) → All connected sockets

Scalability Issues:
  ❌ In-memory room tracking: roomSockets[roomCode] = {socketId: participantId}
     - Unbounded growth on long-running sessions
     - Not shared across server instances
     - No cleanup after session ends
  ❌ Single server only (no Redis adapter)
  ❌ No heartbeat/ping-pong configured
  ❌ No automatic reconnection retry logic
  ❌ No load balancing support
```

### A.6 File Upload/Download Features

**Upload Endpoints:**
```
POST /api/projects
  - Upload project_logo (image, max 5MB)
  - Multer storage: /uploads/project_logos/
  - Filename: plogo-{timestamp}-{random}.{ext}

POST /api/clients
  - Upload client logo (image, max 5MB)
  - Multer storage: /uploads/client_logos/
  - Filename: clogo-{timestamp}-{random}.{ext}

POST /api/users/bulk-upload
  - Upload CSV of users
  - Parse and create bulk users
```

**Download Endpoints:**
```
GET /api/certificates/:id/download
  - Stream certificate PDF (generated on-the-fly)
  - Content-Type: application/pdf

GET /api/reports/:sessionId?format=pdf
  - Generate PDF report
  - Puppeteer rendering (5-30 sec)
  - Stream to client

GET /api/reports/:sessionId?format=xlsx
  - Generate Excel export
  - ExcelJS library (1-5 sec)
  - Stream to client
```

**Storage**:
- Local filesystem only (no S3)
- Uploads retained indefinitely (no cleanup)
- No versioning/backup
- Single server → cannot scale

### A.7 PDF Generation Workload

**Triggers:**
1. **Certificate Generation** (on training completion)
2. **Report Download** (admin request)
3. **Executive Presentations** (on-demand)

**Implementation**:
```javascript
// backend/utils/pdfGenerator.js
const puppeteer = require('puppeteer');

// PROBLEM: New browser instance per request!
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
await page.setContent(htmlContent);
const pdf = await page.pdf({format: 'A4'});
await browser.close();
```

**Resource Usage Per Request:**
```
Memory: 150-400 MB (browser instance)
CPU: 40-80% (rendering)
Disk I/O: 50-100 MB/s (during capture)
Time: 5-30 seconds (depending on content)
Network: None (local)
```

**Scalability Limits:**
- **Concurrent PDFs Possible**: 5-10 (before OOM on 16 GB server)
- **Queue Time**: 30+ seconds per request if >10 queued
- **Memory Spike**: Each request adds 200-400 MB peak usage
- **No Pooling**: Browser instances created/destroyed per request (overhead)
- **No Recovery**: Failed process = orphaned Chrome process + memory leak

### A.8 Video Generation Workload

**Implementation**:
```javascript
// backend/produce_video_smart.js
// Captures 120 keyframes (8 per scene × 15 scenes)
// Renders each frame via Puppeteer
// Encodes via FFmpeg to MP4

// Puppeteer: Render scenes at 1920×1080
// FFmpeg: Encode 120 frames @ 1.5fps = 80 sec duration
// Output: ~500 MB MP4 file
```

**Resource Usage:**
```
Puppeteer Memory: 150-300 MB (one-time)
Frame Rendering: 2 minutes (serial, one frame at a time)
FFmpeg CPU: 95-100% (multi-threaded)
FFmpeg Memory: 100-200 MB
Disk Space: 500 MB output (temporary during encoding)
Total Time: 5-10 minutes for smart video, 20-30 min for full video
```

**Scalability Limits:**
- **Concurrent Videos**: 1-2 maximum (CPU-bound, FFmpeg uses all cores)
- **Queue Time**: 10+ minutes for each queued video
- **CPU Exhaustion**: If 2 videos running, API becomes unresponsive
- **Memory Pressure**: Combined with Puppeteer, can spike to 500 MB+
- **Blocking**: Main API process blocked until video completes

**Recommendation**: **MUST RUN ON SEPARATE WORKER TIER**

### A.9 Scheduled Jobs & Background Tasks

**Current Implementation**: NONE (blocking in request handlers)

```javascript
// PROBLEMS in current code:
// 1. Email invites sent in loop (blocking)
//    POST /api/trainings/:id/schedule-meeting
//    for (const user of users) {
//      await nodemailer.sendMail(...) // Blocks!
//    }

// 2. Certificate generation on training completion (blocking)
//    POST /api/trainings/:id/progress
//    if (allComplete) {
//      const pdf = await puppeteer.generatePdf(...) // Blocks!
//      await nodemailer.sendMail(...) // Blocks!
//    }

// 3. Report aggregation on GET (could take 10+ seconds)
//    GET /api/reports
//    SELECT ... JOIN ... GROUP BY ... // N+1 queries
//    Puppeteer rendering if format=pdf // Blocks!

// 4. Leaderboard calculation (real-time, queried on every broadcast)
//    socket.on('host_show_leaderboard', async () => {
//      participants = await Participant.findAll(...)
//      sort(participants)
//      broadcast to room
//    })
```

**Required Background Jobs** (need to implement):
1. **Video Generation** → SQS queue → Worker tier
2. **PDF Generation** → SQS queue → Worker tier
3. **Email Sending** → SQS queue → Worker tier
4. **Report Aggregation** → Background job → Cache result
5. **Session Cleanup** → Scheduled cron → Delete old sessions
6. **Certificate Auto-Issue** → Scheduled cron → Check completion
7. **Audit Log Rotation** → Scheduled cron → Archive old logs

---

## PART B: INFRASTRUCTURE ASSESSMENT

### B.1 Resource Requirements by User Scale

#### **100 Users (50 concurrent)**
```
Registered Users: 100
Concurrent Users: 15-20 (peak: 50)
Concurrent Quiz Sessions: 2-5
Concurrent PDF/Video: 0-1

CPU Requirements:
  Minimum: 2 cores @ 2.0 GHz
  Recommended: 4 cores @ 2.5 GHz
  Breakdown:
    - Express API: 5-10% (baseline)
    - WebSocket (50 connections): 5-10%
    - Database: 10-15%
    - System: 10-15%
    - Available: 60-70%

RAM Requirements:
  Minimum: 8 GB
  Recommended: 16 GB
  Breakdown:
    - Node.js process: 200-300 MB (baseline)
    - Socket.io tracking (50 participants): 50 MB
    - Database (SQLite in-memory): 20-50 MB
    - Express/middleware: 100 MB
    - System/OS: 2 GB
    - Available for burst: 13 GB

Storage Requirements:
  Database: 50 MB (500 quizzes, 50k responses)
  Uploads: 100 MB (logos)
  Logs: 1 GB
  Total: ~2 GB

Network Bandwidth:
  API requests: 10-20 Mbps average
  WebSocket events: 5-10 Mbps average
  Total: ~30 Mbps peak

Single Server Capacity: 4-core, 16 GB RAM ✅ SUFFICIENT
Cost: $50-100/month (VPS) or $0.05-0.10/hour (EC2)
```

#### **500 Users (150 concurrent)**
```
Registered Users: 500
Concurrent Users: 75-100 (peak: 150)
Concurrent Quiz Sessions: 5-10
Concurrent PDF/Video: 1-2

CPU Requirements:
  Minimum: 4 cores @ 2.5 GHz
  Recommended: 8 cores @ 3.0 GHz
  Breakdown:
    - Express API: 15-20%
    - WebSocket (150 connections): 15-20%
    - Database: 20-30% (larger dataset, more joins)
    - System: 10-15%
    - Available: 20-40% (TIGHT)

RAM Requirements:
  Minimum: 16 GB
  Recommended: 32 GB
  Breakdown:
    - Node.js process: 400-600 MB
    - Socket.io tracking (150 participants): 150-200 MB
    - Database (more data): 100-150 MB
    - Query caching: 200-300 MB
    - System/OS: 3 GB
    - Available: 13 GB

Storage Requirements:
  Database: 250 MB (2500 quizzes, 250k responses)
  Uploads: 500 MB
  Videos/PDFs: 5-10 GB (if caching)
  Logs: 5 GB
  Total: ~20 GB

Single Server + 1 Worker: Not recommended
Recommended: 2x API + 1x Worker tier
Cost: $200-300/month
```

#### **1000 Users (300 concurrent)**
```
Registered Users: 1,000
Concurrent Users: 150-200 (peak: 300)
Concurrent Quiz Sessions: 10-20
Concurrent PDF/Video: 2-4

CPU Requirements:
  Minimum: 8 cores
  Recommended: 16 cores (distributed)
  Per API instance: 4-8 cores
  Per Worker instance: 8-16 cores

RAM Requirements:
  Minimum: 32 GB (distributed)
  Recommended: 48-64 GB
  Per API instance: 16-32 GB
  Per Worker instance: 16-32 GB

Storage Requirements:
  Database: 500 MB - 1 GB
  Uploads: 1 GB
  Media cache: 20-30 GB
  Logs: 10 GB
  Total: ~50 GB

Recommended Architecture:
  - 2-3x API servers (4-8 core each)
  - 2x Worker servers (8-16 core each)
  - 1x PostgreSQL RDS (db.r5.xlarge, 32 GB)
  - 1x Redis (cache.r5.large, 16 GB)
  - 1x ALB (load balancer)
  - 1x Auto Scaling Group (min: 2, max: 5)
  - 1x S3 bucket (media storage)
  
Cost: $1,500-2,500/month
```

#### **3000 Users (900 concurrent)**
```
Registered Users: 3,000
Concurrent Users: 450-600 (peak: 900)
Concurrent Quiz Sessions: 30-60
Concurrent PDF/Video: 5-10

CPU Requirements: 32-48 cores (distributed)
RAM Requirements: 64-96 GB (distributed)
Storage Requirements: 150 GB+ (database + media)

Recommended Architecture:
  - 4-5x API servers (8 core each)
  - 3-4x Worker servers (16 core each)
  - 1x PostgreSQL RDS (db.r5.2xlarge, 64 GB)
  - 1x Redis cluster (cache.r5.xlarge × 3)
  - 1x ALB + NLB
  - Multi-AZ deployment
  - S3 + CloudFront CDN

Cost: $5,000-7,000/month
```

#### **5000 Users (1500 concurrent)**
```
Registered Users: 5,000
Concurrent Users: 750-1000 (peak: 1500)
Concurrent Quiz Sessions: 50-100
Concurrent PDF/Video: 10-20

CPU Requirements: 64-96 cores (distributed)
RAM Requirements: 128-192 GB (distributed)
Storage Requirements: 300 GB+ (database + media)

Recommended Architecture:
  - 8-10x API servers (8-16 core each)
  - 6-8x Worker servers (16-32 core each)
  - 1x PostgreSQL RDS (db.r5.4xlarge, 128 GB) + read replicas
  - 1x Redis cluster (cache.r5.2xlarge × 5)
  - Multi-region setup
  - Advanced CDN (CloudFront + regional caches)
  - Separate rate limiting tier

Cost: $12,000-18,000/month
```

### B.2 Resource Scaling Summary Table

| Scale | Reg. Users | Concurrent | CPU (cores) | RAM (GB) | Storage | Servers | Cost/mo |
|-------|-----------|-----------|----------|---------|---------|---------|---------|
| 100 | 100 | 50 | 4 | 16 | 2 GB | 1 | $100 |
| 500 | 500 | 150 | 8 | 32 | 20 GB | 3 | $300 |
| 1000 | 1000 | 300 | 16 | 64 | 50 GB | 6 | $2000 |
| 3000 | 3000 | 900 | 48 | 96 | 150 GB | 12 | $7000 |
| 5000 | 5000 | 1500 | 96 | 192 | 300 GB | 20 | $18000 |

---

## PART C: DATABASE ANALYSIS

### C.1 SQLite Limitations

```
Limitation #1: CONCURRENCY
  Problem: File-level locking blocks all writes
  Impact: Under 100 concurrent users, OK
           At 500 users, visible contention
           At 1000+ users, database becomes bottleneck
  Example: 10 participants submit responses simultaneously
           → SQLite locks entire DB → 500ms+ latency
           → Users see "slow quiz" experience

Limitation #2: PERFORMANCE
  Problem: No query optimization, full table scans
  Index: NO indexes defined in current code
  Impact: Quiz report GET = 10-30 seconds with 50k sessions
  Growth: Exponential slowdown as data grows

Limitation #3: REPLICATION
  Problem: No built-in replication or backup
  Impact: Single point of failure
           Data loss if file corrupted
           No read scaling (can't offload reports to read replica)

Limitation #4: CONNECTION POOLING
  Problem: Single process only, no connection pool
  Impact: Cannot scale horizontally
           All requests hit same database file

Limitation #5: TRANSACTIONS
  Problem: Limited transaction support
  Impact: Race conditions possible in participant join flow
           Duplicate participant entries possible

Limitation #6: SIZE
  Problem: Performance degrades >1 GB
  Current: ~100 MB (OK)
  Year 1: ~500 MB (getting slow)
  Year 2: ~2 GB (very slow)
  Year 3: ~5 GB (unusable)

VERDICT: SQLite is a development database only.
MIGRATION TIMELINE: Before 500 users, must migrate to PostgreSQL.
```

### C.2 PostgreSQL Migration Effort

#### **Phase 1: Schema Preparation** (2-3 hours)
```sql
-- Create PostgreSQL database
CREATE DATABASE retailedge;

-- Install extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Sequelize will auto-generate tables from models
-- No manual schema needed (ORM handles it)
```

#### **Phase 2: Data Export** (1 hour)
```javascript
// backend/scripts/export-sqlite.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./quizhive.sqlite');
const models = Object.values(require('../models'));

for (const model of models) {
  db.all(`SELECT * FROM ${model.tableName}`, (err, rows) => {
    fs.writeFileSync(
      `./migrations/data/${model.tableName}.json`,
      JSON.stringify(rows, null, 2)
    );
  });
}
```

#### **Phase 3: Connection Configuration** (30 minutes)
```javascript
// backend/config/database.js
const { Sequelize } = require('sequelize');

// Current SQLite
// const sequelize = new Sequelize({
//   dialect: 'sqlite',
//   storage: path.join(__dirname, '..', 'quizhive.sqlite'),
// });

// New PostgreSQL
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'retailedge',
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
});

module.exports = sequelize;
```

#### **Phase 4: Add Missing Indexes** (Critical!)
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_project_id ON users(project_id);

-- Session/Participant
CREATE INDEX idx_sessions_quiz_id ON sessions(quiz_id);
CREATE INDEX idx_sessions_host_id ON sessions(host_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_participants_session_id ON participants(session_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);

-- Response queries
CREATE INDEX idx_responses_participant_id ON responses(participant_id);
CREATE INDEX idx_responses_question_id ON responses(question_id);
CREATE UNIQUE INDEX idx_responses_unique 
  ON responses(participant_id, question_id);

-- Training/Certificate
CREATE INDEX idx_training_project_id ON training(project_id);
CREATE INDEX idx_training_progress_user_project 
  ON training_progress(user_id, project_id);
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_project_id ON certificates(project_id);

-- Search optimization
CREATE INDEX idx_users_name_trgm ON users USING gin(name gin_trgm_ops);
CREATE INDEX idx_projects_name_trgm ON projects USING gin(name gin_trgm_ops);
```

#### **Phase 5: Code Changes** (1 hour)
```
Minimal changes needed:
1. Update DATABASE_URL env var
2. No code changes required (Sequelize handles both dialects)
3. Test all queries work with PostgreSQL
4. Verify indexes are being used (EXPLAIN ANALYZE)
```

#### **Phase 6: Data Import** (30 minutes)
```javascript
// backend/scripts/import-postgresql.js
const sequelize = require('../config/database');
const fs = require('fs');
const models = Object.values(require('../models'));

async function importData() {
  await sequelize.sync({force: false}); // Create tables
  
  for (const model of models) {
    const data = JSON.parse(
      fs.readFileSync(`./migrations/data/${model.tableName}.json`)
    );
    await model.bulkCreate(data);
  }
}

importData().then(() => process.exit(0));
```

### C.3 Query Bottlenecks & N+1 Issues

#### **Bottleneck #1: User List with RBAC**
```javascript
// CURRENT: N+1 queries
router.get('/', async (req, res) => {
  const users = await User.findAll({
    include: [
      { model: Role },        // +1 query per user
      { model: Project },     // +1 query per user
      { model: User, as: 'manager' } // +1 query per user
    ]
  });
  res.json(users);
});

// IMPACT: 1000 users = 4000 queries!
// SOLUTION: Use single query with joins
router.get('/', async (req, res) => {
  const users = await User.findAll({
    include: [
      { model: Role, attributes: ['role_name'] },
      { model: Project, attributes: ['id', 'name'] },
      { model: User, as: 'manager', attributes: ['id', 'name'] }
    ],
    limit: 100, // ADD PAGINATION
    offset: (page - 1) * 100
  });
  res.json(users);
});
```

#### **Bottleneck #2: Quiz Report Generation**
```javascript
// CURRENT: Multiple sequential queries + N+1
router.get('/api/reports/:sessionId', async (req, res) => {
  const session = await Session.findByPk(sessionId);
  const participants = await Participant.findAll({where: {sessionId}}); // Query 1
  for (const p of participants) {
    const responses = await Response.findAll({
      where: {participantId: p.id}
    }); // N queries!
    // Aggregate responses...
  }
});

// IMPACT: 1 session + 100 participants = 101 queries
// SOLUTION: Single aggregation query
router.get('/api/reports/:sessionId', async (req, res) => {
  const report = await sequelize.query(`
    SELECT 
      s.id as session_id,
      q.title,
      p.id as participant_id,
      p.name,
      COUNT(r.id) as total_responses,
      SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END) as correct_count,
      AVG(EXTRACT(EPOCH FROM (r.answered_at - r.posted_at))) as avg_time
    FROM sessions s
    JOIN participants p ON s.id = p.session_id
    LEFT JOIN responses r ON p.id = r.participant_id
    WHERE s.id = ?
    GROUP BY s.id, p.id
    ORDER BY correct_count DESC
  `, {
    replacements: [sessionId],
    type: Sequelize.QueryTypes.SELECT
  });
  res.json(report);
});

// IMPACT: Reduced to 1 query
```

#### **Bottleneck #3: Certificate Eligibility Check**
```javascript
// CURRENT: Recursive project hierarchy lookup
router.post('/api/certificates/claim', async (req, res) => {
  const user = await User.findByPk(userId);
  let projectIds = [user.projectId];
  
  // RECURSIVE: Get all sub-projects
  async function getSubProjects(parentId) {
    const children = await Project.findAll({
      where: {parentId}
    });
    for (const child of children) {
      projectIds.push(child.id);
      await getSubProjects(child.id); // Recursive!
    }
  }
  
  await getSubProjects(user.projectId);
  
  // Check if all trainings complete
  for (const projectId of projectIds) {
    const trainings = await Training.count({
      where: {projectId}
    }); // Query per project!
    const completed = await TrainingProgress.count({
      where: {userId, projectId, completed: true}
    }); // Query per project!
  }
});

// IMPACT: 50+ queries for deep hierarchy
// SOLUTION: Recursive CTE (PostgreSQL)
router.post('/api/certificates/claim', async (req, res) => {
  const projects = await sequelize.query(`
    WITH RECURSIVE project_tree AS (
      SELECT id FROM projects WHERE id = ?
      UNION ALL
      SELECT p.id FROM projects p
      JOIN project_tree pt ON p.parent_id = pt.id
    )
    SELECT pt.id, COUNT(t.id) as total_trainings,
           SUM(CASE WHEN tp.completed THEN 1 ELSE 0 END) as completed
    FROM project_tree pt
    LEFT JOIN training t ON pt.id = t.project_id
    LEFT JOIN training_progress tp ON t.id = tp.training_id AND tp.user_id = ?
    GROUP BY pt.id
  `, {
    replacements: [projectId, userId],
    type: Sequelize.QueryTypes.SELECT
  });
  // Single query! Result contains all projects with completion status
});
```

#### **Bottleneck #4: Leaderboard Query**
```javascript
// CURRENT: Queries all participants then sorts in-memory
socket.on('host_show_leaderboard', async (data) => {
  const participants = await Participant.findAll({
    where: {sessionId},
    include: [{model: Response}]
  });
  // Sort in memory
  const sorted = participants
    .map(p => ({...p, score: p.Responses.length}))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
});

// IMPACT: Full scan every time, O(n log n) sort, memory allocation
// SOLUTION: Index + database sort
socket.on('host_show_leaderboard', async (data) => {
  const leaderboard = await sequelize.query(`
    SELECT p.id, p.name, COUNT(r.id) as score, 
           ROW_NUMBER() OVER (ORDER BY COUNT(r.id) DESC) as rank
    FROM participants p
    LEFT JOIN responses r ON p.id = r.participant_id
    WHERE p.session_id = ?
    GROUP BY p.id, p.name
    ORDER BY score DESC
    LIMIT 10
  `, {
    replacements: [sessionId],
    type: Sequelize.QueryTypes.SELECT
  });
  // Single query, database handles sorting!
});
```

### C.4 Query Performance Improvements

| Query | Current | Optimized | Improvement | Risk |
|-------|---------|-----------|-------------|------|
| User list | 4000+ queries | 1 query | 4000x | Low |
| Report generation | 101 queries | 1 query | 100x | Low |
| Certificate check | 50+ queries | 1 query | 50x | Low |
| Leaderboard | Full scan | Indexed sort | 100x | Low |

### C.5 Migration Checklist

- [ ] Set up PostgreSQL instance (RDS or local)
- [ ] Create database and install extensions
- [ ] Export all data from SQLite
- [ ] Update backend config to use PostgreSQL
- [ ] Run Sequelize migrations (auto-create tables)
- [ ] Add all required indexes
- [ ] Import exported data
- [ ] Test all routes with new database
- [ ] Compare query performance (EXPLAIN ANALYZE)
- [ ] Set up automated backups
- [ ] Load test with 500+ concurrent users
- [ ] Run in parallel for 24 hours before cutover
- [ ] Execute cutover (low-traffic window)

**Estimated Effort**: 8-12 hours (including testing)  
**Risk Level**: LOW (Sequelize handles both dialects)  
**Rollback Time**: 30 minutes (switch DATABASE_URL back to SQLite)

---

## PART D: SCALABILITY ANALYSIS

### D.1 Can Current Architecture Support...?

#### **500 Users?**
```
Analysis:
  - API Processing: ✅ OK (4 cores sufficient)
  - WebSocket Connections: ⚠️ RISKY (in-memory tracking, no Redis)
  - Database: ❌ FAIL (SQLite file locks, contention visible)
  - Media Generation: ⚠️ RISKY (blocking, no queue)
  - Memory: ⚠️ RISKY (150+ participants = 150-200 MB tracking)

Verdict: Can barely support with modifications
  - Must migrate to PostgreSQL
  - Must offload media generation
  - Must add Redis for distributed cache
  - Single server sufficient, but scaling limited

Recommendation: 2-3 servers before hitting limits
```

#### **1000 Users?**
```
Analysis:
  - API Processing: ⚠️ RISKY (needs load balancing)
  - WebSocket: ❌ FAIL (no Redis, can't distribute across servers)
  - Database: ❌ FAIL (PostgreSQL needed urgently)
  - Media Generation: ❌ FAIL (blocking, must have workers)
  - Memory: ⚠️ RISKY (300+ participants tracked, 300+ MB)
  - CPU: ⚠️ RISKY (need 8+ cores)

Verdict: Current architecture cannot support

Breaking Points:
  1. SQLite concurrency (first bottleneck at 200-300 concurrent users)
  2. Socket.io in-memory tracking (no distributed state)
  3. Media generation blocking (if 2+ videos queued, API unresponsive)
  4. Single server CPU (12+ users = 10+ concurrent sessions)

Required Changes:
  ✓ PostgreSQL migration (ESSENTIAL)
  ✓ Redis for session/cache (ESSENTIAL)
  ✓ Load balancer (ESSENTIAL)
  ✓ Worker tier (ESSENTIAL)
  ✓ Job queue (ESSENTIAL)
  
Estimated Effort: 3-4 weeks of engineering
```

#### **3000 Users?**
```
Analysis:
  - API Processing: ❌ FAIL (need 4-5 instances)
  - WebSocket: ❌ FAIL (need Socket.io Redis adapter)
  - Database: ❌ FAIL (PostgreSQL + connection pooling)
  - Media Generation: ❌ FAIL (3-4 worker servers needed)
  - Memory: ❌ FAIL (distributed caching required)
  - Network: ❌ FAIL (bandwidth optimization needed)
  - Storage: ⚠️ RISKY (100+ GB database, need backups)

Verdict: Requires major architectural changes

Required Changes:
  ✓ Multi-server API tier (4-5 instances)
  ✓ PostgreSQL + replicas
  ✓ Redis cluster
  ✓ 2-3 worker servers
  ✓ SQS/RabbitMQ job queue
  ✓ CloudFront CDN
  ✓ Auto-scaling groups
  ✓ Multi-AZ deployment
  
Estimated Effort: 6-8 weeks
```

#### **5000 Users?**
```
Analysis:
  All previous changes plus:
  - Multi-region deployment
  - Database sharding strategy
  - Advanced caching (Memcached)
  - Real-time metrics collection
  - Advanced monitoring/alerting
  - Rate limiting per user
  - Request prioritization

Verdict: Requires enterprise-grade infrastructure

Estimated Effort: 10-12 weeks + ongoing optimization
```

### D.2 Breaking Points & Bottlenecks

```
BREAKING POINT #1: SQLite Concurrency
  Symptom: 10+ concurrent users report slow responses
  Occurs At: 200-300 concurrent users
  Root Cause: File-level locking
  Fix: PostgreSQL migration
  Time To Fix: 1-2 weeks
  Cost: +$50-100/month

BREAKING POINT #2: Socket.io In-Memory State
  Symptom: Participant joins/leaves fails, WebSocket disconnects
  Occurs At: 500-1000 participants tracked
  Root Cause: Memory fragmentation, no distributed state
  Fix: Redis adapter + distributed session store
  Time To Fix: 1 week
  Cost: +$50/month

BREAKING POINT #3: Media Generation Blocking
  Symptom: API becomes unresponsive during video/PDF generation
  Occurs At: 3+ concurrent media requests
  Root Cause: CPU exhaustion, single process
  Fix: Separate worker tier + job queue
  Time To Fix: 2 weeks
  Cost: +$200-500/month (worker servers)

BREAKING POINT #4: Database Connection Pool
  Symptom: "Too many connections" errors
  Occurs At: 500+ API tier instances × 20 connections = 10k connections
  Root Cause: Default max_connections = 100 in PostgreSQL
  Fix: RDS Proxy or PgBouncer, increase limits
  Time To Fix: 1 day
  Cost: +$50/month (RDS Proxy)

BREAKING POINT #5: Network Bandwidth
  Symptom: Video downloads/uploads slow for users
  Occurs At: 100+ concurrent downloads
  Root Cause: Single server egress limit (~10 Gbps)
  Fix: CloudFront CDN
  Time To Fix: 3 days
  Cost: +$100-500/month (depends on transfer)

BREAKING POINT #6: API CPU During Peak
  Symptom: 5xx errors, timeout responses
  Occurs At: 50+ concurrent WebSocket connections × 10 sessions = CPU maxed
  Root Cause: All requests hitting single box
  Fix: Horizontal scaling with auto-scaling
  Time To Fix: 1 week
  Cost: +$300-1000/month (additional servers)

Prevention Strategy:
  1. Monitor at 60% capacity (add servers before hitting limits)
  2. Implement circuit breakers (fail gracefully when overloaded)
  3. Add request prioritization (critical requests first)
  4. Implement caching (reduce database load 70%)
  5. Use async workers (decouple media generation)
```

---

## PART E: ZERO-DOWNTIME DEPLOYMENT STRATEGY

### E.1 Blue-Green Deployment

```
Concept: Run 2 identical environments (Blue = Current, Green = New)
Switch: Instant cutover from Blue to Green at load balancer level
Advantage: Instant rollback, zero downtime
Risk: Database migrations need careful planning

Architecture:

        ┌─────────────────────────────────────────┐
        │         AWS Load Balancer (ALB)          │
        │   Weighted: 100% Blue (during deployment) │
        └────────────┬────────────────────────────┘
                     │
         ┌───────────┴──────────────┐
         │                          │
    ┌────▼────┐              ┌─────▼────┐
    │ BLUE    │              │ GREEN    │
    │ (Current│              │ (New)    │
    │ v1.0.0) │              │ v1.1.0)  │
    │         │              │          │
    │ API x3  │              │ API x3   │
    │ Worker  │              │ Worker   │
    │ x2      │              │ x2       │
    └────┬────┘              └──────────┘
         │
         └──────────┬─────────────────────┬──────┐
                    │                     │      │
            ┌───────▼────────┐    ┌──────▼──┐  │
            │ PostgreSQL DB  │    │ Redis   │  │
            │ (Shared)       │    │ (Shared)│  │
            └────────────────┘    └─────────┘  │
                                               │
                                        ┌──────▼────┐
                                        │ S3 Uploads│
                                        │(Shared)   │
                                        └───────────┘

Deployment Steps:

1. Build new Docker image for v1.1.0
   docker build -t retailedge:api-v1.1.0 .

2. Push to ECR
   docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/retailedge:api-v1.1.0

3. Prepare database migrations (if any)
   npm run migrate:create add-new-tables
   npm run migrate:dry-run

4. Deploy to GREEN environment
   - Launch 3 new API instances with v1.1.0 image
   - Launch 2 new Worker instances with v1.1.0 image
   - Configure with same env vars
   - Wait for health checks to pass (30 sec)

5. Run smoke tests on GREEN
   curl -X GET http://green-alb.internal/api/health
   - Verify 200 OK response
   - Verify WebSocket connections work
   - Test 1 quiz session (E2E test)
   - Verify PDF generation still works

6. Execute database migrations ON GREEN (if needed)
   - Migrations are backward-compatible
   - Old code (Blue) can still read migrated schema
   
7. Switch traffic 50/50 (canary)
   ALB weighted target group:
     - Blue: 50%
     - Green: 50%
   - Monitor error rates for 2 minutes
   - If errors < 1%, proceed to 100%

8. Switch traffic 100% to GREEN
   ALB weighted target group:
     - Blue: 0%
     - Green: 100%
   - Monitor logs/dashboards for 5 minutes

9. Keep BLUE running for 1 hour (instant rollback)
   If issues detected:
     ALB weighted target group:
       - Blue: 100%
       - Green: 0%
   - Rollback happens in 30 seconds
   - Investigate issue in Green
   - Fix and re-deploy when ready

10. Cleanup
    - After 24 hours, scale down Blue environment
    - Keep Green as new production
    - Delete Blue's resources

Rollback Procedure (if needed):
  - Detected Issue: API error rate > 5% or WebSocket failures
  - Action: ALB switches back to Blue (30 seconds)
  - Impact: Zero user interruption
  - Root Cause Analysis: Investigate Green logs
  - Fix: Patch issue, test, redeploy

Database Rollback (if migration failed):
  - Downgrade Script: npm run migrate:down:1
  - But: Multiple deployments may have run migrations
  - Solution: Make migrations IDEMPOTENT
  
  Example idempotent migration:
  CREATE TABLE IF NOT EXISTS new_table (...);
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint ...) THEN
      ALTER TABLE ...
    END IF;
  END $$;

Database Considerations:
  - Problem: Multiple versions of code can't run simultaneously
  - Solution: Make schema changes backward compatible
  
  Backward-compatible migration:
  
  Version 1.0: Uses field "quiz_id"
  Migration: Add field "quiz_uuid" (new)
  Version 1.1: Uses field "quiz_uuid" (with fallback to "quiz_id")
  
  // In code:
  const quizId = question.quiz_uuid || question.quiz_id;
  
  Then Blue (v1.0) can safely read data from Green (v1.1)
  
  After full deployment to Green:
  - Drop backward-compatibility code in v1.2
  - Remove old field "quiz_id" in next migration
```

### E.2 Rolling Deployment (Alternative)

```
Concept: Gradually replace instances one at a time
Advantage: Keeps both versions running during transition
Disadvantage: Longer deployment window, more complex testing

Process:

Initial State: 3x API instances all running v1.0.0

1. Drain connections from API-1
   - Stop accepting new connections
   - Wait for existing requests to complete (timeout: 60s)

2. Deploy v1.1.0 to API-1
   - Pull new image
   - Start container
   - Run health checks

3. Route traffic to API-1 v1.1.0
   - Load balancer adds back to rotation
   - Monitor error rate (watch for 5 minutes)

4. Repeat for API-2
   - Drain API-2
   - Deploy v1.1.0
   - Route traffic back

5. Repeat for API-3
   - Drain API-3
   - Deploy v1.1.0
   - Route traffic back

6. Repeat for Worker-1, Worker-2

Timeline: ~30 minutes (vs 5 min for Blue-Green)
Risk: Higher (mixed versions can cause issues)
Rollback: Must roll back all 5 instances

Kubernetes equivalent:
  kubectl set image deployment/api-backend \
    api-backend=retailedge:api-v1.1.0 \
    --record=true
  
  # Auto-handles rolling update (25% maxUnavailable)
  # Auto-handles health checks
  # Auto-handles rollback if failures
```

### E.3 Health Check Configuration

```
HTTP Health Check:
  GET /api/health
  Expected: 200 OK {status: 'ok', message: '...', ...}
  
  Implementation:
  app.get('/health', (req, res) => {
    // Check critical services
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: await checkDatabase(),
      redis: await checkRedis(),
      services: {
        api: 'ok',
        websocket: io.engine.clientsCount > 0 ? 'ok' : 'idle'
      }
    };
    
    // Overall status
    if (healthData.database === 'error') {
      res.status(503).json(healthData); // Service Unavailable
    } else {
      res.status(200).json(healthData);
    }
  });

Liveness Probe:
  Path: /health
  Interval: 10 seconds
  Timeout: 5 seconds
  Failure threshold: 3
  Action: Kill container and restart
  
  Kubernetes:
    livenessProbe:
      httpGet:
        path: /api/health
        port: 5000
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3

Readiness Probe:
  Path: /health/ready
  Interval: 5 seconds
  Timeout: 3 seconds
  Failure threshold: 2
  Action: Remove from load balancer
  
  Kubernetes:
    readinessProbe:
      httpGet:
        path: /api/health/ready
        port: 5000
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 2

Implementation:
  app.get('/health/ready', async (req, res) => {
    const checks = {
      database: await testDatabaseConnection(),
      redis: await testRedisConnection(),
      websocket: io.engine.clientsCount >= 0, // Just check it's listening
      memory: process.memoryUsage().heapUsed < 1024 * 1024 * 1000 // < 1GB
    };
    
    if (Object.values(checks).every(v => v)) {
      res.status(200).json({ready: true});
    } else {
      res.status(503).json({ready: false, checks});
    }
  });
```

### E.4 Rollback Strategy

```
Automatic Rollback Conditions:
  1. Error rate > 5% for 2 consecutive minutes
  2. P99 response time > 10 seconds
  3. Database connection errors > 100/min
  4. WebSocket connection failures > 10%
  5. Worker queue exceeds 1000 jobs
  6. API memory usage > 90%

Manual Rollback Command:
  # Blue-Green: Switch back to Blue
  aws elbv2 modify-rule \
    --rule-arn arn:aws:... \
    --actions TargetGroupArn=arn:aws:elasticloadbalancing:...blue:...
  
  # Kubernetes: Rollout undo
  kubectl rollout undo deployment/api-backend

Rollback Timeline:
  - Detection: Automated (2 minutes)
  - Execution: 30 seconds (ALB/K8s is fast)
  - User Experience: Transparent (requests redirected)

Post-Rollback:
  1. Trigger incident alert (PagerDuty/Slack)
  2. Investigate logs from Green environment
  3. Fix issue in code/config
  4. Retest before re-deploying
  5. Document root cause

Database Rollback (if migration caused issue):
  # If new schema breaks old code:
  npm run migrate:down:1
  
  # Then fix migration and redeploy
```

---

## PART F: COST OPTIMIZATION ARCHITECTURE

### F.1 Deployment Option Comparison

#### **Option 1: Single EC2 + Docker**
```
Architecture:
  - 1x EC2 t3.2xlarge (8 CPU, 32 GB RAM)
  - Docker with docker-compose
  - EBS 500GB volume
  - RDS PostgreSQL (db.t3.small)
  - Elastic IP

Monthly Cost:
  - EC2: $0.33/hr × 730 hrs = $241
  - EBS: $50
  - RDS: $70
  - Data transfer: $20
  Total: $381/month

Suitable For:
  - 100-300 concurrent users
  - Development/staging
  - Low-traffic applications

Limitations:
  ❌ Single point of failure
  ❌ No horizontal scaling
  ❌ No auto-recovery
  ❌ Manual scaling required
  ❌ No load balancing
  ✅ Simple to manage
  ✅ Good for prototyping

Scaling Path:
  - Cannot scale horizontally
  - Must upgrade to next tier
  - Eventually hits EC2 size limits
```

#### **Option 2: Docker Compose + VPS**
```
Architecture:
  - 2x Linode 16GB (8 CPU each)
  - Docker Compose orchestration
  - PostgreSQL on second server
  - Manual networking

Monthly Cost:
  - Compute: $80 × 2 = $160
  - Block storage: $30
  - Backups: $20
  Total: $210/month

Suitable For:
  - 200-500 concurrent users
  - Small teams
  - Cost-sensitive deployments

Limitations:
  ⚠️ Limited horizontal scaling (2 servers max practical)
  ⚠️ No automatic failover
  ⚠️ Manual orchestration
  ✅ Very cheap
  ✅ Full control
  ✅ Good for cost-sensitive

Scaling Path:
  - Add third server for workers
  - Gets complex quickly
  - Eventually need to migrate to cloud
```

#### **Option 3: ECS Fargate (Recommended)**
```
Architecture:
  - 2-3x Fargate tasks (2 CPU, 4 GB each) for API
  - 1-2x Fargate tasks (8 CPU, 16 GB each) for Workers
  - Application Load Balancer
  - RDS PostgreSQL (db.t3.large)
  - ElastiCache Redis (cache.t3.micro)
  - S3 for uploads
  - CloudWatch for logs/monitoring

Monthly Cost (100 users):
  - Fargate vCPU: $0.04096/vCPU-hour × 2 vCPU × 730h = $60
  - Fargate Memory: $0.004445/GB-hour × 8 GB × 730h = $26
  - ALB: $16 (fixed) + $0.006/LCU-hour = $20
  - RDS: $80
  - Redis: $15
  - S3: $10
  - CloudWatch: $30
  Total: $257/month

Monthly Cost (500 users):
  - Fargate API: 3 tasks × 4 vCPU × $60 = $180
  - Fargate Workers: 2 tasks × 8 vCPU × $120 = $240
  - ALB: $35
  - RDS: $150
  - Redis: $50
  - S3: $30
  - CloudWatch: $50
  Total: $735/month

Suitable For:
  - 100-3000 concurrent users
  - Startups and growing companies
  - Teams familiar with AWS

Advantages:
  ✅ Auto-scaling groups
  ✅ Horizontal scaling built-in
  ✅ Managed services (less ops overhead)
  ✅ Pay-per-second billing (very efficient)
  ✅ Easy to scale up/down
  ✅ Built-in load balancing
  ✅ CloudWatch integration

Disadvantages:
  ⚠️ Vendor lock-in (AWS)
  ⚠️ Complexity of AWS console
  ⚠️ Requires AWS knowledge

Scaling Path:
  - 100 users: 1-2 tasks
  - 500 users: 3-5 tasks
  - 1000 users: 5-10 tasks
  - 3000 users: 10-20 tasks
  - 5000 users: Add read replicas, CDN, second region

Auto-Scaling Policy:
  - Scale up if CPU > 70% for 2 min
  - Scale down if CPU < 30% for 5 min
  - Min tasks: 2, Max tasks: 20 (API tier)
```

#### **Option 4: Kubernetes (EKS)**
```
Architecture:
  - EKS cluster (managed)
  - 2-3x node groups (on-demand for API, spot for workers)
  - Horizontal Pod Autoscaling (HPA)
  - Ingress controller (ALB)
  - StatefulSet for Redis
  - Helm charts for deployments

Monthly Cost (500 users):
  - EKS control plane: $73 (fixed)
  - EC2 nodes (on-demand): 2x t3.xlarge = $132
  - EC2 nodes (spot): 3x t3.2xlarge = $99
  - ALB: $35
  - RDS: $150
  - S3: $30
  - EBS storage: $40
  - CloudWatch: $50
  Total: $609/month

Suitable For:
  - 500-5000+ concurrent users
  - Teams with Kubernetes expertise
  - Multi-region, enterprise deployments

Advantages:
  ✅ Most powerful scaling platform
  ✅ Cloud-agnostic (can migrate to GCP/Azure)
  ✅ Industry standard
  ✅ Automatic failover/recovery
  ✅ Advanced networking options

Disadvantages:
  ❌ Steep learning curve
  ❌ Complex to manage
  ❌ Requires specialized expertise
  ❌ Overkill for small applications
  ⚠️ Can be expensive if misconfigured

Scaling Path:
  - Ideal for applications planning to scale to 5000+ users
  - Can run globally across regions
  - Automatic node scaling based on demand
```

#### **Option 5: Traditional VPS + Manual Scaling**
```
Architecture:
  - 1-2x Linode/DigitalOcean instances
  - Nginx reverse proxy
  - Systemd process management
  - PostgreSQL on separate server
  - Redis on separate server

Monthly Cost:
  - API servers: $80 × 2 = $160
  - PostgreSQL: $80
  - Redis: $40
  - Backups: $30
  Total: $310/month

Suitable For:
  - 200-500 concurrent users
  - Teams with Linux expertise
  - Custom infrastructure needs

Advantages:
  ✅ Full control
  ✅ No vendor lock-in
  ✅ Simple architecture
  ✅ Can migrate between providers easily

Disadvantages:
  ❌ Manual scaling required
  ❌ No automatic failover
  ❌ Requires system administration skills
  ❌ Cannot horizontally scale easily
  ❌ Time-consuming operational overhead

Scaling Path:
  - Manual process to add/remove servers
  - Eventually need to migrate to cloud
  - Becomes unmanageable beyond 500 users
```

### F.2 Cost Optimization Strategies

#### **Strategy 1: Auto-Scaling to Zero During Off-Hours**
```
Problem: Paying for servers running during night/weekends
Solution: Auto-scale to minimum during low-traffic periods

Implementation:
  # AWS CloudWatch + Lambda
  # Scale down at 6 PM
  cron: "0 18 * * MON-FRI"
  action: scale to 1 API task, 0 worker tasks
  
  # Scale up at 8 AM
  cron: "0 8 * * MON-FRI"
  action: scale to 3 API tasks, 2 worker tasks

Savings:
  - Development: -30% (off-hours scaling)
  - Peak usage only: -50% (scale to zero on weekends)
  
Caveat:
  - 30-60 second startup time (cold start)
  - Users may see slight delay first request
```

#### **Strategy 2: Spot Instances for Workers**
```
Problem: Worker tier (video/PDF generation) can tolerate interruptions
Solution: Use spot instances (70% cheaper) for workers

AWS Spot:
  - On-demand t3.2xlarge: $0.33/hr
  - Spot t3.2xlarge: $0.10/hr (70% savings)
  - Trade-off: 2-3 minute interruption every ~24 hours

Implementation:
  - ECS task definition: capacity provider = SPOT
  - On interruption: Job re-queued to next available worker
  - Cost: $200/mo → $60/mo for worker tier

Savings:
  - -$140/month for worker tier
```

#### **Strategy 3: Reserved Instances for Baseline**
```
Problem: Paying on-demand rates for consistent baseline load
Solution: Reserve instances you always need

AWS Pricing:
  - On-demand t3.xlarge: $0.166/hr × 730h = $121/mo
  - 1-year reserved: $78/mo (35% discount)
  - 3-year reserved: $60/mo (50% discount)

Implementation:
  - Baseline 2x t3.xlarge API instances (always running)
  - Buy 1-year reserved: $156/mo
  - Use spot for scaling above baseline
  - Use on-demand for emergency scaling

Savings:
  - $0.33/hr → $0.21/hr (baseline instances)
  - -$88/month per baseline instance
```

#### **Strategy 4: CDN for Media Assets**
```
Problem: Transferring 500MB video files eats bandwidth budget
Solution: CloudFront CDN caches at edge locations

Costs:
  - Direct S3 download: $0.09/GB
  - CloudFront edge cache: $0.085/GB + $0.01/request
  - Break-even: ~10 downloads per file

Optimization:
  - Cache PDFs for 30 days
  - Cache videos for 90 days
  - Compress JavaScript/CSS
  - Lazy-load images

Savings:
  - For 1000 users × 2 downloads/month × 500MB:
    Without CDN: 1000 GB × $0.09 = $90/month
    With CDN: 1000 GB × $0.085 = $85/month + $10 requests = $95
    Actually: 900 GB from cache (90% hit), 100 GB from origin
    Cost: 100 × $0.09 + 900 × $0.085 = $85/month
    Savings: $5/month (net), but improves speed 100x

Best for: High-bandwidth applications (videos)
```

#### **Strategy 5: Database Connection Pooling**
```
Problem: Each API instance creates 20 connections to database
5 instances × 20 connections = 100 connections
But actual usage: 5-10 concurrent queries

Solution: PgBouncer or RDS Proxy (connection multiplexing)

RDS Proxy:
  - Cost: $0.015/vCPU-hour = $11/month (3 vCPUs)
  - Manages 500+ client connections
  - Routes to 20 actual DB connections
  - Connection reuse: 10x improvement

Implementation:
  # Change connection string
  DATABASE_URL=postgresql://pgbouncer:5432/retailedge
  
  # PgBouncer handles multiplexing
  # API still gets fast connections

Benefit:
  - Can use smaller RDS instance (t3.small vs t3.large)
  - -$50-100/month database savings
  - Cost: $11/month PgBouncer
  - Net savings: $40/month

Alternative: Self-managed PgBouncer
  - Free (open source)
  - Runs on own EC2 instance
  - More complex to manage
```

#### **Strategy 6: Archive Old Data**
```
Problem: Database grows indefinitely
Old quiz sessions (6+ months) never accessed but still stored

Solution: Archive to S3, query via Athena

Implementation:
  # Monthly job (Lambda)
  1. Query sessions older than 6 months
  2. Export to Parquet format
  3. Store in S3/Glacier
  4. Delete from database
  
  # To query archived data
  SELECT * FROM s3://retailedge-archive/sessions/2024-01/...
  USING Athena SQL

Savings:
  - Database size: 500 GB → 50 GB (90% reduction)
  - RDS storage: -$400/month
  - S3 storage: +$10/month (with Glacier for old)
  - Athena queries: +$5/month (occasional)
  - Net savings: -$385/month

Trade-off:
  - Archived queries are slower (S3, not database)
  - But rarely accessed data anyway
```

#### **Strategy 7: Implement Request Caching**
```
Problem: Same report queries run 100x per day
Solution: Cache in Redis for 1 hour

Implementation:
  // In report API endpoint
  const cacheKey = `report:${sessionId}:${format}`;
  let report = await redis.get(cacheKey);
  
  if (!report) {
    report = await generateReport(sessionId);
    await redis.setex(cacheKey, 3600, report); // 1 hour TTL
  }
  
  res.json(report);

Benefit:
  - Database load: -80% on reports
  - Puppeteer calls: -90% on same report requests
  - RDS size can be smaller
  - Fargate tasks can be fewer

Savings:
  - Can use 1 fewer t3.xlarge: -$121/mo
  - Fewer Puppeteer calls: -$50/mo estimated
  - Total: -$170/month
```

### F.3 Total Cost Comparison Summary

| Approach | 100 Users | 500 Users | 1000 Users | 3000 Users | Complexity |
|----------|-----------|----------|----------|----------|-----------|
| Single EC2 | $400 | $1500 (fails) | N/A | N/A | 2/5 |
| Docker VPS | $250 | $400 | $900 | N/A | 3/5 |
| ECS Fargate | $300 | $700 | $1800 | $4500 | 3/5 |
| Kubernetes | $400 | $650 | $1500 | $4000 | 5/5 |
| VPS Manual | $350 | $600 | $1200 | N/A | 4/5 |

**Recommendation**: Start with ECS Fargate (sweet spot of cost, scalability, management)

---

## PART G: DOCKERIZATION STRATEGY

### G.1 Dockerfile for Backend

```dockerfile
# File: backend/Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install system dependencies (for FFmpeg, Puppeteer)
RUN apk add --no-cache \
    chromium \
    ffmpeg \
    python3 \
    build-base \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY config ./config
COPY middleware ./middleware
COPY models ./models
COPY routes ./routes
COPY sockets ./sockets
COPY utils ./utils
COPY server.js .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode); })"

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "server.js"]
```

### G.2 Dockerfile for Frontend

```dockerfile
# File: frontend/Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build React app
RUN npm run build

# Production stage (Nginx)
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### G.3 docker-compose.yml (Development)

```yaml
# File: docker-compose.yml

version: '3.9'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: retailedge-postgres
    environment:
      POSTGRES_USER: retailedge
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
      POSTGRES_DB: retailedge
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U retailedge"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: retailedge-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: retailedge-backend
    environment:
      NODE_ENV: development
      DB_HOST: postgres
      DB_USER: retailedge
      DB_PASS: ${DB_PASSWORD:-password}
      DB_NAME: retailedge
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET:-dev-secret-key}
      PORT: 5000
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: retailedge-frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:5000
    volumes:
      - ./frontend/src:/app/src
      - /app/node_modules
    command: npm run dev

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: retailedge-network
```

### G.4 Production Docker Compose (ECS/Fargate)

```yaml
# File: docker-compose.production.yml
# Used for AWS ECS deployment

version: '3.9'

services:
  backend:
    image: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/retailedge:backend-${VERSION}
    container_name: retailedge-api
    
    environment:
      NODE_ENV: production
      DB_HOST: ${RDS_ENDPOINT}
      DB_USER: ${RDS_USER}
      DB_PASS: ${RDS_PASSWORD}
      DB_NAME: retailedge
      DB_SSL: "true"
      REDIS_URL: ${ELASTICACHE_URL}
      JWT_SECRET: ${JWT_SECRET}
      CLOUDFLARE_TOKEN: ${CLOUDFLARE_TOKEN}
      CORS_ORIGIN: ${CORS_ORIGIN}
      PORT: 5000
    
    # ECS logging
    logging:
      driver: awslogs
      options:
        awslogs-group: /ecs/retailedge-backend
        awslogs-region: ${AWS_REGION}
        awslogs-stream-prefix: ecs
    
    # Resource limits
    mem_limit: 4g
    cpu_shares: 2048
    
    # Port mapping
    ports:
      - "5000:5000"

  worker:
    image: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/retailedge:worker-${VERSION}
    container_name: retailedge-worker
    
    environment:
      NODE_ENV: production
      WORKER_TYPE: pdf_video
      REDIS_URL: ${ELASTICACHE_URL}
      DB_HOST: ${RDS_ENDPOINT}
      # ... other env vars
    
    logging:
      driver: awslogs
      options:
        awslogs-group: /ecs/retailedge-worker
        awslogs-region: ${AWS_REGION}
        awslogs-stream-prefix: ecs
    
    # High resource for workers
    mem_limit: 16g
    cpu_shares: 8192
```

### G.5 Services to Containerize

```
CONTAINERIZE:
  ✅ Backend API (Express)
     - Runs on port 5000
     - Stateless
     - Easy to scale

  ✅ Worker (PDF/Video generation)
     - Separate container
     - 8+ CPU cores recommended
     - Can run fewer instances

  ✅ Frontend (React SPA)
     - Nginx-based
     - Static file serving
     - CDN-ready

  ✅ PostgreSQL (optional)
     - Container for development
     - RDS for production (managed)

  ✅ Redis (optional)
     - Container for development
     - ElastiCache for production (managed)

DON'T CONTAINERIZE:
  ❌ Database (use managed RDS)
     - Too stateful
     - Data loss risk
     - Backup complexity
     - Performance critical

  ❌ Cache (use managed ElastiCache)
     - Data loss acceptable
     - Managed is cheaper
     - Automatic failover

  ❌ Email service (use SendGrid/SES)
     - External integration
     - No state needed
```

### G.6 Production Dockerfile (Multi-worker)

```dockerfile
# File: backend/Dockerfile.worker

FROM node:20-alpine

WORKDIR /app

# System dependencies for video/PDF
RUN apk add --no-cache \
    chromium chromium-chromedriver \
    ffmpeg \
    python3 python3-dev \
    build-base cairo-dev jpeg-dev

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Worker processes don't need health checks
# (background processes, not HTTP)

ENV NODE_ENV=production
ENV WORKER_TYPE=pdf_video

CMD ["node", "backend/scripts/worker.js"]
```

### G.7 Backup Strategy for Containerized Deployment

```yaml
# Backup Configuration

Database:
  Type: RDS automated snapshots
  Frequency: Daily
  Retention: 30 days
  Cost: Automatic ($5-10/mo)
  
  Manual snapshots:
    - Before major deployments
    - Before migrations
    - Cost: $0.10 per GB-month

Uploads (S3):
  Type: S3 versioning + lifecycle policy
  Versioning: Enabled (retain 30 days)
  Deletion: 90 days (then delete)
  Backup: Cross-region replication
  Cost: $0.023/GB + replication

Backups (Full):
  Type: AWS Backup service
  Frequency: Daily
  Retention: 30 days
  Cost: $0.018 per GB backed up

Volume Snapshots:
  Type: EBS snapshots (if local storage used)
  Frequency: Hourly
  Retention: 7 days
  Cost: $0.05 per GB-month

Disaster Recovery:
  - RDS Multi-AZ: Automatic failover
  - Cross-region backup: Manual restore (1-2 hours)
  - Point-in-time recovery: To any second in 35 days
```

---

## PART H: SECURITY REVIEW

### H.1 Secret Management Issues

```
ISSUE #1: JWT_SECRET Hardcoded
  Location: backend/config/constants.js
  Problem: const JWT_SECRET = 'super-secret-quizhive-key-2026'
  Risk: CRITICAL - Secret exposed in source code
  
  Fix:
    // backend/config/constants.js
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret';
    
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required!');
    }
  
  Production:
    - Store in AWS Secrets Manager
    - Rotate every 90 days
    - Audit access logs

ISSUE #2: Database Credentials in .env
  Problem: DATABASE_URL has passwords
  Risk: HIGH - If .env committed, passwords exposed
  
  Solution:
    1. Never commit .env to git
    2. Use .env.example as template
    3. Store secrets in Secrets Manager
    4. Use IAM roles (AWS) instead of passwords when possible

ISSUE #3: SMTP Credentials Hardcoded
  Problem: Email passwords in .env
  Risk: HIGH - Email account compromise
  
  Solution:
    1. Use AWS SES (IAM-based, no password)
    2. Or use application-specific passwords
    3. Rotate quarterly
    4. Audit mail access logs

ISSUE #4: Ethereal Mock Account
  Problem: Transporter cached globally
  Risk: MEDIUM - If credentials change, not reloaded
  
  Solution:
    // backend/routes/trainings.js
    let cachedTransporter = null;
    
    async function getTransporter() {
      // Reload every 24 hours or on change
      const now = Date.now();
      if (!cachedTransporter || now - cachedTransporter.createdAt > 86400000) {
        cachedTransporter = nodemailer.createTransport(...);
        cachedTransporter.createdAt = now;
      }
      return cachedTransporter;
    }
```

### H.2 Missing Environment Variables

```
REQUIRED (must be set):
  ✅ NODE_ENV → development | production
  ✅ JWT_SECRET → Generated random string (32+ chars)
  ✅ DB_HOST → PostgreSQL hostname
  ✅ DB_PORT → PostgreSQL port (5432)
  ✅ DB_USER → PostgreSQL username
  ✅ DB_PASS → PostgreSQL password
  ✅ DB_NAME → Database name
  ✅ REDIS_URL → Redis connection URL
  
RECOMMENDED (should be set):
  ⚠️ PORT → Server port (default: 5000)
  ⚠️ CORS_ORIGIN → Allowed CORS origins
  ⚠️ SMTP_HOST → Email SMTP host
  ⚠️ SMTP_PORT → Email SMTP port
  ⚠️ SMTP_USER → Email username
  ⚠️ SMTP_PASS → Email password
  ⚠️ SMTP_SECURE → TLS enabled (true/false)
  ⚠️ LOG_LEVEL → debug | info | warn | error

OPTIONAL (defaults work):
  ○ DB_LOGGING → Enable query logging (true/false)
  ○ DB_SSL → Use SSL for DB (true/false)
  ○ PUPPETEER_TIMEOUT → PDF timeout (ms, default: 30000)
  ○ FILE_UPLOAD_LIMIT → Max upload size (default: 5MB)

Template: backend/.env.example
```

### H.3 Missing SSL/TLS

```
ISSUE: No HTTPS in current setup
  Problem: All data transmitted in plaintext
  Risk: CRITICAL
  
  Implementation:
    1. AWS Certificate Manager (free SSL)
    2. Apply to ALB (load balancer)
    3. Redirect HTTP → HTTPS
    4. Enable HSTS (HTTP Strict Transport Security)

Code Changes:
  // backend/server.js
  
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }
  
  // HSTS header
  app.use((req, res, next) => {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

Nginx Config (if using reverse proxy):
  server {
    listen 80;
    server_name retailedgepro.com;
    return 301 https://$server_name$request_uri;
  }
  
  server {
    listen 443 ssl http2;
    server_name retailedgepro.com;
    
    ssl_certificate /etc/letsencrypt/live/retailedgepro.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/retailedgepro.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
  }
```

### H.4 Missing Rate Limiting

```
ISSUE: No protection against brute force/DDoS
  Problem: Anyone can send unlimited requests
  Risk: HIGH - API exhaustion, brute force attacks

Implementation:
  npm install express-rate-limit

Code:
  // backend/middleware/rateLimitMiddleware.js
  const rateLimit = require('express-rate-limit');
  
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per IP
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    skip: (req) => req.user?.role === 'Super Admin' // Exempt admins
  });
  
  const websocketLimiter = rateLimit({
    windowMs: 1000, // 1 second
    max: 10, // 10 events per second
    skip: (req) => true, // Handle in socket.io events instead
  });
  
  // Apply to routes
  router.post('/login', loginLimiter, ...);
  app.use('/api/', apiLimiter);

WebSocket Rate Limiting:
  // backend/sockets/quizEngine.js
  const socketEventLimiter = {};
  
  io.on('connection', (socket) => {
    socket.on('participant_response', (data) => {
      const key = `${socket.id}:response`;
      const now = Date.now();
      
      if (!socketEventLimiter[key]) {
        socketEventLimiter[key] = [];
      }
      
      // Remove events older than 1 second
      socketEventLimiter[key] = socketEventLimiter[key].filter(t => now - t < 1000);
      
      if (socketEventLimiter[key].length > 5) {
        socket.emit('error', 'Rate limit exceeded');
        return;
      }
      
      socketEventLimiter[key].push(now);
      // Process event
    });
  });
```

### H.5 Missing Request Validation

```
ISSUE: No input validation on API endpoints
  Problem: User can send any data, causes crashes or exploits
  Risk: HIGH - Injection attacks, data corruption

Implementation:
  npm install joi

Code:
  // backend/middleware/validationMiddleware.js
  const Joi = require('joi');
  
  const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }
    req.validatedBody = value;
    next();
  };
  
  // Example: Login validation
  const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  });
  
  router.post('/login', validate(loginSchema), async (req, res) => {
    const { email, password } = req.validatedBody;
    // Process...
  });
  
  // Example: Quiz creation
  const quizSchema = Joi.object({
    title: Joi.string().max(255).required(),
    description: Joi.string().max(2000),
    projectId: Joi.string().uuid().required(),
    questions: Joi.array().items({
      type: Joi.string().valid('multiple_choice', 'multi_select', 'poll'),
      text: Joi.string().required(),
      options: Joi.array().items(Joi.string()),
      correct_answer: Joi.string()
    })
  });
  
  router.post('/api/quizzes', validate(quizSchema), ...);
```

### H.6 CORS Configuration

```
ISSUE: CORS allows all origins
  // Current: app.use(cors());
  Problem: Anyone can make requests from any domain
  Risk: MEDIUM - CSRF attacks possible
  
Fix:
  const cors = require('cors');
  
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
```

### H.7 Security Checklist

```
CRITICAL (Must fix before production):
  ☐ Remove hardcoded JWT_SECRET
  ☐ Add HTTPS/SSL certificate
  ☐ Implement rate limiting
  ☐ Add input validation (Joi)
  ☐ Restrict CORS origins
  ☐ Use environment variables for secrets
  ☐ Enable database SSL connections
  ☐ Set secure cookie flags (httpOnly, secure, sameSite)
  ☐ Add security headers (Content-Security-Policy, X-Frame-Options)
  ☐ Implement CSRF protection
  ☐ Use password hashing (bcrypt) - already done ✓

HIGH (Should fix before launch):
  ☐ Implement API versioning (/api/v1/...)
  ☐ Add request logging/audit trail
  ☐ Implement proper error handling (don't expose stack traces)
  ☐ Set up intrusion detection
  ☐ Add IP whitelisting for admin endpoints
  ☐ Implement account lockout after failed logins
  ☐ Add Two-Factor Authentication (2FA)
  ☐ Use secure random number generation
  ☐ Implement session timeouts
  ☐ Add SQL injection protection (Sequelize parameterized queries) ✓

MEDIUM (Nice to have):
  ☐ Web Application Firewall (WAF)
  ☐ DDoS protection (Cloudflare)
  ☐ Security scanning (OWASP ZAP)
  ☐ Dependency scanning (Snyk)
  ☐ Code analysis (SonarQube)
  ☐ Penetration testing
  ☐ Bug bounty program
```

---

## PART I: PRODUCTION RECOMMENDATION

### I.1 Phase 1: 500-1000 Users (3-6 months)

**Target**: Efficient growth phase, cost under $1500/month

**Architecture:**
```
Frontend:
  - React SPA on S3 + CloudFront
  - Domain: retailedgepro.com
  - SSL: AWS Certificate Manager

Backend API Tier:
  - ECS Fargate
  - 2-3x t3.large tasks (2 CPU, 4 GB each)
  - Auto-scaling: 2-5 tasks based on CPU
  - Container: backend/Dockerfile
  - Update strategy: Blue-Green

Worker Tier:
  - ECS Fargate
  - 1-2x t3.2xlarge tasks (8 CPU, 16 GB each)
  - SQS queue for PDF/video jobs
  - Container: backend/Dockerfile.worker

Database:
  - RDS PostgreSQL db.t3.large (4 CPU, 32 GB)
  - Multi-AZ enabled
  - Automated backups: daily
  - Storage: 100 GB gp3, 3000 IOPS

Cache:
  - ElastiCache Redis cache.t3.small (t3.small, 1.5 GB)
  - Shared for sessions + query cache

Load Balancer:
  - Application Load Balancer (ALB)
  - HTTPS termination
  - Health checks: /health

CDN:
  - CloudFront
  - Cache: Videos (90 days), PDFs (30 days)

Storage:
  - S3 bucket: uploads, certificates, media
  - Versioning enabled
  - Server-side encryption

Monitoring:
  - CloudWatch: metrics, logs, dashboards
  - SNS: alerts on errors, failures
  - X-Ray: request tracing (optional)

DNS:
  - Route 53
  - Alias to ALB
  - Health checks

Monthly Cost Estimate:
  - ECS Fargate API: $150
  - ECS Fargate Workers: $100
  - ALB: $20
  - RDS PostgreSQL: $150
  - ElastiCache: $20
  - S3 storage: $20
  - CloudFront: $50
  - CloudWatch: $30
  - Data transfer: $50
  - Miscellaneous: $50
  Total: ~$640/month

Deployment:
  - GitHub Actions for CI/CD
  - Blue-Green deployments (zero downtime)
  - Automated database migrations
  - Rollback on health check failures
```

**Required Changes**:
1. ✅ Migrate SQLite → PostgreSQL
2. ✅ Add Redis connection pooling
3. ✅ Implement SQS job queue (PDF/video generation)
4. ✅ Add rate limiting middleware
5. ✅ Add input validation (Joi)
6. ✅ Move JWT_SECRET to environment variable
7. ✅ Implement Socket.io Redis adapter
8. ✅ Add health check endpoint
9. ✅ Add request logging
10. ✅ Setup CloudWatch monitoring

**Migration Timeline**: 4-6 weeks

### I.2 Phase 2: 1000-3000 Users (6-12 months)

**Target**: Scale horizontally, cost $2000-5000/month

**Changes from Phase 1**:
```
Backend API Tier:
  - 4-5x t3.large tasks (upgrade to t3.xlarge if needed)
  - Auto-scaling: 3-10 tasks

Worker Tier:
  - 3-4x t3.2xlarge or c5.2xlarge tasks

Database:
  - RDS PostgreSQL db.r5.xlarge (4 CPU, 32 GB)
  - Add read replicas for reporting
  - Performance Insights enabled

Redis:
  - Upgrade to cache.r5.large (2 CPU, 16 GB)
  - Multi-AZ replication

Load Balancer:
  - Same ALB, increased limits

CDN:
  - CloudFront: add additional distribution for API (optional)

Monitoring:
  - Add DataDog or New Relic for APM
  - Add distributed tracing

Database Optimization:
  - Add query caching layer
  - Archive old quiz responses (6+ months) to Glacier
  - Implement read replicas for reports

Cost: ~$3000/month
```

**Code Changes**:
1. Query optimization (add missing indexes)
2. Implement read replicas for reports
3. Add query caching layer
4. Archive old data to S3/Glacier
5. Implement connection pooling (RDS Proxy)

**Migration Timeline**: 4-8 weeks

### I.3 Phase 3: 3000-5000+ Users (12+ months)

**Target**: Multi-region, enterprise-grade, cost $5000-15000/month

**Changes from Phase 2**:
```
Backend API Tier:
  - 8-10x c5.xlarge tasks
  - Multi-region (us-east-1 + us-west-2)
  - DynamoDB for session store (instead of Redis)

Worker Tier:
  - 6-8x c5.2xlarge tasks
  - Distributed across regions

Database:
  - RDS PostgreSQL db.r5.2xlarge
  - Multi-region read replicas
  - AWS Database Migration Service for replication

Redis:
  - Redis cluster (multi-node)
  - Read/write sharding

Load Balancer:
  - Multi-region ALB
  - Route 53 health checks

CDN:
  - CloudFront + regional caches
  - Lambda@Edge for request optimization

Advanced Features:
  - ElastiSearch for logging
  - Kinesis for real-time analytics
  - SageMaker for ML-based recommendations

Cost: ~$8000-12000/month
```

**Cost: ~$10000/month**

---

## PART J: STEP-BY-STEP MIGRATION PLAN

### Week 1-2: Database Migration

**Step 1: Create PostgreSQL Instance**
```bash
# AWS RDS
aws rds create-db-instance \
  --db-instance-identifier retailedge-postgres \
  --db-instance-class db.t3.large \
  --engine postgres \
  --allocated-storage 100 \
  --master-username postgres \
  --master-user-password $(openssl rand -base64 32)
```

**Step 2: Export SQLite Data**
```bash
# backend/scripts/export-sqlite.js
npm run export:sqlite
# Generates: migrations/data/{table}.json
```

**Step 3: Update Connection String**
```bash
# Update backend/.env
DATABASE_URL=postgresql://user:pass@rds-host:5432/retailedge
```

**Step 4: Create Tables in PostgreSQL**
```bash
npm run migrate:up
```

**Step 5: Import Data**
```bash
npm run import:postgres
```

**Step 6: Verify Data Integrity**
```bash
npm run verify:data
# Checks row counts match between SQLite and PostgreSQL
```

**Step 7: Run in Parallel (24-48 hours)**
```
Both SQLite and PostgreSQL receive writes
Sync process replicates to PostgreSQL
```

**Step 8: Cutover**
```
1. Stop writes to SQLite
2. Final sync to PostgreSQL
3. Change DATABASE_URL to PostgreSQL only
4. Restart backend
5. Monitor for 24 hours
```

### Week 3: Infrastructure Setup (AWS)

**Step 1: VPC Configuration**
```bash
# Create VPC, subnets, security groups
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24
aws ec2 create-security-group --vpc-id vpc-xxx --group-name retailedge-api
```

**Step 2: RDS Database**
```bash
# Multi-AZ PostgreSQL
aws rds modify-db-instance \
  --db-instance-identifier retailedge-postgres \
  --multi-az \
  --backup-retention-period 30
```

**Step 3: ElastiCache Redis**
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id retailedge-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1
```

**Step 4: S3 Bucket**
```bash
aws s3 mb s3://retailedge-uploads --region us-east-1
aws s3api put-bucket-versioning \
  --bucket retailedge-uploads \
  --versioning-configuration Status=Enabled
```

**Step 5: ECR Repository**
```bash
aws ecr create-repository --repository-name retailedge
```

### Week 4: Dockerization & CI/CD

**Step 1: Create Dockerfile**
- backend/Dockerfile
- backend/Dockerfile.worker
- frontend/Dockerfile

**Step 2: GitHub Actions CI/CD**
```yaml
# .github/workflows/deploy.yml
name: Deploy to ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to ECR
        run: aws ecr get-login-password | docker login ...
      
      - name: Build and Push
        run: |
          docker build -t retailedge:backend-${{ github.sha }} ./backend
          docker push ...
      
      - name: Update ECS service
        run: aws ecs update-service ...
```

**Step 3: Deploy to ECS**
```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name retailedge

# Create task definitions
aws ecs register-task-definition \
  --cli-input-json file://task-definition-api.json

# Create service
aws ecs create-service \
  --cluster retailedge \
  --service-name retailedge-api \
  --task-definition retailedge:1 \
  --desired-count 2 \
  --launch-type FARGATE
```

### Week 5: Testing & Deployment

**Step 1: Load Testing**
```bash
# 100 concurrent users
npm run load-test:100

# 500 concurrent users
npm run load-test:500

# Check: CPU < 70%, Memory < 80%, Error rate < 1%
```

**Step 2: Security Scanning**
```bash
# OWASP dependency check
npm audit

# Snyk scanning
snyk test

# Container scanning
aws ecr scan-image --repository-name retailedge --image-id latest
```

**Step 3: Blue-Green Deployment**
```
1. Deploy to GREEN (new environment)
2. Run smoke tests
3. Switch 10% traffic to GREEN (canary)
4. Monitor for 5 minutes
5. Switch 100% to GREEN
6. Keep BLUE running for 1 hour (rollback ready)
```

**Step 4: Monitoring Setup**
```bash
# CloudWatch dashboards
aws cloudwatch put-dashboard ...

# SNS alerts
aws sns create-topic --name retailedge-alerts
```

### Week 6: Production Optimization

**Step 1: Add Missing Indexes**
```sql
CREATE INDEX idx_sessions_quiz_id ON sessions(quiz_id);
CREATE INDEX idx_participants_session_id ON participants(session_id);
-- ... (all indexes from Part C)
```

**Step 2: Implement Caching**
```javascript
// Redis cache layer for reports
const reportCache = new Map();
// TTL: 1 hour for aggregated reports
```

**Step 3: Rate Limiting**
```javascript
// Add express-rate-limit middleware
```

**Step 4: Performance Monitoring**
```bash
# Monitor slow queries
SELECT query, calls, total_time FROM pg_stat_statements
ORDER BY total_time DESC LIMIT 10;
```

---

## PART K: RISK ASSESSMENT

### Critical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| **Database Failure** | Data loss, 100% downtime | Low (5%) | Multi-AZ RDS, automated backups, read replicas |
| **API Tier Crash** | Service unavailable | Medium (15%) | Auto-scaling, health checks, multiple instances |
| **Memory Leak in Puppeteer** | PDF generation fails | Medium (20%) | Connection pooling, instance recycling, monitoring |
| **SQLite Concurrency** | Slow quizzes, timeouts | High (80% if no migration) | PostgreSQL migration (DONE by Phase 1) |
| **Redis Connection Failure** | Session loss, reconnect storm | Medium (10%) | Multi-AZ Redis, connection retry logic |
| **Cloudflare Tunnel Failure** | Offline participants can't join | Medium (15%) | Fallback to LAN IP, manual tunnel URL setup |

### Mitigation Strategies

1. **Database Failure**
   - RDS Multi-AZ: Automatic failover in 2 minutes
   - Daily snapshots: 30-day restore window
   - Read replicas: For reporting queries
   - Backup to S3: Disaster recovery

2. **API Tier Crash**
   - Auto-scaling: Add instances if CPU > 70%
   - Health checks: Remove unhealthy instances
   - Load balancer: Distribute across instances
   - Circuit breakers: Fail gracefully

3. **Memory Leaks**
   - Container memory limits: Restart on OOM
   - Puppeteer pooling: Limit concurrent browsers
   - Worker tier: Separate from API, contained failure
   - Monitoring: Alert on memory growth trends

4. **Database Performance**
   - Query optimization: Missing indexes, N+1 queries
   - Connection pooling: RDS Proxy
   - Read replicas: For reports/analytics
   - Caching: Redis for frequently accessed data

5. **Network Issues**
   - Multi-region: For high availability
   - DNS failover: Route 53 health checks
   - CDN: For static assets (fault-tolerant)
   - Rate limiting: Prevent cascading failures

---

## FINAL ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PHASE 1: 500-1000 Users                       │
│                        Production-Ready Architecture                     │
└─────────────────────────────────────────────────────────────────────────┘

                          ┌──────────────────────┐
                          │    Route 53 DNS      │
                          │  (retailedgepro.com) │
                          └──────────┬───────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │   AWS Certificate Manager       │
                    │   (HTTPS/SSL Termination)       │
                    └────────────────┬────────────────┘
                                     │
                    ┌────────────────▼──────────────────┐
                    │  CloudFront CDN                   │
                    │  (Cache: Videos 90d, PDFs 30d)   │
                    └────────────────┬─────────────────┘
                                     │
                    ┌────────────────▼──────────────────┐
                    │  Application Load Balancer (ALB)  │
                    │  - HTTP/2 with gRPC              │
                    │  - Connection draining: 60s      │
                    │  - Sticky sessions: disabled     │
                    └────────────────┬──────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
    ┌───▼────┐                   ┌───▼────┐                   ┌───▼────┐
    │ API-1  │                   │ API-2  │                   │ API-3  │
    │ Fargate│                   │ Fargate│                   │ Fargate│
    │2CPU/4GB│                   │2CPU/4GB│                   │2CPU/4GB│
    │Running │                   │Running │                   │Pending │
    └───┬────┘                   └───┬────┘                   └───┬────┘
        │                            │                            │
        │ (Port 5000)                │ (Port 5000)                │
        └────────────────────────────┼────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
    ┌───▼────────┐             ┌────▼─────┐              ┌──────▼─────┐
    │ Worker-1   │             │ Worker-2 │              │  SQS Queue │
    │ Fargate    │             │ Fargate  │              │ (Backlog)  │
    │8CPU/16GB   │             │8CPU/16GB │              │ 0-10 jobs  │
    │PDF/Video   │             │PDF/Video │              └────────────┘
    └────────────┘             └──────────┘

        ┌──────────────────────────────────────────────────────────┐
        │                     DATA LAYER                           │
        ├──────────────────────────────────────────────────────────┤
        │                                                          │
        │   ┌───────────────────────┐  ┌─────────────────────┐   │
        │   │ RDS PostgreSQL (Multi │  │ ElastiCache Redis   │   │
        │   │ -AZ)                  │  │ cache.t3.micro      │   │
        │   │ db.t3.large (4CPU)    │  │ 1.5 GB              │   │
        │   │ 32 GB RAM             │  │                     │   │
        │   │ 100 GB gp3 storage    │  │ - Session store     │   │
        │   │ 3000 IOPS             │  │ - Query cache       │   │
        │   │ 30-day backups        │  │ - Rate limits       │   │
        │   │ Auto-failover enabled │  │ - Leaderboard       │   │
        │   │                       │  │ 30-day BGSAVE       │   │
        │   │ - User data           │  │ Multi-AZ enabled    │   │
        │   │ - Quizzes             │  │                     │   │
        │   │ - Sessions (500MB)    │  │ Pub/Sub for         │   │
        │   │ - Responses (50GB)    │  │ Socket.io events    │   │
        │   │ - Trainings           │  │                     │   │
        │   │ - Certificates        │  │                     │   │
        │   └───────────────────────┘  └─────────────────────┘   │
        │                                                          │
        │   ┌──────────────────────────────────────────────┐      │
        │   │ S3 Bucket (Uploads, Media, Certificates)   │      │
        │   │ - 100 GB storage                           │      │
        │   │ - Versioning enabled                       │      │
        │   │ - Server-side encryption                   │      │
        │   │ - Lifecycle: Archive to Glacier after 90d  │      │
        │   └──────────────────────────────────────────────┘      │
        │                                                          │
        └──────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────────────────┐
        │                  MONITORING & LOGGING                    │
        ├──────────────────────────────────────────────────────────┤
        │                                                          │
        │ - CloudWatch Metrics (CPU, Memory, Latency, Errors)    │
        │ - CloudWatch Logs (Application logs)                   │
        │ - X-Ray Tracing (Request path analysis)                │
        │ - SNS Alerts (On failures, high CPU, errors)           │
        │ - Dashboard (Real-time metrics)                        │
        │                                                          │
        └──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           DEPLOYMENT PROCESS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. Developer: git push to main                                         │
│  2. GitHub Actions: Trigger CI/CD pipeline                             │
│  3. Build: docker build -t retailedge:api-v1.2.0 ./backend            │
│  4. Test: Run security scans, unit tests                               │
│  5. Push: aws ecr push retailedge:api-v1.2.0                          │
│  6. Deploy to GREEN:                                                  │
│     - Launch 3 new Fargate tasks with v1.2.0                          │
│     - Wait for health checks (30 seconds)                             │
│     - Run smoke tests                                                 │
│  7. Switch traffic: ALB weighted target group                         │
│     - 90% BLUE (v1.1.0), 10% GREEN (v1.2.0) [Canary]                │
│     - Monitor errors for 5 minutes                                   │
│     - If errors < 1%, proceed to 50/50                              │
│     - If errors still < 1%, proceed to 100% GREEN                   │
│  8. Cleanup: Keep BLUE running for 1 hour (instant rollback)         │
│  9. If issues: ALB switches back to BLUE (30 seconds)                │
│     All users redirected to working version transparently            │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## SUMMARY & RECOMMENDATIONS

### Quick Decision Matrix

**For 100-300 Users (Next 3 months)**:
- ✅ **Option**: Single EC2 t3.2xlarge + Docker Compose
- Cost: $400/month
- Setup: 1 week
- Risk: Medium (single point of failure)

**For 500-1000 Users (3-6 months)** ← PHASE 1 ← RECOMMENDED NOW
- ✅ **Option**: AWS ECS Fargate
- Cost: $640/month
- Setup: 4-6 weeks (includes database migration)
- Risk: Low (managed, auto-scaling)

**For 1000-3000 Users (6-12 months)** ← PHASE 2
- ✅ **Option**: AWS ECS Fargate (scale up)
- Cost: $3000/month
- Setup: 4-8 weeks (optimization)
- Risk: Low

**For 3000-5000+ Users (12+ months)** ← PHASE 3
- ✅ **Option**: AWS ECS Fargate + Kubernetes
- Cost: $10000/month
- Setup: 8-12 weeks (multi-region)
- Risk: Low

### Critical Next Steps (Priority Order)

1. **IMMEDIATE (Week 1)**:
   - [ ] Migrate SQLite → PostgreSQL
   - [ ] Move JWT_SECRET to environment variables
   - [ ] Add HTTPS/SSL certificate

2. **SHORT TERM (Weeks 2-3)**:
   - [ ] Set up AWS infrastructure
   - [ ] Create Dockerfiles
   - [ ] Implement SQS job queue for PDF/video
   - [ ] Add Redis adapter for Socket.io

3. **MEDIUM TERM (Weeks 4-6)**:
   - [ ] Implement CI/CD pipeline (GitHub Actions)
   - [ ] Deploy to ECS Fargate
   - [ ] Add monitoring/alerting
   - [ ] Load test (500+ users)

4. **ONGOING**:
   - [ ] Query optimization (missing indexes)
   - [ ] Rate limiting middleware
   - [ ] Input validation (Joi)
   - [ ] Performance monitoring
   - [ ] Security scanning (OWASP)

### Success Criteria for Phase 1

```
✅ Single server fully replaces SQLite
✅ Database performs well at 1000 users
✅ API responds in < 500ms (p95)
✅ WebSocket stability 99.9%
✅ Zero-downtime deployments working
✅ Auto-scaling responding correctly
✅ Alert system functioning
✅ Backup/recovery tested
✅ Cost tracking accurate
✅ Security vulnerabilities addressed
```

