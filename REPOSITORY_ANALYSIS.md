# RetailEdge Pro - Repository Analysis Report

**Generated**: 2026-06-23  
**Project Name**: RetailEdge Pro (QuizHive LMS)  
**Repository Type**: Full-Stack Learning Management System

---

## 1. Project Purpose

RetailEdge Pro is a **comprehensive Learning Management System (LMS)** designed for retail and corporate training. It provides:

- **Quiz & Assessment Management**: Create, deploy, and score quizzes (online & offline)
- **Training Program Management**: Schedule trainings, track progress, and issue certificates
- **Project & Client Management**: Multi-client, multi-project support with hierarchical project structure
- **Role-Based Access Control (RBAC)**: 10+ role types with granular permissions (Admin, Super Admin, Trainer, Program Manager, Client, MD, COO, VP Operations, T&D Manager, Marketing Manager, Staff/Learner)
- **Participant Management**: Offline quiz support, attendance tracking, zone-based reporting (India-focused retail hubs)
- **Reporting & Analytics**: Comprehensive dashboards with attendance, assessment, certification, and training metrics
- **Offline Capabilities**: Offline quiz sync for devices without internet connectivity
- **Video/Content Generation**: Automated PDF, presentation, and video generation capabilities
- **Real-Time Communication**: Live quiz sessions with WebSocket support
- **Mobile-Friendly**: Responsive design for mobile learner participation
- **Certification System**: Automatic certificate generation and distribution

**Target User**: Retail organizations, training departments, corporate L&D teams

---

## 2. Frontend Technology

**Framework & Build Tool**:
- **React** v19.2.6 (UI framework)
- **Vite** v8.0.12 (build bundler & dev server)
- **React Router DOM** v7.15.1 (client-side routing)

**UI/UX Libraries**:
- **Framer Motion** v12.40.0 (animations and motion)
- **Lucide React** v1.16.0 (icon library)
- **Recharts** v3.8.1 (data visualization/charts)

**HTTP & Real-Time Communication**:
- **Axios** v1.16.1 (HTTP client)
- **Socket.io Client** v4.8.3 (WebSocket communication)

**Content Generation & Export**:
- **jsPDF** v4.2.1 (PDF generation)
- **pptxgenjs** v4.0.1 (PowerPoint presentation generation)
- **html2canvas** v1.4.1 (HTML to image conversion)
- **exceljs** v4.4.0 (Excel workbook generation)
- **xlsx** v0.18.5 + **xlsx-js-style** v1.2.0 (Excel parsing & styling)
- **file-saver** v2.0.5 (file download utilities)
- **qrcode** v1.5.4 (QR code generation)

**Code Quality**:
- **ESLint** v10.3.0 (code linting)
- **@vitejs/plugin-react** v6.0.1 (React Fast Refresh for Vite)

**Dev Server Configuration**:
- Port: **5173** (default, but bound to `0.0.0.0` for LAN access)
- Hot reload & strict port enabled
- Proxying to backend API (`/api` → `http://localhost:5000`)
- WebSocket proxying for Socket.io (`/socket.io` → `http://localhost:5000`)

---

## 3. Backend Technology

**Runtime & Framework**:
- **Node.js** (v18+ recommended)
- **Express** v5.2.1 (HTTP server framework)
- **CORS** v2.8.6 (cross-origin resource sharing)

**Authentication & Security**:
- **jsonwebtoken** v9.0.3 (JWT token generation & verification)
- **bcrypt** v6.0.0 (password hashing)
- Custom JWT-based authentication middleware

**Database ORM**:
- **Sequelize** v6.37.8 (JavaScript ORM)
- **sqlite3** v6.0.1 (SQLite driver)

**Real-Time Communication**:
- **Socket.io** v4.8.3 (WebSocket server for live quiz sessions, real-time updates)

