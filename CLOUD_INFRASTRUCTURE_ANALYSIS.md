# RetailEdge Pro - Cloud Infrastructure Analysis
## Deployment Architecture & Resource Estimation

**Prepared for**: Cloud Infrastructure Planning  
**Date**: 2026-06-23  
**Application**: RetailEdge Pro (Quiz/Training LMS)

---

## Executive Summary

RetailEdge Pro is a **media-intensive, real-time quiz platform** with resource-heavy content generation (video, PDF). Current architecture is **single-server optimized** but can scale to handle 50-100 concurrent quiz sessions. Database must migrate from SQLite to PostgreSQL for multi-user production deployments.

---

## 1. CPU REQUIREMENTS

### Development Environment
```
Minimum: 2 cores @ 2.0 GHz
Recommended: 4 cores @ 2.5 GHz
```

### Production - Single Server (50-100 concurrent sessions)
```
Minimum: 4 cores @ 2.5 GHz
Recommended: 8 cores @ 3.0+ GHz
```

### Production - Scaled Deployment (1000+ concurrent users)
```
API Tier: 8-16 cores per instance (horizontal scalable)
Worker Tier: 8-16 cores per instance (video/PDF generation)
Database: 16-32 cores (high I/O + complex queries)
```

### CPU Workload Breakdown

| Component | Load | Duration | Frequency | Priority |
|-----------|------|----------|-----------|----------|
| **Express API** (quiz/CRUD) | 5-15% | Continuous | Per request | Normal |
| **Socket.io Broadcasting** | 10-20% per 100 participants | 1-2 sec | Per question | Normal |
| **Puppeteer PDF Generation** | 80-100% (single core bound) | 5-30 sec | On-demand | High |
| **FFmpeg Video Processing** | 90-100% (multi-threaded, uses all cores) | 5+ minutes | On-demand | High |
| **Database Query Processing** | 20-40% peak | 100-500ms | Per API request | Normal |
| **Authentication (JWT)** | <1% | <10ms | Per request | Low |
| **Compression/Serialization** | 5-10% | Varies | Per response | Low |

### CPU Bottlenecks Identified

❌ **Current Limitations:**
1. **Single-threaded Puppeteer** for PDF generation blocks all other requests
2. **FFmpeg CPU-bound** — consumes all available cores during video encoding
3. **SQLite write locks** — sequential writes under concurrency
4. **No process pooling** — each request spawns new Puppeteer instance

✅ **Optimization Opportunities:**
- Implement Puppeteer pool (6-10 instances)
- Offload video generation to separate worker tier
- Use multi-processing for query aggregation
- Implement request queuing for heavy operations

---

## 2. RAM REQUIREMENTS

### Development Environment
```
Minimum: 4 GB
Recommended: 8 GB
```

### Single-Server Production (up to 100 concurrent sessions)
```
Minimum: 8 GB
Recommended: 16 GB
- 2-4 GB: Node.js process base + Express
- 2-4 GB: In-memory session tracking + WebSocket connections
- 2-4 GB: Puppeteer instances (1-2 concurrent)
- 2-4 GB: Database queries + caching
- 2-4 GB: OS + system buffers
```

### Scaled Deployment (1000+ concurrent users)

**API Server** (per instance):
```
12-16 GB
- Base Node.js: 2 GB
- WebSocket/session tracking: 4-6 GB
- Puppeteer pool (6 instances): 1.2-2.4 GB
- Query cache: 1-2 GB
- Buffers/reserves: 2 GB
```

**Worker Server** (video/PDF generation):
```
24-32 GB
- Puppeteer pool (8-10 instances): 2-4 GB
- FFmpeg processes: 4-8 GB
- FFmpeg frame buffers: 2-4 GB
- Queue processing: 2 GB
- OS buffers: 4-8 GB
```

**Database Server** (PostgreSQL):
```
32-64 GB
- PostgreSQL shared buffer: 8-16 GB (25% of RAM)
- Page cache: 8-16 GB
- Working memory per query: 4-8 GB
- Connection buffers: 2-4 GB
- OS buffers: 4-8 GB
```

### Memory Breakdown by Feature

