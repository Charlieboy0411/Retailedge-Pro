const sequelize = require('./config/database');
const Quiz = require('./models/Quiz');
const User = require('./models/User');
const Role = require('./models/Role');

async function inspect() {
  await sequelize.authenticate();
  const quizzes = await Quiz.findAll({
    include: [{ model: User, as: 'creator', include: [Role] }]
  });
  for (const q of quizzes) {
    console.log(`Quiz Title: ${q.title} | Creator ID: ${q.creatorId} | Creator Name: ${q.creator ? q.creator.name : 'None'} | Creator Role: ${q.creator && q.creator.Role ? q.creator.Role.role_name : 'None'}`);
  }
  process.exit(0);
}
inspect();