**Media & File Processing**:
- **Multer** v2.2.0 (file upload handling)
- **FFmpeg** via **@ffmpeg-installer/ffmpeg** v1.1.0 + **fluent-ffmpeg** v2.1.3 (video/audio processing)
- **Puppeteer** v25.1.0 (headless browser for screenshots, PDF generation)

**Email & Notifications**:
- **Nodemailer** v8.0.11 (SMTP email with fallback to Ethereal test emails)

**Environment Configuration**:
- **dotenv** v17.4.2 (environment variable management)

**Tunneling & Networking**:
- **localtunnel** v2.0.2 (optional local tunneling)
- **Cloudflared** (spawned as CLI subprocess for Cloudflare Tunnel)

**Server Configuration**:
- Port: **5000** (default, configurable via `PORT` env var)
- Serves both REST API and static React frontend
- CORS enabled for all origins
- Static file serving from `frontend/dist` (production build)
- Cache control headers for SPA fallback

---

## 4. Database Used

**Type**: **SQLite** (file-based relational database)

**Location**: `backend/quizhive.sqlite`

**ORM**: Sequelize v6.37.8

**Models Defined** (15+ core entities):
- `User` - Users with roles, designations, employment types
- `Role` - Role definitions (Admin, Trainer, Learner, etc.)
- `Project` - Projects with hierarchical support (parent/child relationships)
- `Client` - Client information with branding
- `Quiz` - Quiz/assessment definitions
- `Question` - Quiz questions with types (multiple choice, multi-select, poll, word cloud, rating, etc.)
- `Session` - Training/quiz session records
- `Participant` - Session participants with attendance & scoring
- `Response` - Individual quiz responses per participant
- `Training` - Training program definitions
- `TrainingProgress` - User progress tracking in training modules
- `Certificate` - Issued certificates to users
- `OfflineSyncDevice` - Offline device sync tracking
- `Escalation` - Issue escalation management
- `AuditLog` - System audit logging
- `UserQuery` - User support queries/bug reports
- `ExecutiveMetric` - Project-level executive metrics

**Data Persistence**:
- No migrations framework set up; schema defined via Sequelize models
- Suitable for development/small-to-medium deployments
- Consider PostgreSQL for production at scale

---

## 5. External Services Used

| Service | Purpose | Integration | Config |
|---------|---------|-------------|--------|
| **Cloudflare Tunnel** (cloudflared CLI) | Public tunneling for participant access from any network | Spawned as subprocess in `server.js` | Auto-starts on server boot |
| **Nodemailer (SMTP)** | Email notifications for training invites, password reset | Configured via environment variables or Ethereal test account | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` |
| **Ethereal Email** | Mock email service (fallback when no SMTP config) | Auto-provisioned test account | Used in development |
| **FFmpeg** | Video and audio processing (concat, encoding, frame extraction) | CLI invocation via fluent-ffmpeg | Installed via `@ffmpeg-installer/ffmpeg` |
| **Puppeteer** | Headless browser automation (screenshots, PDF generation, screen capture) | Node.js library for rendering & DOM automation | Auto-manages Chromium download |

**Optional Services**:
- **LocalTunnel**: Available but not actively used (Cloudflare Tunnel preferred)

---

## 6. Environment Variables Required

### Backend Environment Variables

| Variable | Purpose | Type | Required | Default/Example |
|----------|---------|------|----------|-----------------|
| `PORT` | Backend server port | Number | No | `5000` |
| `MONGODB_URI` | MongoDB connection (legacy, currently unused) | String | No | `mongodb://localhost:27017/retailedge` |
| `JWT_SECRET` | JWT signing secret | String | No | `super-secret-quizhive-key-2026` (hardcoded, UNSAFE) |
| `SMTP_HOST` | Email SMTP host | String | No | (Ethereal fallback if missing) |
| `SMTP_PORT` | Email SMTP port | Number | No | `587` |
| `SMTP_USER` | Email sender account | String | No | (Ethereal fallback if missing) |
| `SMTP_PASS` | Email sender password | String | No | (Ethereal fallback if missing) |
| `SMTP_SECURE` | Use TLS for SMTP | Boolean | No | `false` (or `true` for port 465) |

