const Session = require('../models/Session');
const Question = require('../models/Question');
const Participant = require('../models/Participant');
const Response = require('../models/Response');
const Quiz = require('../models/Quiz');

// In-memory map: roomCode → Map<socketId, participantId>
// Used for live connection tracking without hitting DB on every event
const roomSockets = {};   // roomCode → { socketId: participantId }
const socketRoom  = {};   // socketId → { roomCode, participantId }

const isCorrectAnswer = (question, submittedAnswer) => {
  if (!question || question.type === 'poll' || question.type === 'word_cloud' || question.type === 'rating') {
    return false; // Opinion-based/polls have no correct answer
  }
  
  const correct = question.correct_answer;
  if (!correct) return false;

  if (question.type === 'multi_select') {
    let correctArr = [];
    if (Array.isArray(correct)) correctArr = correct;
    else if (typeof correct === 'string') {
      try { correctArr = JSON.parse(correct); }
      catch (e) { correctArr = correct.split(',').map(s => s.trim()); }
    }

    let submittedArr = [];
    if (Array.isArray(submittedAnswer)) submittedArr = submittedAnswer;
    else if (typeof submittedAnswer === 'string') {
      try { submittedArr = JSON.parse(submittedAnswer); }
      catch (e) { submittedArr = submittedAnswer.split(',').map(s => s.trim()); }
    }

    if (!Array.isArray(correctArr) || !Array.isArray(submittedArr)) return false;
    if (correctArr.length !== submittedArr.length) return false;
    
    const sortedCorrect = [...correctArr].sort();
    const sortedSubmitted = [...submittedArr].sort();
    return sortedCorrect.every((val, index) => val === sortedSubmitted[index]);
  }

  if (typeof correct === 'string' && typeof submittedAnswer === 'string') {
    return correct.trim().toLowerCase() === submittedAnswer.trim().toLowerCase();
  }
  return correct === submittedAnswer;
};

/** Compute real-time trainer metrics for a room */
const getRoomMetrics = (roomCode) => {
  const sockets = roomSockets[roomCode] || {};
  const total = Object.keys(sockets).length;
  return { connected: total };
};

/** Broadcast updated metrics to host */
const broadcastMetrics = (io, roomCode, sessionId) => {
  Participant.findAll({ where: { sessionId } }).then(all => {
    const waiting      = all.filter(p => p.connectionStatus === 'waiting').length;
    const active       = all.filter(p => p.connectionStatus === 'active').length;
    const disconnected = all.filter(p => p.connectionStatus === 'disconnected').length;
    const rejoined     = all.filter(p => p.connectionStatus === 'rejoined').length;
    const total        = all.length;

    io.to(roomCode).emit('participant_metrics', {
      total, waiting, active, disconnected, rejoined
    });
  }).catch(() => {});
};

