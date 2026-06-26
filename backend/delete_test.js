const sequelize = require('./config/database');
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');
const Session = require('./models/Session');
const Participant = require('./models/Participant');
const Response = require('./models/Response');
const { Op } = require('sequelize');

async function testDelete() {
  await sequelize.authenticate();
  
  // Find a quiz to try to delete
  const quiz = await Quiz.findOne();
  if (!quiz) {
    console.log('No quiz found to delete.');
    process.exit(0);
  }
  
  console.log(`Attempting to delete quiz: ${quiz.title} (ID: ${quiz.id})`);
  
  try {
    const questions = await Question.findAll({ where: { quizId: quiz.id } });
    const questionIds = questions.map(q => q.id);

    const sessions = await Session.findAll({ where: { quizId: quiz.id } });
    const sessionIds = sessions.map(s => s.id);

    console.log(`Associated questions count: ${questionIds.length}`);
    console.log(`Associated sessions count: ${sessionIds.length}`);

    // 1. Delete associated responses first to satisfy foreign key constraints
    if (questionIds.length > 0) {
      const respQCount = await Response.destroy({ where: { questionId: { [Op.in]: questionIds } } });
      console.log(`Deleted responses by questionId: ${respQCount}`);
    }

    if (sessionIds.length > 0) {
      const participantIds = (await Participant.findAll({ where: { sessionId: { [Op.in]: sessionIds } }, attributes: ['id'] })).map(p => p.id);
      console.log(`Associated participants count: ${participantIds.length}`);
      if (participantIds.length > 0) {
        const respPCount = await Response.destroy({ where: { participantId: { [Op.in]: participantIds } } });
        console.log(`Deleted responses by participantId: ${respPCount}`);
      }
      // 2. Delete participants
      const partCount = await Participant.destroy({ where: { sessionId: { [Op.in]: sessionIds } } });
      console.log(`Deleted participants: ${partCount}`);
      // 3. Delete sessions
      const sessCount = await Session.destroy({ where: { id: { [Op.in]: sessionIds } } });
      console.log(`Deleted sessions: ${sessCount}`);
    }

    // 4. Delete questions
    const questCount = await Question.destroy({ where: { quizId: quiz.id } });
    console.log(`Deleted questions: ${questCount}`);

    // 5. Finally delete the quiz
    await quiz.destroy();
    console.log('Quiz deleted successfully!');
  } catch (err) {
    console.error('DELETE FAILED WITH ERROR:', err);
  }
  
  process.exit(0);
}

testDelete();
