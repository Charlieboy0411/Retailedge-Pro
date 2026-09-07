const sequelize = require('./config/database');
const crypto = require('crypto');
const Certificate = require('./models/Certificate');
const CertificateAuditLog = require('./models/CertificateAuditLog');
const User = require('./models/User');
const Project = require('./models/Project');
const Client = require('./models/Client');
const Training = require('./models/Training');
const { generateQRCodeDataUrl } = require('./utils/pdfGenerator');

async function seed() {
  try {
    await sequelize.sync();

    // Fetch existing users, projects, clients, trainings
    const users = await User.findAll({ limit: 20 });
    const projects = await Project.findAll({ limit: 5 });
    const clients = await Client.findAll({ limit: 5 });
    const trainings = await Training.findAll({ limit: 5 });

    if (users.length === 0) {
      console.log('No users found to seed certificates.');
      process.exit(0);
    }

    const defaultProject = projects[0] || null;
    const defaultClient = clients[0] || null;
    const defaultTraining = trainings[0] || null;

    const sampleData = [
      { name: 'Raj Kumar', empId: 'EMP-1001', score: 92, att: 98, status: 'ISSUED', template: 'corporate', date: '2026-08-05' },
      { name: 'Priya Sharma', empId: 'EMP-1002', score: 88, att: 95, status: 'ISSUED', template: 'retail_excellence', date: '2026-08-10' },
      { name: 'Amit Singh', empId: 'EMP-1003', score: 94, att: 100, status: 'VALID', template: 'premium_achievement', date: '2026-08-12' },
      { name: 'Neha Patel', empId: 'EMP-1004', score: 85, att: 90, status: 'ISSUED', template: 'corporate', date: '2026-08-14' },
      { name: 'Vikram Joshi', empId: 'EMP-1005', score: 78, att: 88, status: 'REVOKED', template: 'corporate', date: '2026-07-20', reason: 'Attendance discrepancy in modern trade field check' },
      { name: 'Sunita Rao', empId: 'EMP-1006', score: 90, att: 94, status: 'ISSUED', template: 'retail_excellence', date: '2026-08-18' },
      { name: 'Rohit Mehta', empId: 'EMP-1007', score: 96, att: 100, status: 'VALID', template: 'premium_achievement', date: '2026-08-20' },
      { name: 'Ananya Deshmukh', empId: 'EMP-1008', score: 82, att: 85, status: 'REPLACED', template: 'corporate', date: '2026-07-15' },
      { name: 'Deepak Verma', empId: 'EMP-1009', score: 91, att: 96, status: 'ISSUED', template: 'corporate', date: '2026-08-22' }
    ];

    console.log(`Seeding ${sampleData.length} demo certificates...`);

    for (let i = 0; i < sampleData.length; i++) {
      const item = sampleData[i];
      const targetUser = users[i % users.length];
      const certId = `REP-2026-${String(i + 1).padStart(6, '0')}`;
      const token = crypto.randomBytes(20).toString('hex');
      const verifyUrl = `http://localhost:5173/verify/${certId}`;
      const qrCode = await generateQRCodeDataUrl(verifyUrl);

      // Check if exists
      const existing = await Certificate.findOne({ where: { certificate_id: certId } });
      if (existing) {
        existing.status = item.status;
        existing.assessmentScore = item.score;
        existing.attendancePercentage = item.att;
        existing.templateId = item.template;
        existing.issueDate = item.date;
        existing.revocationReason = item.reason || null;
        existing.revokedAt = item.status === 'REVOKED' ? new Date('2026-07-25') : null;
        existing.revokedBy = item.status === 'REVOKED' ? 'Mohit Tiku' : null;
        await existing.save();
      } else {
        await Certificate.create({
          certificate_id: certId,
          userId: targetUser.id,
          projectId: defaultProject ? defaultProject.id : null,
          clientId: defaultClient ? defaultClient.id : null,
          trainingId: defaultTraining ? defaultTraining.id : null,
          batchName: 'UI Mumbai Promoter Batch 04',
          templateId: item.template,
          issueDate: item.date,
          assessmentScore: item.score,
          attendancePercentage: item.att,
          completionPercentage: 100,
          status: item.status,
          verificationToken: token,
          qrCode,
          signatoryName: 'Mohit Tiku',
          signatoryDesignation: 'Managing Director',
          trainerName: 'Aakash Verma',
          revocationReason: item.reason || null,
          revokedAt: item.status === 'REVOKED' ? new Date('2026-07-25') : null,
          revokedBy: item.status === 'REVOKED' ? 'Mohit Tiku' : null
        });
      }

      // Add audit log
      await CertificateAuditLog.create({
        certificateId: certId,
        action: item.status === 'REVOKED' ? 'REVOKED' : 'ISSUED',
        performedBy: 'System Admin',
        reason: item.reason || 'Conferred upon successful training completion',
        timestamp: new Date(item.date)
      });
    }

    console.log('✅ Demo certificates seeded successfully!');
    process.exit(0);
  } catch (e) {
    console.error('Seeding error:', e);
    process.exit(1);
  }
}

seed();
