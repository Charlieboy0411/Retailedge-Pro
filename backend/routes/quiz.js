const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Project = require('../models/Project');
const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Response = require('../models/Response');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

router.get('/', requireAuth, async (req, res) => {
  try {
    const quizzes = await Quiz.findAll({
      include: [
        { model: Project },
        { model: Question, as: 'questions' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching quizzes' });
  }
});

// POST /api/quizzes
// Expects body: { title, description, config, projectId, questions: [{ type, text, options, correct_answer }] }
router.post('/', requireAuth, async (req, res) => {
  const { title, description, config, projectId, questions } = req.body;
  try {
    // Create the Quiz
    const quiz = await Quiz.create({ 
      title, 
      description, 
      config: config || {}, 
      creatorId: req.user.id,
      projectId: projectId || null 
    });

    // Create the nested questions
    if (questions && questions.length > 0) {
      const questionsData = questions.map(q => ({
        ...q,
        quizId: quiz.id
      }));
      await Question.bulkCreate(questionsData);
    }

    // Fetch the complete created quiz with questions
    const createdQuiz = await Quiz.findByPk(quiz.id, {
      include: [{ model: Question, as: 'questions' }]
    });

    res.status(201).json(createdQuiz);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create quiz', details: err.message });
  }
});

// Helper function to check if answer is correct
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

// POST /api/quizzes/:id/offline - Enable & configure offline mode
router.post('/:id/offline', requireAuth, requireRole(['Trainer', 'Admin', 'Super Admin']), async (req, res) => {
  const { isOffline, startTime, endTime } = req.body;
  try {
    const quiz = await Quiz.findByPk(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const currentConfig = quiz.config || {};
    quiz.config = {
      ...currentConfig,
      isOffline: !!isOffline,
      offlineStartTime: startTime || null,
      offlineEndTime: endTime || null
    };

    const roomCode = `off-${quiz.id.substring(0, 8)}`;
    if (isOffline) {
      let session = await Session.findOne({ where: { quizId: quiz.id, roomCode } });
      if (!session) {
        await Session.create({
          quizId: quiz.id,
          hostId: req.user.id,
          roomCode: roomCode,
          status: 'active',
          current_question_index: 0,
          startedAt: new Date()
        });
      } else if (session.status !== 'active') {
        session.status = 'active';
        await session.save();
      }
    } else {
      const session = await Session.findOne({ where: { quizId: quiz.id, roomCode } });
      if (session && session.status !== 'finished') {
        session.status = 'finished';
        session.endedAt = new Date();
        await session.save();
      }
    }

    // Save changes
    quiz.changed('config', true);
    await quiz.save();
    res.json({ success: true, config: quiz.config });
  } catch (err) {
    console.error('Offline config error:', err);
    res.status(500).json({ error: 'Failed to configure offline quiz', details: err.message });
  }
});

// GET /api/quizzes/:id/offline-details - Public endpoint for taking quiz asynchronously
router.get('/:id/offline-details', async (req, res) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id, {
      include: [
        { model: Project },
        { model: Question, as: 'questions' }
      ]
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const conf = quiz.config || {};
    if (!conf.isOffline) {
      return res.status(400).json({ error: 'This quiz is not configured for offline taking.' });
    }

    const now = new Date();
    if (conf.offlineStartTime && new Date(conf.offlineStartTime) > now) {
      return res.status(400).json({ 
        error: 'This offline quiz has not started yet.',
        startTime: conf.offlineStartTime,
        endTime: conf.offlineEndTime
      });
    }

    if (conf.offlineEndTime && new Date(conf.offlineEndTime) < now) {
      return res.status(400).json({ 
        error: 'This offline quiz has ended.',
        startTime: conf.offlineStartTime,
        endTime: conf.offlineEndTime
      });
    }

    // Omit correct answers
    const safeQuestions = (quiz.questions || []).map(q => {
      const qObj = q.toJSON();
      delete qObj.correct_answer;
      return qObj;
    });

    res.json({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      projectName: quiz.Project ? quiz.Project.name : 'No Project',
      questions: safeQuestions,
      offlineStartTime: conf.offlineStartTime,
      offlineEndTime: conf.offlineEndTime
    });
  } catch (err) {
    console.error('Offline details error:', err);
    res.status(500).json({ error: 'Failed to retrieve offline quiz details.' });
  }
});

// POST /api/quizzes/:id/offline-check-eligibility - Verify duplicate submissions
router.post('/:id/offline-check-eligibility', async (req, res) => {
  const { employeeId, mobileNumber, userId } = req.body;
  try {
    const quiz = await Quiz.findByPk(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (userId) {
      const User = require('../models/User');
      const Role = require('../models/Role');
      const user = await User.findByPk(userId, { include: [Role] });
      if (user) {
        const roleName = user.Role ? user.Role.role_name : null;
        if (['Trainer', 'Admin', 'Super Admin', 'Program Manager', 'Client'].includes(roleName)) {
          return res.json({ eligible: false, message: 'Trainer and Administrator roles are not eligible to participate in offline quizzes.' });
        }
      }
    }

    const roomCode = `off-${quiz.id.substring(0, 8)}`;
    const session = await Session.findOne({ where: { quizId: quiz.id, roomCode } });
    if (!session) {
      return res.json({ eligible: true });
    }

    const clauses = [];
    if (userId) clauses.push({ userId });
    if (employeeId && employeeId.trim() !== '') clauses.push({ employeeId: employeeId.trim() });
    if (mobileNumber && mobileNumber.trim() !== '') clauses.push({ mobileNumber: mobileNumber.trim() });

    if (clauses.length === 0) {
      return res.json({ eligible: true });
    }

    const duplicate = await Participant.findOne({
      where: {
        sessionId: session.id,
        [Op.or]: clauses
      }
    });

    if (duplicate) {
      return res.json({ eligible: false, message: 'You have already completed this quiz. Only one submission is allowed.' });
    }

    res.json({ eligible: true });
  } catch (err) {
    console.error('Eligibility check error:', err);
    res.status(500).json({ error: 'Failed to verify eligibility.' });
  }
});

// POST /api/quizzes/:id/offline-submit - Submit offline quiz responses and grade
router.post('/:id/offline-submit', async (req, res) => {
  const { name, employeeId, mobileNumber, storeName, userId, deviceId, answers } = req.body;
  try {
    const quiz = await Quiz.findByPk(req.params.id, {
      include: [{ model: Question, as: 'questions' }]
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (userId) {
      const User = require('../models/User');
      const Role = require('../models/Role');
      const user = await User.findByPk(userId, { include: [Role] });
      if (user) {
        const roleName = user.Role ? user.Role.role_name : null;
        if (['Trainer', 'Admin', 'Super Admin', 'Program Manager', 'Client'].includes(roleName)) {
          return res.status(403).json({ error: 'Trainer and Administrator roles are not eligible to submit responses.' });
        }
      }
    }

    const conf = quiz.config || {};
    if (!conf.isOffline) {
      return res.status(400).json({ error: 'This quiz is not configured for offline taking.' });
    }

    const now = new Date();
    if (conf.offlineStartTime && new Date(conf.offlineStartTime) > now) {
      return res.status(400).json({ error: 'This offline quiz has not started yet.' });
    }
    if (conf.offlineEndTime && new Date(conf.offlineEndTime) < now) {
      return res.status(400).json({ error: 'This offline quiz has ended.' });
    }

    const roomCode = `off-${quiz.id.substring(0, 8)}`;
    const session = await Session.findOne({ where: { quizId: quiz.id, roomCode } });
    if (!session) {
      return res.status(400).json({ error: 'Offline session not active.' });
    }

    // Check duplicate
    const clauses = [];
    if (userId) clauses.push({ userId });
    if (employeeId && employeeId.trim() !== '') clauses.push({ employeeId: employeeId.trim() });
    if (mobileNumber && mobileNumber.trim() !== '') clauses.push({ mobileNumber: mobileNumber.trim() });

    if (clauses.length > 0) {
      const duplicate = await Participant.findOne({
        where: {
          sessionId: session.id,
          [Op.or]: clauses
        }
      });
      if (duplicate) {
        return res.status(400).json({ error: 'You have already completed this quiz. Only one submission is allowed.' });
      }
    }

    // Grade answers
    let finalScore = 0;
    const responsesToCreate = [];
    const dbQuestionsMap = {};
    (quiz.questions || []).forEach(q => {
      dbQuestionsMap[q.id] = q;
    });

    (answers || []).forEach(ans => {
      const question = dbQuestionsMap[ans.questionId];
      if (question) {
        let points = 0;
        if (isCorrectAnswer(question, ans.answer)) {
          points = question.points !== undefined ? question.points : 1;
        }
        finalScore += points;

        responsesToCreate.push({
          questionId: ans.questionId,
          answer: Array.isArray(ans.answer) ? JSON.stringify(ans.answer) : String(ans.answer),
          response_time: ans.timeTaken || 0,
          points_awarded: points
        });
      }
    });

    // Create participant
    const participant = await Participant.create({
      sessionId: session.id,
      name: name || 'Guest',
      employeeId: employeeId || null,
      mobileNumber: mobileNumber || null,
      storeName: storeName || null,
      connectionStatus: 'active',
      score: finalScore,
      userId: userId || null,
      deviceId: deviceId || null
    });

    responsesToCreate.forEach(r => {
      r.participantId = participant.id;
    });
    await Response.bulkCreate(responsesToCreate);

    const io = req.app.get('io');
    if (io) {
      io.emit('offline_response_submitted', { quizId: quiz.id, sessionId: session.id });
    }

    const totalQuestions = quiz.questions ? quiz.questions.length : 0;
    res.json({
      success: true,
      score: finalScore,
      totalQuestions,
      percentage: totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0
    });
  } catch (err) {
    console.error('Offline submit error:', err);
    res.status(500).json({ error: 'Failed to submit quiz responses.' });
  }
});

// GET /api/quizzes/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id, {
      include: [
        { model: Project },
        { model: Question, as: 'questions' }
      ]
    });
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (err) {
    console.error('Failed to fetch quiz details:', err);
    res.status(500).json({ error: 'Server error fetching quiz details' });
  }
});

// PUT /api/quizzes/:id
router.put('/:id', requireAuth, requireRole(['Trainer', 'Admin', 'Super Admin']), async (req, res) => {
  const { title, description, config, projectId, questions } = req.body;
  try {
    const quiz = await Quiz.findByPk(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Check creator or admin/super admin
    const User = require('../models/User');
    const Role = require('../models/Role');
    const userWithRole = await User.findByPk(req.user.id, { include: [Role] });
    const userRole = userWithRole?.Role?.role_name;

    if (quiz.creatorId !== req.user.id && !['Admin', 'Super Admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Unauthorized to edit this quiz' });
    }

    // Update Quiz
    quiz.title = title !== undefined ? title : quiz.title;
    quiz.description = description !== undefined ? description : quiz.description;
    quiz.config = config !== undefined ? config : quiz.config;
    quiz.projectId = projectId !== undefined ? projectId : quiz.projectId;
    await quiz.save();

    // Update questions
    if (questions) {
      await Question.destroy({ where: { quizId: quiz.id } });
      if (questions.length > 0) {
        const questionsData = questions.map(q => ({
          type: q.type,
          text: q.text,
          options: q.options,
          correct_answer: q.correct_answer,
          time_limit: q.time_limit !== undefined ? q.time_limit : 30,
          points: q.points !== undefined ? q.points : 1,
          media_url: q.media_url || '',
          quizId: quiz.id
        }));
        await Question.bulkCreate(questionsData);
      }
    }

    const updatedQuiz = await Quiz.findByPk(quiz.id, {
      include: [{ model: Question, as: 'questions' }]
    });

    res.json(updatedQuiz);
  } catch (err) {
    console.error('Failed to update quiz:', err);
    res.status(500).json({ error: 'Failed to update quiz', details: err.message });
  }
});

// DELETE /api/quizzes/:id
router.delete('/:id', requireAuth, requireRole(['Trainer', 'Admin', 'Super Admin']), async (req, res) => {
  console.log('Delete attempt for quiz ID:', req.params.id);
  console.log('User ID from token:', req.user.id);
  console.log('User role from token:', req.user.role);
  try {
    const quiz = await Quiz.findByPk(req.params.id);
    if (!quiz) {
      console.log('Quiz not found in DB');
      return res.status(404).json({ error: 'Quiz not found' });
    }
    console.log('Quiz creator ID:', quiz.creatorId);

    // Check creator or admin/super admin
    const User = require('../models/User');
    const Role = require('../models/Role');
    const userWithRole = await User.findByPk(req.user.id, { include: [Role] });
    const userRole = userWithRole?.Role?.role_name;
    console.log('User role from DB:', userRole);

    if (quiz.creatorId !== req.user.id && !['Admin', 'Super Admin', 'Trainer'].includes(userRole)) {
      console.log('Block unauthorized delete: creatorId mismatch and not privileged role');
      return res.status(403).json({ error: 'Unauthorized to delete this quiz' });
    }

    // Delete associated items
    const questions = await Question.findAll({ where: { quizId: quiz.id } });
    const questionIds = questions.map(q => q.id);

    const sessions = await Session.findAll({ where: { quizId: quiz.id } });
    const sessionIds = sessions.map(s => s.id);

    // 1. Delete associated responses first to satisfy foreign key constraints
    if (questionIds.length > 0) {
      await Response.destroy({ where: { questionId: { [Op.in]: questionIds } } });
    }

    if (sessionIds.length > 0) {
      const participantIds = (await Participant.findAll({ where: { sessionId: { [Op.in]: sessionIds } }, attributes: ['id'] })).map(p => p.id);
      if (participantIds.length > 0) {
        await Response.destroy({ where: { participantId: { [Op.in]: participantIds } } });
      }
      // 2. Delete participants
      await Participant.destroy({ where: { sessionId: { [Op.in]: sessionIds } } });
      // 3. Delete sessions
      await Session.destroy({ where: { id: { [Op.in]: sessionIds } } });
    }

    // 4. Delete questions
    await Question.destroy({ where: { quizId: quiz.id } });

    // 5. Finally delete the quiz
    await quiz.destroy();

    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (err) {
    console.error('Failed to delete quiz:', err);
    res.status(500).json({ error: 'Failed to delete quiz', details: err.message });
  }
});

// New endpoint to verify authentication and role
router.get('/me', requireAuth, (req, res) => {
  console.log('Auth check for user', req.user.id, 'role', req.user.role);
  res.json({ user: req.user });
});


module.exports = router;
