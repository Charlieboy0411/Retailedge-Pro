const User = require('../models/User');
const Role = require('../models/Role');
const Project = require('../models/Project');
const TrainingProgress = require('../models/TrainingProgress');
const Participant = require('../models/Participant');
const Certificate = require('../models/Certificate');
const Session = require('../models/Session');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Response = require('../models/Response');
const JitsiAttendance = require('../models/JitsiAttendance');
const { Op } = require('sequelize');

/**
 * Supervisor Team Scope & Intelligence Service
 * Authoritative backend service for supervisor-to-subordinate resolution and team metrics
 */
class SupervisorService {
  /**
   * Get subordinate IDs directly reporting to the supervisor
   */
  static async getTeamSubordinateIds(supervisorId) {
    if (!supervisorId) return [];
    const subordinates = await User.findAll({
      where: { managerId: supervisorId },
      attributes: ['id']
    });
    return subordinates.map(s => s.id);
  }

  /**
   * Check whether targetUserId is a direct report of supervisorId
   */
  static async isSubordinate(supervisorId, targetUserId) {
    if (!supervisorId || !targetUserId) return false;
    const user = await User.findOne({
      where: { id: targetUserId, managerId: supervisorId },
      attributes: ['id']
    });
    return Boolean(user);
  }

  /**
   * Get direct subordinates with roles and projects
   */
  static async getTeamMembers(supervisorId) {
    if (!supervisorId) return [];
    return await User.findAll({
      where: { managerId: supervisorId },
      include: [
        { model: Role, attributes: ['id', 'role_name'] },
        { model: Project, attributes: ['id', 'name'] }
      ],
      attributes: ['id', 'name', 'email', 'employee_id', 'designation', 'location', 'status', 'managerId', 'createdAt'],
      order: [['name', 'ASC']]
    });
  }

