# RetailEdge Pro - End-to-End Workflow Architecture

## Overview: Request → Frontend → Backend → Database → External Services → Response

```mermaid
graph TB
    subgraph "User Layer"
        A1["🧑 Desktop User<br/>(Browser)"]
        A2["📱 Mobile User<br/>(Browser)"]
        A3["💻 Trainer<br/>(Dashboard)"]
    end

    subgraph "Network Layer"
        B1["HTTP/REST<br/>Request"]
        B2["WebSocket<br/>Real-time Events"]
    end

    subgraph "Frontend Layer"
        C1["React SPA<br/>(Vite Built)"]
        C2["State Management"]
        C3["Socket.io Client"]
    end

    subgraph "Backend Layer"
        D1["Express Server<br/>Port 5000"]
        D2["Route Handlers<br/>/api/*"]
        D3["Auth Middleware<br/>JWT Validation"]
        D4["RBAC Middleware<br/>Role Check"]
        D5["Socket.io Server<br/>Real-time Sync"]
    end

    subgraph "Data Layer"
        E1["Sequelize ORM"]
        E2["SQLite Database<br/>quizhive.sqlite"]
    end

    subgraph "External Services"
        F1["📧 Nodemailer<br/>SMTP/Ethereal"]
        F2["🎬 FFmpeg<br/>Video Processing"]
        F3["📸 Puppeteer<br/>Screenshots/PDF"]
        F4["🌐 Cloudflare Tunnel<br/>Public Access"]
    end

    A1 -->|HTTP Request| B1
    A2 -->|HTTP Request| B1
    A3 -->|WebSocket Event| B2
    
    B1 -->|React Components| C1
    B2 -->|Socket Events| C3
    
    C1 -->|Axios API Call| D1
    C2 -->|State Updates| C1
    C3 -->|Emit/Listen| D5
    
    D1 --> D2
    D2 --> D3
    D3 --> D4
    D4 --> D5
    
    D2 -->|Query/Mutate| E1
    E1 -->|SQL| E2
    
    D2 -.->|Async Tasks| F1
    D2 -.->|Media Gen| F2
    D2 -.->|Content Gen| F3
    D5 -.->|Public URL| F4
    
    E2 -->|Data| E1
    E1 -->|Response| D1
    D1 -->|JSON| C1
    C1 -->|HTML/CSS/JS| A1
    C1 -->|Rendered UI| A2
```

---

## 1. Authentication & Authorization Workflow

### Login Flow

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Frontend as 🎨 React Frontend
    participant Backend as 🔌 Express Backend
    participant DB as 💾 SQLite Database
    participant LocalStorage as 💾 Browser Storage

    User->>Frontend: Enter Email & Password
    Frontend->>Backend: POST /api/auth/login<br/>{email, password}
    
    Backend->>Backend: Hash password check<br/>(bcrypt.compare)
    Backend->>DB: Query User by Email
    
    DB-->>Backend: User Record
    Backend->>Backend: Verify Password Hash
    Backend->>Backend: Check User Status<br/>(Active/Suspended)
    
    alt Password Valid & Active
        Backend->>Backend: Generate JWT Token<br/>(24h expiry)
        Backend-->>Frontend: 200 OK<br/>{token, user}
        Frontend->>LocalStorage: Save JWT Token
        Frontend->>Frontend: Update App State
        Frontend-->>User: ✅ Login Success<br/>Redirect to Dashboard
    else Password Invalid
        Backend-->>Frontend: 401 Unauthorized
        Frontend-->>User: ❌ Invalid Credentials
    else Account Inactive
        Backend-->>Frontend: 403 Forbidden
        Frontend-->>User: ❌ Account Suspended
    end
```

### Authenticated Request Flow

```mermaid
sequenceDiagram
    participant Frontend as 🎨 Frontend
    participant AuthMiddleware as 🔐 Auth Middleware
    participant RBACMiddleware as 👥 RBAC Middleware
    participant RouteHandler as 📍 Route Handler
    participant DB as 💾 Database

    Frontend->>Frontend: Get JWT from LocalStorage
    Frontend->>AuthMiddleware: GET /api/users<br/>Header: Authorization: Bearer <token>
    
    AuthMiddleware->>AuthMiddleware: Extract Token
    AuthMiddleware->>AuthMiddleware: jwt.verify(token)
    
    alt Token Valid
        AuthMiddleware->>AuthMiddleware: Decode {id, role, projectId}
        AuthMiddleware->>AuthMiddleware: Attach to req.user
        AuthMiddleware->>RBACMiddleware: next()
    else Token Expired/Invalid
        AuthMiddleware-->>Frontend: 401 Unauthorized
        Frontend->>Frontend: Clear Token & Redirect
    end
    
    RBACMiddleware->>RBACMiddleware: Check if role in<br/>allowedRoles array
    
    alt User Role Authorized
        RBACMiddleware->>RouteHandler: next()
        RouteHandler->>DB: Query Users
        DB-->>RouteHandler: User Records
        RouteHandler-->>Frontend: 200 OK {users[]}
    else User Role Not Authorized
        RBACMiddleware-->>Frontend: 403 Forbidden
    end
