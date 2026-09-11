const { Op } = require('sequelize');
const Project = require('../models/Project');
const ProjectAssignment = require('../models/ProjectAssignment');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const Training = require('../models/Training');
const TrainingProgress = require('../models/TrainingProgress');
const Session = require('../models/Session');
const Participant = require('../models/Participant');
const Response = require('../models/Response');
const Certificate = require('../models/Certificate');
const JitsiAttendance = require('../models/JitsiAttendance');

/**
 * Resolves all accessible project IDs for a T&D Manager.
 * Scope: ProjectAssignment (status: 'Active') + User.projectId + child subprojects (parentId).
 * Enforces boundary: A foreign targetProjectId or targetSubProjectId throws HTTP 403 Forbidden.
 */
async function getAccessibleTDProjectIds(tdUser, targetProjectId = 'all', targetSubProjectId = 'all') {
  if (!tdUser) return [];

  const userId = tdUser.id;
  const userRole = tdUser.role || (tdUser.Role ? tdUser.Role.role_name : '');

  let authorizedBaseIds = [];

  // Admins have enterprise-wide access
  if (['Admin', 'Super Admin'].includes(userRole)) {
    const allProjs = await Project.findAll({ attributes: ['id'] });
    authorizedBaseIds = allProjs.map(p => p.id);
  } else {
    // 1. Resolve from ProjectAssignment
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (isUuid) {
      const assignments = await ProjectAssignment.findAll({
        where: { userId, status: 'Active' },
        attributes: ['projectId']
      });
      authorizedBaseIds = assignments.map(a => a.projectId);
    }

    // 2. Include user.projectId if set or query from DB
    let userRecord = tdUser;
    if (!userRecord.projectId && isUuid) {
      userRecord = await User.findByPk(userId, { attributes: ['id', 'projectId'] });
    }

    if (userRecord && userRecord.projectId) {
      const pIds = String(userRecord.projectId).split(',').map(s => s.trim()).filter(Boolean);
      pIds.forEach(id => {
        if (!authorizedBaseIds.includes(id)) authorizedBaseIds.push(id);
      });
    }

    // 3. Expand to child subprojects
    if (authorizedBaseIds.length > 0) {
      const subProjects = await Project.findAll({
        where: { parentId: { [Op.in]: authorizedBaseIds } },
        attributes: ['id']
      });
      subProjects.forEach(sp => {
        if (!authorizedBaseIds.includes(sp.id)) authorizedBaseIds.push(sp.id);
      });
    }
  }

  if (authorizedBaseIds.length === 0) {
    return [];
  }

  // Validate targetSubProjectId filter
  if (targetSubProjectId && targetSubProjectId !== 'all') {
    if (!authorizedBaseIds.includes(targetSubProjectId)) {
      const err = new Error('Forbidden: You do not have permission for this subproject capability portfolio.');
      err.status = 403;
      throw err;
    }
    return [targetSubProjectId];
  }

  // Validate targetProjectId filter
  if (targetProjectId && targetProjectId !== 'all') {
    if (!authorizedBaseIds.includes(targetProjectId)) {
      const err = new Error('Forbidden: You do not have permission for this project capability portfolio.');
      err.status = 403;
      throw err;
    }

    const subProjects = await Project.findAll({
      where: { parentId: targetProjectId },
      attributes: ['id']
    });
    const familyIds = [targetProjectId, ...subProjects.map(sp => sp.id)];
    return familyIds.filter(id => authorizedBaseIds.includes(id));
  }

  return authorizedBaseIds;
}

/**
 * Computes 9 real database-derived KPIs for the T&D Capability Cockpit.
 * Includes data-driven portfolio health and actionable attention signals.
 * Zero hardcoded mock numbers.
 */
/**
 * Resolves unified date boundaries for period filtering across all T&D capability metrics.
 * Default: 'current_month'
 * Supported options:
 * - current_month (or this_month): 1st of month to end of month
 * - previous_month (or last_month): 1st of previous month to end of previous month
 * - current_quarter (or this_quarter): 1st of current quarter to end of current quarter
 * - previous_quarter (or last_quarter): 1st of previous quarter to end of previous quarter
 * - current_fy (or this_fy): April 1 of current financial year to March 31 of next
 * - all_time (or all): null (unrestricted)
 * - custom: customStartDate to customEndDate
 */