### Frontend Environment Variables
- None required (vite.config.js proxies API calls to backend)

### Missing/Not Configured
⚠️ **Critical Issues**:
1. **No `.env` file exists** in the repository (hardcoded `JWT_SECRET` in `backend/config/constants.js`)
2. **No `.env.example` or `.env.template`** for developers
3. **JWT_SECRET hardcoded** in source code (should be environment-variable)

---

## 7. API Endpoints

All API endpoints are prefixed with `/api` and return JSON.

### Authentication Routes (`/api/auth`)
| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|----------------|------|
| `POST` | `/api/auth/login` | User login | No | Public |
| `POST` | `/api/auth/forgot-password` | Password reset | No | Public |
| `POST` | `/api/auth/change-password` | Change password | Yes | Authenticated |

### User Management (`/api/users`)
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `GET` | `/api/users` | List all users (with filters) | Yes | Admin, PM, Trainer, Client, etc. |
| `GET` | `/api/users/:id` | Get user details | Yes | Admin, PM, Trainer, etc. |
| `GET` | `/api/users/hierarchy/:id` | Get user hierarchy/reports | Yes | Admin, PM, Trainer, T&D Manager |
| `POST` | `/api/users` | Create new user | Yes | Admin, Super Admin, Program Manager |
| `PUT` | `/api/users/:id` | Update user | Yes | Admin, Super Admin, Program Manager |
| `DELETE` | `/api/users/:id` | Delete user | Yes | Admin, Super Admin, Program Manager |
| `POST` | `/api/users/bulk-upload` | Bulk upload users (CSV) | Yes | Admin, Super Admin, Program Manager |
| `POST` | `/api/users/queries` | Submit support query/bug report | Yes | Authenticated |
| `GET` | `/api/users/queries` | Get all queries (admin) | Yes | Admin, Super Admin |
| `PATCH` | `/api/users/queries/:id/resolve` | Resolve query | Yes | Admin, Super Admin |

### Projects (`/api/projects`)
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `GET` | `/api/projects` | List all projects | Yes | Authenticated |
| `POST` | `/api/projects` | Create project | Yes | Admin, Super Admin |
| `PUT` | `/api/projects/:id` | Update project | Yes | Admin, Super Admin |
| `DELETE` | `/api/projects/:id` | Delete project | Yes | Admin, Super Admin |
| `GET` | `/api/projects/:id/executive-metrics` | Get project metrics | Yes | Authenticated |
| `POST` | `/api/projects/:id/executive-metrics` | Create project metrics | Yes | Admin, MD, COO, VP Ops |

### Quizzes (`/api/quizzes`)
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `GET` | `/api/quizzes` | List quizzes | Yes | Authenticated |
| `POST` | `/api/quizzes` | Create quiz | Yes | Authenticated |
| `GET` | `/api/quizzes/:id` | Get quiz details | Yes | Authenticated |
| `PUT` | `/api/quizzes/:id` | Update quiz | Yes | Trainer, Admin, Super Admin |
| `DELETE` | `/api/quizzes/:id` | Delete quiz | Yes | Trainer, Admin, Super Admin |
| `POST` | `/api/quizzes/:id/offline` | Create offline quiz session | Yes | Trainer, Admin, Super Admin |
| `GET` | `/api/quizzes/:id/offline-details` | Get offline quiz details | No | Public |
| `POST` | `/api/quizzes/:id/offline-check-eligibility` | Check participant eligibility | No | Public |
| `POST` | `/api/quizzes/:id/offline-submit` | Submit offline quiz responses | No | Public |