```

---

## 2. Quiz Session Workflow (Real-Time)

### Quiz Trainer Initiates Live Session

```mermaid
sequenceDiagram
    participant Trainer as 👨‍🏫 Trainer
    participant TrainerUI as 🎨 Frontend
    participant Backend as 🔌 Backend
    participant Participants as 👥 Participants
    participant DB as 💾 Database

    Trainer->>TrainerUI: Click "Start Quiz"
    TrainerUI->>Backend: POST /api/quizzes/:id/session<br/>{quizId, mode: 'live'}
    
    Backend->>DB: Create Session Record<br/>(status: 'active')
    DB-->>Backend: Session {id, code, pin}
    Backend-->>TrainerUI: 200 OK {sessionId, joinCode}
    
    TrainerUI->>TrainerUI: Display QR Code<br/>Join Link & PIN
    TrainerUI->>Backend: socket.emit('trainer_session_started')<br/>{sessionId}
    
    Backend->>Backend: Store Socket Room<br/>quizSession_<sessionId>
    Backend->>Participants: 📡 socket.broadcast<br/>'session_created'
```

### Participant Joins Quiz Session

```mermaid
sequenceDiagram
    participant Participant as 📱 Participant
    participant Phone as 🎨 Phone Frontend
    participant Backend as 🔌 Backend
    participant Trainer as 👨‍🏫 Trainer
    participant TrainerUI as 🎨 Trainer UI
    participant DB as 💾 Database

    Participant->>Phone: Scan QR Code or Enter Code
    Phone->>Backend: GET /api/quizzes/:id/offline-details<br/>?code=ABC123
    Backend->>DB: Lookup Session by Code
    DB-->>Backend: Session Details & Quiz
    Backend-->>Phone: 200 OK {quiz, questions, sessionId}
    
    Phone->>Phone: Display "Ready to Join?"
    Participant->>Phone: Enter Name & Employee ID
    Phone->>Backend: POST /api/quizzes/:id/offline-check-eligibility<br/>{sessionId, participantInfo}
    
    Backend->>DB: Check Participant Eligibility<br/>(Project, Previous Attempts, Time Window)
    alt Eligible
        Backend->>DB: Create Participant Record<br/>(status: 'joined', score: null)
        DB-->>Backend: Participant {id, sessionId}
        Backend-->>Phone: 200 OK {participantId}
        
        Phone->>Backend: socket.emit('participant_joined')<br/>{participantId, name}
        Backend->>Backend: Add Socket to Room
        Backend->>Backend: Store Participant Session Mapping
        Backend-->>TrainerUI: 📡 Participant Connected<br/>(Live Update)
        TrainerUI->>Trainer: ✅ "<name> has joined"
    else Not Eligible
        Backend-->>Phone: 403 Forbidden {reason}
        Phone->>Participant: ❌ Cannot Join
    end
```

### Quiz Question Display & Response Flow

```mermaid
sequenceDiagram
    participant Trainer as 👨‍🏫 Trainer
    participant TrainerUI as 🎨 Trainer UI
    participant Backend as 🔌 Backend
    participant Participant as 📱 Participant
    participant Phone as 📱 Phone

    Trainer->>TrainerUI: Click "Next Question"
    TrainerUI->>Backend: socket.emit('post_question')<br/>{sessionId, questionNumber}
    
    Backend->>DB: Fetch Question Details
    DB-->>Backend: Question {id, text, type, options}
    Backend->>Backend: Start Timer (if timed)
    Backend->>Participant: 📡 socket.broadcast('question_posted')<br/>{question, timeLimit}
    
    Phone->>Phone: Display Question & Options
    Participant->>Phone: Select Answer(s)
    
    Phone->>Backend: socket.emit('participant_response')<br/>{participantId, questionId, answer, timeSpent}
    Backend->>Backend: Validate Response Format
    Backend->>DB: Store Response Record<br/>{participantId, questionId, answer, timestamp}
    
    Backend->>Backend: Calculate Correctness<br/>(if MCQ type)
    Backend->>Backend: Check if Answer Correct<br/>(compare with correct_answer)
    
    Backend->>DB: Update Participant Score<br/>(if correct: +points)
    Backend-->>TrainerUI: 📡 Participant Responded
    TrainerUI->>Trainer: ✅ Answer Submitted

    opt Timer Expired & No Response
        Backend->>Backend: Timeout Handler
        Backend->>DB: Mark as Unanswered
    end