function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function resolvePeriodDateRange(period = 'current_month', customStartDate = null, customEndDate = null) {
  const normalized = (period || 'current_month').toLowerCase();
  if (normalized === 'all' || normalized === 'all_time') {
    return null;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 8 = Sep

  let start;
  let end;

  if (normalized === 'current_month' || normalized === 'this_month') {
    start = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
  } else if (normalized === 'previous_month' || normalized === 'last_month') {
    start = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
    end = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
  } else if (normalized === 'current_quarter' || normalized === 'this_quarter') {
    const quarterIndex = Math.floor(currentMonth / 3);
    start = new Date(currentYear, quarterIndex * 3, 1, 0, 0, 0, 0);
    end = new Date(currentYear, (quarterIndex + 1) * 3, 0, 23, 59, 59, 999);
  } else if (normalized === 'previous_quarter' || normalized === 'last_quarter') {
    const quarterIndex = Math.floor(currentMonth / 3);
    const prevQuarterIndex = quarterIndex === 0 ? 3 : quarterIndex - 1;
    const prevQuarterYear = quarterIndex === 0 ? currentYear - 1 : currentYear;
    start = new Date(prevQuarterYear, prevQuarterIndex * 3, 1, 0, 0, 0, 0);
    end = new Date(prevQuarterYear, (prevQuarterIndex + 1) * 3, 0, 23, 59, 59, 999);
  } else if (normalized === 'current_fy' || normalized === 'this_fy') {
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    start = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
    end = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
  } else if (normalized === 'custom' && customStartDate && customEndDate) {
    const sParts = String(customStartDate).split('-').map(Number);
    const eParts = String(customEndDate).split('-').map(Number);
    if (sParts.length === 3 && eParts.length === 3) {
      start = new Date(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0, 0);
      end = new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59, 999);
    } else {
      start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
    }
  } else if (normalized === 'last_30_days') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    end = now;
  } else {
    // Default fallback to current month
    start = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
  }

  if (start && end) {
    const startDateStr = formatLocalDate(start);
    const endDateStr = formatLocalDate(end);
    return {
      start,
      end,
      timestampFilter: { [Op.gte]: start, [Op.lte]: end },
      dateOnlyFilter: { [Op.gte]: startDateStr, [Op.lte]: endDateStr },
      startDateStr,
      endDateStr
    };
  }

  return null;
}

/**
 * Computes 9 real database-derived KPIs for the T&D Capability Cockpit.
 * Includes data-driven portfolio health and actionable attention signals.
 * Authoritative learner-level formulas, zero mock numbers, strict period alignment.
 */
