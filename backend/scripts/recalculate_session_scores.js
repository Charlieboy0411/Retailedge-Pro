/**
 * recalculate_session_scores.js
 * Safely recalculates persisted Response.points_awarded and Participant.score
 * for a finished quiz session using the authoritative scoringEngine.
 *
 * Usage:
 *   Dry run (default, no DB writes):
 *     node scripts/recalculate_session_scores.js <sessionId>
 *   Apply updates inside a single transaction:
 *     node scripts/recalculate_session_scores.js <sessionId> --apply
 */

const sequelize = require('../config/database');
const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Response = require('../models/Response');
const Question = require('../models/Question');
const ReportAudit = require('../models/ReportAudit');
const scoringEngine = require('../sockets/services/scoringEngine');
const { generateLevel1QuizReport } = require('../utils/reportAnalyticsEngine');

async function main() {
  const args = process.argv.slice(2);
  const sessionId = args.find(a => !a.startsWith('--'));
  const apply = args.includes('--apply');

  if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    console.error('Usage: node scripts/recalculate_session_scores.js <session-uuid> [--apply]');
    process.exit(1);
  }

  console.log(`Mode: ${apply ? 'APPLY (transactional write)' : 'DRY RUN (read-only)'}`);
  console.log(`Target Session: ${sessionId}`);

  const session = await Session.findByPk(sessionId);
  if (!session) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }

  const participants = await Participant.findAll({
    where: { sessionId },
    include: [{
      model: Response,
      include: [Question]
    }],
    order: [['name', 'ASC']]
  });

  if (participants.length === 0) {
    console.log('No participants found for this session.');
    process.exit(0);
  }

  const responseUpdates = [];
  const participantUpdates = [];

  for (const p of participants) {
    const responses = p.Responses || [];
    let newTotalScore = 0;

    for (const r of responses) {
      if (!r.Question) {
        newTotalScore += Number(r.points_awarded || 0);
        continue;
      }
      const isCorrect = scoringEngine.isCorrectAnswer(r.Question, r.answer);
      const newPoints = scoringEngine.calculatePoints(isCorrect, r.Question, r.response_time);
      const oldPoints = Number(r.points_awarded || 0);
      newTotalScore += newPoints;

      if (newPoints !== oldPoints) {
        responseUpdates.push({
          responseId: r.id,
          participantName: p.name,
          questionText: (r.Question.text || '').slice(0, 50),
          oldPoints,
          newPoints
        });
      }
    }

    const oldTotalScore = Number(p.score || 0);
    if (newTotalScore !== oldTotalScore) {
      participantUpdates.push({
        participantId: p.id,
        name: p.name,
        employeeId: p.employeeId || '',
        oldScore: oldTotalScore,
        newScore: newTotalScore
      });
    }
  }

  console.log(`\nResponse point changes (${responseUpdates.length}):`);
  for (const u of responseUpdates) {
    console.log(`  - ${u.participantName} | "${u.questionText}..." : ${u.oldPoints} -> ${u.newPoints}`);
  }

  console.log(`\nParticipant total score changes (${participantUpdates.length}):`);
  for (const u of participantUpdates) {
    console.log(`  - ${u.name} (${u.employeeId}) : ${u.oldScore} -> ${u.newScore}`);
  }

  const existingAudit = await ReportAudit.findOne({
    where: { sessionId, level: 'LEVEL_1_QUIZ' }
  });

  if (!apply) {
    if (existingAudit) {
      console.log(`\nExisting ReportAudit snapshot found (${existingAudit.reportCode}); will refresh on --apply.`);
    }
    console.log('\nDry run complete. Re-run with --apply to persist these changes.');
    await sequelize.close();
    return;
  }

  if (responseUpdates.length === 0 && participantUpdates.length === 0) {
    console.log('\nNo score changes needed.');
  } else {
    await sequelize.transaction(async (t) => {
      for (const u of responseUpdates) {
        await Response.update(
          { points_awarded: u.newPoints },
          { where: { id: u.responseId }, transaction: t }
        );
      }
      for (const u of participantUpdates) {
        await Participant.update(
          { score: u.newScore },
          { where: { id: u.participantId }, transaction: t }
        );
      }
    });
    console.log(`\nApplied ${responseUpdates.length} response updates and ${participantUpdates.length} participant score updates.`);
  }

  if (existingAudit) {
    await generateLevel1QuizReport(session.quizId, sessionId);
    console.log(`Refreshed ReportAudit snapshot ${existingAudit.reportCode} (${existingAudit.id}).`);
  }

  await sequelize.close();
}

main().catch(async (err) => {
  console.error('Recalculation failed:', err.message);
  try { await sequelize.close(); } catch (_) {}
  process.exit(1);
});