```

### Quiz Session End & Results

```mermaid
sequenceDiagram
    participant Trainer as 👨‍🏫 Trainer
    participant TrainerUI as 🎨 Trainer UI
    participant Backend as 🔌 Backend
    participant Participant as 📱 Participant
    participant Phone as 📱 Phone
    participant DB as 💾 Database

    Trainer->>TrainerUI: Click "End Quiz"
    TrainerUI->>Backend: socket.emit('end_session')<br/>{sessionId}
    
    Backend->>DB: Get All Responses<br/>for sessionId
    DB-->>Backend: Responses[]
    
    Backend->>Backend: Calculate Final Scores<br/>for Each Participant<br/>(total correct/score)
    Backend->>Backend: Rank Participants<br/>(leaderboard)
    Backend->>DB: Update Session<br/>(status: 'completed')<br/>Update Participants<br/>(final_score, rank)
    
    Backend->>Backend: Generate Results Object<br/>{scores, ranks, pass/fail}
    Backend-->>TrainerUI: 📡 'session_ended'<br/>{results, leaderboard}
    Backend-->>Phone: 📡 'session_ended'<br/>{yourScore, rank, result}
    
    TrainerUI->>Trainer: ✅ Session Ended<br/>Display Results
    Phone->>Participant: ✅ Quiz Complete<br/>Your Score: X/Y
    
    Trainer->>TrainerUI: Click "Download Report"
    TrainerUI->>Backend: GET /api/reports/:sessionId
    Backend->>DB: Query Session + All Responses
    Backend->>Backend: Aggregate Data
    Backend->>Backend: Generate PDF (Puppeteer)
    Backend-->>TrainerUI: PDF File
    TrainerUI->>Trainer: ✅ Report Downloaded
```

---

## 3. Training & Certification Workflow

```mermaid
sequenceDiagram
    participant PM as 👔 Program Manager
    participant TrainingUI as 🎨 Frontend
    participant Backend as 🔌 Backend
    participant Trainer as 👨‍🏫 Trainer
    participant Learner as 👨‍💼 Learner
    participant Email as 📧 Nodemailer SMTP
    participant DB as 💾 Database

    PM->>TrainingUI: Create Training Module<br/>(title, description, project)
    TrainingUI->>Backend: POST /api/trainings<br/>{title, description, projectId, scheduledAt}
    Backend->>DB: Create Training Record
    DB-->>Backend: Training {id}
    Backend-->>TrainingUI: 200 OK
    
    PM->>TrainingUI: Select Participants & Invite
    TrainingUI->>Backend: POST /api/trainings/:id/invite<br/>{userIds[]}
    
    Backend->>DB: Fetch User Emails
    DB-->>Backend: Users[{id, email, name}]
    Backend->>Email: nodemailer.sendMail<br/>(to, subject, htmlTemplate)
    Email->>Email: Connect to SMTP
    Email->>Learner: 📧 Meeting Invitation<br/>(topic, date, join link)
    
    Backend->>DB: Create TrainingProgress<br/>Records
    Backend-->>TrainingUI: 200 OK
    
    Learner->>Learner: Open Email
    Learner->>TrainingUI: Click "Join Training"
    TrainingUI->>Backend: GET /api/trainings/:id
    Backend->>DB: Fetch Training Details
    DB-->>Backend: Training + Materials
    Backend-->>TrainingUI: 200 OK
    
    TrainingUI->>Learner: Display Training Content
    Learner->>TrainingUI: Watch Videos, Read Materials
    Learner->>TrainingUI: Mark Module Complete
    
    TrainingUI->>Backend: POST /api/trainings/:id/progress<br/>{userId, completed: true}
    Backend->>DB: Update TrainingProgress<br/>(completed: true, completedAt: now)
    DB-->>Backend: Updated Record
    Backend->>Backend: Check if All Required<br/>Trainings Completed
    
    alt All Trainings Completed
        Backend->>DB: Create Certificate Record<br/>{userId, projectId, status: 'issued'}
        Backend->>Backend: Generate Certificate PDF<br/>(Puppeteer)
        Backend->>Email: Send Certificate Email<br/>(attachment: PDF)
        Email->>Learner: 📧 Certificate Awarded
        Backend-->>TrainingUI: 200 OK {certificateId}
    else Trainings Pending
        Backend-->>TrainingUI: 200 OK {progress: X%}
    end
    
    Learner->>TrainingUI: Download Certificate
    TrainingUI->>Backend: GET /api/certificates/:id/download
    Backend->>DB: Verify Certificate Ownership
    Backend->>Backend: Fetch Certificate PDF<br/>(cached or regenerate)
    Backend-->>Learner: 200 OK {PDF file}