| Feature | RAM Used | Notes |
|---------|----------|-------|
| **Base Node.js** | ~200 MB | Heap base size |
| **Express app** | ~100 MB | Routes, middleware |
| **100 WebSocket connections** | ~50-100 MB | Room tracking, participant maps |
| **1000 WebSocket connections** | ~500 MB - 1 GB | Scales linearly |
| **Puppeteer instance** | 150-400 MB | Per browser instance |
| **FFmpeg process** | 100-200 MB | Per concurrent encoding |
| **SQLite database** | ~50-100 MB | File-based, minimal overhead |
| **In-memory session store** | 1 MB per 10 participants | No expiration cleanup |
| **Query result cache** | 50-200 MB | Optional, not implemented |

### Memory Concerns

⚠️ **Critical Issues:**
1. **No Puppeteer pooling** — each PDF/video request creates new 200-400 MB instance
   - 10 simultaneous PDFs = 2-4 GB spike
   - No cleanup if process fails

2. **In-memory room tracking unbounded** — stores entire quiz state
   - 1000 rooms × 100 participants = ~100 MB
   - Never cleaned up after session ends

3. **SQLite memory mapping** — file mapped into RAM
   - Large quiz databases can consume significant memory

4. **Node.js heap growth** — no garbage collection triggers defined

### Recommended Memory Management

```javascript
// Add to server.js
const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
if (heapUsed > 1024) { // 1GB threshold
  console.warn(`Heap usage high: ${heapUsed}MB, triggering GC`);
  if (global.gc) global.gc();
}

// Session cleanup (every hour)
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of Object.entries(rooms)) {
    if (now - session.createdAt > 7200000) { // 2 hour timeout
      delete rooms[sessionId];
    }
  }
}, 3600000);
```

---

## 3. STORAGE REQUIREMENTS

### Development Environment
```
Total: 2-5 GB
- Code: 500 MB
- node_modules: 1-2 GB
- Database (SQLite): 10-50 MB
- Uploads (test images): 50-100 MB
- Build outputs: 200-500 MB
```

### Single-Server Production (Year 1)

```
Total: 100-500 GB

Breakdown:
├── Database (SQLite/PostgreSQL)
│   ├── User/Role data: ~100 MB
│   ├── Quizzes + Questions: ~500 MB
│   ├── Sessions + Responses: ~50 GB (50k sessions × 100 participants × 4 bytes)
│   ├── Trainings + Progress: ~20 GB
│   ├── Audit logs: ~10 GB
│   └── Total: ~80 GB
│
├── Media Assets
│   ├── Executive videos (MP4): 20-50 GB (40-100 videos × 500-1000 MB)
│   ├── PDFs (certificates, reports): 10-20 GB (40k certificates × 250 KB)
│   ├── Screenshots: 5-10 GB
│   └── Total: ~50 GB
│
├── Uploads (User Files)
│   ├── Profile pictures: 500 MB
│   ├── Project logos: 100 MB
│   ├── Client logos: 100 MB
│   └── Total: ~1 GB
│
├── Application Code
│   ├── Frontend build (dist): 2-5 MB
│   ├── Backend source: 100 MB
│   ├── node_modules (backend): 1.5 GB
│   ├── node_modules (frontend): 2 GB
│   └── Total: ~3.6 GB
│
├── Logs & Temp
│   ├── Application logs: 5-10 GB
│   ├── System logs: 2-5 GB
│   ├── Temp files: 1 GB
│   └── Total: ~10 GB
│
└── OS & System: ~20 GB
```

### Scaled Deployment (Multi-Server, 1000+ users)

**Per Server Breakdown:**

| Component | Single Server | 3-Server Cluster | Notes |
|-----------|---------------|------------------|-------|
| Database | 80-100 GB | 240-300 GB (replicated) | PostgreSQL with replication |
| Videos | 50 GB | 100-150 GB (shared storage) | S3/EBS replicated |
| User uploads | 1-2 GB | 10-20 GB (distributed) | S3 or distributed NFS |
| Logs | 10 GB | 50 GB (centralized ELK) | ECS/S3 bucket |
| Backups | (Daily) 150 GB | (Daily) 300 GB | S3 with versioning |
| **TOTAL** | **~300 GB** | **~750 GB** | Per cluster |

### Storage Type Recommendations