### Trainings (`/api/trainings`)
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `GET` | `/api/trainings` | List trainings | Yes | Authenticated |
| `POST` | `/api/trainings` | Create training | Yes | Admin, PM, Trainer, T&D Manager |
| `POST` | `/api/trainings/:id/progress` | Update training progress | Yes | Authenticated |
| `DELETE` | `/api/trainings/:id` | Delete training | Yes | Admin, PM, Trainer, T&D Manager |
| `POST` | `/api/trainings/schedule-meeting` | Schedule training meeting (sends email) | Yes | Admin, PM, Trainer, T&D Manager |

### Certificates (`/api/certificates`)
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `GET` | `/api/certificates` | List certificates (RBAC filtered) | Yes | Authenticated |
| `POST` | `/api/certificates/claim` | Claim certificate | Yes | Authenticated |
| `GET` | `/api/certificates/:id/download` | Download certificate | Yes | Authenticated |

### Reports (`/api/reports`)
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `GET` | `/api/reports` | List reports | Yes | Authenticated |
| `GET` | `/api/reports/attendance` | Attendance report | Yes | Authenticated |
| `GET` | `/api/reports/leaderboard` | Performance leaderboard | Yes | Authenticated |
| `GET` | `/api/reports/:sessionId` | Detailed session report | Yes | Authenticated |
| `DELETE` | `/api/reports/:id` | Delete report | Yes | Authenticated |

### Roles (`/api/roles`)
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `GET` | `/api/roles` | List roles | Yes | Authenticated |
| `POST` | `/api/roles` | Create role | Yes | Authenticated |
| `PUT` | `/api/roles/:id` | Update role | Yes | Authenticated |
| `DELETE` | `/api/roles/:id` | Delete role | Yes | Authenticated |

### Clients (`/api/clients`)
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `GET` | `/api/clients` | List clients | Yes | Authenticated |
| `POST` | `/api/clients` | Create client | Yes | Authenticated |
| `PUT` | `/api/clients/:id` | Update client | Yes | Authenticated |
| `DELETE` | `/api/clients/:id` | Delete client | Yes | Authenticated |

### Escalations (`/api/escalations`)
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `GET` | `/api/escalations` | List escalations | No | Public |
| `POST` | `/api/escalations` | Create escalation | Yes | MD, COO, VP Ops, Admin |
| `PATCH` | `/api/escalations/:id/reply` | Reply to escalation | Yes | PM, Admin, Super Admin |

### Super Admin (`/api/superadmin`)
| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `GET` | `/api/superadmin/stats` | System-wide statistics | Yes | Super Admin, Admin |

### Utility Endpoints
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/join-url` | Get public join URL (for QR code) | No |
| `POST` | `/api/set-tunnel-url` | Manually set tunnel URL | No |
| `GET` | `/api/host-ip` | Get LAN IP address | No |
| `GET` | `/health` | Health check | No |

### Real-Time WebSocket Events (Socket.io)
- `new_quiz_session` - New quiz session started
- `participant_joined` - Participant joined session
- `question_posted` - New question posted
- `participant_responded` - Response submitted
- `session_ended` - Quiz session ended
- `new_query_submitted` - User submitted support query
- (Additional quiz engine events in `backend/sockets/quizEngine.js`)

---

## 8. Build Command

### Frontend Build
```bash
cd frontend && npm run build
```
**Output**: `frontend/dist/` (minified, optimized React bundle)

### Full Stack Build
```bash
# Install dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Build frontend
cd frontend && npm run build && cd ..

# Backend does not require build (transpilation)
```

**Build Artifacts**:
- Frontend: `frontend/dist/` (ready for production)
- Backend: Source files in `backend/` (runs directly with Node.js)

---

## 9. Start Command

### Development Mode

**Terminal 1 - Backend Server**:
```bash
cd backend
npm install
node server.js
# or with nodemon (if installed):
npx nodemon server.js
```
- Backend runs on: `http://localhost:5000`
- Serves React frontend from `frontend/dist` (if built)
- Starts Cloudflare Tunnel for public access