async function getTDCapabilityCockpitMetrics(tdUser, targetProjectId = 'all', targetSubProjectId = 'all', period = 'current_month', customStartDate = null, customEndDate = null) {
  const projectIds = await getAccessibleTDProjectIds(tdUser, targetProjectId, targetSubProjectId);
  const resolvedRange = resolvePeriodDateRange(period, customStartDate, customEndDate);

  if (projectIds.length === 0) {
    return {
      kpis: {
        totalLearners: 0,
        activeModules: 0,
        activeQuizzes: 0,
        curriculumCompletionRate: null,
        attendanceRate: null,
        assessmentAverageScore: null,
        assessmentPassRate: null,
        hasAssessmentData: false,
        hasAttendanceData: false,
        hasCurriculumData: false,
        certificatesIssued: 0,
        skillDeficitsCount: 0,
        assessmentRiskCount: 0,
        attendanceRiskCount: 0,
        certEligibleCount: 0
      },
      health: {
        status: 'Insufficient Data',
        badgeColor: 'slate',
        score: null,
        summary: 'No active learners or modules assigned in this empty portfolio scope.',
        criteria: []
      },
      attentionRequired: [],
      portfolioProjects: [],
      capabilityMatrix: [],
      trainerDelivery: [],
      period: period || 'current_month',
      periodRange: resolvedRange ? { start: resolvedRange.startDateStr, end: resolvedRange.endDateStr } : null
    };
  }

  const trainingWhere = { projectId: { [Op.in]: projectIds } };
  if (resolvedRange) trainingWhere.createdAt = resolvedRange.timestampFilter;

  const quizWhere = { projectId: { [Op.in]: projectIds } };
  if (resolvedRange) quizWhere.createdAt = resolvedRange.timestampFilter;

  const certWhere = {
    projectId: { [Op.in]: projectIds },
    status: { [Op.in]: ['VALID', 'ISSUED', 'Active', 'Valid'] }
  };
  if (resolvedRange) certWhere.issueDate = resolvedRange.dateOnlyFilter;

  const sessionWhere = { projectId: { [Op.in]: projectIds } };
  if (resolvedRange) sessionWhere.startedAt = resolvedRange.timestampFilter;

  // Stage 1: Parallel fetch of all primary entities
  const [
    participants,
    activeModules,
    activeQuizzes,
    certificatesIssued,
    trainingRecords,
    sessions,
    portfolioProjects
  ] = await Promise.all([
    User.findAll({
      where: { projectId: { [Op.in]: projectIds } },
      attributes: ['id', 'name', 'email', 'employee_id', 'designation', 'projectId', 'status']
    }),
    Training.count({ where: trainingWhere }),
    Quiz.count({ where: quizWhere }),
    Certificate.count({ where: certWhere }),
    Training.findAll({
      where: { projectId: { [Op.in]: projectIds } },
      include: [{ model: Project, attributes: ['id', 'name'] }],
      limit: 25,
      order: [['createdAt', 'DESC']]
    }),
    Session.findAll({
      where: sessionWhere,
      include: [{ model: User, as: 'host', attributes: ['id', 'name', 'email'] }],
      limit: 25,
      order: [['createdAt', 'DESC']]
    }),
    Project.findAll({
      where: { id: { [Op.in]: projectIds } },
      attributes: ['id', 'name', 'project_code', 'status', 'parentId']
    })
  ]);

  const participantIds = participants.map(p => p.id);
  const totalLearners = participants.length;
  const trainingIds = trainingRecords.map(t => t.id);

  // Stage 2: Parallel fetch of participation metrics across participants & modules
  let allUserScores;
  let allUserAtt;
  let allUserProg;
  let allTrainingCompletions;

  const stage2Promises = [];
  if (participantIds.length > 0) {
    const partWhere = { userId: { [Op.in]: participantIds } };
    if (resolvedRange) partWhere.createdAt = resolvedRange.timestampFilter;
    stage2Promises.push(Participant.findAll({ where: partWhere, attributes: ['userId', 'score'] }));

    const attWhere = { userId: { [Op.in]: participantIds } };
    if (resolvedRange) attWhere.firstJoinedAt = resolvedRange.timestampFilter;
    stage2Promises.push(JitsiAttendance.findAll({ where: attWhere, attributes: ['userId', 'attendancePercentage', 'status'] }));

    const progWhere = { userId: { [Op.in]: participantIds } };
    if (resolvedRange) progWhere.completedAt = resolvedRange.timestampFilter;
    stage2Promises.push(TrainingProgress.findAll({ where: progWhere, attributes: ['userId', 'trainingId', 'completed'] }));
  } else {
    stage2Promises.push(Promise.resolve([]), Promise.resolve([]), Promise.resolve([]));
  }

  if (trainingIds.length > 0) {
    const progTrainingWhere = { trainingId: { [Op.in]: trainingIds }, completed: true };
    if (resolvedRange) progTrainingWhere.completedAt = resolvedRange.timestampFilter;
    stage2Promises.push(TrainingProgress.findAll({
      where: progTrainingWhere,
      attributes: ['trainingId', 'userId']
    }));
  } else {
    stage2Promises.push(Promise.resolve([]));
  }

  const [
    stage2Scores,
    stage2Att,
    stage2Prog,
    stage2Completions
  ] = await Promise.all(stage2Promises);

  allUserScores = stage2Scores;
  allUserAtt = stage2Att;
  allUserProg = stage2Prog;
  allTrainingCompletions = stage2Completions;

  // 4. Curriculum Completion Rate (Exact Numerator / Denominator)
  // Numerator: Total completed module assignments in scope
  // Denominator: Total potential assignments (totalLearners * activeModules) or actual progress records
  let curriculumCompletionRate;
  let hasCurriculumData;

  if (allUserProg.length > 0) {
    hasCurriculumData = true;
    const completedCount = allUserProg.filter(p => p.completed === true).length;
    curriculumCompletionRate = Math.round((completedCount / allUserProg.length) * 100);
  } else if (totalLearners > 0 && activeModules > 0 && allTrainingCompletions.length > 0) {
    hasCurriculumData = true;
    const completedCount = allTrainingCompletions.length;
    const capacity = totalLearners * activeModules;
    curriculumCompletionRate = Math.min(100, Math.round((completedCount / capacity) * 100));
  } else {
    curriculumCompletionRate = null;
    hasCurriculumData = false;
  }

  // 5. Attendance Rate (Learner-Level Canonical Aggregate from JitsiAttendance)
  const userAttMap = new Map();
  allUserAtt.forEach(r => {
    if (!userAttMap.has(r.userId)) userAttMap.set(r.userId, []);
    const pct = typeof r.attendancePercentage === 'number' ? r.attendancePercentage : (r.status === 'Present' || r.status === 'Completed' ? 100 : 0);
    userAttMap.get(r.userId).push(pct);
  });

  let attendanceRate;
  let hasAttendanceData;

  if (userAttMap.size > 0) {
    hasAttendanceData = true;
    let sumLearnerAtt = 0;
    userAttMap.forEach((atts) => {
      const learnerAvg = atts.reduce((a, b) => a + b, 0) / atts.length;
      sumLearnerAtt += learnerAvg;
    });
    attendanceRate = Math.round(sumLearnerAtt / userAttMap.size);
  } else {
    attendanceRate = null;
    hasAttendanceData = false;
  }

  // 6. Assessment Average Score & 7. Assessment Pass Rate (Learner-Level Authoritative Evaluation)
  // Eliminates repeat-attempt volume bias: each assessed learner contributes exactly one authoritative result
  // If no evaluated attempts exist, return null and hasAssessmentData: false. Zero does NOT mean no data!
  const userScoresMap = new Map();
  allUserScores.forEach(r => {
    if (r.userId && r.score !== null && r.score !== undefined) {
      if (!userScoresMap.has(r.userId)) userScoresMap.set(r.userId, []);
      userScoresMap.get(r.userId).push(Number(r.score));
    }
  });

  let assessmentAverageScore;
  let assessmentPassRate;
  let hasAssessmentData;
  const assessedLearnersCount = userScoresMap.size;

  if (assessedLearnersCount > 0) {
    hasAssessmentData = true;
    let sumAuthoritativeScores = 0;
    let passedLearnersCount = 0;

    userScoresMap.forEach((scores) => {
      // Authoritative learner assessment result is their highest/best completed evaluation score
      const bestScore = Math.max(...scores);
      sumAuthoritativeScores += bestScore;
      if (bestScore >= 70) {
        passedLearnersCount++;
      }
    });

    assessmentAverageScore = Math.round(sumAuthoritativeScores / assessedLearnersCount);
    assessmentPassRate = Math.round((passedLearnersCount / assessedLearnersCount) * 100);
  } else {
    // No completed evaluated assessments: return null so UI renders "—" ("No completed assessments")
    // Never convert empty dataset into 0% failure
    assessmentAverageScore = null;
    assessmentPassRate = null;
    hasAssessmentData = false;
  }

  // 9. Risk & Attention Triage (Explicit Diagnostic Counts)
  // Assessment Risk: Unique learners with completed evaluated score < 70%
  // Attendance Risk: Unique learners with attendance < 80%
  // Learners Requiring Attention: Unique UNION of both sets (Assessment Risk + Attendance Risk may exceed total)
  // Certification Eligible: Both criteria evaluated and met (Score >= 70% AND Attendance >= 80%)
  let uniqueAttentionLearnersCount = 0;
  let lowScoreLearnersCount = 0;
  let lowAttLearnersCount = 0;
  let certEligibleLearnersCount = 0;

  for (const p of participants) {
    const hasScores = userScoresMap.has(p.id);
    const hasAtt = userAttMap.has(p.id);

    const scores = userScoresMap.get(p.id) || [];
    const atts = userAttMap.get(p.id) || [];

    const pBestScore = scores.length > 0 ? Math.max(...scores) : null;
    const pAttAvg = atts.length > 0 ? Math.round(atts.reduce((a, b) => a + b, 0) / atts.length) : null;

    let flaggedAssessment = false;
    let flaggedAttendance = false;

    // Only flag assessment risk if the learner actually attempted/completed an assessment
    if (hasScores && pBestScore !== null && pBestScore < 70) {
      lowScoreLearnersCount++;
      flaggedAssessment = true;
    }

    if (hasAtt && pAttAvg !== null && pAttAvg < 80) {
      lowAttLearnersCount++;
      flaggedAttendance = true;
    }

    if (flaggedAssessment || flaggedAttendance) {
      uniqueAttentionLearnersCount++;
    }

    if (hasScores && hasAtt && pBestScore !== null && pAttAvg !== null && pBestScore >= 70 && pAttAvg >= 80) {
      certEligibleLearnersCount++;
    }
  }

  // Capability Framework Matrix
  const progressMap = new Map();
  allTrainingCompletions.forEach(c => {
    progressMap.set(c.trainingId, (progressMap.get(c.trainingId) || 0) + 1);
  });

  let lowCompletionModulesCount = 0;
  const capabilityMatrix = trainingRecords.map(t => {
    const completions = progressMap.get(t.id) || 0;
    const totalEnrolled = totalLearners > 0 ? totalLearners : 1;
    const completionPct = Math.min(100, Math.round((completions / totalEnrolled) * 100));
    if (completionPct < 50) lowCompletionModulesCount++;

    return {
      id: t.id,
      title: t.title,
      type: t.type,
      duration: t.duration || 'N/A',
      projectName: t.Project?.name || 'Authorized Project',
      completionPct: completionPct,
      status: completionPct >= 80 ? 'Mastered' : (completionPct >= 50 ? 'In Progress' : 'Deficit Risk')
    };
  });

  // Trainer Delivery Matrix (Real sessions hosted by authorized trainers)
  const trainerMap = new Map();
  sessions.forEach(s => {
    if (s.host) {
      if (!trainerMap.has(s.host.id)) {
        trainerMap.set(s.host.id, {
          id: s.host.id,
          name: s.host.name,
          email: s.host.email,
          sessionsHosted: 0,
          status: 'Active Delivery'
        });
      }
      trainerMap.get(s.host.id).sessionsHosted++;
    }
  });
  const trainerDelivery = Array.from(trainerMap.values());

  // Deterministic Portfolio Health Hierarchy
  // INSUFFICIENT DATA: When selected period has insufficient delivery or evaluation evidence
  // CRITICAL: Evaluated pass rate < 60%, Attendance < 50%, or >50% of workforce in deficit
  // NEEDS ATTENTION: Attendance < 80%, deficit learners > 0, evaluated pass rate 60-69%, or curriculum completion < 70%
  // WATCH: Near-threshold conditions (Attendance 80-84% or Pass Rate 70-74%) — never overrides Critical or Needs Attention
  // HEALTHY: All required standards met
  let healthStatus;
  let badgeColor;
  let healthScore;
  let healthSummary;

  const hasDeliveryOrEvaluationEvidence = hasAttendanceData || hasAssessmentData || hasCurriculumData;

  // Critical conditions
  const isCriticalPassRate = hasAssessmentData && assessmentPassRate < 60;
  const isCriticalAttendance = hasAttendanceData && attendanceRate < 50;
  const isCriticalDeficit = totalLearners > 0 && (uniqueAttentionLearnersCount / totalLearners) > 0.5;

  // Needs Attention conditions
  const isAttentionAttendance = hasAttendanceData && attendanceRate < 80;
  const isAttentionDeficit = uniqueAttentionLearnersCount > 0;
  const isAttentionPassRate = hasAssessmentData && assessmentPassRate >= 60 && assessmentPassRate < 70;
  const isAttentionCurriculum = hasCurriculumData && curriculumCompletionRate < 70;

  // Watch conditions (Near-threshold signals that DO NOT override Critical or Needs Attention)
  const isWatchAttendance = hasAttendanceData && attendanceRate >= 80 && attendanceRate < 85;
  const isWatchPassRate = hasAssessmentData && assessmentPassRate >= 70 && assessmentPassRate < 75;

  if (!hasDeliveryOrEvaluationEvidence) {
    healthStatus = 'Insufficient Data';
    badgeColor = 'slate';
    healthScore = null;
    healthSummary = 'Insufficient delivery or evaluation evidence in the selected period to assess portfolio health.';
  } else if (isCriticalPassRate || isCriticalAttendance || isCriticalDeficit) {
    healthStatus = 'Critical';
    badgeColor = 'red';
    healthScore = 45;
    healthSummary = 'Critical capability lag detected: severe assessment failure (<60%), attendance collapse (<50%), or majority workforce deficit.';
  } else if (isAttentionAttendance || isAttentionDeficit || isAttentionPassRate || isAttentionCurriculum) {
    healthStatus = 'Needs Attention';
    badgeColor = 'amber';
    healthScore = 75;
    healthSummary = `${uniqueAttentionLearnersCount} learner(s) or active delivery metrics (Attendance: ${hasAttendanceData ? `${attendanceRate}%` : '—'}, Completion: ${hasCurriculumData ? `${curriculumCompletionRate}%` : '—'}) require coaching and capability follow-up.`;
  } else if (isWatchAttendance || isWatchPassRate) {
    healthStatus = 'Watch';
    badgeColor = 'blue';
    healthScore = 85;
    healthSummary = 'Capability indicators meet operational standards but remain near watch thresholds (Attendance: 80–84% or Pass Rate: 70–74%).';
  } else {
    healthStatus = 'Healthy';
    badgeColor = 'green';
    healthScore = 95;
    healthSummary = 'All capability indicators are currently meeting target benchmarks.';
  }

  const criteria = [
    {
      name: 'Workforce Attendance Rate',
      threshold: '>= 80%',
      actual: hasAttendanceData ? `${attendanceRate}%` : 'No attendance records',
      met: hasAttendanceData ? attendanceRate >= 80 : null
    },
    {
      name: 'Assessment Pass Rate',
      threshold: '>= 70%',
      actual: hasAssessmentData ? `${assessmentPassRate}%` : 'No completed assessments',
      met: hasAssessmentData ? assessmentPassRate >= 70 : null
    },
    {
      name: 'Assessment Average Score',
      threshold: '>= 70%',
      actual: hasAssessmentData ? `${assessmentAverageScore}%` : 'No completed assessments',
      met: hasAssessmentData ? assessmentAverageScore >= 70 : null
    },
    {
      name: 'Curriculum Completion Rate',
      threshold: '>= 70%',
      actual: hasCurriculumData ? `${curriculumCompletionRate}%` : 'No curriculum assigned',
      met: hasCurriculumData ? curriculumCompletionRate >= 70 : null
    },
    {
      name: 'Unique Learners Requiring Attention',
      threshold: '0 Learners',
      actual: `${uniqueAttentionLearnersCount} learners`,
      met: uniqueAttentionLearnersCount === 0
    }
  ];

  const health = {
    status: healthStatus,
    badgeColor,
    score: healthScore,
    summary: healthSummary,
    criteria
  };

  // Generate Real Actionable Signals for Attention Required Section
  const attentionRequired = [];

  if (uniqueAttentionLearnersCount > 0) {
    attentionRequired.push({
      id: 'unique-learners-deficit',
      severity: uniqueAttentionLearnersCount > 5 ? 'critical' : 'amber',
      count: uniqueAttentionLearnersCount,
      title: `${uniqueAttentionLearnersCount} Unique Learner${uniqueAttentionLearnersCount > 1 ? 's' : ''} Requiring Attention`,
      description: `Assessment Risk: ${lowScoreLearnersCount} | Attendance Risk: ${lowAttLearnersCount}. Diagnostic indicators for coaching intervention.`,
      actionLabel: 'View Learners',
      actionTab: 'learners',
      actionFilter: 'deficit'
    });
  }

  if (hasAttendanceData && attendanceRate < 80) {
    attentionRequired.push({
      id: 'attendance-lag',
      severity: attendanceRate < 70 ? 'critical' : 'amber',
      count: attendanceRate,
      title: `Attendance Rate at ${attendanceRate}% (Standard: >= 80%)`,
      description: `Training session participation is currently below the 80% certification eligibility threshold.`,
      actionLabel: 'View Attendance',
      actionRoute: '/attendance'
    });
  }

  if (lowCompletionModulesCount > 0 && hasCurriculumData) {
    attentionRequired.push({
      id: 'modules-completion',
      severity: 'amber',
      count: lowCompletionModulesCount,
      title: `${lowCompletionModulesCount} Module${lowCompletionModulesCount > 1 ? 's' : ''} Below Completion Target`,
      description: `Curriculum items with under 50% completion across assigned learners.`,
      actionLabel: 'View Modules',
      actionTab: 'framework',
      actionRoute: '/trainings'
    });
  }

  if (certEligibleLearnersCount > 0) {
    attentionRequired.push({
      id: 'cert-eligible',
      severity: 'green',
      count: certEligibleLearnersCount,
      title: `${certEligibleLearnersCount} Learner${certEligibleLearnersCount > 1 ? 's' : ''} Certification Eligible`,
      description: `Learners meeting both criteria: Attendance >= 80% and Assessment Score >= 70%. Ready for issuance.`,
      actionLabel: 'Review Eligibility',
      actionRoute: '/certificates'
    });
  }

  return {
    kpis: {
      totalLearners,
      activeModules,
      activeQuizzes,
      curriculumCompletionRate,
      attendanceRate,
      assessmentAverageScore,
      assessmentPassRate,
      hasAssessmentData,
      hasAttendanceData,
      hasCurriculumData,
      certificatesIssued,
      skillDeficitsCount: uniqueAttentionLearnersCount,
      assessmentRiskCount: lowScoreLearnersCount,
      attendanceRiskCount: lowAttLearnersCount,
      certEligibleCount: certEligibleLearnersCount
    },
    health,
    attentionRequired,
    portfolioProjects,
    capabilityMatrix,
    trainerDelivery,
    period: period || 'current_month',
    periodRange: resolvedRange ? { start: resolvedRange.startDateStr, end: resolvedRange.endDateStr } : null
  };
}