| Data Type | Storage Solution | Reasoning |
|-----------|-----------------|-----------|
| **Database** | EBS (SSD) io1/gp3 | 3000-10000 IOPS needed for concurrent queries |
| **Media (videos)** | S3 Intelligent-Tiering | Infrequent access, large files, distribution |
| **Certificates/PDFs** | S3 Standard | Generated on-demand, cached 30 days |
| **User uploads** | S3 or EBS | Small files (~5MB max), accessed frequently |
| **Logs** | CloudWatch Logs/ELK | Structured, searchable, retention policy |
| **Backups** | S3 + Glacier | Database snapshots daily, archive monthly |
| **Temporary files** | Local NVMe or tmpfs | PDFs during generation, cleaned hourly |

### Storage Growth Projections

```
Year 1:  300 GB (baseline)
Year 2:  750 GB (2.5x growth)
Year 3:  1.5 TB (2x from Year 2)
Year 5:  5+ TB (enterprise scale)

Assumptions:
- 10k new users/month
- 50% of users complete 5 quizzes/month (250k responses)
- 1 video generated/week (500 MB each)
- 1k certificates/month
```

### Storage I/O Requirements

| Operation | Throughput | Frequency | Total IOPS |
|-----------|-----------|-----------|-----------|
| User list (GET) | 100 MB/s sequential | 10 req/min | 1,000 |
| Report generation | 50 MB/s random | 5 req/min | 500 |
| Video writing | 100 MB/s sequential | 1 job/hour | 100 |
| PDF generation | 20 MB/s sequential | 10 jobs/min | 200 |
| Session data logging | 10 MB/s sequential | Continuous | 100 |
| **Peak IOPS** | — | — | **2,000** |

**Recommendation**: Use **SSD storage** (gp3/io1) with **3,000-5,000 provisioned IOPS**

---

## 4. REQUIRED PORTS

### Inbound Ports

| Port | Protocol | Service | Access | Purpose |
|------|----------|---------|--------|---------|
| **80** | HTTP | Frontend | Public | HTTP redirect to 443 |
| **443** | HTTPS/TLS | Frontend + API | Public | Frontend SPA, API requests |
| **5000** | HTTP/WS | Backend API | Private* | Express server, Socket.io |
| **5173** | HTTP | Vite Dev | Dev only | Development server (remove in prod) |
| **3306** | TCP | MySQL | Private | (Optional if using MySQL) |
| **5432** | TCP | PostgreSQL | Private | Database (recommended) |
| **6379** | TCP | Redis | Private | Session cache, job queue |
| **9200** | HTTP | Elasticsearch | Private | Log indexing (optional) |
| **25** | SMTP | Email | Outbound | Sending emails (Nodemailer) |
| **587** | SMTP TLS | Email | Outbound | Sending emails (Ethereal/Gmail) |

*Private = Internal only (VPC/security group restricted)

### Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Internet (Public)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                  ┌────▼──────┐
                  │  AWS ELB   │
                  │ (Port 443) │
                  └────┬───────┘
                       │ (HTTPS/TLS)
         ┌─────────────┴──────────────┐
         │                            │
    ┌────▼────┐                  ┌────▼────┐
    │ API Srv │                  │ API Srv │
    │(5000)   │                  │(5000)   │
    └────┬────┘                  └────┬────┘
         │                            │
         └─────────────┬──────────────┘
                       │ (Private)
         ┌─────────────┴──────────────┐
         │                            │
    ┌────▼─────────┐            ┌────▼─────────┐
    │ PostgreSQL   │            │   Redis      │
    │ (5432)       │            │  (6379)      │
    └──────────────┘            └──────────────┘

Firewall Rules:
- 80, 443: Allow from 0.0.0.0/0 (public internet)
- 5000: Allow from ELB only
- 5432, 6379: Allow from API tier only
- SSH (22): Allow from admin IPs only
```

### Outbound Ports (Backend must reach)

| Port | Protocol | Service | Purpose |
|------|----------|---------|---------|
| **25, 587** | SMTP | Email providers | Send training invites, certificates |
| **443** | HTTPS | API calls | Cloudflare Tunnel, external APIs |
| **3306, 5432** | TCP | Databases | (if external hosted) |
| **53** | DNS | DNS queries | Domain resolution |

### Port Allocation Strategy

```yaml
Development:
  Frontend: 5173
  Backend:  5000
  Database: 5432 (local PostgreSQL)
  Redis:    6379

Staging/Production (AWS):
  ALB: 80, 443
  API Tier: 5000 (private, port mapping via ECS/Docker)
  RDS: 5432 (managed, not exposed)
  ElastiCache: 6379 (managed, not exposed)
  CloudFront: 443 → S3/ALB
