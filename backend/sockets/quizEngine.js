const Session     = require('../models/Session');
const Question    = require('../models/Question');
const Participant = require('../models/Participant');
const Response    = require('../models/Response');
const Quiz        = require('../models/Quiz');
const User        = require('../models/User');
const Role        = require('../models/Role');
const jwt         = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const logger      = require('../utils/logger');
const scoringEngine = require('./services/scoringEngine');

// ─── In-Memory Connection Tracking ───────────────────────────────────────────
// NOTE: This state is per-process. A server restart clears it.
// PostgreSQL Session/Participant tables provide durable recovery (see host_start_quiz).
const roomSockets = {};  // roomCode → { socketId: participantId }
const socketRoom  = {};  // socketId → { roomCode, participantId, sessionId }

// ─── Server-Authoritative Timer State ────────────────────────────────────────
const activeTimers    = {};  // roomCode → { intervalId, remaining, questionId }
const metricsDebounce = {};  // roomCode → debounce timer

// ─── Security: Answer Deduplication ─────────────────────────────────────────
// Tracks (participantId:questionId) pairs already answered — prevents replay/double-submit
const answeredMap = {};  // `${participantId}:${questionId}` → true

// ─── Security: Rate Limiter ───────────────────────────────────────────────────
// Prevents flooding: max 10 submit_answer events per socket per 30-second window
const socketRateLimit = {}; // socketId → { count, windowStart }
const RATE_LIMIT_MAX    = 10;
const RATE_LIMIT_WINDOW = 30_000; // ms

// ─── Security: Payload Size Cap ──────────────────────────────────────────────
const MAX_ANSWER_BYTES = 4_096; // 4 KB — rejects oversized or malformed payloads

// ─── Monitoring Counters ──────────────────────────────────────────────────────
const monitorStats = {
  totalConnections:         0,
  totalDisconnections:      0,
  totalAnswers:             0,
  totalLateRejections:      0,
  totalDupeRejections:      0,
  totalFloodRejections:     0,
  totalOversizedRejections: 0,
  totalInvalidRooms:        0,
  failedReconnects:         0,
  questionsDelivered:       0,
  startedAt:                Date.now(),
};

// ─── Room Metrics ─────────────────────────────────────────────────────────────

/** Broadcast updated participant metrics to host — debounced 300ms to batch rapid events */
const broadcastMetrics = (io, roomCode, sessionId) => {
  if (metricsDebounce[roomCode]) clearTimeout(metricsDebounce[roomCode]);
  metricsDebounce[roomCode] = setTimeout(() => {
    Participant.findAll({ where: { sessionId } })
      .then(all => {
        const waiting      = all.filter(p => p.connectionStatus === 'waiting').length;
        const active       = all.filter(p => p.connectionStatus !== 'disconnected').length;
        const disconnected = all.filter(p => p.connectionStatus === 'disconnected').length;
        const rejoined     = all.filter(p => p.connectionStatus === 'rejoined').length;
        const total        = all.length;
        io.to(roomCode).emit('participant_metrics', { total, waiting, active, disconnected, rejoined });
      })
      .catch(() => {});
  }, 300);
};

// ─── Server-Authoritative Timer ───────────────────────────────────────────────

/**
 * Start a countdown on the server and broadcast `timer_tick` every second.
 * Tracks `remaining` so we can enforce late-answer rejection in submit_answer.
 * When reaching 0, emits canonical `timer_expired` (and legacy `time_up` alias).
 */
const startServerTimer = (io, roomCode, durationSeconds, questionId) => {
  clearServerTimer(roomCode);
  let remaining = durationSeconds;
  activeTimers[roomCode] = {
    questionId,
    remaining,
    intervalId: setInterval(() => {
      remaining--;
      activeTimers[roomCode].remaining = remaining;
      io.to(roomCode).emit('timer_tick', { remaining });
      if (remaining <= 0) {
        clearServerTimer(roomCode);
        io.to(roomCode).emit('timer_expired');
        io.to(roomCode).emit('time_up'); // legacy alias for host
      }
    }, 1000),
  };
};