```

---

## 4. Offline Quiz Workflow (Mobile Sync)

### Download for Offline Use

```mermaid
sequenceDiagram
    participant Participant as 📱 Participant
    participant Phone as 🎨 Phone Browser
    participant Backend as 🔌 Backend
    participant DB as 💾 Database
    participant BrowserStorage as 💾 IndexedDB

    Participant->>Phone: Navigate to Offline Quiz
    Phone->>Backend: GET /api/quizzes/:id/offline-details
    Backend->>DB: Fetch Quiz + Questions
    DB-->>Backend: Complete Quiz Object
    Backend-->>Phone: 200 OK {quiz, questions[], options}
    
    Phone->>BrowserStorage: Store Quiz Data<br/>(IndexedDB)
    Phone->>Participant: ✅ Quiz Ready<br/>Offline Available

    Participant->>Phone: (No Internet)<br/>Open Offline Quiz
    Phone->>BrowserStorage: Retrieve Quiz Data
    BrowserStorage-->>Phone: Quiz Data
    Phone->>Participant: Display Questions
    Participant->>Phone: Answer Questions
    Phone->>BrowserStorage: Save Responses<br/>(as you go)
```

### Upload Responses When Online

```mermaid
sequenceDiagram
    participant Phone as 📱 Phone
    participant BrowserStorage as 💾 IndexedDB
    participant NetworkDetector as 🌐 Network Detector
    participant Backend as 🔌 Backend
    participant DB as 💾 Database

    Phone->>NetworkDetector: Listen for Network Events
    NetworkDetector->>NetworkDetector: Detect Online Status
    
    opt User Goes Online
        NetworkDetector->>Phone: Network Available
        Phone->>BrowserStorage: Retrieve Unsync Responses
        BrowserStorage-->>Phone: Responses[]
        
        Phone->>Backend: POST /api/quizzes/:id/offline-submit<br/>{participantId, responses[]}<br/>{offline: true, timestamp, deviceInfo}
        
        Backend->>DB: Verify Participant Eligibility
        Backend->>DB: Check Timestamps<br/>(prevent tampering)
        Backend->>Backend: Validate Responses
        Backend->>DB: Batch Insert Responses<br/>via OfflineSyncDevice Record
        
        DB-->>Backend: Inserted
        Backend-->>Phone: 200 OK {syncId, status: 'synced'}
        
        Phone->>BrowserStorage: Clear Synced Responses
        Phone->>Participant: ✅ Responses Synced
    end
```

---

## 5. Report Generation Workflow

```mermaid
sequenceDiagram
    participant Admin as 👔 Admin
    participant AdminUI as 🎨 Frontend
    participant Backend as 🔌 Backend
    participant DB as 💾 Database
    participant FFmpeg as 🎬 FFmpeg
    participant Puppeteer as 📸 Puppeteer
    participant FileSystem as 💾 Local Storage

    Admin->>AdminUI: Request "Attendance Report"
    AdminUI->>Backend: GET /api/reports/attendance<br/>?projectId=X&dateRange=Y
    
    Backend->>DB: Query Participants<br/>+ Sessions + Projects<br/>(JOIN multiple tables)
    DB-->>Backend: Raw Data[]
    
    Backend->>Backend: Aggregate Data<br/>• Calculate Attendance %<br/>• Group by Zone<br/>• Calculate By Project
    Backend->>Backend: Process Data<br/>• Sort Results<br/>• Calculate Metrics
    
    Admin->>AdminUI: Select "Export as PDF"
    AdminUI->>Backend: POST /api/reports/:sessionId<br/>?format=pdf
    
    Backend->>Backend: Format Data for PDF<br/>(charts, tables)
    Backend->>Puppeteer: Launch Headless Browser<br/>generate_report_template.html<br/>(inject data)
    
    Puppeteer->>Puppeteer: Render HTML<br/>+ CSS/Charts
    Puppeteer->>Puppeteer: Take Screenshot/PDF
    Puppeteer-->>Backend: PDF Buffer
    
    Backend->>FileSystem: Save PDF Temporarily<br/>(/downloads/)
    Backend-->>AdminUI: 200 OK {downloadUrl}
    AdminUI-->>Admin: ✅ Report Ready
    
    Admin->>AdminUI: Click Download
    AdminUI->>Backend: GET /downloads/report_123.pdf
    Backend->>FileSystem: Read PDF File
    FileSystem-->>Backend: File Content
    Backend-->>Admin: 200 OK {PDF File}
    AdminUI->>Admin: ✅ PDF Downloaded
    
    opt Cleanup
        Backend->>Backend: (Scheduled Job)<br/>Delete old PDFs<br/>(24h retention)
    end