```

---

## 5. DATABASE DEPENDENCIES

### Current Database: SQLite

**Status**: Development/testing only

```
File: /backend/quizhive.sqlite
Size: 10-100 MB (grows with data)
Connections: Single process (file-based locking)
Performance: OK for <100 concurrent users
```

**Limitations for Production:**
- ❌ No concurrent writes (file locks)
- ❌ No distributed replication
- ❌ No user/permission system
- ❌ Limited query optimization
- ❌ No connection pooling
- ❌ Poor performance on large datasets (>1 GB)

### Recommended: PostgreSQL

**Specifications:**

```yaml
Version: 13+ (14+ recommended)
Connections: 
  Min: 20
  Max: 200 (scale with app tier)
Memory:
  shared_buffers: 8 GB (25% of host RAM)
  effective_cache_size: 24 GB
Storage:
  Type: EBS gp3 or io1
  IOPS: 3,000-10,000 (depends on load)
  Size: 100 GB minimum, 500 GB+ recommended
Extensions:
  - pg_trgm (full-text search optimization)
  - uuid-ossp (UUID generation)
  - pg_stat_statements (query monitoring)
```

### Database Schema & Indexes

**Critical Tables & Sizes:**

| Table | Rows (Year 1) | Size | Growth |
|-------|---------------|------|--------|
| users | 10k | 50 MB | Linear |
| quizzes | 500 | 10 MB | Linear |
| sessions | 50k | 100 MB | Linear |
| responses | 5M | 50 GB | Exponential |
| participants | 500k | 200 MB | Exponential |
| training_progress | 100k | 50 MB | Linear |
| certificates | 50k | 100 MB | Linear |

**Required Indexes** (not currently defined):

```sql
-- Critical for performance
CREATE INDEX idx_sessions_quiz_id ON sessions(quiz_id);
CREATE INDEX idx_participants_session_id ON participants(session_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);
CREATE INDEX idx_responses_participant_id ON responses(participant_id);
CREATE INDEX idx_responses_question_id ON responses(question_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_project_id ON users(project_id);
CREATE INDEX idx_training_progress_user_project ON training_progress(user_id, project_id);

-- Performance critical (composite indexes)
CREATE INDEX idx_responses_session_question ON responses(participant_id, question_id);
CREATE INDEX idx_participants_session_user ON participants(session_id, user_id);

-- Search optimization
CREATE INDEX idx_users_name_trgm ON users USING gin(name gin_trgm_ops);
```

### Migration Strategy: SQLite → PostgreSQL

**Step 1: Schema Migration**
```bash
# Use Sequelize migrations to auto-generate
npm run migrate:create migration-sqlite-to-postgres

# Manual SQL mapping for views/functions
```

**Step 2: Data Export**
```javascript
// backend/scripts/export-sqlite.js
const sequelize = require('../config/database');
const fs = require('fs');

async function exportData() {
  const models = require('../models');
  for (const model of Object.values(models)) {
    const data = await model.findAll();
    fs.writeFileSync(`${model.name}.json`, JSON.stringify(data, null, 2));
  }
}
```

**Step 3: Database Preparation**
```bash
# Create PostgreSQL instance (AWS RDS or self-managed)
# Set up connection string in .env
DATABASE_URL=postgresql://user:pass@rds-host:5432/retailedge
```

**Step 4: Import & Validate**
```bash
# Run via Sequelize
npm run migrate:up
npm run seed:production  # Re-populate data
# Validate row counts match
```

**Step 5: Cutover**
```
1. Stop API tier
2. Verify PostgreSQL has all data
3. Update DATABASE_URL to production DB
4. Restart API tier
5. Monitor for 24 hours
6. Keep SQLite backup for 30 days
```

### Connection Pooling Configuration

```javascript
// backend/config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  pool: {
    max: 20,           // Max connections
    min: 5,            // Min pool size
    acquire: 30000,    // Timeout to get connection
    idle: 10000,       // Release idle connections
  },
  logging: false,
  operatorsAliases: false,
});
```

### Backup & Recovery Strategy

```
Frequency: Daily snapshots, hourly incremental
Retention: 30-day rolling window
Location: S3 + secondary region
RPO: 1 hour (max data loss)
RTO: 15 minutes (recovery time)