/** Stop and remove a room's server timer */
const clearServerTimer = (roomCode) => {
  if (activeTimers[roomCode]) {
    clearInterval(activeTimers[roomCode].intervalId);
    delete activeTimers[roomCode];
  }
};

// ─── Exported Stats (used by /api/admin/stats endpoint) ──────────────────────
/**
 * Returns a snapshot of real-time system state.
 * Called by server.js to power the monitoring dashboard.
 */
const getStats = () => {
  const rooms = Object.keys(roomSockets).map(code => ({
    roomCode:         code,
    participantCount: Object.keys(roomSockets[code] || {}).length,
    timerActive:      !!activeTimers[code],
    timerRemaining:   activeTimers[code]?.remaining ?? null,
  }));

  return {
    activeRooms:       rooms.length,
    totalSockets:      Object.keys(socketRoom).length,
    rooms,
    monitor:           { ...monitorStats },
    uptimeSeconds:     Math.floor((Date.now() - monitorStats.startedAt) / 1000),
    memoryMB:          parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)),
    memoryTotalMB:     parseFloat((process.memoryUsage().heapTotal / 1024 / 1024).toFixed(1)),
    rssMemoryMB:       parseFloat((process.memoryUsage().rss / 1024 / 1024).toFixed(1)),
    cpuUsage:          process.cpuUsage(),
  };
};