  /**
   * Calculate 8 Authoritative Team Operational KPIs
   */
  static async getTeamMetrics(supervisorId) {
    const teamMembers = await this.getTeamMembers(supervisorId);
    const teamUserIds = teamMembers.map(m => m.id);

    if (teamUserIds.length === 0) {
      return {
        teamMembers: 0,
        activeLearners: 0,
        trainingCompletion: 0,
        attendanceRate: 0,
        averageAssessmentScore: 0,
        assessmentPassRate: 0,
        certificationReady: 0,
        atRiskLearners: 0
      };
    }

    // 1. Training Progresses for Team
    const progresses = await TrainingProgress.findAll({
      where: { userId: { [Op.in]: teamUserIds } }
    });
    const completedProgresses = progresses.filter(p => p.completed).length;
    const trainingCompletionRate = progresses.length > 0
      ? Math.round((completedProgresses / progresses.length) * 100)
      : 0;

    const participations = await Participant.findAll({
      where: { userId: { [Op.in]: teamUserIds } },
      include: [
        Response,
        {
          model: Session,
          include: [{
            model: Quiz,
            include: [{ model: Question, as: 'questions' }]
          }]
        }
      ]
    });

    let totalScore = 0;
    let scoredAttempts = 0;
    let passedAttempts = 0;

    participations.forEach(p => {
      const qCount = p.Session?.Quiz?.questions ? p.Session.Quiz.questions.length : 0;
      const responses = p.Responses || [];
      const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
      const pct = qCount > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / qCount) * 100))) : 0;
      totalScore += pct;
      scoredAttempts++;
      if (pct >= 70) passedAttempts++;
    });

    const averageAssessmentScore = scoredAttempts > 0 ? Math.round(totalScore / scoredAttempts) : 0;
    const assessmentPassRate = scoredAttempts > 0 ? Math.round((passedAttempts / scoredAttempts) * 100) : 0;

    // 3. Certificates Issued for Team
    const issuedCerts = await Certificate.findAll({
      where: {
        userId: { [Op.in]: teamUserIds },
        status: { [Op.in]: ['ISSUED', 'VALID'] }
      },
      attributes: ['userId']
    });
    const certifiedUserIds = new Set(issuedCerts.map(c => c.userId));

    // 4. Query Actual Jitsi Attendance for Team Members
    const jitsiRecords = await JitsiAttendance.findAll({
      where: { userId: { [Op.in]: teamUserIds } },
      attributes: ['userId', 'attendancePercentage', 'status']
    });

    const userAttMap = new Map();
    jitsiRecords.forEach(r => {
      if (!userAttMap.has(r.userId)) userAttMap.set(r.userId, []);
      const pct = typeof r.attendancePercentage === 'number'
        ? r.attendancePercentage
        : (r.status === 'Present' || r.status === 'Completed' ? 100 : 0);
      userAttMap.get(r.userId).push(pct);
    });

    // 5. Calculate Attendance and Roster Metrics per Member
    let totalAttendancePct = 0;
    let membersWithAttendanceCount = 0;
    let certReadyCount = 0;
    let atRiskCount = 0;
    let activeLearnersCount = 0;

    teamMembers.forEach(member => {
      const memberProgress = progresses.filter(p => p.userId === member.id);
      const memberParts = participations.filter(p => p.userId === member.id);
      const memberAtts = userAttMap.get(member.id);
      const hasMemberAtt = Array.isArray(memberAtts) && memberAtts.length > 0;

      if (memberProgress.length > 0 || memberParts.length > 0 || hasMemberAtt) {
        activeLearnersCount++;
      }

      // Member attendance calculation: authoritative Jitsi attendance only
      let memberAtt = null;
      if (hasMemberAtt) {
        memberAtt = Math.round(memberAtts.reduce((a, b) => a + b, 0) / memberAtts.length);
        totalAttendancePct += memberAtt;
        membersWithAttendanceCount++;
      }

      // Member score calculation
      let memberScore = 0;
      const hasScore = memberParts.length > 0;
      if (hasScore) {
        let mTotal = 0;
        memberParts.forEach(p => {
          const qCount = p.Session?.Quiz?.questions ? p.Session.Quiz.questions.length : 0;
          const responses = p.Responses || [];
          const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
          mTotal += qCount > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / qCount) * 100))) : 0;
        });
        memberScore = Math.round(mTotal / memberParts.length);
      }

      // Authoritative Certification Eligibility: Attendance >= 80% AND Score >= 70% AND Not Yet Certified
      const isCertEligible = hasMemberAtt && memberAtt >= 80 && hasScore && memberScore >= 70 && !certifiedUserIds.has(member.id);
      if (isCertEligible) certReadyCount++;

      // Coaching Attention: At Risk = Assessment < 60% OR Attendance < 80% (only when attendance data exists)
      const isAtRisk = (hasScore && memberScore < 60) || (hasMemberAtt && memberAtt < 80);
      if (isAtRisk) atRiskCount++;
    });

    const hasAttendanceData = membersWithAttendanceCount > 0;
    const attendanceRate = hasAttendanceData ? Math.round(totalAttendancePct / membersWithAttendanceCount) : null;

    return {
      teamMembers: teamMembers.length,
      activeLearners: activeLearnersCount,
      trainingCompletion: trainingCompletionRate,
      attendanceRate,
      hasAttendanceData,
      averageAssessmentScore,
      assessmentPassRate,
      certificationReady: certReadyCount,
      atRiskLearners: atRiskCount
    };
  }

  /**
   * Detailed Team Performance & Coaching Roster
   */
  static async getTeamPerformanceRoster(supervisorId) {
    const teamMembers = await this.getTeamMembers(supervisorId);
    const teamUserIds = teamMembers.map(m => m.id);

    if (teamUserIds.length === 0) return [];

    const [progresses, participations, issuedCerts, jitsiRecords] = await Promise.all([
      TrainingProgress.findAll({
        where: { userId: { [Op.in]: teamUserIds } }
      }),
      Participant.findAll({
        where: { userId: { [Op.in]: teamUserIds } },
        include: [
          Response,
          {
            model: Session,
            include: [{
              model: Quiz,
              include: [{ model: Question, as: 'questions' }]
            }]
          }
        ]
      }),
      Certificate.findAll({
        where: {
          userId: { [Op.in]: teamUserIds },
          status: { [Op.in]: ['ISSUED', 'VALID'] }
        },
        attributes: ['userId', 'certificate_id', 'issueDate']
      }),
      JitsiAttendance.findAll({
        where: { userId: { [Op.in]: teamUserIds } },
        attributes: ['userId', 'attendancePercentage', 'status']
      })
    ]);

    const certMap = new Map();
    issuedCerts.forEach(c => certMap.set(c.userId, c));

    const userAttMap = new Map();
    jitsiRecords.forEach(r => {
      if (!userAttMap.has(r.userId)) userAttMap.set(r.userId, []);
      const pct = typeof r.attendancePercentage === 'number'
        ? r.attendancePercentage
        : (r.status === 'Present' || r.status === 'Completed' ? 100 : 0);
      userAttMap.get(r.userId).push(pct);
    });

    return teamMembers.map(member => {
      const memberProgress = progresses.filter(p => p.userId === member.id);
      const memberParts = participations.filter(p => p.userId === member.id);
      const memberAtts = userAttMap.get(member.id);
      const hasMemberAtt = Array.isArray(memberAtts) && memberAtts.length > 0;

      const completedCount = memberProgress.filter(p => p.completed).length;
      const progressPct = memberProgress.length > 0 ? Math.round((completedCount / memberProgress.length) * 100) : 0;
      
      const attendancePct = hasMemberAtt
        ? Math.round(memberAtts.reduce((a, b) => a + b, 0) / memberAtts.length)
        : null;

      let scorePct = null;
      const hasScore = memberParts.length > 0;
      if (hasScore) {
        let sum = 0;
        memberParts.forEach(p => {
          const qCount = p.Session?.Quiz?.questions ? p.Session.Quiz.questions.length : 0;
          const responses = p.Responses || [];
          const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
          sum += qCount > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / qCount) * 100))) : 0;
        });
        scorePct = Math.round(sum / memberParts.length);
      }

      // Coaching Status (Operational Triage)
      // <60% = At Risk, 60-74% = Needs Review, >=75% = On Track
      const isAtRisk = (hasScore && scorePct < 60) || (hasMemberAtt && attendancePct < 80);
      let coachingStatus = 'On Track';
      if (isAtRisk) {
        coachingStatus = 'At Risk';
      } else if (hasScore && scorePct >= 60 && scorePct <= 74) {
        coachingStatus = 'Needs Review';
      }

      // Certification Eligibility (Authoritative Rule)
      // Attendance >= 80% AND Assessment >= 70%
      const existingCert = certMap.get(member.id);
      const isEligible = hasMemberAtt && attendancePct >= 80 && hasScore && scorePct >= 70;
      let certStatus;
      if (existingCert) {
        certStatus = 'Certified';
      } else if (isEligible) {
        certStatus = 'Eligible';
      } else {
        certStatus = 'Not Eligible';
      }

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        employee_id: member.employee_id,
        managerId: member.managerId,
        designation: member.designation || 'Associate',
        project: member.Project?.name || 'General',
        trainingProgress: progressPct,
        attendancePercentage: attendancePct,
        hasAttendanceData: hasMemberAtt,
        assessmentScore: scorePct,
        hasAssessmentData: hasScore,
        coachingStatus,
        certificationStatus: certStatus,
        certificateId: existingCert ? existingCert.certificate_id : null,
        needsAttention: coachingStatus === 'At Risk' || coachingStatus === 'Needs Review'
      };
    });
  }
}

module.exports = SupervisorService;