Automated:
aws rds create-db-snapshot --db-instance-identifier retailedge-prod
aws s3 sync /var/lib/postgresql/backups s3://retailedge-backups/
```

---

## 6. EXTERNAL SERVICES

### Required Services

#### 1. **Email Delivery** (Nodemailer)
```
Current: Ethereal (mock) or local SMTP
Production Options:
  - AWS SES (Simple Email Service)
  - SendGrid
  - Mailgun
  - Google Workspace SMTP

Configuration:
  SMTP_HOST: smtp.sendgrid.net
  SMTP_PORT: 587
  SMTP_USER: apikey
  SMTP_PASS: SG.xxxxxxxxxx
  
Capacity:
  - Emails per day: 100-1000
  - Bulk sends: Training invites (10-100/batch)
  - Rate limit: 100/sec (SendGrid)
```

**Cost Estimation:**
- SendGrid: $0.10 per 1000 emails (free tier: 100/day)
- AWS SES: $0.10 per 1000 emails (free: 62,000/month)
- Mailgun: $0.50/1000 emails (50k/month free)

#### 2. **Video Processing** (FFmpeg)
```
Type: Self-hosted, CPU-intensive
Deployment: Separate worker tier or Lambda
Capacity: 1-2 concurrent encodes per core
Scaling: Auto-scale worker pool

Installed via: @ffmpeg-installer/ffmpeg
Usage: Video generation (produce_video.js)
```

#### 3. **Screenshot/PDF Generation** (Puppeteer)
```
Type: Self-hosted, memory-intensive
Deployment: Backend API or separate worker
Capacity: 1-2 concurrent instances per 1 GB RAM
Scaling: Browser pool + job queue

Installed via: npm package
Usage: 
  - Certificate PDFs
  - Report generation
  - Executive presentations
```

#### 4. **Public URL Tunneling** (Cloudflare Tunnel)
```
Type: Third-party service, auto-started
Purpose: Enable mobile participants from any network
Installation: cloudflared CLI
Usage: Backend auto-starts on startup
Cost: Free tier (1-10 concurrent connections)
Production: Upgrade to pro/enterprise

Alternative: ngrok (paid), custom ngrok server
```

### Optional Services

| Service | Use Case | Cost | Priority |
|---------|----------|------|----------|
| **CloudFront** | CDN for videos/assets | $0.085/GB | Medium |
| **S3** | File storage (uploads) | $0.023/GB | High |
| **ElastiCache** | Session/query caching | $0.017/hr (t3.micro) | Medium |
| **CloudWatch** | Logs & monitoring | $0.50/GB ingested | High |
| **Sentry** | Error tracking | Free-$500/mo | Low |
| **New Relic** | APM monitoring | $0.29/hour | Medium |
| **GitHub Actions** | CI/CD pipelines | Free (2000 min/mo) | High |
| **DataDog** | Full-stack monitoring | $15/host/mo | Medium |

---

## 7. PRODUCTION DEPLOYMENT ARCHITECTURE

### Architecture Option 1: AWS-Based (Recommended for Growth)

```
┌────────────────────────────────────────────────────────────────┐
│                      AWS ACCOUNT                               │
│                    (Region: us-east-1)                         │
└────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  PUBLIC TIER (Internet-facing)                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Route 53 (DNS)                                       │   │
│  │ retailedgepro.com → ALB IP                          │   │
│  └─────────────────────────────────────────────────────┘   │
│           │                                                  │
│  ┌────────▼─────────────────────────────────────────┐       │
│  │ CloudFront (CDN)                                  │       │
│  │ - Cache static assets (videos, PDFs)             │       │
│  │ - Compress responses                             │       │
│  │ - Edge locations worldwide                       │       │
│  └────────┬─────────────────────────────────────────┘       │
│           │                                                  │
│  ┌────────▼─────────────────────────────────────────┐       │
│  │ Application Load Balancer (ALB)                   │       │
│  │ - SSL/TLS termination                            │       │
│  │ - Health checks                                  │       │
│  │ - Path-based routing (/api → backend)            │       │
│  │ - Cross-AZ redundancy                            │       │
│  └────────┬─────────────────────────────────────────┘       │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────────┐
│  APP TIER (ECS Fargate)                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Task: API-1  │  │ Task: API-2  │  │ Task: API-3  │      │
│  │ Backend      │  │ Backend      │  │ Backend      │      │
│  │ (Node.js)    │  │ (Node.js)    │  │ (Node.js)    │      │
│  │ Port 5000    │  │ Port 5000    │  │ Port 5000    │      │
│  │ 2 CPU, 4 GB  │  │ 2 CPU, 4 GB  │  │ 2 CPU, 4 GB  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│        │                  │                 │               │
│        └──────────────────┼─────────────────┘               │
│                           │                                 │
│  ┌────────────────────────▼──────────────────────┐          │
│  │ Auto Scaling Group                            │          │
│  │ Min: 2, Desired: 3, Max: 10                  │          │
│  │ Scale on: CPU > 70%, Network > 80%            │          │
│  └─────────────────────────────────────────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐ ┌──────▼───────┐ ┌───────▼─────────┐
│ DATA TIER      │ │ CACHE TIER   │ │ STORAGE TIER    │
├────────────────┤ ├──────────────┤ ├─────────────────┤
│                │ │              │ │                 │
│ Amazon RDS     │ │ ElastiCache  │ │ S3 Bucket       │
│ PostgreSQL     │ │ Redis        │ │ - Video assets  │
│ - 2 x 16 GB    │ │ - t3.micro   │ │ - Certificates  │
│ - io1 storage  │ │ - 1 GB cache │ │ - User uploads  │
│ - Multi-AZ     │ │ - Replicated │ │ - Backup store  │
│ - Backup daily │ │              │ │ - 500 GB        │
│ - SSL enabled  │ │              │ │ - Versioning ON │
│                │ │              │ │ - Encryption ON │
└────────────────┘ └──────────────┘ └─────────────────┘
        ▲
        │