/**
 * Fetches participant capability roster strictly within T&D Manager's authorized projects.
 * Excludes sensitive fields: password, phone, manager IDs.
 */
async function getTDParticipants(tdUser, targetProjectId = 'all', targetSubProjectId = 'all', search = '', period = 'current_month', customStartDate = null, customEndDate = null) {
  const projectIds = await getAccessibleTDProjectIds(tdUser, targetProjectId, targetSubProjectId);
  if (projectIds.length === 0) return [];

  const resolvedRange = resolvePeriodDateRange(period, customStartDate, customEndDate);

  const whereClause = {
    projectId: { [Op.in]: projectIds }
  };

  if (search && search.trim() !== '') {
    whereClause[Op.or] = [
      { name: { [Op.iLike || Op.like]: `%${search.trim()}%` } },
      { employee_id: { [Op.iLike || Op.like]: `%${search.trim()}%` } },
      { email: { [Op.iLike || Op.like]: `%${search.trim()}%` } }
    ];
  }

  const users = await User.findAll({
    where: whereClause,
    attributes: ['id', 'name', 'email', 'employee_id', 'designation', 'projectId', 'status'],
    include: [{ model: Project, attributes: ['id', 'name'] }],
    order: [['name', 'ASC']]
  });

  const userIds = users.map(u => u.id);
  const attMap = new Map();
  const scoreMap = new Map();
  const progMap = new Map();
  const certMap = new Map();

  if (userIds.length > 0) {
    const attWhere = { userId: { [Op.in]: userIds } };
    if (resolvedRange) attWhere.firstJoinedAt = resolvedRange.timestampFilter;

    const partWhere = { userId: { [Op.in]: userIds } };
    if (resolvedRange) partWhere.createdAt = resolvedRange.timestampFilter;

    const progWhere = { userId: { [Op.in]: userIds } };
    if (resolvedRange) progWhere.completedAt = resolvedRange.timestampFilter;

    const certWhere = {
      userId: { [Op.in]: userIds },
      projectId: { [Op.in]: projectIds },
      status: { [Op.in]: ['VALID', 'ISSUED', 'Active', 'Valid'] }
    };
    if (resolvedRange) certWhere.issueDate = resolvedRange.dateOnlyFilter;

    const [allAtt, allScores, allProg, allCerts] = await Promise.all([
      JitsiAttendance.findAll({
        where: attWhere,
        attributes: ['userId', 'attendancePercentage', 'status']
      }),
      Participant.findAll({
        where: partWhere,
        attributes: ['userId', 'score']
      }),
      TrainingProgress.findAll({
        where: progWhere,
        attributes: ['userId', 'completed']
      }),
      Certificate.findAll({
        where: certWhere,
        attributes: ['userId', 'certificate_id', 'status', 'issueDate']
      })
    ]);

    allAtt.forEach(r => {
      if (!attMap.has(r.userId)) attMap.set(r.userId, []);
      const pct = typeof r.attendancePercentage === 'number' ? r.attendancePercentage : (r.status === 'Present' || r.status === 'Completed' ? 100 : 0);
      attMap.get(r.userId).push(pct);
    });

    allScores.forEach(r => {
      if (r.score !== null && r.score !== undefined) {
        if (!scoreMap.has(r.userId)) scoreMap.set(r.userId, []);
        scoreMap.get(r.userId).push(Number(r.score || 0));
      }
    });

    allProg.forEach(r => {
      if (!progMap.has(r.userId)) progMap.set(r.userId, []);
      progMap.get(r.userId).push(r.completed);
    });

    allCerts.forEach(c => {
      if (!certMap.has(c.userId)) certMap.set(c.userId, c);
    });
  }

  const results = users.map(u => {
    const attRecords = attMap.get(u.id) || [];
    const attRate = attRecords.length > 0
      ? Math.round(attRecords.reduce((a, b) => a + b, 0) / attRecords.length)
      : (attMap.size > 0 ? 0 : 0);

    const pScores = scoreMap.get(u.id) || [];
    const avgScore = pScores.length > 0
      ? Math.round(Math.max(...pScores)) // Authoritative best score
      : null;

    const progRecords = progMap.get(u.id) || [];
    const progRate = progRecords.length > 0
      ? Math.round((progRecords.filter(Boolean).length / progRecords.length) * 100)
      : 0;

    const cert = certMap.get(u.id);
    const isAssessmentRisk = pScores.length > 0 && avgScore !== null && avgScore < 70;
    const isAttendanceRisk = attRecords.length > 0 && attRate < 80;
    const isDeficit = isAssessmentRisk || isAttendanceRisk;
    const hasEvaluations = pScores.length > 0 || attRecords.length > 0;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      employeeId: u.employee_id || 'N/A',
      designation: u.designation || 'Learner',
      projectName: u.Project?.name || 'Assigned Project',
      projectId: u.projectId,
      attendanceRate: attRate,
      avgScore,
      curriculumProgress: progRate,
      status: u.status,
      certified: Boolean(cert),
      certificateId: cert?.certificate_id || null,
      capabilityStatus: isDeficit ? 'Deficit' : (avgScore !== null && avgScore >= 85 ? 'Mastery' : (hasEvaluations ? 'Proficient' : 'Enrolled'))
    };
  });

  return results;
}

