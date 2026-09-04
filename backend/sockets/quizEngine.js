const Session     = require('../models/Session');
const Question    = require('../models/Question');
const Participant = require('../models/Participant');
const Response    = require('../models/Response');
const Quiz        = require('../models/Quiz');
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
        const active       = all.filter(p => p.connectionStatus === 'active').length;
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
 * When reaching 0, emits `timer_expired` to the room.
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

    // ═══════════════════════════════════════════════════════════════════════════
    // HOST EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    // Host starts or resumes a live quiz session
    socket.on('host_start_quiz', async ({ quizId, hostId, sessionName, roomCode: existingRoomCode }) => {
      try {
        let session = null;
        let roomCode = existingRoomCode;
        let recovered = false;
        let participantsData = [];
        let currentQuestion  = null;

        // If an explicit roomCode is given (reconnecting/recovering existing session on page refresh)
        if (roomCode) {
          session = await Session.findOne({
            where: { roomCode, status: ['waiting', 'active'] },
            order: [['createdAt', 'DESC']]
          });
        }

        if (session) {
          roomCode  = session.roomCode;
          recovered = true;

          const participants = await Participant.findAll({ where: { sessionId: session.id } });
          participantsData   = participants.map(p => ({
            id:           p.id,
            name:         p.name,
            avatar:       p.avatar || '🙂',
            disconnected: p.connectionStatus === 'disconnected',
          }));

          if (session.status === 'active') {
            const quiz = await Quiz.findByPk(quizId, {
              include: [{ model: Question, as: 'questions' }]
            });
            if (quiz && quiz.questions) {
              const sorted = [...quiz.questions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
              const idx    = session.current_question_index - 1;
              if (idx >= 0 && idx < sorted.length) currentQuestion = sorted[idx];
            }
          }

          logger.info('QuizEngine', roomCode, session.id, 'Host recovered existing session', {
            hostId,
            status: session.status,
            questionIndex: session.current_question_index,
          });
        } else {
<<<<<<< HEAD
          roomCode = Math.floor(100000 + Math.random() * 900000).toString();
          session  = await Session.create({
            quizId,
            hostId,
            roomCode,
            status:                  'waiting',
            current_question_index: 0,
          });
          logger.info('QuizEngine', roomCode, session.id, 'Host started new quiz session', { hostId, quizId });
=======
          // Always generate a unique 6-digit room code for fresh quiz launch
          let uniqueCodeFound = false;
          while (!uniqueCodeFound) {
            roomCode = Math.floor(100000 + Math.random() * 900000).toString();
            const collision = await Session.findOne({ where: { roomCode, status: ['waiting', 'active'] } });
            if (!collision) uniqueCodeFound = true;
          }

          session = await Session.create({
            quizId,
            hostId,
            roomCode: roomCode,
            session_name: sessionName || null,
            status: 'waiting',
            current_question_index: 0
          });
          console.log(`[QuizEngine] Host started NEW quiz session. Room: ${roomCode}, Subject/Batch: ${sessionName || 'Default'}`);
>>>>>>> abhishek
        }

        if (!roomSockets[roomCode]) roomSockets[roomCode] = {};
        socket.join(roomCode);
<<<<<<< HEAD

        socket.emit('session_created', {
          roomCode,
          sessionId:            session.id,
=======
        socket.emit('session_created', { 
          roomCode, 
          sessionId: session.id,
          sessionName: session.session_name || sessionName || null,
>>>>>>> abhishek
          recovered,
          status:               session.status,
          currentQuestionIndex: session.current_question_index - 1,
          participants:         participantsData,
          currentQuestion,
        });
      } catch (error) {
        logger.error('QuizEngine', null, null, 'host_start_quiz error', error);
        socket.emit('error', 'Failed to start quiz session');
      }
    });

    // Host reconnects to an existing room after a socket drop
    socket.on('host_rejoin_room', ({ roomCode }) => {
      if (!roomCode) return;
      const cleanCode = (roomCode || '').replace(/\s+/g, '');
      if (!roomSockets[cleanCode]) roomSockets[cleanCode] = {};
      socket.join(cleanCode);
      logger.info('QuizEngine', cleanCode, null, 'Host rejoined room after reconnect', { socketId: socket.id });
    });

    // Host moves to the next question
    socket.on('host_next_question', async ({ roomCode, sessionId, question, questionIndex, totalQuestions }) => {
      try {
        const session = await Session.findByPk(sessionId);
        if (session) {
          session.status = 'active';
          session.current_question_index = questionIndex !== undefined
            ? questionIndex + 1
            : session.current_question_index + 1;
          await session.save();
        }

        await Participant.update(
          { connectionStatus: 'active' },
          { where: { sessionId, connectionStatus: 'waiting' } }
        );

        const safeQuestion = {
          id:            question.id,
          text:          question.text,
          type:          question.type,
          options:       question.options,
          time_limit:    question.time_limit,
          media_url:     question.media_url,
          questionIndex: questionIndex !== undefined
            ? questionIndex
            : (session ? session.current_question_index - 1 : 0),
          totalQuestions,
        };

        io.to(roomCode).emit('new_question', safeQuestion);
        broadcastMetrics(io, roomCode, sessionId);

        // ── Server-authoritative timer — tracks remaining for late-answer rejection ──
        const timeLimitSeconds = question.time_limit || 30;
        startServerTimer(io, roomCode, timeLimitSeconds, question.id);
        monitorStats.questionsDelivered++;

        logger.info('QuizEngine', roomCode, sessionId, 'Question deployed', {
          questionIndex,
          timeLimitSeconds,
          questionId: question.id,
        });
      } catch (error) {
        logger.error('QuizEngine', roomCode, sessionId, 'host_next_question error', error);
        socket.emit('error', 'Failed to push next question');
      }
    });

    // Host shows leaderboard
    socket.on('host_show_leaderboard', async ({ roomCode, sessionId }) => {
      try {
        const participants = await Participant.findAll({
          where: { sessionId },
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

        io.to(roomCode).emit('leaderboard_update', leaderboardData);
        logger.info('QuizEngine', roomCode, sessionId, 'Leaderboard broadcast', { count: leaderboardData.length });
      } catch (error) {
        logger.error('QuizEngine', roomCode, sessionId, 'host_show_leaderboard error', error);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PARTICIPANT EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    // Participant joins a room
    socket.on('participant_join', async ({ roomCode, name, employeeId, mobileNumber, avatar, userId, deviceId, participantId: incomingParticipantId, isRejoin: explicitRejoin, zone }) => {
      try {
        const cleanCode = (roomCode || '').replace(/\s+/g, '');

        // ── Security: reject invalid room codes immediately ──
        const session = await Session.findOne({
          where: { roomCode: cleanCode, status: ['waiting', 'active'] },
          include: [{ model: Quiz, include: [{ model: Question, as: 'questions' }] }],
          order: [['createdAt', 'DESC']],
        });

        if (!session) {
          monitorStats.totalInvalidRooms++;
          logger.warn('QuizEngine', cleanCode, null, 'Rejected join — invalid room code', { name });
          socket.emit('error', 'Invalid Room Code. Please check the code and try again.');
          return;
        }

        // --- 1. SEARCH FOR EXISTING PARTICIPANT IN THIS SESSION (DEDUPLICATION) ---
        let participant = null;
        let isRejoin    = false;

        // A. Match by explicit participantId from client
        if (incomingParticipantId) {
          participant = await Participant.findOne({
            where: { id: incomingParticipantId, sessionId: session.id }
          });
        }

        // B. Match by deviceId (same phone / browser tab)
        if (!participant && deviceId) {
          participant = await Participant.findOne({
            where: { sessionId: session.id, deviceId }
          });
        }

        // C. Match by employeeId if provided
        if (!participant && employeeId) {
          participant = await Participant.findOne({
            where: { sessionId: session.id, employeeId }
          });
        }

        // D. Match by mobileNumber if provided
        if (!participant && mobileNumber) {
          participant = await Participant.findOne({
            where: { sessionId: session.id, mobileNumber }
          });
        }

        // E. Match by logged-in userId
        if (!participant && userId) {
          participant = await Participant.findOne({
            where: { sessionId: session.id, userId }
          });
        }

        // F. Match by name in the same session (prevent duplicate entry for same person)
        if (!participant && name && name.trim()) {
          const sessionParticipants = await Participant.findAll({ where: { sessionId: session.id } });
          participant = sessionParticipants.find(p => p.name && p.name.trim().toLowerCase() === name.trim().toLowerCase()) || null;
        }

        // --- 2. VALIDATE OR ESTABLISH CONNECTION STATUS ---
        if (participant) {
          // Rejoining existing participant session - cleanly replace socket
          const roomMap = roomSockets[cleanCode] || {};
          const oldSocketId = Object.keys(roomMap).find(key => roomMap[key] === participant.id);
          if (oldSocketId && oldSocketId !== socket.id) {
            const oldSocket = io.sockets.sockets.get(oldSocketId);
            if (oldSocket) {
              try { oldSocket.disconnect(true); } catch(e) {}
            }
            delete roomSockets[cleanCode][oldSocketId];
            delete socketRoom[oldSocketId];
          }

          isRejoin = true;
          participant.connectionStatus = session.status === 'active' ? 'active' : 'rejoined';
          if (avatar) participant.avatar = avatar;
          if (name) participant.name = name;
          if (deviceId) participant.deviceId = deviceId;
          await participant.save();
        } else {
          // Fresh unique participant join
          participant = await Participant.create({
            sessionId: session.id,
            name: name || 'Anonymous Learner',
            employeeId: employeeId || null,
            mobileNumber: mobileNumber || null,
            avatar: avatar || '🙂',
            connectionStatus: session.status === 'active' ? 'active' : 'waiting',
            userId: userId || null,
            deviceId: deviceId || null,
            storeName: zone || null
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
              time_limit:     activeQuestion.time_limit,
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
          name,
          participantId: participant.id,
        });
      } catch (error) {
        logger.error('QuizEngine', roomCode, null, 'participant_join error', error);
        socket.emit('error', 'Failed to join room');
      }
    });

    // Participant submits an answer
    socket.on('submit_answer', async ({ roomCode, participantId, questionId, answer, timeTaken }) => {

      // ── Security Check 0: Payload size guard — reject oversized/malformed payloads ──
      const answerStr = typeof answer === 'string' ? answer : JSON.stringify(answer ?? '');
      if (answerStr.length > MAX_ANSWER_BYTES) {
        monitorStats.totalOversizedRejections++;
        logger.warn('QuizEngine', roomCode, null, 'Oversized payload rejected', {
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
        logger.warn('QuizEngine', roomCode, null, 'Rate limit exceeded — flooding detected', {
          socketId: socket.id, participantId, count: rl.count,
        });
        socket.emit('answer_rejected', { reason: 'Too many submissions' });
        return;
      }

      // ── Security Check 2: Reject answers after the server timer has expired ──
      // activeTimers[roomCode] is deleted the moment remaining reaches 0.
      if (!activeTimers[roomCode]) {
        monitorStats.totalLateRejections++;
        logger.warn('QuizEngine', roomCode, null, 'Late answer rejected — timer expired', {
          participantId, questionId,
        });
        socket.emit('answer_rejected', { reason: 'Time expired' });
        return;
      }

      // ── Security Check 3: Reject duplicate submissions for the same question ──
      const dedupeKey = `${participantId}:${questionId}`;
      if (answeredMap[dedupeKey]) {
        monitorStats.totalDupeRejections++;
        logger.warn('QuizEngine', roomCode, null, 'Duplicate answer rejected', {
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

        io.to(roomCode).emit('answer_received', { participantId, points, answer, isCorrect });
        monitorStats.totalAnswers++;

        logger.info('QuizEngine', roomCode, null, 'Answer submitted', {
          participantId,
          questionId,
          isCorrect,
          points,
          timeTaken,
        });
      } catch (error) {
        logger.error('QuizEngine', roomCode, null, 'submit_answer error', error);
      }
    });

    // Participant sends emoji reaction
    socket.on('emoji_reaction', ({ roomCode, emoji }) => {
      io.to(roomCode).emit('emoji_received', { emoji });
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
    // HOST CONTROL EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    // Host ends the session
    socket.on('host_end_session', async ({ roomCode }) => {
      clearServerTimer(roomCode);

      try {
        const session = await Session.findOne({
          where: { roomCode, status: ['waiting', 'active'] },
        });
        if (session) {
          session.status  = 'finished';
          session.endedAt = new Date();
          await session.save();
          logger.info('QuizEngine', roomCode, session.id, 'Quiz session ended');

          // ── Targeted Notifications (as recommended in Phase 1 review) ─────────
          //
          // 1. Notify the quiz room that the quiz ended (participants see final screen)
          io.to(roomCode).emit('live_session_finished', { sessionId: session.id, roomCode });
          //
          // 2. Notify all dashboard clients via a dedicated `dashboard_sync` event.
          //    Dashboard pages (Reports, Attendance, PMDashboard) listen to `dashboard_sync`,
          //    NOT `live_session_finished`. This prevents quiz participants from reacting
          //    to an administrative event and vice versa.
          io.emit('dashboard_sync', {
            event:     'session_finished',
            sessionId: session.id,
            roomCode,
          });
        }
      } catch (err) {
        logger.error('QuizEngine', roomCode, null, 'host_end_session error', err);
      }

      io.to(roomCode).emit('quiz_ended');

      // Cleanup room tracking
      delete roomSockets[roomCode];
      if (metricsDebounce[roomCode]) {
        clearTimeout(metricsDebounce[roomCode]);
        delete metricsDebounce[roomCode];
      }
    });

    // Host resets session back to lobby
    socket.on('host_reset_lobby', ({ roomCode }) => {
      clearServerTimer(roomCode);
      io.to(roomCode).emit('lobby_reset');
    });

    // Host reveals the correct answer
    socket.on('host_reveal_answer', async ({ roomCode, questionId }) => {
      try {
        const question      = await Question.findByPk(questionId);
        const correctAnswer = question ? question.correct_answer : null;
        io.to(roomCode).emit('answer_revealed', { correctAnswer });
        logger.info('QuizEngine', roomCode, null, 'Answer revealed', { questionId });
      } catch (err) {
        logger.error('QuizEngine', roomCode, null, 'host_reveal_answer error', err);
        io.to(roomCode).emit('answer_revealed', { correctAnswer: null });
      }
    });
  });
}

quizEngine.getStats = getStats;
module.exports = quizEngine;