┌───────┴────────────────────────────────────────────────────┐
│  WORKER TIER (ECS Fargate Spot)                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ Task: Worker-1  │  │ Task: Worker-2  │                 │
│  │ Video/PDF Gen   │  │ Video/PDF Gen   │                 │
│  │ 8 CPU, 16 GB    │  │ 8 CPU, 16 GB    │                 │
│  │ Puppeteer pool  │  │ Puppeteer pool  │                 │
│  │ FFmpeg encoder  │  │ FFmpeg encoder  │                 │
│  └─────────────────┘  └─────────────────┘                 │
│        │                        │                         │
│        └────────────┬───────────┘                         │
│                     │                                     │
│  ┌──────────────────▼──────────────────┐                │
│  │ SQS (Job Queue)                     │                │
│  │ - PDF generation requests            │                │
│  │ - Video encoding jobs                │                │
│  │ - Email send tasks                   │                │
│  │ - Visibility timeout: 3600 sec       │                │
│  └─────────────────────────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

ADDITIONAL SERVICES:
├─ CloudWatch (Monitoring & Logs)
├─ Lambda (Scheduled jobs: backups, cleanup)
├─ SNS (Alerts & notifications)
├─ Secrets Manager (Credentials)
├─ VPC (Network isolation)
├─ Security Groups (Firewall rules)
└─ IAM (Access control)
```

### Architecture Option 2: Kubernetes (For Enterprise Scale)

```yaml
# kubectl apply -f k8s-manifests/

apiVersion: v1
kind: Namespace
metadata:
  name: retailedge-prod

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-backend
  namespace: retailedge-prod
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-backend
  template:
    metadata:
      labels:
        app: api-backend
    spec:
      containers:
      - name: backend
        image: retailedge:backend-latest
        ports:
        - containerPort: 5000
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: redis-config
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker-video
  namespace: retailedge-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: worker-video
  template:
    metadata:
      labels:
        app: worker-video
    spec:
      containers:
      - name: worker
        image: retailedge:worker-latest
        resources:
          requests:
            memory: "16Gi"
            cpu: "8"
          limits:
            memory: "32Gi"
            cpu: "16"
        env:
        - name: WORKER_TYPE
          value: "video"

---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: retailedge-prod
spec:
  type: LoadBalancer
  selector:
    app: api-backend
  ports:
  - name: http
    port: 80
    targetPort: 5000
  - name: https
    port: 443
    targetPort: 5000

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: retailedge-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Architecture Option 3: On-Premises / Self-Managed

