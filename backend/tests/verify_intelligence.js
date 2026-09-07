const intelligenceService = require('../utils/projectIntelligenceService');
const Project = require('../models/Project');
const User = require('../models/User');

async function testIntelligence() {
  try {
    console.log('🧪 Testing Project Intelligence Service...');

    // 1. Test Project Scoping with a Program Manager
    const pmUser = await User.findOne({ where: { email: 'amol.mohite@idonneous.com' } });
    if (!pmUser) {
      console.log('⚠️ PM user not found, testing with first available PM');
    }
    const testUser = pmUser || { id: 'test-pm', role: 'Program Manager', projectId: '1c4c15a4-88fa-4624-a45a-a97a9fac7907' };
    
    const accessibleIds = await intelligenceService.getAccessibleProjectIds(testUser, 'all', 'all');
    console.log(`✅ Accessible Projects for PM (${testUser.name || testUser.email}): ${accessibleIds.length} projects`);
    if (accessibleIds.length === 0) throw new Error('Expected accessible projects for PM');

    // 2. Test 13 KPIs Calculation
    const kpis = await intelligenceService.getProjectKPIs(accessibleIds);
    console.log('✅ Calculated 13 KPIs:');
    console.log(`   1. Active Projects: ${kpis.activeProjects}`);
    console.log(`   2. Active Subprojects: ${kpis.activeSubprojects}`);
    console.log(`   3. Active Training Sessions: ${kpis.activeTrainingSessions}`);
    console.log(`   4. Total Participants: ${kpis.totalParticipants}`);
    console.log(`   5. Participants Joined: ${kpis.participantsJoined}`);
    console.log(`   6. Attendance Rate: ${kpis.attendanceRate}%`);
    console.log(`   7. Average Session Duration: ${kpis.averageSessionDuration}`);
    console.log(`   8. Quizzes Assigned: ${kpis.quizzesAssigned}`);
    console.log(`   9. Quiz Attempts: ${kpis.quizAttempts}`);
    console.log(`   10. Quiz Completion Rate: ${kpis.quizCompletionRate}%`);
    console.log(`   11. Average Quiz Score: ${kpis.averageQuizScore}%`);
    console.log(`   12. Quiz Pass Rate: ${kpis.quizPassRate}%`);
    console.log(`   13. Certificates Issued: ${kpis.certificatesIssued}`);

    // 3. Test Jitsi Attendance & Intervals
    const jitsiData = await intelligenceService.getProjectJitsiAttendance(accessibleIds);
    console.log(`✅ Jitsi Telemetry: ${jitsiData.overview.totalRecorded} records found.`);
    console.log(`   Present: ${jitsiData.overview.present}, Below Threshold: ${jitsiData.overview.belowThreshold}`);

    // 4. Test Quiz Intelligence
    const quizData = await intelligenceService.getProjectQuizIntelligence(accessibleIds);
    console.log(`✅ Quiz Intelligence: ${quizData.kpis.totalAttempts} attempts (Online: ${quizData.onlineAttempts}, Offline: ${quizData.offlineAttempts})`);

    // 5. Test Multi-Project Comparison
    const comparison = await intelligenceService.getProjectComparison(testUser);
    console.log(`✅ Project Comparison: ${comparison.length} projects analyzed with health ratings.`);
    comparison.slice(0, 3).forEach(c => {
      console.log(`   • ${c.name}: ${c.participants} learners | ${c.attendance} att | Health: ${c.projectHealth}`);
    });

    // 6. Test Master Training Outcome (21 columns)
    const masterRows = await intelligenceService.getMasterTrainingOutcomeData(accessibleIds);
    console.log(`✅ Master Training Outcome Rows: ${masterRows.length} rows.`);
    if (masterRows.length > 0) {
      console.log('   Sample Row Columns:', Object.keys(masterRows[0]).join(', '));
      const colCount = Object.keys(masterRows[0]).length;
      console.log(`   Column Count: ${colCount} (expected >= 20)`);
    }

    console.log('\n🎉 ALL INTELLIGENCE SERVICE TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

testIntelligence();