```

### Excel Export Workflow

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant UI as 🎨 Frontend
    participant Backend as 🔌 Backend
    participant DB as 💾 Database
    participant ExcelJS as 📊 ExcelJS Lib

    User->>UI: Request "Export to Excel"
    UI->>Backend: GET /api/reports?format=xlsx
    
    Backend->>DB: Query Report Data
    DB-->>Backend: Records[]
    
    Backend->>ExcelJS: Create Workbook
    ExcelJS->>ExcelJS: Add Worksheet
    ExcelJS->>ExcelJS: Add Headers Row
    ExcelJS->>ExcelJS: Add Data Rows<br/>(with formatting)
    ExcelJS->>ExcelJS: Add Summary Sheet<br/>(charts)
    ExcelJS->>ExcelJS: Generate Buffer
    ExcelJS-->>Backend: Excel File Buffer
    
    Backend->>Backend: Create Filename<br/>report_YYYY-MM-DD.xlsx
    Backend-->>UI: 200 OK {Excel File}
    UI->>User: ✅ Excel Downloaded
```

---

## 6. File Upload & Processing Workflow

### User Profile Picture Upload

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant UI as 🎨 Frontend
    participant Multer as 📤 Multer Middleware
    participant Backend as 🔌 Backend
    participant FileSystem as 💾 Uploads Folder
    participant DB as 💾 Database

    User->>UI: Select Profile Picture
    UI->>UI: Preview Image
    User->>UI: Click "Upload"
    
    UI->>Multer: POST /api/users/:id<br/>multipart/form-data<br/>(file + fields)
    
    Multer->>Multer: Validate MIME Type<br/>(must be image/)
    Multer->>Multer: Check File Size<br/>(max 5MB)
    
    alt File Valid
        Multer->>Multer: Generate Unique Filename<br/>profile_TIMESTAMP_RANDOM.jpg
        Multer->>FileSystem: Write File<br/>(/uploads/profile_pictures/)
        Multer->>Backend: Attach file to req.file
        
        Backend->>DB: Update User Record<br/>{profile_picture_url: /uploads/profile_pictures/...}
        DB-->>Backend: Updated User
        Backend-->>UI: 200 OK {user}
        UI->>UI: Update Avatar Display
        UI-->>User: ✅ Picture Updated
    else File Invalid
        Multer-->>UI: 400 Bad Request
        UI-->>User: ❌ Invalid file
    end
```

### Project Logo Upload

```mermaid
sequenceDiagram
    participant PM as 👔 Project Manager
    participant UI as 🎨 Frontend
    participant Backend as 🔌 Backend
    participant Multer as 📤 Multer
    participant FileSystem as 💾 Uploads Folder
    participant DB as 💾 Database

    PM->>UI: Create Project + Upload Logo
    UI->>Backend: POST /api/projects<br/>multipart/form-data<br/>{name, code, file: logoImage}
    
    Backend->>Multer: Handle Upload
    Multer->>FileSystem: Save File<br/>(/uploads/project_logos/plogo-TIMESTAMP.png)
    Multer-->>Backend: req.file
    
    Backend->>Backend: Store Path<br/>/uploads/project_logos/plogo-123.png
    Backend->>DB: Create Project Record<br/>{name, project_logo: path}
    DB-->>Backend: Project {id}
    Backend-->>UI: 200 OK {project}
    
    UI->>UI: Display Project with Logo
    UI-->>PM: ✅ Project Created