```
Single Server (Small Deployment):
┌─────────────────────────────────────┐
│ Ubuntu 20.04 LTS                    │
│ - 16 GB RAM                         │
│ - 8 cores CPU                       │
│ - 500 GB SSD storage                │
│                                     │
│ ┌──────────────────────────────┐   │
│ │ Docker Container Orchestration   │
│ │ (docker-compose or Kubernetes)   │
│ ├──────────────────────────────┤   │
│ │ - Node.js Backend (5000)     │   │
│ │ - PostgreSQL (5432)          │   │
│ │ - Redis (6379)               │   │
│ │ - Nginx (80/443 reverse proxy)   │
│ │ - Certbot (SSL/TLS)          │   │
│ └──────────────────────────────┘   │
│                                     │
│ External:                           │
│ - Cloudflare for DNS/DDoS          │
│ - SendGrid for Email               │
│ - S3-compatible storage (MinIO)   │
└─────────────────────────────────────┘
```

### Deployment Comparison Matrix

| Feature | AWS ECS | Kubernetes | On-Premises |
|---------|---------|-----------|-------------|
| **Setup Time** | 1-2 hours | 4-8 hours | 1-2 days |
| **Cost** | $500-2000/mo | $800-3000/mo | $1000-5000/mo |
| **Scalability** | Excellent | Excellent | Good |
| **Management** | AWS handles | Self-managed | Self-managed |
| **Auto-scaling** | Built-in | Pod-level | Manual |
| **HA/DR** | Excellent | Excellent | Manual config |
| **Best For** | Growing startups | Enterprise | Cost-sensitive |

---

## 8. RESOURCE ESTIMATION BY USE CASE

### Small Deployment (100 concurrent users, 10 sessions/day)

```
Compute:
- Single t3.xlarge instance (4 CPU, 16 GB RAM)
- Cost: ~$150/month

Storage:
- 100 GB EBS volume
- Cost: ~$10/month

Database:
- db.t3.micro PostgreSQL (1 CPU, 1 GB RAM)
- Cost: ~$40/month

Cache:
- elasticache t3.micro Redis
- Cost: ~$15/month

Other:
- Data transfer: ~$5/month
- RDS backup: ~$5/month
- S3 storage: ~$10/month

TOTAL: ~$235/month
```

### Medium Deployment (500 concurrent users, 100 sessions/day)

```
Compute:
- 3x t3.2xlarge instances (8 CPU, 32 GB each)
- ALB: ~$20/month
- Cost: ~$450/month

Storage:
- 500 GB EBS volume (io1, 3000 IOPS)
- Cost: ~$150/month

Database:
- db.r5.xlarge PostgreSQL (4 CPU, 32 GB RAM)
- Multi-AZ: +50%
- Cost: ~$450/month

Cache:
- elasticache cache.r5.large Redis (2 CPU, 16 GB)
- Multi-AZ: +50%
- Cost: ~$150/month

CDN/Storage:
- CloudFront: ~$100/month
- S3: ~$50/month

Other Services:
- Email (SendGrid): ~$50/month
- Monitoring (CloudWatch): ~$30/month
- RDS backup: ~$50/month

TOTAL: ~$1,500/month
```

### Large Deployment (2000 concurrent users, 1000 sessions/day)

```
Compute:
- 10x c5.2xlarge instances (8 CPU, 16 GB each)
- ALB + NLB: ~$50/month
- Cost: ~$1,600/month

Worker Tier:
- 5x c5.4xlarge (16 CPU, 32 GB) for video/PDF
- Cost: ~$1,200/month

Storage:
- 2 TB EBS volume (io1, 10000 IOPS)
- Cost: ~$400/month

Database:
- db.r5.4xlarge PostgreSQL Multi-AZ (16 CPU, 128 GB)
- Cost: ~$2,000/month

Cache:
- elasticache cache.r5.xlarge Redis (4 CPU, 32 GB)
- Cost: ~$300/month

CDN/Storage:
- CloudFront: ~$500/month
- S3: ~$200/month

Other Services:
- Email (SendGrid enterprise): ~$200/month
- Monitoring + APM: ~$200/month
- Logging (CloudWatch): ~$100/month
- RDS backup: ~$200/month

TOTAL: ~$6,950/month
```

---

