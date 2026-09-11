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

    // 4. Calculate Attendance and Roster Metrics per Member
    let totalAttendancePct = 0;
    let certReadyCount = 0;
    let atRiskCount = 0;
    let activeLearnersCount = 0;

    teamMembers.forEach(member => {
      const memberProgress = progresses.filter(p => p.userId === member.id);
      const memberParts = participations.filter(p => p.userId === member.id);

      if (memberProgress.length > 0 || memberParts.length > 0) {
        activeLearnersCount++;
      }

      // Member attendance calculation
      let memberAtt = 80; // Baseline fallback
      if (memberProgress.length > 0) {
        const completed = memberProgress.filter(p => p.completed).length;
        memberAtt = Math.round((completed / memberProgress.length) * 100);
      }

      // Member score calculation
      let memberScore = 0;
      if (memberParts.length > 0) {
        let mTotal = 0;
        memberParts.forEach(p => {
          const qCount = p.Session?.Quiz?.questions ? p.Session.Quiz.questions.length : 0;
          const responses = p.Responses || [];
          const correctCount = responses.filter(r => r.points_awarded > 0 || r.is_correct).length;
          mTotal += qCount > 0 ? Math.min(100, Math.max(0, Math.round((correctCount / qCount) * 100))) : 0;
        });
        memberScore = Math.round(mTotal / memberParts.length);
      }

      totalAttendancePct += memberAtt;

      // Authoritative Certification Eligibility: Attendance >= 80% AND Score >= 70% AND Not Yet Certified
      const isCertEligible = memberAtt >= 80 && memberScore >= 70 && !certifiedUserIds.has(member.id);
      if (isCertEligible) certReadyCount++;

      // Coaching Attention: At Risk = Assessment < 60% OR Attendance < 80%
      const isAtRisk = memberScore < 60 || memberAtt < 80;
      if (isAtRisk) atRiskCount++;
    });

    const attendanceRate = teamMembers.length > 0 ? Math.round(totalAttendancePct / teamMembers.length) : 0;

    return {
      teamMembers: teamMembers.length,
      activeLearners: activeLearnersCount,
      trainingCompletion: trainingCompletionRate,
      attendanceRate,
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

    const progresses = await TrainingProgress.findAll({
      where: { userId: { [Op.in]: teamUserIds } }
    });

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

    const issuedCerts = await Certificate.findAll({
      where: {
        userId: { [Op.in]: teamUserIds },
        status: { [Op.in]: ['ISSUED', 'VALID'] }
      },
      attributes: ['userId', 'certificate_id', 'issueDate']
    });
    const certMap = new Map();
    issuedCerts.forEach(c => certMap.set(c.userId, c));

    return teamMembers.map(member => {
      const memberProgress = progresses.filter(p => p.userId === member.id);
      const memberParts = participations.filter(p => p.userId === member.id);

      const completedCount = memberProgress.filter(p => p.completed).length;
      const progressPct = memberProgress.length > 0 ? Math.round((completedCount / memberProgress.length) * 100) : 0;
      const attendancePct = memberProgress.length > 0 ? progressPct : 75;

      let scorePct = 0;
      if (memberParts.length > 0) {
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
      let coachingStatus = 'On Track';
      if (scorePct < 60 || attendancePct < 80) {
        coachingStatus = 'At Risk';
      } else if (scorePct >= 60 && scorePct <= 74) {
        coachingStatus = 'Needs Review';
      }

      // Certification Eligibility (Authoritative Rule)
      // Attendance >= 80% AND Assessment >= 70%
      const existingCert = certMap.get(member.id);
      const isEligible = attendancePct >= 80 && scorePct >= 70;
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
        assessmentScore: scorePct,
        coachingStatus,
        certificationStatus: certStatus,
        certificateId: existingCert ? existingCert.certificate_id : null,
        needsAttention: coachingStatus === 'At Risk' || coachingStatus === 'Needs Review'
      };
    });
  }
}

module.exports = SupervisorService;
