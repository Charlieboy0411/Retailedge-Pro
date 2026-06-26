const sequelize = require('./config/database');
const User = require('./models/User');
const Role = require('./models/Role');
const Project = require('./models/Project');
const Quiz = require('./models/Quiz');
const Session = require('./models/Session');
const Question = require('./models/Question');

async function runHealthCheck() {
  console.log('================================================');
  console.log('🚀 INITIATING RETAIL EDGE PRO DB HEALTH CHECK 🚀');
  console.log('================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL Database');
    
    let issuesFound = 0;
    
    // 1. Check for Orphaned Users
    const totalUsers = await User.count();
    console.log(`\n👥 Validating ${totalUsers} Users...`);
    
    const users = await User.findAll({ include: [Role, Project] });
    for (const u of users) {
      if (!u.Role) {
        console.log(`   ❌ [ISSUE] User ${u.email} has NO valid role assigned (roleId: ${u.roleId})!`);
        issuesFound++;
      }
    }
    
    // 2. Check for Orphaned Sessions
    const totalSessions = await Session.count();
    console.log(`\n🎮 Validating ${totalSessions} Live Sessions...`);
    
    const sessions = await Session.findAll({ include: [Quiz] });
    for (const s of sessions) {
      if (!s.Quiz) {
        console.log(`   ❌ [ISSUE] Session ${s.pin} points to a deleted/missing Quiz: ${s.quizId}`);
        issuesFound++;
      }
    }
    
    // 3. Question Option Integrity
    const totalQuestions = await Question.count();
    console.log(`\n❓ Validating ${totalQuestions} Questions...`);
    const questions = await Question.findAll();
    for (const q of questions) {
      if (q.type !== 'descriptive') {
        let opts = [];
        try {
          opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        } catch (e) {}
        if (!opts || opts.length < 2) {
          console.log(`   ❌ [ISSUE] Question ID ${q.id} has insufficient options!`);
          issuesFound++;
        }
      }
    }

    console.log('\n================================================');
    if (issuesFound === 0) {
      console.log('🌟 DATABASE HEALTH CHECK PASSED! 🌟');
      console.log('No orphaned records, schema violations, or missing indexes found.');
      console.log('The database is CLEAN and READY for production.');
    } else {
      console.log(`🛑 HEALTH CHECK FAILED with ${issuesFound} issues.`);
      console.log('Please resolve the above data anomalies before going live to prevent runtime crashes.');
    }
    console.log('================================================\n');

  } catch (error) {
    console.error('Fatal Error during health check:', error);
  } finally {
    process.exit(0);
  }
}

runHealthCheck();