// ─── Main Socket Handler ──────────────────────────────────────────────────────
function quizEngine(io) {
  io.on('connection', (socket) => {
    monitorStats.totalConnections++;
    logger.info('QuizEngine', null, null, 'Socket connected', { socketId: socket.id });

    // Extract authentication token from handshake auth or query params
    const rawToken = socket.handshake?.auth?.token || socket.handshake?.query?.token;
    if (rawToken) {
      try {
        socket.user = jwt.verify(rawToken, JWT_SECRET);
      } catch (e) {}
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HOST EVENTS (CANONICAL CONTRACT)
    // ═══════════════════════════════════════════════════════════════════════════

    // Host starts or resumes a live quiz session (CANONICAL)
    socket.on('host_start_quiz', async ({ quizId, hostId, hostName, token: payloadToken }) => {
      try {
        if (!quizId) {
          return socket.emit('error', 'Quiz ID is required');
        }

        let callerUser = socket.user;
        if (!callerUser && payloadToken) {
          try {
            callerUser = jwt.verify(payloadToken, JWT_SECRET);
            socket.user = callerUser;
          } catch (e) {}
        }

        // Host identity validation:
        // Authoritative socket user takes precedence over DevTools-supplied hostId
        let authoritativeHostId = hostId;
        if (callerUser) {
          authoritativeHostId = callerUser.id;
          if (hostId && hostId !== callerUser.id && !['Admin', 'Super Admin'].includes(callerUser.role)) {
            return socket.emit('error', 'Unauthorized: Cannot start session on behalf of another user');
          }
        }

        // RBAC validation: Only Trainer, Admin, Super Admin can host Live Arena
        if (callerUser) {
          const authorizedRoles = ['Trainer', 'Admin', 'Super Admin'];
          if (!authorizedRoles.includes(callerUser.role)) {
            return socket.emit('error', 'Forbidden: Insufficient role permissions to host Live Arena');
          }
        } else if (authoritativeHostId) {
          const dbUser = await User.findByPk(authoritativeHostId, {
            include: [{ model: Role }]
          });
          if (dbUser) {
            const roleName = dbUser.Role ? dbUser.Role.role_name : dbUser.role;
            const authorizedRoles = ['Trainer', 'Admin', 'Super Admin'];
            if (roleName && !authorizedRoles.includes(roleName)) {
              return socket.emit('error', 'Forbidden: Insufficient role permissions to host Live Arena');
            }
          }
        }

        const quiz = await Quiz.findByPk(quizId, {
          include: [{ model: Question, as: 'questions' }]
        });
        if (!quiz) {
          return socket.emit('error', 'Quiz not found');
        }

        // Project Isolation validation:
        // Trainer cannot host quizzes belonging to foreign projects
        if (callerUser && callerUser.role === 'Trainer' && callerUser.projectId) {
          if (quiz.projectId && quiz.projectId !== callerUser.projectId) {
            return socket.emit('error', 'Forbidden: Trainer not authorized for this project');
          }
        }

        // Check for existing waiting or active session for this quiz
        let session = await Session.findOne({
          where: {
            quizId,
            ...(authoritativeHostId ? { hostId: authoritativeHostId } : {}),
            status: ['waiting', 'active']
          },
          order: [['createdAt', 'DESC']]
        });

        let roomCode;
        let recovered        = false;
        let participantsData = [];
        let currentQuestion  = null;

        if (session) {
          roomCode  = session.roomCode;
          recovered = true;

          // Backfill projectId, trainingId, or hostId if missing
          if (!session.projectId && quiz.projectId) {
            session.projectId = quiz.projectId;
            await session.save();
          }
          if (!session.trainingId && quiz.trainingId) {
            session.trainingId = quiz.trainingId;
            await session.save();
          }
          if (!session.hostId && authoritativeHostId) {
            session.hostId = authoritativeHostId;
            await session.save();
          }

          const participants = await Participant.findAll({ where: { sessionId: session.id } });
          participantsData   = participants.map(p => ({
            id:           p.id,
            name:         p.name,
            avatar:       p.avatar || '🙂',
            disconnected: p.connectionStatus === 'disconnected',
          }));

          if (session.status === 'active' && quiz.questions) {
            const sorted = [...quiz.questions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            const idx    = session.current_question_index - 1;
            if (idx >= 0 && idx < sorted.length) currentQuestion = sorted[idx];
          }

          logger.info('QuizEngine', roomCode, session.id, 'Host recovered existing session', {
            hostId: session.hostId,
            status: session.status,
            questionIndex: session.current_question_index,
          });
        } else {
          roomCode = Math.floor(100000 + Math.random() * 900000).toString();
          session  = await Session.create({
            quizId,
            hostId: authoritativeHostId || null,
            projectId: quiz.projectId || null,
            trainingId: quiz.trainingId || null,
            roomCode,
            status:                  'waiting',
            current_question_index: 0,
          });
          logger.info('QuizEngine', roomCode, session.id, 'Host started new quiz session', { hostId: authoritativeHostId, quizId, projectId: quiz.projectId });
        }

        if (!roomSockets[roomCode]) roomSockets[roomCode] = {};
        socket.join(roomCode);

        const initialMetrics = {
          total:        participantsData.length,
          waiting:      participantsData.filter(p => !p.disconnected).length,
          active:       participantsData.filter(p => !p.disconnected).length,
          disconnected: participantsData.filter(p => p.disconnected).length,
          rejoined:     0,
        };

        const sessionPayload = {
          roomCode,
          sessionId:            session.id,
          recovered,
          status:               session.status,
          currentQuestionIndex: session.current_question_index - 1,
          participants:         participantsData,
          currentQuestion,
          metrics:              initialMetrics,
        };

        // Emit canonical session_created event and legacy session_started alias
        socket.emit('session_created', sessionPayload);
        socket.emit('session_started', sessionPayload); // legacy alias

        // Broadcast initial participant metrics to room
        io.to(roomCode).emit('participant_metrics', initialMetrics);
      } catch (error) {
        logger.error('QuizEngine', null, null, 'host_start_quiz error', error);
        socket.emit('error', 'Failed to start quiz session');
      }
    });

    // Host reconnects to an existing room after a socket drop (CANONICAL)
    const handleHostRejoin = ({ roomCode }) => {
      if (!roomCode) return;
      const cleanCode = (roomCode || '').replace(/\s+/g, '');
      if (!roomSockets[cleanCode]) roomSockets[cleanCode] = {};
      socket.join(cleanCode);
      logger.info('QuizEngine', cleanCode, null, 'Host rejoined room after reconnect', { socketId: socket.id });
    };
    socket.on('host_rejoin_room', handleHostRejoin);
    socket.on('host_reconnect', handleHostRejoin); // legacy alias

    // Host moves to the next question or starts session (CANONICAL)
    const handleHostNextQuestion = async ({ roomCode, sessionId, question, questionIndex, totalQuestions }) => {
      try {
        const cleanCode = (roomCode || '').replace(/\s+/g, '');
        let session = sessionId ? await Session.findByPk(sessionId) : null;
        if (!session && cleanCode) {
          session = await Session.findOne({ where: { roomCode: cleanCode, status: ['waiting', 'active'] } });
        }
        if (!session) {
          return socket.emit('error', 'Session not found');
        }

        let callerUser = socket.user;
        if (callerUser) {
          const authorizedRoles = ['Trainer', 'Admin', 'Super Admin'];
          if (!authorizedRoles.includes(callerUser.role)) {
            return socket.emit('error', 'Forbidden: Insufficient role permissions');
          }
          if (session.hostId && session.hostId !== callerUser.id && !['Admin', 'Super Admin'].includes(callerUser.role)) {
            return socket.emit('error', 'Unauthorized: Not the host of this session');
          }
          if (callerUser.role === 'Trainer' && callerUser.projectId && session.projectId && session.projectId !== callerUser.projectId) {
            return socket.emit('error', 'Forbidden: Project isolation violation');
          }
        }

        const targetIndex = questionIndex !== undefined ? questionIndex : session.current_question_index;
        session.status = 'active';
        session.current_question_index = targetIndex + 1;
        if (!session.startedAt) {
          session.startedAt = new Date();
        }
        await session.save();

        await Participant.update(
          { connectionStatus: 'active' },
          { where: { sessionId: session.id, connectionStatus: 'waiting' } }
        );

        // Authoritative question retrieval: defensive fallback if question is missing/incomplete
        let activeQuestion = question;
        if (!activeQuestion || !activeQuestion.id || !activeQuestion.text) {
          const quiz = await Quiz.findByPk(session.quizId, {
            include: [{ model: Question, as: 'questions' }]
          });
          if (quiz && quiz.questions && quiz.questions.length > 0) {
            const sorted = [...quiz.questions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            activeQuestion = sorted[targetIndex] || sorted[0];
            totalQuestions = sorted.length;
          }
        }

        if (!activeQuestion) {
          return socket.emit('error', 'Question not found for session');
        }

        const duration = activeQuestion.time_limit || 30;
        const safeQuestion = {
          id:            activeQuestion.id,
          text:          activeQuestion.text,
          type:          activeQuestion.type,
          options:       activeQuestion.options,
          time_limit:    duration,
          duration:      duration,
          media_url:     activeQuestion.media_url,
          questionIndex: targetIndex,
          totalQuestions: totalQuestions || 1,
        };

        // Broadcast canonical new_question event and legacy question_started alias
        io.to(cleanCode).emit('new_question', safeQuestion);
        io.to(cleanCode).emit('question_started', safeQuestion); // legacy alias
        broadcastMetrics(io, cleanCode, session.id);

        // Server-authoritative timer
        startServerTimer(io, cleanCode, duration, activeQuestion.id);
        monitorStats.questionsDelivered++;

        logger.info('QuizEngine', cleanCode, session.id, 'Question deployed', {
          questionIndex: targetIndex,
          timeLimitSeconds: duration,
          questionId: activeQuestion.id,
        });
      } catch (error) {
        logger.error('QuizEngine', roomCode, sessionId, 'host_next_question error', error);
        socket.emit('error', 'Failed to push next question');
      }
    };
    socket.on('host_next_question', handleHostNextQuestion);
    socket.on('host_start_session', handleHostNextQuestion);

    // Host shows leaderboard (CANONICAL)
    socket.on('host_show_leaderboard', async ({ roomCode, sessionId }) => {
      try {
        const cleanCode = (roomCode || '').replace(/\s+/g, '');
        let sId = sessionId;
        if (!sId && cleanCode) {
          const session = await Session.findOne({ where: { roomCode: cleanCode } });
          if (session) sId = session.id;
        }
        if (!sId) return;

        const participants = await Participant.findAll({
          where: { sessionId: sId },
          order: [['score', 'DESC']],
          limit: 10,
        });

        const leaderboardData = participants.map(p => ({
          id:               p.id,
          name:             p.name,
          avatar:           p.avatar || '🙂',
          score:            p.score,
          connectionStatus: p.connectionStatus,
        }));

        io.to(cleanCode).emit('leaderboard_update', leaderboardData);
        logger.info('QuizEngine', cleanCode, sId, 'Leaderboard broadcast', { count: leaderboardData.length });
      } catch (error) {
        logger.error('QuizEngine', roomCode, sessionId, 'host_show_leaderboard error', error);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PARTICIPANT EVENTS (CANONICAL CONTRACT)
    // ═══════════════════════════════════════════════════════════════════════════

    // Participant joins the live quiz session (CANONICAL)
    const handleParticipantJoin = async ({ roomCode, name, employeeId, mobileNumber, avatar, userId, deviceId }) => {
      try {
        const cleanCode = (roomCode || '').replace(/\s+/g, '');

        // ── Security: reject invalid or expired room codes ──
        const session = await Session.findOne({
          where: { roomCode: cleanCode },
          include: [{ model: Quiz, include: [{ model: Question, as: 'questions' }] }],
          order: [['createdAt', 'DESC']],
        });

        if (!session) {
          monitorStats.totalInvalidRooms++;
          logger.warn('QuizEngine', cleanCode, null, 'Rejected join — invalid room code', { name });
          return socket.emit('error', 'Invalid Room Code. Please check the code and try again.');
        }

        if (session.status === 'finished') {
          return socket.emit('error', 'Session has already ended');
        }

        // Project isolation validation for participant
        const joinUserId = userId || socket.user?.id;
        if (joinUserId && session.projectId) {
          const userRecord = await User.findByPk(joinUserId);
          if (userRecord && userRecord.projectId && userRecord.projectId !== session.projectId) {
            return socket.emit('error', 'Forbidden: Participant belongs to a different project');
          }
        }

        let participant = null;
        let isRejoin    = false;

        if (deviceId) {
          participant = await Participant.findOne({ where: { sessionId: session.id, deviceId } });
        }
        if (!participant && employeeId) {
          participant = await Participant.findOne({ where: { sessionId: session.id, employeeId } });
        }
        if (!participant && mobileNumber) {
          participant = await Participant.findOne({ where: { sessionId: session.id, mobileNumber } });
        }
        if (!participant && userId) {
          participant = await Participant.findOne({ where: { sessionId: session.id, userId } });
        }

        if (participant) {
          const roomMap  = roomSockets[cleanCode] || {};
          const isOnline = Object.values(roomMap).includes(participant.id);
          if (isOnline) {
            const oldSocketId = Object.keys(roomMap).find(key => roomMap[key] === participant.id);
            if (oldSocketId) {
              const oldSocket = io.sockets.sockets.get(oldSocketId);
              if (oldSocket) oldSocket.disconnect(true);
              delete roomSockets[cleanCode][oldSocketId];
              delete socketRoom[oldSocketId];
            }
          }

          isRejoin                     = true;
          participant.connectionStatus = 'rejoined';
          if (avatar)   participant.avatar   = avatar;
          if (name)     participant.name     = name;
          if (deviceId) participant.deviceId = deviceId;
          await participant.save();
        } else {
          participant = await Participant.create({
            sessionId:        session.id,
            name:             name || 'Learner',
            employeeId:       employeeId   || null,
            mobileNumber:     mobileNumber || null,
            avatar:           avatar       || '🙂',
            connectionStatus: session.status === 'active' ? 'active' : 'waiting',
            userId:           userId       || null,
            deviceId:         deviceId     || null,
          });
        }

        if (!roomSockets[cleanCode]) roomSockets[cleanCode] = {};
        roomSockets[cleanCode][socket.id] = participant.id;
        socketRoom[socket.id] = { roomCode: cleanCode, participantId: participant.id, sessionId: session.id };

        socket.join(cleanCode);

        const existingParticipants = await Participant.findAll({ where: { sessionId: session.id } });
        socket.emit('joined_session', {
          participantId: participant.id,
          sessionId:     session.id,
          isRejoin,
          avatar:        participant.avatar,
          score:         participant.score,
          participants:  existingParticipants.map(p => ({ id: p.id, name: p.name, avatar: p.avatar || '🙂' })),
        });

        if (session.status === 'active' && session.Quiz && session.Quiz.questions) {
          const sorted = [...session.Quiz.questions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          const idx    = session.current_question_index - 1;
          if (idx >= 0 && idx < sorted.length) {
            const activeQuestion = sorted[idx];
            socket.emit('new_question', {
              id:             activeQuestion.id,
              text:           activeQuestion.text,
              type:           activeQuestion.type,
              options:        activeQuestion.options,
              time_limit:     activeQuestion.time_limit || 30,
              duration:       activeQuestion.time_limit || 30,
              media_url:      activeQuestion.media_url,
              questionIndex:  idx,
              totalQuestions: sorted.length,
            });
          }
        }

        io.to(cleanCode).emit('participant_joined', {
          name:     participant.name,
          id:       participant.id,
          avatar:   participant.avatar || '🙂',
          isRejoin,
        });

        broadcastMetrics(io, cleanCode, session.id);
        logger.info('QuizEngine', cleanCode, session.id, isRejoin ? 'Participant rejoined' : 'Participant joined', {
          name: participant.name,
          participantId: participant.id,
        });
      } catch (error) {
        logger.error('QuizEngine', roomCode, null, 'participant_join error', error);
        socket.emit('error', 'Failed to join room');
      }
    };

    socket.on('participant_join', handleParticipantJoin);
    socket.on('join_session', handleParticipantJoin); // legacy alias

    // Participant submits an answer (CANONICAL)
    socket.on('submit_answer', async ({ roomCode, participantId, questionId, answer, timeTaken }) => {
      const cleanCode = (roomCode || '').replace(/\s+/g, '');

      // ── Security Check 0: Payload size guard — reject oversized/malformed payloads ──
      const answerStr = typeof answer === 'string' ? answer : JSON.stringify(answer ?? '');
      if (answerStr.length > MAX_ANSWER_BYTES) {
        monitorStats.totalOversizedRejections++;
        logger.warn('QuizEngine', cleanCode, null, 'Oversized payload rejected', {
          participantId, size: answerStr.length,
        });
        socket.emit('answer_rejected', { reason: 'Payload too large' });
        return;
      }

      // ── Security Check 1: Rate limiter — max 10 submissions per 30 seconds ──
      const now = Date.now();
      if (!socketRateLimit[socket.id]) socketRateLimit[socket.id] = { count: 0, windowStart: now };
      const rl = socketRateLimit[socket.id];
      if (now - rl.windowStart > RATE_LIMIT_WINDOW) { rl.count = 0; rl.windowStart = now; }
      rl.count++;
      if (rl.count > RATE_LIMIT_MAX) {
        monitorStats.totalFloodRejections++;
        logger.warn('QuizEngine', cleanCode, null, 'Rate limit exceeded — flooding detected', {
          socketId: socket.id, participantId, count: rl.count,
        });
        socket.emit('answer_rejected', { reason: 'Too many submissions' });
        return;
      }

      // ── Security Check 2: Reject answers after the server timer has expired ──
      // activeTimers[cleanCode] is deleted the moment remaining reaches 0.
      if (!activeTimers[cleanCode]) {
        monitorStats.totalLateRejections++;
        logger.warn('QuizEngine', cleanCode, null, 'Late answer rejected — timer expired', {
          participantId, questionId,
        });
        socket.emit('answer_rejected', { reason: 'Time expired' });
        return;
      }

      // ── Security Check 3: Reject duplicate submissions for the same question ──
      const dedupeKey = `${participantId}:${questionId}`;
      if (answeredMap[dedupeKey]) {
        monitorStats.totalDupeRejections++;
        logger.warn('QuizEngine', cleanCode, null, 'Duplicate answer rejected (memory check)', {
          participantId, questionId,
        });
        socket.emit('answer_rejected', { reason: 'Already answered' });
        return;
      }

      // DB-level deduplication: ensure participant has not already submitted for this question
      const existingResponse = await Response.findOne({
        where: { participantId, questionId }
      });
      if (existingResponse) {
        answeredMap[dedupeKey] = true;
        monitorStats.totalDupeRejections++;
        logger.warn('QuizEngine', cleanCode, null, 'Duplicate answer rejected (DB check)', {
          participantId, questionId,
        });
        socket.emit('answer_rejected', { reason: 'Already answered' });
        return;
      }
      answeredMap[dedupeKey] = true;

      try {
        const question  = await Question.findByPk(questionId);
        const isCorrect = scoringEngine.isCorrectAnswer(question, answer);
        const points    = scoringEngine.calculatePoints(isCorrect, question, timeTaken);

        await Response.create({
          participantId,
          questionId,
          answer,
          response_time:  timeTaken,
          points_awarded: points,
        });

        const participant = await Participant.findByPk(participantId);
        if (participant) {
          participant.score += points;
          await participant.save();
        }

        const answerPayload = { participantId, points, answer, isCorrect, questionId };
        // Broadcast canonical answer_received event
        io.to(cleanCode).emit('answer_received', answerPayload);
        monitorStats.totalAnswers++;

        logger.info('QuizEngine', cleanCode, null, 'Answer submitted', {
          participantId,
          questionId,
          isCorrect,
          points,
          timeTaken,
        });
      } catch (error) {
        logger.error('QuizEngine', cleanCode, null, 'submit_answer error', error);
      }
    });

    // Participant sends emoji reaction (CANONICAL)
    socket.on('emoji_reaction', ({ roomCode, emoji }) => {
      const cleanCode = (roomCode || '').replace(/\s+/g, '');
      io.to(cleanCode).emit('emoji_received', { emoji });
      io.to(cleanCode).emit('reaction_received', { emoji }); // legacy alias
    });

    // Handle participant disconnect
    socket.on('disconnect', async () => {
      monitorStats.totalDisconnections++;

      // Clean up per-socket rate limiter state to prevent memory leaks
      delete socketRateLimit[socket.id];

      const info = socketRoom[socket.id];
      if (!info) return;

      const { roomCode, participantId, sessionId } = info;

      if (roomSockets[roomCode]) {
        delete roomSockets[roomCode][socket.id];
      }
      delete socketRoom[socket.id];

      try {
        const participant = await Participant.findByPk(participantId);
        if (participant && participant.connectionStatus !== 'disconnected') {
          participant.connectionStatus = 'disconnected';
          await participant.save();
        }
        broadcastMetrics(io, roomCode, sessionId);
        io.to(roomCode).emit('participant_disconnected', { participantId, name: participant?.name });
        logger.info('QuizEngine', roomCode, sessionId, 'Participant disconnected', { participantId });
      } catch (err) {
        logger.error('QuizEngine', roomCode, sessionId, 'disconnect handler error', err);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // HOST CONTROL EVENTS (CANONICAL CONTRACT)
    // ═══════════════════════════════════════════════════════════════════════════

    // Host ends the session (CANONICAL)
    const handleHostEndSession = async ({ roomCode }) => {
      clearServerTimer(roomCode);
      const cleanCode = (roomCode || '').replace(/\s+/g, '');

      try {
        const session = await Session.findOne({
          where: { roomCode: cleanCode, status: ['waiting', 'active'] },
        });
        if (session) {
          let callerUser = socket.user;
          if (callerUser) {
            const authorizedRoles = ['Trainer', 'Admin', 'Super Admin'];
            if (!authorizedRoles.includes(callerUser.role)) {
              return socket.emit('error', 'Forbidden: Insufficient role permissions');
            }
            if (session.hostId && session.hostId !== callerUser.id && !['Admin', 'Super Admin'].includes(callerUser.role)) {
              return socket.emit('error', 'Unauthorized: Not the host of this session');
            }
          }
          session.status  = 'finished';
          session.endedAt = new Date();
          await session.save();
          logger.info('QuizEngine', cleanCode, session.id, 'Quiz session ended');

          const participants = await Participant.findAll({
            where: { sessionId: session.id },
            order: [['score', 'DESC']],
            limit: 10,
          });
          const leaderboard = participants.map(p => ({
            id:               p.id,
            name:             p.name,
            avatar:           p.avatar || '🙂',
            score:            p.score,
            connectionStatus: p.connectionStatus,
          }));

          // 1. Notify the quiz room that the quiz ended
          io.to(cleanCode).emit('live_session_finished', { sessionId: session.id, roomCode: cleanCode });
          io.to(cleanCode).emit('quiz_ended', { leaderboard });

          // 2. Notify all dashboard clients via a dedicated `dashboard_sync` event
          io.emit('dashboard_sync', {
            event:     'session_finished',
            sessionId: session.id,
            roomCode:  cleanCode,
          });
        }
      } catch (err) {
        logger.error('QuizEngine', cleanCode, null, 'host_end_session error', err);
      }

      // Cleanup room tracking
      delete roomSockets[cleanCode];
      if (metricsDebounce[cleanCode]) {
        clearTimeout(metricsDebounce[cleanCode]);
        delete metricsDebounce[cleanCode];
      }
    };

    socket.on('host_end_session', handleHostEndSession);
    socket.on('host_end_quiz', handleHostEndSession); // legacy alias

    // Host resets session back to lobby
    socket.on('host_reset_lobby', ({ roomCode }) => {
      const cleanCode = (roomCode || '').replace(/\s+/g, '');
      clearServerTimer(cleanCode);
      io.to(cleanCode).emit('lobby_reset');
    });

    // Host reveals the correct answer (CANONICAL)
    socket.on('host_reveal_answer', async ({ roomCode, questionId, questionIndex }) => {
      try {
        const cleanCode = (roomCode || '').replace(/\s+/g, '');
        let qId = questionId;
        if (!qId && questionIndex !== undefined) {
          const session = await Session.findOne({ where: { roomCode: cleanCode } });
          if (session) {
            const quiz = await Quiz.findByPk(session.quizId, {
              include: [{ model: Question, as: 'questions' }]
            });
            if (quiz && quiz.questions) {
              const sorted = [...quiz.questions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
              if (sorted[questionIndex]) qId = sorted[questionIndex].id;
            }
          }
        }
        const question      = qId ? await Question.findByPk(qId) : null;
        const correctAnswer = question ? question.correct_answer : null;

        // Fetch current leaderboard alongside answer reveal
        let leaderboardData = [];
        const session = await Session.findOne({ where: { roomCode: cleanCode } });
        if (session) {
          const participants = await Participant.findAll({
            where: { sessionId: session.id },
            order: [['score', 'DESC']],
            limit: 10,
          });
          leaderboardData = participants.map(p => ({
            id:               p.id,
            name:             p.name,
            avatar:           p.avatar || '🙂',
            score:            p.score,
            connectionStatus: p.connectionStatus,
          }));
        }

        io.to(cleanCode).emit('answer_revealed', { correctAnswer, questionId: qId, leaderboard: leaderboardData });
        logger.info('QuizEngine', cleanCode, null, 'Answer revealed', { questionId: qId });
      } catch (err) {
        logger.error('QuizEngine', roomCode, null, 'host_reveal_answer error', err);
        io.to(roomCode).emit('answer_revealed', { correctAnswer: null, leaderboard: [] });
      }
    });
  });
}

quizEngine.getStats = getStats;
module.exports = quizEngine;