## 9. DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] Purchase domain name (retailedgepro.com)
- [ ] Set up AWS account or hosting provider
- [ ] Create VPC with public/private subnets
- [ ] Configure security groups & NACLs
- [ ] Provision RDS PostgreSQL instance
- [ ] Provision ElastiCache Redis cluster
- [ ] Set up S3 buckets (assets, backups, logs)
- [ ] Create IAM roles & policies
- [ ] Configure CloudFront distribution
- [ ] Set up Route 53 DNS records
- [ ] Obtain SSL certificate (AWS Certificate Manager)
- [ ] Configure Secrets Manager for credentials
- [ ] Set up CloudWatch dashboards
- [ ] Create SNS topics for alerts

### Deployment

- [ ] Build Docker images for backend & worker
- [ ] Push images to ECR (Elastic Container Registry)
- [ ] Create ECS task definitions
- [ ] Create ECS service with load balancer
- [ ] Configure auto-scaling policies
- [ ] Deploy database migrations
- [ ] Seed initial data (roles, clients, etc.)
- [ ] Test health checks (/health endpoint)
- [ ] Verify SSL/TLS is working
- [ ] Test API endpoints
- [ ] Test Socket.io connections
- [ ] Verify email sending (certificates)
- [ ] Verify PDF generation
- [ ] Verify file uploads to S3
- [ ] Load testing (Apache JMeter, k6)
- [ ] Security scanning (OWASP, Snyk)

### Post-Deployment

- [ ] Monitor dashboards for first 24 hours
- [ ] Set up log aggregation (ELK, CloudWatch)
- [ ] Configure automated backups
- [ ] Set up disaster recovery procedures
- [ ] Document runbooks for common issues
- [ ] Train ops team on deployment
- [ ] Schedule post-deployment review
- [ ] Plan capacity for next 6 months

---

## 10. MONITORING & ALERTING

### Key Metrics to Monitor

```yaml
Application Metrics:
  - API response time (p50, p95, p99)
  - Request throughput (requests/sec)
  - Error rate (% of failed requests)
  - WebSocket connection count
  - Quiz session active count
  - PDF/video generation queue length

Infrastructure Metrics:
  - CPU utilization (% per instance)
  - Memory utilization (% per instance)
  - Disk I/O (IOPS, throughput)
  - Network bandwidth (in/out)
  - Database connection count
  - Redis memory usage

Business Metrics:
  - Users active (daily/monthly)
  - Quizzes completed
  - Certificates issued
  - Average quiz score
  - Session duration

Alert Thresholds:
  - CPU > 80% for 5+ minutes
  - Memory > 90%
  - API error rate > 1%
  - DB query time > 1000ms
  - WebSocket disconnections > 10%
  - Queue length > 100 jobs
```

### Recommended Monitoring Tools

| Tool | Purpose | Cost |
|------|---------|------|
| CloudWatch | Metrics, Logs, Dashboards | Included/pay-per-use |
| DataDog | Full observability | $15-100/host/mo |
| New Relic | APM | $0.29/hour minimum |
| Prometheus + Grafana | Self-hosted metrics | Free |
| ELK Stack | Centralized logging | Free/self-hosted |
| Sentry | Error tracking | Free-$500/mo |

---

## Summary Table

| Requirement | Dev | Small | Medium | Large |
|-------------|-----|-------|--------|-------|
| **CPU** | 2-4 cores | 4 cores | 24 cores | 80+ cores |
| **RAM** | 4-8 GB | 16 GB | 96 GB | 256+ GB |
| **Storage** | 5-10 GB | 100 GB | 500 GB | 2+ TB |
| **Database** | SQLite | PostgreSQL (t3.micro) | PostgreSQL (r5.xlarge) | PostgreSQL (r5.4xlarge) |
| **Cache** | None | Redis micro | Redis large | Redis xlarge |
| **Cost/Month** | N/A | $235 | $1,500 | $6,950 |
| **Users** | 1-10 | 100 | 500 | 2000+ |
| **Sessions/Day** | 1-5 | 10 | 100 | 1000+ |

---

## Recommendations

1. **Start with Option 1 (AWS ECS)** — best balance of scalability and ease of management
2. **Migrate SQLite → PostgreSQL immediately** before production launch
3. **Implement Puppeteer pooling** to reduce memory spikes
4. **Add Redis for session storage** to support horizontal scaling
5. **Use SQS for video/PDF generation** to decouple from main API tier
6. **Set up CloudFront CDN** for media assets to reduce bandwidth costs
7. **Implement comprehensive monitoring** from day 1
8. **Plan database migration** well before scaling to 1000+ users