**Terminal 2 - Frontend Dev Server** (separate terminal):
```bash
cd frontend
npm install
npm run dev
```
- Frontend dev server runs on: `http://localhost:5173` (all interfaces: `0.0.0.0`)
- Proxies API calls to backend on `http://localhost:5000`
- Hot reload enabled

### Production Mode

**Single Command - Backend serves built frontend**:
```bash
# Ensure frontend is built
cd frontend && npm run build && cd ..

# Start backend server
cd backend && node server.js
```
- Backend on `http://localhost:5000` serves both API and static frontend
- No separate Vite dev server needed
- Cloudflare Tunnel auto-starts for remote access

---

## 10. Deployment Architecture

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    Participant Devices (Mobile/Desktop)      │
│                  (Can join via LAN, Mobile Data, or WAN)      │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
   ┌─────▼────┐ ┌───▼────────┐ ┌▼──────────────┐
   │   LAN    │ │ Cloudflare │ │  Manual URL   │
   │Network   │ │  Tunnel    │ │  (ngrok, etc) │
   │Access    │ │ (Auto-start)│ │  via API Call │
   └─────┬────┘ └───┬────────┘ └▼──────────────┘
         └───────────┼────────────┘
                     │ HTTPS
                     │
         ┌───────────▼──────────────┐
         │  Node.js Express Server   │
         │   (Port 5000)             │
         │                           │
         │  ┌─────────────────────┐  │
         │  │  REST API Layer     │  │
         │  │  (/api/*)           │  │
         │  └─────────┬───────────┘  │
         │            │              │
         │  ┌─────────▼───────────┐  │
         │  │  Socket.io Engine   │  │
         │  │  (Real-time Events) │  │
         │  └─────────┬───────────┘  │
         │            │              │
         │  ┌─────────▼───────────┐  │
         │  │  Sequelize ORM      │  │
         │  │  (Data Access)      │  │
         │  └─────────┬───────────┘  │
         │            │              │
         │  ┌─────────▼───────────┐  │
         │  │  Static Frontend    │  │
         │  │  (React SPA)        │  │
         │  │  (dist/ folder)     │  │
         │  └─────────────────────┘  │
         └───────────┬──────────────┘
                     │
         ┌───────────▼──────────────┐
         │  SQLite Database         │
         │ (backend/quizhive.sqlite)│
         │                          │
         │ - Users, Quizzes         │
         │ - Sessions, Responses    │
         │ - Trainings, Certs       │
         │ - Projects, Clients      │
         └──────────────────────────┘
         
External Services:
├── Nodemailer (SMTP) → Email notifications
├── FFmpeg → Video/audio processing
├── Puppeteer → Screenshots/PDF generation
└── Cloudflare Tunnel → Public URL tunneling
```

### Deployment Topology

**Single-Server Deployment** (Current Setup)
- One Node.js process handles API, WebSocket, and frontend serving
- SQLite file-based DB on same server
- Suitable for: Dev, staging, small production deployments

**Recommended Production Upgrade Path**
1. **Separate Processes**:
   - Backend API server (Node.js cluster or PM2)
   - Frontend: Static CDN (AWS S3, Netlify, Vercel)
   - Database: PostgreSQL (replace SQLite)

2. **Clustering**:
   - Multiple backend instances behind load balancer
   - Redis for session management & Socket.io adapter
   - Database replication (PostgreSQL)

3. **Infrastructure**:
   - Docker containerization
   - Kubernetes orchestration
   - Auto-scaling based on metrics
   - Managed database services (AWS RDS, Azure DB)

### Key Deployment Considerations

| Aspect | Current Setup | Production Recommendation |
|--------|---------------|--------------------------|
| **Database** | SQLite (file-based) | PostgreSQL or MongoDB |
| **Server** | Single Node.js instance | PM2 clusters or Kubernetes |
| **Frontend** | Served by Express | Separate CDN or S3 |
| **Real-time** | Socket.io in-memory | Redis adapter for clustering |
| **Email** | Ethereal mock or SMTP | Dedicated service (SendGrid, AWS SES) |
| **File Storage** | Local filesystem | S3-compatible (AWS, MinIO) |
| **Tunneling** | Cloudflare Tunnel | Nginx reverse proxy + DNS |
| **Scaling** | None (vertical only) | Horizontal scaling ready |
| **Monitoring** | Console logs | ELK/Datadog/New Relic |

---

## Missing Configuration Files

### ⚠️ Critical Missing Files

1. **`.env` (Backend)**
   - **Status**: Missing
   - **Impact**: JWT_SECRET hardcoded in source; email config missing
   - **Recommendation**: Create template and document
   - **Example Content**:
   ```env
   PORT=5000
   JWT_SECRET=your-secret-key-here
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_SECURE=true
   ```

2. **`.env.example` (Backend)**
   - **Status**: Missing
   - **Impact**: Developers don't know required env vars
   - **Recommendation**: Create and commit to repo

3. **`.env.local` (Frontend)**
   - **Status**: Missing
   - **Impact**: Frontend API URL should be configurable
   - **Recommendation**: Add env var support if deployed separately

4. **`.gitignore` - Insufficient**
   - **Status**: Exists but may not include `.env`, `node_modules`, build artifacts
   - **Recommendation**: Review and enhance

5. **`docker-compose.yml`** (for local dev with external DB)
   - **Status**: Missing
   - **Recommendation**: Add for PostgreSQL/MongoDB development

6. **`Dockerfile`** (Backend)
   - **Status**: Missing
   - **Impact**: Can't easily containerize
   - **Recommendation**: Create for Docker deployment

7. **`vercel.json` or `netlify.toml`** (Frontend)
   - **Status**: Missing
   - **Impact**: Can't easily deploy to Vercel/Netlify
   - **Recommendation**: Add for frontend-only deployment

8. **`pm2.ecosystem.config.js`**
   - **Status**: Missing
   - **Recommendation**: Add for production process management

9. **Environment-specific configs** (development.js, production.js)
   - **Status**: Missing
   - **Recommendation**: Add backend config management

10. **`.env.development.local` & `.env.production.local`**
    - **Status**: Missing
    - **Recommendation**: Create templates for local dev

### Recommended Priority Actions

**P0 (Critical)**:
1. Create `.env.example` with all required variables
2. Move hardcoded `JWT_SECRET` to environment variable
3. Create `.env.gitignore` entry (if not present)

**P1 (Important)**:
4. Create `Dockerfile` for containerization
5. Create `docker-compose.yml` for local PostgreSQL dev
6. Document deployment procedures

**P2 (Nice-to-Have)**:
7. Create PM2 ecosystem config
8. Add environment-specific backend configs
9. Create deployment checklist

---

## Summary

| Item | Value |
|------|-------|
| **Framework Type** | Full-Stack MERN-like (Node/Express + React/Vite) |
| **Language** | JavaScript (Node.js backend, React frontend) |
| **Database** | SQLite (Sequelize ORM) |
| **Real-Time** | Socket.io WebSocket |
| **Authentication** | JWT tokens |
| **API Type** | RESTful JSON API (~40+ endpoints) |
| **Frontend Port** | 5173 (dev), served from backend (prod) |
| **Backend Port** | 5000 |
| **Production Ready** | ⚠️ Partial (needs SQLite→PostgreSQL migration, .env setup) |
| **Deployment Target** | AWS EC2, DigitalOcean, Heroku, Docker, Kubernetes |
| **Key External Services** | Nodemailer, FFmpeg, Puppeteer, Cloudflare Tunnel |
| **Build Time** | ~2-3 minutes (with node_modules cache) |
| **Recommended Node Version** | v18+ |

---

**Report End**