```

---

## 7. Real-Time Communication (WebSocket) Workflow

```mermaid
sequenceDiagram
    participant Client1 as 👤 Client 1
    participant Client1UI as 🎨 Browser 1
    participant SocketClient as 🔌 Socket.io Client
    participant SocketServer as 🔌 Socket.io Server
    participant Backend as 🔌 Express Backend
    participant Client2 as 👤 Client 2
    participant Client2UI as 🎨 Browser 2

    Client1UI->>SocketClient: socket.connect()
    SocketClient->>SocketServer: Establish WebSocket<br/>Connection
    SocketServer->>SocketServer: Store Socket ID<br/>+ User ID Mapping
    
    Backend->>SocketServer: app.set('io', io)
    
    Client1UI->>SocketClient: socket.emit('join_room')<br/>{quizSessionId}
    SocketClient->>SocketServer: Event Received
    SocketServer->>SocketServer: Add Socket to Room<br/>socket.join(roomId)
    
    Client2UI->>SocketClient: socket.connect()
    SocketClient->>SocketServer: (New Socket)
    SocketServer->>SocketServer: Store Socket ID
    
    Client2UI->>SocketClient: socket.emit('join_room')<br/>{quizSessionId}
    SocketClient->>SocketServer: Event Received
    SocketServer->>SocketServer: Add Socket to Room
    
    Backend->>SocketServer: io.to(roomId).emit<br/>('question_posted')<br/>{questionData}
    SocketServer->>Client1UI: 📡 Event Received
    SocketServer->>Client2UI: 📡 Event Received
    Client1UI->>Client1: Update UI<br/>Display Question
    Client2UI->>Client2: Update UI<br/>Display Question
    
    Client1UI->>SocketServer: socket.emit<br/>('response_submitted')<br/>{answer}
    SocketServer->>Backend: Event Triggered
    Backend->>Backend: Process Response
    Backend->>SocketServer: io.to(roomId).emit<br/>('response_recorded')<br/>{participantId}
    SocketServer->>Client1UI: 📡 Confirmation
```

---

## 8. End-to-End Data Flow Example: Quiz Taking

### Complete Sequence

```
┌─────────────────────────────────────────────────────────────────────┐
│ QUIZ PARTICIPANT JOURNEY: From QR Scan to Certificate               │
└─────────────────────────────────────────────────────────────────────┘

STEP 1: DISCOVERY
───────────────────
User (Participant) receives SMS/Email with QR code
                          ↓
Scans QR → Browser opens → Frontend loads React SPA (5173 dev / 5000 prod)


STEP 2: QUIZ LOOKUP & ELIGIBILITY CHECK
──────────────────────────────────────────
Frontend: GET /api/quizzes/:id/offline-details?code=ABC123
                          ↓
Backend: Extract quiz ID from code
                          ↓
Backend Auth Middleware: No auth required (public endpoint)
                          ↓
Backend Route Handler: queries DB for Quiz + Questions
                          ↓
DB: SELECT quiz, questions, options FROM database
                          ↓
Response: {quiz, questions[], options} → Frontend
                          ↓
Frontend: Display "Ready to Join? Enter Name"


STEP 3: SESSION ENTRY
──────────────────────
User: Types Name + Employee ID
                          ↓
Frontend: POST /api/quizzes/:id/offline-check-eligibility
          {name, employeeId, sessionCode}
                          ↓
Backend: Validate participant eligibility
         • Is project active?
         • Has user already attempted? (check max_attempts)
         • Is participant within allowed time window?
                          ↓
DB: SELECT user, project, previous_responses
                          ↓
Backend Logic: 
  if (eligible) {
    DB: INSERT INTO participants {name, sessionId, score: null}
    response: {participantId, status: 'joined'}
  } else {
    response: {error: 'Not eligible', reason: '...'} 
  }
                          ↓
Frontend: If error → Show "You cannot join this quiz"
          If success → Socket.io connect


STEP 4: REAL-TIME CONNECTION
──────────────────────────────
Frontend: socket.connect(backend_url)
          socket.emit('participant_joined', {participantId, name})
                          ↓
Backend Socket.io Server: Receives event
                          ↓
Backend: socket.join('quiz_session_' + sessionId)
         Store mapping: socketId ↔ participantId
                          ↓
Backend: Emit to Trainer: 'participant_joined', {name}
         (Trainer UI updates: "John has joined")
                          ↓
Frontend: Display "Waiting for first question..."


STEP 5: QUESTION & RESPONSE CYCLE
──────────────────────────────────
[Trainer clicks "Next Question"]
                          ↓
Trainer Frontend: socket.emit('post_question', {questionId, timeLimit})
                          ↓
Backend Socket Server: Receives from trainer socket
                          ↓
Backend: DB.query('SELECT * FROM questions WHERE id = ?')
         Broadcast to room: io.to('quiz_session_X').emit(
           'question_posted',
           {
             id: questionId,
             text: "What is customer loyalty?",
             type: "multiple_choice",
             options: ["A", "B", "C", "D"],
             timeLimit: 30
           }
         )
                          ↓
Frontend: Receives WebSocket event
          Timer: countdown 30 seconds
          Display question + radio buttons
                          ↓
User: Clicks Option B
                          ↓
Frontend: socket.emit('participant_response', {
  participantId,
  questionId,
  answer: 'B',
  timeSpent: 5
})
                          ↓