module.exports = function(io) {
  io.on('connection', (socket) => {
    
    // --- HOST EVENTS ---
    
    // Host starts or resumes a live quiz session
    socket.on('host_start_quiz', async ({ quizId, hostId }) => {
      try {
        // Check if an active session already exists to prevent duplicate rooms on refresh
        let session = await Session.findOne({
          where: { quizId, hostId, status: ['waiting', 'active'] },
          order: [['createdAt', 'DESC']]
        });

        let roomCode;
        let recovered = false;
        let participantsData = [];

        if (session) {
          roomCode = session.roomCode;
          recovered = true;
          const participants = await Participant.findAll({ where: { sessionId: session.id } });
          participantsData = participants.map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar || '🙂',
            disconnected: p.connectionStatus === 'disconnected'
          }));
          console.log(`[QuizEngine] Host recovered existing session. Room: ${roomCode}`);
        } else {
          // Generate a 6-digit random code
          roomCode = Math.floor(100000 + Math.random() * 900000).toString();
          session = await Session.create({
            quizId,
            hostId,
            roomCode: roomCode,
            status: 'waiting',
            current_question_index: 0
          });
          console.log(`[QuizEngine] Host started new quiz. Room: ${roomCode}`);
        }

        // Init room tracking
        if (!roomSockets[roomCode]) roomSockets[roomCode] = {};

        socket.join(roomCode);
        socket.emit('session_created', { 
          roomCode, 
          sessionId: session.id,
          recovered,
          status: session.status,
          currentQuestionIndex: session.current_question_index - 1, // 0-indexed in frontend
          participants: participantsData
        });
      } catch (error) {
        console.error('[QuizEngine] host_start_quiz error:', error);
        socket.emit('error', 'Failed to start quiz session');
      }
    });

    // Host reconnects to an existing room after a socket drop (no new session created)
    socket.on('host_rejoin_room', ({ roomCode }) => {
      if (!roomCode) return;
      const cleanCode = (roomCode || '').replace(/\s+/g, '');
      if (!roomSockets[cleanCode]) roomSockets[cleanCode] = {};
      socket.join(cleanCode);
      console.log(`[QuizEngine] Host rejoined room ${cleanCode} after reconnect.`);
    });

    // Host moves to the next question
    socket.on('host_next_question', async ({ roomCode, sessionId, question, questionIndex, totalQuestions }) => {
      try {
        const session = await Session.findByPk(sessionId);
        if (session) {
          session.status = 'active';
          if (questionIndex !== undefined) {
            session.current_question_index = questionIndex + 1;
          } else {
            session.current_question_index += 1;
          }
          await session.save();
        }

        // Mark all waiting participants as active
        await Participant.update(
          { connectionStatus: 'active' },
          { where: { sessionId, connectionStatus: 'waiting' } }
        );

        const safeQuestion = {
          id: question.id,
          text: question.text,
          type: question.type,
          options: question.options,
          time_limit: question.time_limit,
          media_url: question.media_url,
          questionIndex: questionIndex !== undefined ? questionIndex : (session ? session.current_question_index - 1 : 0),
          totalQuestions: totalQuestions
        };

        io.to(roomCode).emit('new_question', safeQuestion);
        broadcastMetrics(io, roomCode, sessionId);
        console.log(`[QuizEngine] Room ${roomCode}: Next question deployed.`);
      } catch (error) {
        socket.emit('error', 'Failed to push next question');
      }
    });

    // Host shows leaderboard for current question
    socket.on('host_show_leaderboard', async ({ roomCode, sessionId }) => {
      try {
        const participants = await Participant.findAll({
          where: { sessionId },
          include: [{
            model: Response,
            attributes: ['points_awarded', 'response_time']
          }],
          order: [['score', 'DESC']],
          limit: 10
        });
        
        io.to(roomCode).emit('leaderboard_update', participants);
      } catch (error) {
        console.error(error);
      }
    });

    // --- PARTICIPANT EVENTS ---

    // Participant joins a room
    socket.on('participant_join', async ({ roomCode, name, employeeId, mobileNumber, avatar, userId, deviceId }) => {
      try {
        const cleanCode = (roomCode || '').replace(/\s+/g, '');

        // Only match non-finished sessions to avoid stale session collisions
        const session = await Session.findOne({ 
          where: { roomCode: cleanCode, status: ['waiting', 'active'] },
          include: [{
            model: Quiz,
            include: [{ model: Question, as: 'questions' }]
          }],
          order: [['createdAt', 'DESC']] // pick most recent if duplicates exist
        });

        if (!session) {
          socket.emit('error', 'Invalid Room Code. Please check the code and try again.');
          return;
        }

        // --- 1. SEARCH FOR EXISTING PARTICIPANT IN THIS SESSION ---
        let participant = null;
        let isRejoin = false;

        // Try searching by deviceId first (most reliable for silent browser refreshes)
        if (deviceId) {
          participant = await Participant.findOne({
            where: { sessionId: session.id, deviceId }
          });
        }

        // Try searching by employeeId if provided (Option B or Guest custom ID)
        if (!participant && employeeId) {
          participant = await Participant.findOne({
            where: { sessionId: session.id, employeeId }
          });
        }

        // Try searching by mobileNumber if provided (Option C OTP login)
        if (!participant && mobileNumber) {
          participant = await Participant.findOne({
            where: { sessionId: session.id, mobileNumber }
          });
        }

        // --- 2. VALIDATE OR ESTABLISH CONNECTION STATUS ---
        if (participant) {
          // Null-safe check: roomSockets may be empty after a backend restart
          // In that case, allow rejoin rather than crashing
          const roomMap = roomSockets[cleanCode] || {};
          const isOnline = Object.values(roomMap).includes(participant.id);
          if (isOnline) {
            // Instead of rejecting, gracefully takeover the session and disconnect the old zombie socket
            const oldSocketId = Object.keys(roomMap).find(key => roomMap[key] === participant.id);
            if (oldSocketId) {
              const oldSocket = io.sockets.sockets.get(oldSocketId);
              if (oldSocket) {
                oldSocket.disconnect(true);
              }
              delete roomSockets[cleanCode][oldSocketId];
              delete socketRoom[oldSocketId];
            }
          }

          // Allow rejoin / takeover
          isRejoin = true;
          participant.connectionStatus = 'rejoined';
          if (avatar) participant.avatar = avatar;
          if (name) participant.name = name;
          if (deviceId) participant.deviceId = deviceId;
          await participant.save();
        } else {
          // Fresh join
          participant = await Participant.create({
            sessionId: session.id,
            name,
            employeeId: employeeId || null,
            mobileNumber: mobileNumber || null,
            avatar: avatar || '🙂',
            connectionStatus: 'waiting',
            userId: userId || null,
            deviceId: deviceId || null,
          });
        }

        // Track socket → participant mapping
        if (!roomSockets[cleanCode]) roomSockets[cleanCode] = {};
        roomSockets[cleanCode][socket.id] = participant.id;
        socketRoom[socket.id] = { roomCode: cleanCode, participantId: participant.id, sessionId: session.id };

        socket.join(cleanCode);

        const existingParticipants = await Participant.findAll({ where: { sessionId: session.id } });
        socket.emit('joined_session', { 
          participantId: participant.id, 
          sessionId: session.id,
          isRejoin,
          avatar: participant.avatar,
          score: participant.score,
          participants: existingParticipants.map(p => ({ id: p.id, name: p.name, avatar: p.avatar || '🙂' }))
        });
        
        // If session is already active, push the current question to the newly joined participant
        if (session.status === 'active' && session.Quiz && session.Quiz.questions) {
          const sortedQuestions = [...session.Quiz.questions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          const idx = session.current_question_index - 1;
          if (idx >= 0 && idx < sortedQuestions.length) {
            const activeQuestion = sortedQuestions[idx];
            const safeQuestion = {
              id: activeQuestion.id,
              text: activeQuestion.text,
              type: activeQuestion.type,
              options: activeQuestion.options,
              time_limit: activeQuestion.time_limit,
              media_url: activeQuestion.media_url,
              questionIndex: idx,
              totalQuestions: sortedQuestions.length
            };
            socket.emit('new_question', safeQuestion);
          }
        }

        // Notify host that someone joined / rejoined
        io.to(cleanCode).emit('participant_joined', { 
          name: participant.name, 
          id: participant.id, 
          avatar: participant.avatar || '🙂',
          isRejoin 
        });

        broadcastMetrics(io, cleanCode, session.id);
        console.log(`[QuizEngine] ${name} ${isRejoin ? 're-joined' : 'joined'} room ${cleanCode}`);
      } catch (error) {
        console.error('[QuizEngine] participant_join error:', error);
        socket.emit('error', 'Failed to join room');
      }
    });

    // Handle participant disconnect
    socket.on('disconnect', async () => {
      const info = socketRoom[socket.id];
      if (!info) return;

      const { roomCode, participantId, sessionId } = info;

      // Remove from room tracking
      if (roomSockets[roomCode]) {
        delete roomSockets[roomCode][socket.id];
      }
      delete socketRoom[socket.id];

      // Update DB status
      try {
        const participant = await Participant.findByPk(participantId);
        if (participant && participant.connectionStatus !== 'disconnected') {
          participant.connectionStatus = 'disconnected';
          await participant.save();
        }
        broadcastMetrics(io, roomCode, sessionId);
        io.to(roomCode).emit('participant_disconnected', { participantId, name: participant?.name });
        console.log(`[QuizEngine] Participant ${participantId} disconnected from room ${roomCode}`);
      } catch (err) {
        console.error('[QuizEngine] disconnect handler error:', err);
      }
    });

    // Participant submits an answer
    socket.on('submit_answer', async ({ roomCode, participantId, questionId, answer, timeTaken }) => {
      try {
        // 1. Fetch question to check if correct
        const question = await Question.findByPk(questionId);
        
        let points = 0;
        if (isCorrectAnswer(question, answer)) {
          points = 1;
        }

        // 2. Save Response
        await Response.create({
          participantId,
          questionId,
          answer,
          response_time: timeTaken,
          points_awarded: points
        });

        // 3. Update Participant Score
        const participant = await Participant.findByPk(participantId);
        if (participant) {
          participant.score += points;
          await participant.save();
        }

        // 4. Notify host of submission
        io.to(roomCode).emit('answer_received', { participantId, points, answer });
      } catch (error) {
        console.error('Failed to process answer', error);
      }
    });

    // Participant sends emoji reaction
    socket.on('emoji_reaction', ({ roomCode, emoji }) => {
      io.to(roomCode).emit('emoji_received', { emoji });
    });

    // Host ends session
    socket.on('host_end_session', async ({ roomCode }) => {
      try {
        const session = await Session.findOne({
          where: { roomCode: roomCode, status: ['waiting', 'active'] }
        });
        if (session) {
          session.status = 'finished';
          session.endedAt = new Date();
          await session.save();
          console.log(`[QuizEngine] Session ${session.id} status updated to finished.`);
          // Emit a global event so dashboards refresh
          io.emit('live_session_finished', { sessionId: session.id, roomCode });
        }
      } catch (err) {
        console.error('[QuizEngine] host_end_session error updating database:', err);
      }
      io.to(roomCode).emit('quiz_ended');
      // Cleanup room tracking
      delete roomSockets[roomCode];
    });

    // Host resets session back to lobby
    socket.on('host_reset_lobby', ({ roomCode }) => {
      io.to(roomCode).emit('lobby_reset');
    });

    // Host reveals question answer
    socket.on('host_reveal_answer', async ({ roomCode, questionId }) => {
      try {
        const question = await Question.findByPk(questionId);
        const correctAnswer = question ? question.correct_answer : null;
        io.to(roomCode).emit('answer_revealed', { correctAnswer });
      } catch (err) {
        console.error('Failed to reveal answer', err);
        io.to(roomCode).emit('answer_revealed', { correctAnswer: null });
      }
    });

  });
};