/**
 * Returns capability-scoped report templates available to T&D Manager.
 * Explicitly excludes:
 * - Level 3 Executive Monthly Closing
 * - Enterprise commercial intelligence
 * - Client proprietary/commercial reports
 */
function getTDAvailableReports(tdUser) {
  return [
    { id: 'training-performance', name: 'Training Performance Analytics', scope: 'Capability Intelligence', category: 'Training' },
    { id: 'module-completion', name: 'Curriculum & Module Completion Report', scope: 'Capability Intelligence', category: 'Training' },
    { id: 'assessment-analytics', name: 'Assessment & Quiz Diagnostic Matrix', scope: 'Capability Intelligence', category: 'Assessment' },
    { id: 'attendance-analytics', name: 'Attendance & Engagement Rate', scope: 'Capability Intelligence', category: 'Attendance' },
    { id: 'skill-gap-analytics', name: 'Competency & Skill Gap Triage', scope: 'Capability Intelligence', category: 'Capability' },
    { id: 'trainer-delivery-performance', name: 'Trainer Delivery & Host Evaluation', scope: 'Capability Intelligence', category: 'Trainer' },
    { id: 'certification-pipeline', name: 'Certification Issuance Ledger', scope: 'Capability Intelligence', category: 'Certification' },
    { id: 'operational-training-reports', name: 'Operational Training Program Log', scope: 'Capability Intelligence', category: 'Operational' }
  ];
}

module.exports = {
  getAccessibleTDProjectIds,
  getTDCapabilityCockpitMetrics,
  getTDParticipants,
  getTDAvailableReports,
  resolvePeriodDateRange
};