Backend: Receives response
         
         // Validate
         const isCorrect = (answer === question.correct_answer)
         
         // Store in DB
         DB: INSERT INTO responses {participantId, questionId, answer, ...}
         
         // Update score
         if (isCorrect) {
           DB: UPDATE participants SET score = score + 10 WHERE id = participantId
         }
                          ↓
Backend: Emit to Trainer: 'response_recorded', {participantName, correct}
         Emit to Participant: 'response_accepted'


STEP 6: QUIZ END
────────────────
[After all questions]
                          ↓
Trainer: Clicks "End Quiz"
                          ↓
Trainer Frontend: socket.emit('session_ended', {sessionId})
                          ↓
Backend: DB.query('SELECT p.*, COUNT(r.id) as attempts, SUM(r.correct) as score
          FROM participants p
          LEFT JOIN responses r ON p.id = r.participantId
          WHERE p.sessionId = ? GROUP BY p.id')
                          ↓
Backend: Calculate results
         • Final Score: 8/10 = 80%
         • Pass/Fail: if (score >= 60) PASS else FAIL
         • Rank: based on scores (1st, 2nd, 3rd...)
                          ↓
Backend: DB: UPDATE session SET status = 'completed', endedAt = now()
         DB: UPDATE participants SET final_score = 80, status = 'completed'
                          ↓
Backend: Emit to all: 'session_ended', {
  yourScore: 80,
  totalScore: 100,
  rank: 2,
  result: 'PASS',
  leaderboard: [{name, score, rank}...]
}
                          ↓
Frontend: Display results screen
          "Congratulations! You scored 80/100"
          "You ranked 2nd"


STEP 7: REPORT GENERATION
──────────────────────────
Trainer: Clicks "Download Report"
                          ↓
Trainer Frontend: GET /api/reports/:sessionId?format=pdf
                          ↓
Backend: DB.query('SELECT * FROM sessions
         JOIN participants ON session.id = participants.sessionId
         JOIN responses ON participants.id = responses.participantId
         WHERE sessionId = ? ...')
                          ↓
Backend: Aggregate data:
  {
    sessionId: 123,
    quizTitle: "Customer Service Quiz",
    totalQuestions: 10,
    participants: [
      {name: "John", score: 80, rank: 1},
      {name: "Jane", score: 75, rank: 2}
    ],
    statistics: {
      avgScore: 77.5,
      passRate: 100%,
      duration: 45min
    }
  }
                          ↓
Backend: Puppeteer.launch()
         Generate HTML with data
         <html><body>
           <h1>Quiz Report: Customer Service</h1>
           <table>
             <tr><td>Participant</td><td>Score</td><td>Rank</td></tr>
             ... data rows ...
           </table>
           <canvas id="chart"></canvas>
         </body></html>
                          ↓
Puppeteer: Render HTML
           Take screenshot / PDF
           Return PDF Buffer
                          ↓
Backend: Save to /backend/downloads/report_session123.pdf
         Return download URL
                          ↓
Frontend: Trigger download
          Browser downloads: report_session123.pdf


STEP 8: CERTIFICATE (IF TRAINING COMPLETE)
──────────────────────────────────────────
[After completing all quiz/trainings for project]
                          ↓
Backend: Background job checks:
  SELECT * FROM trainingProgress
  WHERE userId = ? AND projectId = ?
  COUNT(*) = required_trainings AND all completed = TRUE
                          ↓
Backend: If eligible:
  DB: INSERT INTO certificates {
    userId,
    projectId,
    issuedAt: now(),
    status: 'issued'
  }
                          ↓
Backend: Puppeteer.launch()
         Generate certificate HTML:
         <html>
           <body style="certificate styling">
             <h1>Certificate of Completion</h1>
             <p>This is to certify that [Name]</p>
             <p>Has successfully completed [Project]</p>
             <p>Date: [Date]</p>
             <img src="signature">
           </body>
         </html>
                          ↓
Puppeteer: Render → PDF
           Save to /uploads/certificates/cert_user123.pdf
                          ↓
Backend: nodemailer.sendMail({
  to: participant.email,
  subject: 'Certificate of Completion',
  html: emailTemplate,
  attachments: [{
    filename: 'Certificate.pdf',
    path: '/uploads/certificates/cert_user123.pdf'
  }]
})
                          ↓
SMTP Server: (Ethereal/Gmail/SendGrid)
           Deliver email to participant
                          ↓
Participant: Receives email with PDF attachment
            Downloads certificate


┌─────────────────────────────────────────────────────────────────────┐
│ DATA FLOW SUMMARY                                                   │
└─────────────────────────────────────────────────────────────────────┘

User Input
    ↓
Frontend (React)
    ├→ Validates input locally
    ├→ Sends HTTP request (Axios)
    ├→ Or connects WebSocket (Socket.io)
    ↓
Backend (Express)
    ├→ Routes request to handler
    ├→ Auth Middleware (JWT verification)
    ├→ RBAC Middleware (Role check)
    ├→ Data validation
    ↓
Database (SQLite + Sequelize)
    ├→ Query data
    ├→ Validate foreign keys
    ├→ Return results
    ↓
Backend Processing
    ├→ Calculate metrics
    ├→ Check eligibility
    ├→ Transform data
    ├→ Generate files (if needed)
    ↓
External Services (Async)
    ├→ Nodemailer: Send emails
    ├→ Puppeteer: Generate PDFs
    ├→ FFmpeg: Process media
    ↓
Response
    ├→ HTTP: JSON payload
    ├→ WebSocket: Real-time event
    ├→ File download: PDF/Excel
    ↓
Frontend Update
    ├→ Update UI state
    ├→ Display to user
    ├→ Cache in LocalStorage/IndexedDB
```

---

## 9. System Integration Points

```mermaid
graph TB
    subgraph "Client Layer"
        A["📱 Browser/Mobile"]
    end
    
    subgraph "Frontend"
        B["React App (Vite)"]
        C["State Management<br/>(useState, Context)"]
        D["Local Storage<br/>(JWT Token)"]
    end
    
    subgraph "Network"
        E["HTTP/REST"]
        F["WebSocket"]
    end
    
    subgraph "Backend API"
        G["Express Server"]
        H["Route Handlers"]
        I["Auth/RBAC Middleware"]
    end
    
    subgraph "Data Processing"
        J["Business Logic"]
        K["Validation & Transformation"]
    end
    
    subgraph "Data Access"
        L["Sequelize ORM"]
        M["SQLite Database"]
    end
    
    subgraph "External Services"
        N["Email<br/>Nodemailer"]
        O["PDF/Screenshots<br/>Puppeteer"]
        P["Media Processing<br/>FFmpeg"]
        Q["Public URL<br/>Cloudflare"]
    end
    
    A -->|User Interaction| B
    B -->|State| C
    B -->|Token| D
    B -->|JSON Requests| E
    B -->|Real-time Events| F
    E -->|HTTP| G
    F -->|WebSocket| G
    G -->|Route| H
    H -->|Validate| I
    I -->|Business Logic| J
    J -->|Transform| K
    K -->|Query/Mutate| L
    L -->|SQL| M
    M -->|Result| L
    J -.->|Async Task| N
    J -.->|Async Task| O
    J -.->|Async Task| P
    J -.->|Tunnel URL| Q
    L -->|Data| J
    J -->|Response| G
    G -->|JSON| E
    G -->|Event| F
    E -->|Update| C
    F -->|Update| C
    C -->|Re-render| B
    B -->|Display| A
```

---

## 10. Key Data Flows by Module

| Module | Input | Process | Output | Services |
|--------|-------|---------|--------|----------|
| **Authentication** | Email + Password | Hash verify, JWT generate | Token + User | DB, JWT Library |
| **Quiz Session** | QR/Code + Name | Eligibility check, register | Participant ID | DB, Socket.io |
| **Question Posting** | Question ID | Fetch data, broadcast | All participants see Q | DB, Socket.io |
| **Response Handling** | Answer + Time | Validate, score, store | Score update | DB, Socket.io |
| **Reporting** | Session ID | Query + aggregate + render | PDF/Excel file | DB, Puppeteer, ExcelJS |
| **Email Invite** | User email + meeting info | Template + SMTP send | Email delivered | Nodemailer, SMTP |
| **Certificate** | User + Project | Check completion, generate PDF | PDF + Email sent | DB, Puppeteer, Nodemailer |
| **Offline Sync** | Responses + timestamp | Verify + batch insert | Responses stored | IndexedDB, DB, Network |

---

## Summary

The RetailEdge Pro application operates on a **request-response** and **event-driven** architecture:

1. **User initiates action** in browser
2. **Frontend (React)** collects input, validates locally, sends to backend
3. **Backend (Express)** authenticates, authorizes, validates, processes business logic
4. **Database (SQLite)** stores/retrieves data via Sequelize ORM
5. **External Services** handle async operations (email, PDF, media)
6. **Real-time Events** via Socket.io keep all participants synchronized
7. **Response flows back** to frontend and other connected clients
8. **Frontend re-renders** UI with new data

This architecture supports synchronous REST calls for one-off operations and asynchronous WebSocket events for real-time collaboration (quizzes, live sessions).

