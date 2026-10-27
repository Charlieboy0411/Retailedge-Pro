const express = require('express');
const router = express.Router();
const Training = require('../models/Training');
const TrainingProgress = require('../models/TrainingProgress');
const Certificate = require('../models/Certificate');
const Project = require('../models/Project');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { kolkataToUtcIso, formatKolkataDateTime } = require('../utils/dateTimeUtils');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, 'training-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

let cachedTransporter = null;

async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('✉️ SMTP Transporter initialized successfully.');
  } else {
    try {
      console.log('✉️ No SMTP credentials in env. Creating Ethereal mock mail account...');
      const testAccount = await nodemailer.createTestAccount();
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('✉️ Ethereal Mock Transporter initialized successfully.');
    } catch (err) {
      console.error('⚠️ Failed to create Ethereal mock mail transporter. Emails will only be simulated.', err.message);
      cachedTransporter = {
        sendMail: async (options) => {
          console.log(`✉️ [Console Fallback Mail] Sent to: ${options.to}`);
          return { messageId: 'console-fallback' };
        }
      };
    }
  }
  return cachedTransporter;
}

async function sendInviteEmail(user, title, description, scheduledAt, url, projectName) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER ? `"QuizHive LMS" <${process.env.SMTP_USER}>` : '"QuizHive LMS" <no-reply@quizhive.com>',
      to: `${user.name} <${user.email}>`,
      subject: `Invitation: ${title} (${projectName})`,
      text: `Hi ${user.name},\n\nYou have been invited to a training meeting for project "${projectName}".\n\nDetails:\n- Topic: ${title}\n- Description: ${description || 'No description provided.'}\n- Date & Time: ${formatKolkataDateTime(scheduledAt)} (IST)\n- Join Link: ${url}\n\nPlease join the meeting on time.\n\nBest regards,\nLMS Training Team`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
          <h2 style="color: #7c3aed; margin-top: 0; font-size: 1.5rem;">📅 Meeting Invitation: ${title}</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>You have been invited to a training meeting for project <strong style="color: #f36f21;">"${projectName}"</strong>.</p>
          <div style="background-color: #ffffff; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Details:</strong></p>
            <table style="width: 100%; font-size: 0.9rem; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 100px;">Topic:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${title}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Description:</td>
                <td style="padding: 6px 0; color: #334155;">${description || 'No description provided.'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Date & Time:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${formatKolkataDateTime(scheduledAt)} (IST)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Join Link:</td>
                <td style="padding: 6px 0;"><a href="${url}" style="color: #2563eb; font-weight: 600; text-decoration: none;">Click Here to Join Meeting</a></td>
              </tr>
            </table>
          </div>
          <p style="font-size: 0.85rem; color: #64748b;">Please join the meeting on time. If you have any questions, reach out to your Trainer or Program Manager.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0;">This email is auto-generated by the QuizHive LMS platform.</p>
        </div>
      `
    });

    console.log(`✉️ Email successfully sent to ${user.email} (Msg ID: ${info.messageId})`);
    if (info.messageId !== 'console-fallback') {
      const testUrl = nodemailer.getTestMessageUrl(info);
      if (testUrl) {
        console.log(`🔗 [Ethereal Mock Email Preview]: ${testUrl}`);
      }
    }
  } catch (err) {
    console.error(`❌ Error sending email to ${user.email}:`, err);
  }
}

async function validateTrainerEligibility(trainerId, projectId) {
  if (!trainerId) return { valid: false, error: 'Trainer selection is required' };

  const User = require('../models/User');
  const Role = require('../models/Role');
  const ProjectAssignment = require('../models/ProjectAssignment');

  const trainerUser = await User.findByPk(trainerId, {
    include: [{ model: Role, attributes: ['id', 'role_name'] }]
  });

  if (!trainerUser) {
    return { valid: false, error: 'Assigned trainer user not found.' };
  }

  const roleName = trainerUser.Role ? trainerUser.Role.role_name : '';
  if (roleName !== 'Trainer') {
    return { valid: false, error: `Selected user "${trainerUser.name}" does not have the Trainer role (current role: ${roleName || 'None'}).` };
  }

  if (trainerUser.status !== 'Active') {
    return { valid: false, error: `Selected trainer "${trainerUser.name}" is not Active (status: ${trainerUser.status}).` };
  }

  // If projectId is provided, verify active trainer assignment to that project or its parent hierarchy
  if (projectId) {
    const Project = require('../models/Project');
    const { Op } = require('sequelize');
    const project = await Project.findByPk(projectId, { attributes: ['id', 'parentId'] });
    const effectiveProjectIds = [projectId];
    const visited = new Set([projectId]);
    let curr = project;
    while (curr && curr.parentId && !visited.has(curr.parentId)) {
      visited.add(curr.parentId);
      effectiveProjectIds.push(curr.parentId);
      curr = await Project.findByPk(curr.parentId, { attributes: ['id', 'parentId'] });
    }

    const activeAssignment = await ProjectAssignment.findOne({
      where: {
        userId: trainerId,
        projectId: { [Op.in]: effectiveProjectIds },
        status: 'Active'
      }
    });

    const userProjects = trainerUser.projectId
      ? String(trainerUser.projectId).split(',').map(s => s.trim())
      : [];
    const isPrimaryProject = userProjects.some(pId => effectiveProjectIds.includes(pId));

    if (!activeAssignment && !isPrimaryProject) {
      return {
        valid: false,
        error: `Trainer "${trainerUser.name}" is not assigned to this project. Please select an eligible trainer assigned to this project.`
      };
    }
  }

  return { valid: true, trainer: trainerUser };
}

async function sendTrainerAssignmentEmail(trainerUser, title, description, scheduledAt, url, projectName, action = 'scheduled') {
  if (!trainerUser || !trainerUser.email) return;

  const actionMap = {
    scheduled: { subject: `Class Assignment: ${title} (${projectName})`, heading: '🎓 New Live Training Class Assigned' },
    rescheduled: { subject: `Class Rescheduled: ${title} (${projectName})`, heading: '⏰ Training Class Rescheduled' },
    reassigned: { subject: `Class Assigned to You: ${title} (${projectName})`, heading: '🔄 Training Class Assigned to You' },
    cancelled: { subject: `Class Cancelled: ${title} (${projectName})`, heading: '🚫 Training Class Cancelled' }
  };
  const meta = actionMap[action] || actionMap.scheduled;

  console.log('\n================================================================================');
  console.log(`✉️  TRAINER NOTIFICATION [${action.toUpperCase()}]: "${title}"`);
  console.log(`Trainer: ${trainerUser.name} <${trainerUser.email}>`);
  console.log(`Project: ${projectName}`);
  console.log(`Scheduled At: ${scheduledAt ? formatKolkataDateTime(scheduledAt) : 'TBD'} (IST)`);
  console.log(`Meeting Link: ${url}`);
  console.log('================================================================================');

  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER ? `"QuizHive LMS" <${process.env.SMTP_USER}>` : '"QuizHive LMS" <no-reply@quizhive.com>',
      to: `${trainerUser.name} <${trainerUser.email}>`,
      subject: meta.subject,
      text: `Hi ${trainerUser.name},\n\nYou have been assigned as the trainer for "${title}" under project "${projectName}".\n\nDate & Time: ${scheduledAt ? formatKolkataDateTime(scheduledAt) : 'TBD'} (IST)\nMeeting Link: ${url}\n\nPlease prepare your materials and host the session on time.\n\nBest regards,\nRetailEdge PRO LMS Operations`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0;">
          <h2 style="color: #2563eb; margin-top: 0; font-size: 1.5rem;">${meta.heading}</h2>
          <p>Hi <strong>${trainerUser.name}</strong>,</p>
          <p>You have been assigned as the responsible trainer for training class on project <strong style="color: #f36f21;">"${projectName}"</strong>.</p>
          <div style="background-color: #ffffff; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Session Details:</strong></p>
            <table style="width: 100%; font-size: 0.9rem; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 110px;">Topic:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${title}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Description:</td>
                <td style="padding: 6px 0; color: #334155;">${description || 'No description provided.'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Date & Time:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${scheduledAt ? formatKolkataDateTime(scheduledAt) : 'TBD'} (IST)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Host Link:</td>
                <td style="padding: 6px 0;"><a href="${url}" style="color: #2563eb; font-weight: 600; text-decoration: none;">Launch / Join Live Meeting</a></td>
              </tr>
            </table>
          </div>
          <p style="font-size: 0.85rem; color: #64748b;">This session has been added directly to your Trainer Workspace and Calendar.</p>
        </div>
      `
    });
    console.log(`✉️ Trainer notification sent to ${trainerUser.email} (Msg ID: ${info.messageId})`);
  } catch (err) {
    console.error(`❌ Error sending notification to trainer ${trainerUser.email}:`, err);
  }
}

function getZoneFromCoords(lat, lng, defaultLocation) {
  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    if (defaultLocation) {
      const match = defaultLocation.match(/(North|West|East|South)/i);
      return match ? match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase() : 'N/A';
    }
    return 'N/A';
  }

  // Reference coordinates for Indian retail hubs representing zones:
  // Delhi (North): 28.6139, 77.2090
  // Mumbai (West): 19.0760, 72.8777
  // Kolkata (East): 22.5726, 88.3639
  // Bangalore (South): 12.9716, 77.5946
  
  const zones = [
    { name: 'North', lat: 28.6139, lng: 77.2090 },
    { name: 'West', lat: 19.0760, lng: 72.8777 },
    { name: 'East', lat: 22.5726, lng: 88.3639 },
    { name: 'South', lat: 12.9716, lng: 77.5946 }
  ];

  let closestZone = 'N/A';
  let minDistance = Infinity;

  for (const zone of zones) {
    const dist = Math.sqrt(Math.pow(lat - zone.lat, 2) + Math.pow(lng - zone.lng, 2));
    if (dist < minDistance) {
      minDistance = dist;
      closestZone = zone.name;
    }
  }

  return closestZone;
}

// GET /api/trainings - Fetch trainings based on role & project
router.get('/', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userProjectId = req.user.projectId;
    const userId = req.user.id;

    const { Op } = require('sequelize');

    // Fetch progress for this user
    const progress = await TrainingProgress.findAll({
      where: { userId }
    });
    const userProgressTrainingIds = progress.map(p => p.trainingId);

    let whereClause = {};

    if (userRole === 'Client') {
      const clientService = require('../utils/clientService');
      const projectIds = await clientService.getAccessibleClientProjectIds(req.user, req.query.projectId || 'all', 'all');
      whereClause.projectId = { [Op.in]: projectIds };
    } else if (!['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager', 'MD', 'COO', 'VP Operations'].includes(userRole)) {
      const orConditions = [];

      if (userProjectId) {
        if (String(userProjectId).includes(',')) {
          orConditions.push({
            projectId: { [Op.in]: String(userProjectId).split(',').map(id => id.trim()).filter(Boolean) }
          });
        } else {
          orConditions.push({
            projectId: userProjectId
          });
        }
      } else {
        // Unassigned trainees see global
        orConditions.push({ projectId: null });
      }

      // If they have been invited/have progress on other trainings, include those as well
      if (userProgressTrainingIds.length > 0) {
        orConditions.push({
          id: { [Op.in]: userProgressTrainingIds }
        });
      }

      // If a specific training ID was requested (e.g. via direct LMS link), allow viewing it
      if (req.query.id) {
        orConditions.push({
          id: req.query.id
        });
      }

      whereClause = { [Op.or]: orConditions };
    } else if (userRole === 'T&D Manager') {
      const tdService = require('../utils/tdService');
      const accessibleProjectIds = await tdService.getAccessibleTDProjectIds(req.user, req.query.projectId || 'all', 'all');
      whereClause.projectId = { [Op.in]: accessibleProjectIds };
    } else if (userRole === 'Trainer') {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      const { projectId } = req.query;
      let projectCondition;
      if (projectId === '') {
        projectCondition = { projectId: null };
      } else if (projectId && projectId !== 'all') {
        if (!accessibleProjectIds.includes(projectId)) {
          return res.status(403).json({ error: 'Forbidden: You do not have permission for this project.' });
        }
        projectCondition = { projectId: projectId };
      } else {
        projectCondition = {
          [Op.or]: [
            { projectId: { [Op.in]: accessibleProjectIds.length > 0 ? accessibleProjectIds : ['00000000-0000-0000-0000-000000000000'] } },
            { projectId: null }
          ]
        };
      }

      // Safeguard 5: A trainer must not see another trainer's assigned meeting merely because they created it.
      // - Meeting items (type === 'Meeting'):
      //   - If trainerId is not null: visible ONLY if trainerId === req.user.id
      //   - If trainerId is null (legacy session): visible to project trainers as before
      // - Non-meeting items (type !== 'Meeting'): visible to project trainers as before
      whereClause = {
        [Op.and]: [
          projectCondition,
          {
            [Op.or]: [
              { type: { [Op.ne]: 'Meeting' } },
              { [Op.and]: [{ type: 'Meeting' }, { trainerId: req.user.id }] },
              { [Op.and]: [{ type: 'Meeting' }, { trainerId: null }] }
            ]
          }
        ]
      };
    } else if (userRole === 'Program Manager') {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      const { projectId } = req.query;
      if (projectId && projectId !== 'all') {
        const requestedIds = String(projectId).split(',').map(id => id.trim()).filter(Boolean);
        const unauthorized = requestedIds.filter(id => !accessibleProjectIds.includes(id));
        if (unauthorized.length > 0) {
          return res.status(403).json({ error: 'Forbidden: You do not have permission for this project.' });
        }
        whereClause.projectId = requestedIds.length === 1 ? requestedIds[0] : { [Op.in]: requestedIds };
      } else {
        whereClause.projectId = { [Op.in]: accessibleProjectIds.length > 0 ? accessibleProjectIds : ['00000000-0000-0000-0000-000000000000'] };
      }
    } else {
      // For Admins and Executive Leadership, support filter by project if query is passed
      const { projectId } = req.query;
      if (projectId === '') {
        whereClause.projectId = null;
      } else if (projectId && projectId !== 'all') {
        if (String(projectId).includes(',')) {
          whereClause.projectId = { [Op.in]: String(projectId).split(',').map(id => id.trim()).filter(Boolean) };
        } else {
          whereClause.projectId = projectId;
        }
      }
    }

    const User = require('../models/User');
    const trainings = await Training.findAll({
      where: whereClause,
      include: [
        { model: Project, attributes: ['id', 'name'] },
        { model: User, as: 'Trainer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'Creator', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Map progress state onto trainings
    const trainingsWithProgress = trainings.map(t => {
      const prog = progress.find(p => p.trainingId === t.id);
      return {
        ...t.toJSON(),
        completed: prog ? prog.completed : false,
        completedAt: prog ? prog.completedAt : null
      };
    });

    res.json(trainingsWithProgress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trainings', details: error.message });
  }
});

// POST /api/trainings - Create new training material (Admin/Trainer/PM/Leadership)
router.post('/', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager', 'MD', 'COO', 'VP Operations']), upload.single('file'), async (req, res) => {
  try {
    const { title, description, type, url, duration, projectId, scheduledAt } = req.body;
    let finalUrl = url;

    if (req.file) {
      finalUrl = `/uploads/${req.file.filename}`;
    }

    if (!title || !finalUrl) {
      return res.status(400).json({ error: 'Title and URL/File are required' });
    }

    if (projectId && !['Admin', 'Super Admin', 'MD', 'COO', 'VP Operations'].includes(req.user.role)) {
      if (req.user.role === 'T&D Manager') {
        const tdService = require('../utils/tdService');
        const accessibleProjectIds = await tdService.getAccessibleTDProjectIds(req.user, 'all', 'all');
        if (!accessibleProjectIds.includes(projectId)) {
          return res.status(403).json({ error: 'Forbidden: You do not have permission to add trainings for this project.' });
        }
      } else {
        const intelligenceService = require('../utils/projectIntelligenceService');
        const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
        if (!accessibleProjectIds.includes(projectId)) {
          return res.status(403).json({ error: 'Forbidden: You do not have permission to add trainings for this project.' });
        }
      }
    } else if (!projectId && !['Admin', 'Super Admin', 'MD', 'COO', 'VP Operations'].includes(req.user.role)) {
      if (type === 'Meeting' && ['Trainer', 'T&D Manager'].includes(req.user.role)) {
        // Allowed: General / Global meeting scheduling for Trainer and T&D Manager
      } else {
        return res.status(400).json({ error: 'Project is required for non-admin training material creation.' });
      }
    }

    let formattedUrl = finalUrl.trim();
    if (formattedUrl && !req.file && !/^https?:\/\//i.test(formattedUrl) && !formattedUrl.startsWith('/uploads/')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    let normalizedScheduledAt = null;
    if (scheduledAt) {
      normalizedScheduledAt = kolkataToUtcIso(scheduledAt);
      if (!normalizedScheduledAt) {
        return res.status(400).json({ error: 'Invalid scheduledAt date/time format.' });
      }
    } else if (type === 'Meeting') {
      return res.status(400).json({ error: 'Scheduled date and time is required for meeting sessions.' });
    }

    let assignedTrainerId = null;
    let trainerUser = null;

    if (type === 'Meeting') {
      if (req.user.role === 'Trainer' && !req.body.trainerId && (!req.body.trainerIds || !req.body.trainerIds.length)) {
        assignedTrainerId = req.user.id;
      } else {
        assignedTrainerId = req.body.trainerId || (Array.isArray(req.body.trainerIds) && req.body.trainerIds[0]) || null;
      }

      // Auto-resolve project trainer if not explicitly specified and project has an active assigned trainer
      if (!assignedTrainerId && projectId) {
        const Role = require('../models/Role');
        const User = require('../models/User');
        const ProjectAssignment = require('../models/ProjectAssignment');
        const Project = require('../models/Project');
        const { Op } = require('sequelize');
        const trainerRole = await Role.findOne({ where: { role_name: 'Trainer' } });
        if (trainerRole) {
          const project = await Project.findByPk(projectId, { attributes: ['id', 'parentId'] });
          const effectiveProjectIds = [projectId];
          const visited = new Set([projectId]);
          let curr = project;
          while (curr && curr.parentId && !visited.has(curr.parentId)) {
            visited.add(curr.parentId);
            effectiveProjectIds.push(curr.parentId);
            curr = await Project.findByPk(curr.parentId, { attributes: ['id', 'parentId'] });
          }

          const assignments = await ProjectAssignment.findAll({
            where: { projectId: { [Op.in]: effectiveProjectIds }, status: 'Active' },
            include: [{
              model: User,
              where: { roleId: trainerRole.id, status: 'Active' },
              attributes: ['id']
            }]
          });
          if (assignments.length === 1 && assignments[0].User) {
            assignedTrainerId = assignments[0].User.id;
          } else if (assignments.length === 0) {
            const allActiveTrainers = await User.findAll({
              where: {
                roleId: trainerRole.id,
                status: 'Active'
              },
              attributes: ['id', 'projectId']
            });
            const matching = allActiveTrainers.filter(u => {
              if (!u.projectId) return false;
              const pIds = String(u.projectId).split(',').map(s => s.trim());
              return pIds.some(pId => effectiveProjectIds.includes(pId));
            });
            if (matching.length === 1) {
              assignedTrainerId = matching[0].id;
            }
          }
        }
      }

      if (assignedTrainerId) {
        const eligibility = await validateTrainerEligibility(assignedTrainerId, projectId);
        if (!eligibility.valid) {
          return res.status(400).json({ error: eligibility.error });
        }
        trainerUser = eligibility.trainer;
      }
    }

    const newTraining = await Training.create({
      title,
      description,
      type: type || 'Video',
      url: formattedUrl,
      duration: duration || '10 mins',
      projectId: projectId || null,
      scheduledAt: normalizedScheduledAt,
      trainerId: assignedTrainerId || null,
      createdBy: req.user.id,
      platform: req.body.platform || 'google_meet',
      status: 'Scheduled'
    });

    if (type === 'Meeting' && assignedTrainerId && trainerUser) {
      let projectName = 'General (Global)';
      if (projectId) {
        const proj = await Project.findByPk(projectId);
        if (proj) projectName = proj.name;
      }
      sendTrainerAssignmentEmail(trainerUser, title, description, normalizedScheduledAt, formattedUrl, projectName, 'scheduled');
    }

    res.status(201).json(newTraining);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create training', details: error.message });
  }
});

// ─── ATTENDEE JOIN IDENTITY & ZONE VALIDATION HELPERS ─────────────────────────
function normalizeZoneTitle(z) {
  if (!z || typeof z !== 'string') return '';
  const trimmed = z.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower === 'pan india' || lower === 'pan-india' || lower === 'all india') return 'Pan India';
  if (lower === 'north') return 'North';
  if (lower === 'south') return 'South';
  if (lower === 'east') return 'East';
  if (lower === 'west') return 'West';
  if (lower === 'central') return 'Central';
  return trimmed.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function sortZonesCanonical(zones) {
  const CANONICAL_ORDER = ['North', 'South', 'East', 'West', 'Central', 'Pan India'];
  return zones.sort((a, b) => {
    const idxA = CANONICAL_ORDER.indexOf(a);
    const idxB = CANONICAL_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

async function getAuthoritativeTrainingZones(training) {
  const Project = require('../models/Project');
  const ProjectAssignment = require('../models/ProjectAssignment');
  const { Op } = require('sequelize');

  const zonesSet = new Set();

  if (training.projectId) {
    const project = await Project.findByPk(training.projectId);
    if (project) {
      // 1. Explicit project zone configuration takes precedence
      if (project.zone && typeof project.zone === 'string' && project.zone.trim()) {
        project.zone.split(',')
          .map(z => normalizeZoneTitle(z))
          .filter(Boolean)
          .forEach(z => zonesSet.add(z));
      } else {
        // 2. If project zone is not set on the project itself, inspect active subprojects and assignments
        const subprojects = await Project.findAll({
          where: { parentId: project.id, status: { [Op.ne]: 'Archived' } },
          attributes: ['zone']
        });
        subprojects.forEach(sp => {
          if (sp.zone && typeof sp.zone === 'string') {
            sp.zone.split(',')
              .map(z => normalizeZoneTitle(z))
              .filter(Boolean)
              .forEach(z => zonesSet.add(z));
          }
        });

        const assignments = await ProjectAssignment.findAll({
          where: { projectId: project.id, status: 'Active', zone: { [Op.ne]: null } },
          attributes: ['zone']
        });
        assignments.forEach(a => {
          if (a.zone && typeof a.zone === 'string') {
            a.zone.split(',')
              .map(z => normalizeZoneTitle(z))
              .filter(Boolean)
              .forEach(z => zonesSet.add(z));
          }
        });
      }
    }
  } else {
    // General / Global meeting: collect configured zones across all active projects
    const allProjects = await Project.findAll({
      where: { zone: { [Op.ne]: null }, status: { [Op.ne]: 'Archived' } },
      attributes: ['zone']
    });
    allProjects.forEach(p => {
      if (p.zone && typeof p.zone === 'string') {
        p.zone.split(',')
          .map(z => normalizeZoneTitle(z))
          .filter(Boolean)
          .forEach(z => zonesSet.add(z));
      }
    });

    const allAssignments = await ProjectAssignment.findAll({
      where: { zone: { [Op.ne]: null }, status: 'Active' },
      attributes: ['zone']
    });
    allAssignments.forEach(a => {
      if (a.zone && typeof a.zone === 'string') {
        a.zone.split(',')
          .map(z => normalizeZoneTitle(z))
          .filter(Boolean)
          .forEach(z => zonesSet.add(z));
      }
    });
  }

  const validList = Array.from(zonesSet)
    .filter(z => z && z !== 'Unmapped' && z !== 'N/A');

  return sortZonesCanonical(validList);
}

// GET /api/trainings/:id/join-context - Public endpoint to retrieve session context and valid zones for attendee join
router.get('/:id/join-context', async (req, res) => {
  try {
    const trainingId = req.params.id;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(trainingId)) {
      return res.status(400).json({ error: 'Invalid meeting ID format' });
    }

    const training = await Training.findByPk(trainingId, {
      include: [{ model: Project, attributes: ['id', 'name', 'zone'] }]
    });

    if (!training) {
      return res.status(404).json({ error: 'Training meeting not found' });
    }

    const validZones = await getAuthoritativeTrainingZones(training);

    let matchedEmployee = null;
    if (req.query.employeeId && typeof req.query.employeeId === 'string') {
      const cleanEmpId = req.query.employeeId.trim();
      if (cleanEmpId) {
        const User = require('../models/User');
        const ProjectAssignment = require('../models/ProjectAssignment');
        const user = await User.findOne({ where: { employee_id: cleanEmpId } });
        if (user) {
          let authoritativeZone = null;
          if (training.projectId) {
            const assignment = await ProjectAssignment.findOne({
              where: { userId: user.id, projectId: training.projectId, status: 'Active' }
            });
            if (assignment && assignment.zone) {
              authoritativeZone = assignment.zone;
            }
          }
          if (!authoritativeZone && user.location) {
            authoritativeZone = user.location;
          }
          matchedEmployee = {
            name: user.name,
            authoritativeZone: authoritativeZone && validZones.includes(authoritativeZone) ? authoritativeZone : null
          };
        }
      }
    }

    res.json({
      meetingId: training.id,
      title: training.title,
      description: training.description,
      type: training.type,
      scheduledAt: training.scheduledAt,
      projectId: training.projectId || null,
      projectName: training.Project ? training.Project.name : 'General (Global)',
      validZones,
      zonesConfigured: validZones.length > 0,
      matchedEmployee
    });
  } catch (error) {
    console.error('GET /api/trainings/:id/join-context error:', error);
    res.status(500).json({ error: 'Failed to retrieve meeting context', details: error.message });
  }
});

// POST /api/trainings/:id/guest-join - Standardized attendee registration & session binding
router.post('/:id/guest-join', async (req, res) => {
  try {
    const trainingId = req.params.id;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(trainingId)) {
      return res.status(400).json({ error: 'Invalid meeting ID format' });
    }

    const { name, employeeId, zone } = req.body;
    
    const cleanName = (typeof name === 'string' ? name : '').trim();
    const cleanEmployeeId = (typeof employeeId === 'string' ? employeeId : (employeeId !== undefined && employeeId !== null ? String(employeeId) : '')).trim();
    const cleanZone = (typeof zone === 'string' ? zone : '').trim();

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ error: 'Full Name is required (minimum 2 characters)' });
    }

    if (!cleanEmployeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    if (!cleanZone) {
      return res.status(400).json({ error: 'Zone selection is required' });
    }

    const Project = require('../models/Project');
    const training = await Training.findByPk(trainingId, {
      include: [{ model: Project, attributes: ['id', 'name', 'zone'] }]
    });
    if (!training) {
      return res.status(404).json({ error: 'Training meeting not found' });
    }

    const validZones = await getAuthoritativeTrainingZones(training);
    if (validZones.length === 0) {
      return res.status(400).json({
        error: 'Zones are not configured for this project. Please contact your Program Manager or Trainer before joining.'
      });
    }

    const matchedZone = validZones.find(z => z.toLowerCase() === cleanZone.toLowerCase());
    if (!matchedZone) {
      return res.status(400).json({
        error: `Invalid zone "${cleanZone}". Please select from configured project zones: ${validZones.join(', ')}.`
      });
    }
    const authoritativeZone = matchedZone;

    const User = require('../models/User');
    const Role = require('../models/Role');
    const ProjectAssignment = require('../models/ProjectAssignment');
    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcrypt');

    // 1. Authoritative lookup by canonical employee_id (preserves leading zeros)
    let targetUser = await User.findOne({
      where: { employee_id: cleanEmployeeId },
      include: [Role]
    });

    if (targetUser) {
      // Identity Check: Name consistency
      const existingNorm = targetUser.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const inputNorm = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');

      const nameMatch = existingNorm === inputNorm ||
                        existingNorm.includes(inputNorm) ||
                        inputNorm.includes(existingNorm);

      if (!nameMatch) {
        return res.status(400).json({
          error: `Employee ID "${cleanEmployeeId}" is registered to another employee. Please verify your Employee ID.`
        });
      }

      // Zone conflict check with authoritative records
      if (training.projectId) {
        const existingAssignment = await ProjectAssignment.findOne({
          where: { userId: targetUser.id, projectId: training.projectId, status: 'Active' }
        });

        if (existingAssignment && existingAssignment.zone && existingAssignment.zone.trim().toLowerCase() !== authoritativeZone.toLowerCase()) {
          return res.status(400).json({
            error: `Zone conflict: Employee is officially assigned to zone "${existingAssignment.zone}". Please select your assigned zone or contact your supervisor.`
          });
        }

        if (existingAssignment && !existingAssignment.zone) {
          await existingAssignment.update({ zone: authoritativeZone });
        } else if (!existingAssignment) {
          await ProjectAssignment.create({
            userId: targetUser.id,
            projectId: training.projectId,
            role: targetUser.Role?.role_name || 'Employee',
            zone: authoritativeZone,
            status: 'Active'
          });
        }
      }
    } else {
      // 2. New employee identity creation
      const employeeRole = await Role.findOne({ where: { role_name: 'Employee' } });
      if (!employeeRole) {
        return res.status(500).json({ error: 'Employee role not found' });
      }

      const sanitizedEmp = cleanEmployeeId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const guestEmail = `emp_${sanitizedEmp}_${Date.now()}@retailedgepro.in`;
      const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);

      targetUser = await User.create({
        name: cleanName,
        employee_id: cleanEmployeeId, // Preserves original string format and leading zeros
        email: guestEmail,
        password: tempPassword,
        roleId: employeeRole.id,
        projectId: training.projectId || null,
        location: authoritativeZone,
        department: 'Field Operations'
      });

      if (training.projectId) {
        await ProjectAssignment.create({
          userId: targetUser.id,
          projectId: training.projectId,
          role: 'Employee',
          zone: authoritativeZone,
          status: 'Active'
        });
      }
    }

    // 3. Idempotent attendance/progress registration
    const [progress, created] = await TrainingProgress.findOrCreate({
      where: {
        userId: targetUser.id,
        trainingId: training.id
      },
      defaults: {
        completed: false,
        timeSpent: 1,
        zone: authoritativeZone
      }
    });

    if (!created && (!progress.zone || progress.zone === 'N/A')) {
      await progress.update({ zone: authoritativeZone });
    }

    const token = jwt.sign(
      {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.Role?.role_name || 'Employee',
        projectId: training.projectId || targetUser.projectId
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        employee_id: targetUser.employee_id,
        email: targetUser.email,
        role: targetUser.Role?.role_name || 'Employee',
        projectId: training.projectId || targetUser.projectId,
        zone: authoritativeZone
      },
      meeting: {
        id: training.id,
        title: training.title,
        description: training.description,
        url: training.url,
        scheduledAt: training.scheduledAt,
        duration: training.duration,
        projectName: training.Project ? training.Project.name : 'General (Global)'
      }
    });
  } catch (error) {
    console.error('POST /api/trainings/:id/guest-join error:', error);
    res.status(500).json({ error: 'Failed to process join request', details: error.message });
  }
});

// POST /api/trainings/:id/progress - Toggle completion state for a training item
router.post('/:id/progress', requireAuth, async (req, res) => {
  try {
    const trainingId = req.params.id;
    const userId = req.user.id;
    const { completed, timeSpent, latitude, longitude } = req.body;

    const training = await Training.findByPk(trainingId);
    if (!training) {
      return res.status(404).json({ error: 'Training material not found' });
    }

    const User = require('../models/User');
    const userObj = await User.findByPk(userId);
    const calculatedZone = getZoneFromCoords(latitude, longitude, userObj?.location);

    let progress = await TrainingProgress.findOne({
      where: { userId, trainingId }
    });

    if (progress) {
      const nextTimeSpent = (progress.timeSpent || 0) + (timeSpent || 0);
      const updateData = {
        completed: completed === undefined ? true : completed,
        completedAt: completed === false ? null : (progress.completedAt || new Date()),
        timeSpent: nextTimeSpent
      };
      if (latitude !== undefined && latitude !== null) updateData.latitude = latitude;
      if (longitude !== undefined && longitude !== null) updateData.longitude = longitude;
      if (calculatedZone && calculatedZone !== 'N/A') updateData.zone = calculatedZone;
      else if (!progress.zone && userObj?.location) {
        updateData.zone = getZoneFromCoords(null, null, userObj.location);
      }
      await progress.update(updateData);
    } else {
      progress = await TrainingProgress.create({
        userId,
        trainingId,
        completed: completed === undefined ? true : completed,
        completedAt: completed === false ? null : new Date(),
        timeSpent: timeSpent || 0,
        latitude: latitude || null,
        longitude: longitude || null,
        zone: calculatedZone !== 'N/A' ? calculatedZone : (getZoneFromCoords(null, null, userObj?.location) || 'N/A')
      });
    }

    // Auto-issuing certificate logic:
    // If the training belongs to a project, check if the user has completed ALL trainings for that project.
    if (training.projectId && (completed !== false)) {
      const allProjectTrainings = await Training.findAll({
        where: { projectId: training.projectId }
      });

      const completedProjectTrainings = await TrainingProgress.findAll({
        where: {
          userId,
          completed: true
        },
        include: [{
          model: Training,
          where: { projectId: training.projectId }
        }]
      });

      if (completedProjectTrainings.length === allProjectTrainings.length) {
        // Auto issue certificate if it doesn't already exist
        const [cert, created] = await Certificate.findOrCreate({
          where: {
            userId,
            projectId: training.projectId
          },
          defaults: {
            issueDate: new Date(),
            qrCode: `CERT-QR-${userId.substring(0, 5)}-${training.projectId.substring(0, 5)}-${Date.now()}`
          }
        });
        if (created) {
          console.log(`Auto-issued certificate for user ${userId} on project ${training.projectId}`);
        }
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('attendance_updated', { userId, trainingId });
    }

    res.json({ message: 'Progress updated successfully', progress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress', details: error.message });
  }
});

// PUT /api/trainings/:id - Update training material
router.put('/:id', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager', 'MD', 'COO', 'VP Operations']), upload.single('file'), async (req, res) => {
  try {
    const training = await Training.findByPk(req.params.id);
    if (!training) {
      return res.status(404).json({ error: 'Training not found' });
    }

    const userRole = req.user.role || (req.user.Role ? req.user.Role.role_name : '');
    if (userRole === 'T&D Manager') {
      const tdService = require('../utils/tdService');
      const accessibleProjectIds = await tdService.getAccessibleTDProjectIds(req.user, 'all', 'all');
      if (!training.projectId || !accessibleProjectIds.includes(training.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to edit training materials outside your capability portfolio.' });
      }
      if (req.body.projectId && !accessibleProjectIds.includes(req.body.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You cannot assign training materials to a foreign project.' });
      }
    } else if (userRole === 'Trainer' && training.projectId) {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      if (!accessibleProjectIds.includes(training.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to edit training materials for this project.' });
      }
    }

    const { title, description, type, url, duration, projectId, scheduledAt, trainerId, platform, status } = req.body;
    let finalUrl = url;
    if (req.file) {
      finalUrl = `/uploads/${req.file.filename}`;
    }

    if (title !== undefined) training.title = title;
    if (description !== undefined) training.description = description;
    if (type !== undefined) training.type = type;
    if (finalUrl !== undefined) {
      let formattedUrl = finalUrl.trim();
      if (formattedUrl && !req.file && !/^https?:\/\//i.test(formattedUrl) && !formattedUrl.startsWith('/uploads/')) {
        formattedUrl = 'https://' + formattedUrl;
      }
      training.url = formattedUrl;
    }
    if (duration !== undefined) training.duration = duration;
    if (projectId !== undefined) training.projectId = projectId || null;
    if (platform !== undefined) training.platform = platform;
    if (status !== undefined) {
      const prevStatus = training.status;
      training.status = status;
      if (status === 'Cancelled' && prevStatus !== 'Cancelled' && training.trainerId) {
        const User = require('../models/User');
        const trainer = await User.findByPk(training.trainerId);
        let projectName = 'General (Global)';
        if (training.projectId) {
          const proj = await Project.findByPk(training.projectId);
          if (proj) projectName = proj.name;
        }
        if (trainer) {
          sendTrainerAssignmentEmail(trainer, training.title, training.description, training.scheduledAt, training.url, projectName, 'cancelled');
        }
      }
    }

    let scheduledAtChanged = false;
    if (scheduledAt !== undefined) {
      if (scheduledAt) {
        const normalized = kolkataToUtcIso(scheduledAt);
        if (!normalized) {
          return res.status(400).json({ error: 'Invalid scheduledAt date/time format.' });
        }
        if (training.scheduledAt !== normalized) {
          scheduledAtChanged = true;
          training.scheduledAt = normalized;
        }
      } else {
        if (training.scheduledAt !== null) scheduledAtChanged = true;
        training.scheduledAt = null;
      }
    }

    // Handle trainer assignment/reassignment
    if (trainerId !== undefined && trainerId !== training.trainerId) {
      const User = require('../models/User');
      const oldTrainerId = training.trainerId;
      const targetProjectId = projectId !== undefined ? projectId : training.projectId;

      if (trainerId) {
        const eligibility = await validateTrainerEligibility(trainerId, targetProjectId);
        if (!eligibility.valid) {
          return res.status(400).json({ error: eligibility.error });
        }
        training.trainerId = trainerId;

        let projectName = 'General (Global)';
        if (targetProjectId) {
          const proj = await Project.findByPk(targetProjectId);
          if (proj) projectName = proj.name;
        }

        // Notify newly assigned trainer
        sendTrainerAssignmentEmail(eligibility.trainer, training.title, training.description, training.scheduledAt, training.url, projectName, 'reassigned');

        // If old trainer existed, notify them of cancellation/reassignment
        if (oldTrainerId) {
          const oldTrainer = await User.findByPk(oldTrainerId);
          if (oldTrainer) {
            sendTrainerAssignmentEmail(oldTrainer, training.title, training.description, training.scheduledAt, training.url, projectName, 'cancelled');
          }
        }
      } else {
        training.trainerId = null;
      }
    } else if (scheduledAtChanged && training.trainerId) {
      const User = require('../models/User');
      const trainer = await User.findByPk(training.trainerId);
      let projectName = 'General (Global)';
      if (training.projectId) {
        const proj = await Project.findByPk(training.projectId);
        if (proj) projectName = proj.name;
      }
      if (trainer) {
        sendTrainerAssignmentEmail(trainer, training.title, training.description, training.scheduledAt, training.url, projectName, 'rescheduled');
      }
    }

    await training.save();

    const User = require('../models/User');
    const updatedTraining = await Training.findByPk(training.id, {
      include: [
        { model: Project, attributes: ['id', 'name'] },
        { model: User, as: 'Trainer', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'Creator', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json(updatedTraining);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update training', details: error.message });
  }
});

// DELETE /api/trainings/:id - Delete a training material
router.delete('/:id', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager', 'MD', 'COO', 'VP Operations']), async (req, res) => {
  try {
    const training = await Training.findByPk(req.params.id);
    if (!training) {
      return res.status(404).json({ error: 'Training not found' });
    }

    if (req.user.role === 'T&D Manager') {
      const tdService = require('../utils/tdService');
      const accessibleProjectIds = await tdService.getAccessibleTDProjectIds(req.user, 'all', 'all');
      if (!training.projectId || !accessibleProjectIds.includes(training.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to delete training materials outside your capability portfolio.' });
      }
    } else if (req.user.role === 'Trainer' && training.projectId) {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      if (!accessibleProjectIds.includes(training.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this training material.' });
      }
    }

    // If meeting had an assigned trainer, notify them of cancellation before deletion
    if (training.type === 'Meeting' && training.trainerId) {
      const User = require('../models/User');
      const trainer = await User.findByPk(training.trainerId);
      let projectName = 'General (Global)';
      if (training.projectId) {
        const proj = await Project.findByPk(training.projectId);
        if (proj) projectName = proj.name;
      }
      if (trainer) {
        sendTrainerAssignmentEmail(trainer, training.title, training.description, training.scheduledAt, training.url, projectName, 'cancelled');
      }
    }

    await training.destroy();
    res.json({ message: 'Training material deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete training', details: error.message });
  }
});

// POST /api/trainings/schedule-meeting - Schedule a training meeting with trainer assignment & notifications
router.post('/schedule-meeting', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager', 'MD', 'COO', 'VP Operations']), async (req, res) => {
  try {
    const { title, description, projectId, scheduledAt, url, inviteeIds, trainerId, trainerIds, platform } = req.body;

    if (!title || !url || !scheduledAt) {
      return res.status(400).json({ error: 'Title, URL, and Date/Time are required' });
    }

    const normalizedScheduledAt = kolkataToUtcIso(scheduledAt);
    if (!normalizedScheduledAt) {
      return res.status(400).json({ error: 'Invalid scheduledAt date/time format.' });
    }

    if (projectId && !['Admin', 'Super Admin', 'MD', 'COO', 'VP Operations'].includes(req.user.role)) {
      if (req.user.role === 'T&D Manager') {
        const tdService = require('../utils/tdService');
        const accessibleProjectIds = await tdService.getAccessibleTDProjectIds(req.user, 'all', 'all');
        if (!accessibleProjectIds.includes(projectId)) {
          return res.status(403).json({ error: 'Forbidden: You do not have permission to schedule meetings for this project.' });
        }
      } else {
        const intelligenceService = require('../utils/projectIntelligenceService');
        const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
        if (!accessibleProjectIds.includes(projectId)) {
          return res.status(403).json({ error: 'Forbidden: You do not have permission to schedule meetings for this project.' });
        }
      }
    } else if (!projectId && !['Admin', 'Super Admin', 'Trainer', 'T&D Manager', 'MD', 'COO', 'VP Operations'].includes(req.user.role)) {
      return res.status(400).json({ error: 'Project is required to schedule a meeting.' });
    }

    // Resolve primary trainer assignment
    let assignedTrainerId = trainerId || (Array.isArray(trainerIds) && trainerIds[0]) || null;
    if (req.user.role === 'Trainer' && !assignedTrainerId) {
      assignedTrainerId = req.user.id;
    }

    // Auto-resolve project trainer if not explicitly specified and project has an active assigned trainer
    if (!assignedTrainerId && projectId) {
      const Role = require('../models/Role');
      const User = require('../models/User');
      const ProjectAssignment = require('../models/ProjectAssignment');
      const Project = require('../models/Project');
      const { Op } = require('sequelize');
      const trainerRole = await Role.findOne({ where: { role_name: 'Trainer' } });
      if (trainerRole) {
        const project = await Project.findByPk(projectId, { attributes: ['id', 'parentId'] });
        const effectiveProjectIds = [projectId];
        const visited = new Set([projectId]);
        let curr = project;
        while (curr && curr.parentId && !visited.has(curr.parentId)) {
          visited.add(curr.parentId);
          effectiveProjectIds.push(curr.parentId);
          curr = await Project.findByPk(curr.parentId, { attributes: ['id', 'parentId'] });
        }

        const assignments = await ProjectAssignment.findAll({
          where: { projectId: { [Op.in]: effectiveProjectIds }, status: 'Active' },
          include: [{
            model: User,
            where: { roleId: trainerRole.id, status: 'Active' },
            attributes: ['id']
          }]
        });
        if (assignments.length === 1 && assignments[0].User) {
          assignedTrainerId = assignments[0].User.id;
        } else if (assignments.length === 0) {
          const allActiveTrainers = await User.findAll({
            where: {
              roleId: trainerRole.id,
              status: 'Active'
            },
            attributes: ['id', 'projectId']
          });
          const matching = allActiveTrainers.filter(u => {
            if (!u.projectId) return false;
            const pIds = String(u.projectId).split(',').map(s => s.trim());
            return pIds.some(pId => effectiveProjectIds.includes(pId));
          });
          if (matching.length === 1) {
            assignedTrainerId = matching[0].id;
          }
        }
      }
    }

    let trainerUser = null;
    if (assignedTrainerId) {
      const eligibility = await validateTrainerEligibility(assignedTrainerId, projectId);
      if (!eligibility.valid) {
        return res.status(400).json({ error: eligibility.error });
      }
      trainerUser = eligibility.trainer;
    }

    let formattedUrl = url.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    // 60-second duplicate submission guard
    const { Op } = require('sequelize');
    const recentDuplicate = await Training.findOne({
      where: {
        title: title.trim(),
        projectId: projectId || null,
        trainerId: assignedTrainerId || null,
        scheduledAt: normalizedScheduledAt,
        createdAt: { [Op.gte]: new Date(Date.now() - 60000) }
      }
    });

    if (recentDuplicate) {
      return res.status(409).json({ error: 'A meeting with this topic, trainer, and date/time was just created. Please avoid duplicate submission.' });
    }

    // 1. Create the Training meeting with trainerId, createdBy, platform, status
    const newMeeting = await Training.create({
      title: title.trim(),
      description,
      type: 'Meeting',
      url: formattedUrl,
      duration: '1 hour',
      projectId: projectId || null,
      scheduledAt: normalizedScheduledAt,
      trainerId: assignedTrainerId || null,
      createdBy: req.user.id,
      platform: platform || 'google_meet',
      status: 'Scheduled'
    });

    // 2. Fetch invitees details
    let invitees = [];
    if (inviteeIds && Array.isArray(inviteeIds) && inviteeIds.length > 0) {
      const User = require('../models/User');
      invitees = await User.findAll({
        where: {
          id: inviteeIds
        },
        attributes: ['id', 'name', 'email', 'location']
      });
    }

    // 3. Find project name if projectId is provided
    let projectName = 'General (Global)';
    if (projectId) {
      const project = await Project.findByPk(projectId);
      if (project) {
        projectName = project.name;
      }
    }

    // 4. Send assigned trainer notification
    if (assignedTrainerId && trainerUser) {
      sendTrainerAssignmentEmail(trainerUser, title, description, normalizedScheduledAt, formattedUrl, projectName, 'scheduled');
    }

    // 5. Send attendee notifications & create TrainingProgress
    console.log('\n================================================================================');
    console.log(`✉️  ATTENDEE INVITATIONS FOR MEETING: "${title}"`);
    console.log(`Project: ${projectName}`);
    console.log(`Trainer: ${trainerUser ? `${trainerUser.name} <${trainerUser.email}>` : 'Unassigned'}`);
    console.log(`Scheduled At: ${formatKolkataDateTime(normalizedScheduledAt)} (IST)`);
    console.log(`Meeting Link: ${formattedUrl}`);
    console.log('================================================================================');
    
    for (const user of invitees) {
      const defaultZone = getZoneFromCoords(null, null, user.location);

      // Auto-populate TrainingProgress for the invited users
      await TrainingProgress.findOrCreate({
        where: {
          userId: user.id,
          trainingId: newMeeting.id
        },
        defaults: {
          completed: false,
          timeSpent: 0,
          zone: defaultZone !== 'N/A' ? defaultZone : 'N/A'
        }
      });

      // Send actual email invitation (runs in background so it doesn't block the API response)
      sendInviteEmail(user, title, description, scheduledAt, formattedUrl, projectName);
    }
    console.log('================================================================================\n');

    const io = req.app.get('io');
    if (io) {
      io.emit('attendance_updated', { meetingId: newMeeting.id });
    }

    res.status(201).json({
      message: 'Meeting scheduled successfully and invitation notifications dispatched.',
      meeting: newMeeting,
      inviteeCount: invitees.length
    });
  } catch (error) {
    console.error('Failed to schedule meeting:', error);
    res.status(500).json({ error: 'Failed to schedule meeting', details: error.message });
  }
});

// ─── JITSI ATTENDANCE & INTERVAL TELEMETRY ENDPOINTS ─────────────────────────
const JitsiAttendance = require('../models/JitsiAttendance');
const JitsiInterval = require('../models/JitsiInterval');

// POST /api/trainings/:id/jitsi-event - Securely handle join/leave/heartbeat events
router.post('/:id/jitsi-event', requireAuth, async (req, res) => {
  try {
    const trainingId = req.params.id;
    const {
      event, // 'join' | 'leave' | 'heartbeat'
      jitsiParticipantId,
      scheduledDurationMinutes = 60
    } = req.body;

    if (!['join', 'leave', 'heartbeat'].includes(event)) {
      return res.status(400).json({ error: 'Invalid telemetry event type. Supported events: join, leave, heartbeat' });
    }

    const training = await Training.findByPk(trainingId);
    if (!training) {
      return res.status(404).json({ error: 'Training not found' });
    }

    // 1. Authoritative Identity Resolution from Authenticated Token
    const User = require('../models/User');
    const Role = require('../models/Role');
    const authUser = await User.findByPk(req.user.id, {
      include: [{ model: Role, attributes: ['id', 'role_name'] }]
    });

    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized: Authenticated user not found' });
    }

    const rawRole = req.user.role || authUser.Role?.role_name || '';
    const userRole = String(rawRole).trim();
    const normalizedRole = userRole.toLowerCase();
    const isAdmin = ['admin', 'super admin', 'superadmin'].includes(normalizedRole);
    const isObserver = ['supervisor', 'client'].includes(normalizedRole);

    // Prevent identity impersonation: Client payload cannot forge a different userId
    if (req.body.userId && String(req.body.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden: You cannot submit attendance telemetry for another user' });
    }

    // 2. Strict Project Scoping / Authorization
    if (!isAdmin) {
      if (!training.projectId) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission for this training session' });
      }
      const intelligenceService = require('../utils/projectIntelligenceService');
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      if (!Array.isArray(accessibleProjectIds) || !accessibleProjectIds.includes(training.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission for this training session' });
      }
    }

    // 3. Non-authoritative Observer Mode for Supervisor & Client:
    // Observer presence must NEVER create, alter, or inflate participant attendance records
    if (isObserver) {
      return res.json({
        message: `${userRole} observer presence recorded (non-authoritative; zero attendance mutation)`,
        observer: true,
        attendancePercentage: null
      });
    }

    // 4. Authoritative Participant Binding
    const userId = authUser.id;
    const participantName = authUser.name;
    const employeeId = authUser.employee_id || null;

    // Resolve authoritative zone from TrainingProgress, ProjectAssignment, or User location
    let zone = null;
    const progress = await TrainingProgress.findOne({
      where: { userId, trainingId }
    });
    if (progress && progress.zone && progress.zone !== 'N/A') {
      zone = progress.zone;
    } else if (training.projectId) {
      const ProjectAssignment = require('../models/ProjectAssignment');
      const assignment = await ProjectAssignment.findOne({
        where: { userId, projectId: training.projectId, status: 'Active' }
      });
      if (assignment && assignment.zone) {
        zone = assignment.zone;
      }
    }
    if (!zone && req.body.zone) {
      zone = String(req.body.zone).trim();
    }
    if (!zone && authUser.location) {
      zone = authUser.location;
    }

    let attendance = await JitsiAttendance.findOne({
      where: {
        trainingId,
        userId
      }
    });

    const now = new Date();

    if (event === 'join') {
      if (!attendance) {
        attendance = await JitsiAttendance.create({
          trainingId,
          projectId: training.projectId,
          userId,
          participantName,
          employeeId,
          zone,
          jitsiParticipantId: jitsiParticipantId || null,
          scheduledDurationMinutes,
          totalAttendedMinutes: 0,
          attendancePercentage: 0,
          rejoinCount: 0,
          status: 'Online',
          firstJoinedAt: now,
          lastHeartbeatAt: now
        });
      } else {
        // Rejoin event - check if an open interval already exists (idempotency guard)
        const openInterval = await JitsiInterval.findOne({
          where: { jitsiAttendanceId: attendance.id, leftAt: null }
        });

        if (openInterval) {
          // Open interval already active - treat as idempotent heartbeat refresh
          await attendance.update({
            status: 'Online',
            lastHeartbeatAt: now,
            ...(!attendance.zone && zone ? { zone } : {}),
            ...(jitsiParticipantId ? { jitsiParticipantId } : {})
          });
          return res.json({ success: true, attendance, message: 'Already joined (idempotent)' });
        }

        const rejoins = (attendance.rejoinCount || 0) + 1;
        await attendance.update({
          status: 'Online',
          rejoinCount: rejoins,
          lastHeartbeatAt: now,
          ...(!attendance.zone && zone ? { zone } : {}),
          ...(jitsiParticipantId ? { jitsiParticipantId } : {})
        });
      }

      // Create new open interval only if no open interval exists
      const existingOpen = await JitsiInterval.findOne({
        where: { jitsiAttendanceId: attendance.id, leftAt: null }
      });
      if (!existingOpen) {
        await JitsiInterval.create({
          jitsiAttendanceId: attendance.id,
          joinedAt: now
        });
      }

    } else if (event === 'leave') {
      if (attendance) {
        // Find latest open interval without leftAt
        const openInterval = await JitsiInterval.findOne({
          where: { jitsiAttendanceId: attendance.id, leftAt: null },
          order: [['joinedAt', 'DESC']]
        });

        if (openInterval) {
          const durationSec = Math.max(0, Math.round((now - new Date(openInterval.joinedAt)) / 1000));
          await openInterval.update({
            leftAt: now,
            durationSeconds: durationSec
          });
        }

        // Consolidate all intervals
        const allIntervals = await JitsiInterval.findAll({
          where: { jitsiAttendanceId: attendance.id }
        });

        const totalSeconds = allIntervals.reduce((sum, intv) => {
          if (intv.durationSeconds) return sum + intv.durationSeconds;
          if (intv.leftAt) return sum + Math.max(0, Math.round((new Date(intv.leftAt) - new Date(intv.joinedAt)) / 1000));
          return sum;
        }, 0);

        const totalMinutes = Math.round((totalSeconds / 60) * 10) / 10;
        const targetDuration = attendance.scheduledDurationMinutes || scheduledDurationMinutes || 60;
        const attendancePct = Math.min(100, Math.round((totalMinutes / targetDuration) * 100));

        await attendance.update({
          totalAttendedMinutes: totalMinutes,
          attendancePercentage: attendancePct,
          status: attendancePct >= 75 ? 'Completed' : 'Left Early',
          lastLeftAt: now,
          lastHeartbeatAt: now
        });
      }
    } else if (event === 'heartbeat') {
      if (attendance) {
        // Update open interval duration
        const openInterval = await JitsiInterval.findOne({
          where: { jitsiAttendanceId: attendance.id, leftAt: null },
          order: [['joinedAt', 'DESC']]
        });

        if (openInterval) {
          const currentSec = Math.max(0, Math.round((now - new Date(openInterval.joinedAt)) / 1000));
          await openInterval.update({ durationSeconds: currentSec });
        }

        // Consolidate up-to-date duration
        const allIntervals = await JitsiInterval.findAll({
          where: { jitsiAttendanceId: attendance.id }
        });
        const totalSeconds = allIntervals.reduce((sum, intv) => sum + (intv.durationSeconds || 0), 0);
        const totalMinutes = Math.round((totalSeconds / 60) * 10) / 10;
        const targetDuration = attendance.scheduledDurationMinutes || 60;
        const attendancePct = Math.min(100, Math.round((totalMinutes / targetDuration) * 100));

        await attendance.update({
          totalAttendedMinutes: totalMinutes,
          attendancePercentage: attendancePct,
          status: 'Online',
          lastHeartbeatAt: now
        });
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('jitsi_attendance_updated', { trainingId });
    }

    res.json({ success: true, attendance });
  } catch (error) {
    console.error('Jitsi event handler error:', error);
    res.status(500).json({ error: 'Failed to process Jitsi event', details: error.message });
  }
});

// GET /api/trainings/:id/live-attendance - Live online participants in active meeting
router.get('/:id/live-attendance', requireAuth, async (req, res) => {
  try {
    const trainingId = req.params.id;
    const training = await Training.findByPk(trainingId);
    if (!training) {
      return res.status(404).json({ error: 'Training not found' });
    }

    // Strict Data Isolation check: verify PM has access to training's project
    const userRole = req.user.role || (req.user.Role ? req.user.Role.role_name : '');
    if (!['Admin', 'Super Admin'].includes(userRole) && training.projectId) {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const accessibleIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      if (!accessibleIds.includes(training.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission for this training session.' });
      }
    }

    const records = await JitsiAttendance.findAll({
      where: { trainingId },
      include: [{ model: JitsiInterval, as: 'intervals' }],
      order: [['updatedAt', 'DESC']]
    });

    const now = new Date();
    const liveThresholdMs = 90 * 1000; // 90 seconds threshold

    const liveParticipants = await Promise.all(records.map(async (r) => {
      let isOnline = r.status === 'Online' && (r.lastHeartbeatAt && (now - new Date(r.lastHeartbeatAt) < liveThresholdMs));
      
      // Auto-cleanup stale intervals if browser crashed or network dropped
      if (!isOnline && r.status === 'Online') {
        const openInterval = await JitsiInterval.findOne({
          where: { jitsiAttendanceId: r.id, leftAt: null },
          order: [['joinedAt', 'DESC']]
        });
        if (openInterval) {
          const closeTime = r.lastHeartbeatAt || now;
          const durSec = Math.max(0, Math.round((new Date(closeTime) - new Date(openInterval.joinedAt)) / 1000));
          await openInterval.update({ leftAt: closeTime, durationSeconds: durSec });

          const allIntervals = await JitsiInterval.findAll({ where: { jitsiAttendanceId: r.id } });
          const totalSeconds = allIntervals.reduce((sum, intv) => sum + (intv.durationSeconds || 0), 0);
          const totalMinutes = Math.round((totalSeconds / 60) * 10) / 10;
          const scheduledMins = r.scheduledDurationMinutes || 60;
          const attPct = Math.min(100, Math.round((totalMinutes / scheduledMins) * 100));

          await r.update({
            totalAttendedMinutes: totalMinutes,
            attendancePercentage: attPct,
            status: 'Offline',
            lastLeftAt: closeTime
          });
        }
      }

      const mins = Math.round(r.totalAttendedMinutes || 0);
      const durationStr = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

      return {
        id: r.id,
        participant: r.participantName,
        employeeId: r.employeeId || 'N/A',
        status: isOnline ? 'Online' : (r.status || 'Offline'),
        joinTime: r.firstJoinedAt ? new Date(r.firstJoinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        currentDuration: durationStr,
        durationMinutes: mins,
        scheduledDurationMinutes: r.scheduledDurationMinutes || 60,
        rejoinCount: r.rejoinCount || 0,
        attendancePercentage: Math.round(r.attendancePercentage || 0)
      };
    }));

    res.json(liveParticipants);
  } catch (error) {
    console.error('GET live-attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch live attendance', details: error.message });
  }
});

// POST /api/trainings/:id/end-meeting - Trainer ends meeting, closing all open intervals
router.post('/:id/end-meeting', requireAuth, requireRole(['Trainer', 'Admin', 'Super Admin', 'Program Manager', 'MD', 'COO', 'VP Operations']), async (req, res) => {
  try {
    const trainingId = req.params.id;
    const training = await Training.findByPk(trainingId);
    if (!training) {
      return res.status(404).json({ error: 'Training session not found.' });
    }

    if (req.user.role === 'Trainer' && training.projectId) {
      const intelligenceService = require('../utils/projectIntelligenceService');
      const accessibleProjectIds = await intelligenceService.getAccessibleProjectIds(req.user, 'all', 'all');
      if (!accessibleProjectIds.includes(training.projectId)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to end this meeting.' });
      }
    }

    const now = new Date();

    const attendances = await JitsiAttendance.findAll({ where: { trainingId } });
    for (const att of attendances) {
      const openInterval = await JitsiInterval.findOne({
        where: { jitsiAttendanceId: att.id, leftAt: null }
      });
      if (openInterval) {
        const durationSec = Math.max(0, Math.round((now - new Date(openInterval.joinedAt)) / 1000));
        await openInterval.update({ leftAt: now, durationSeconds: durationSec });
      }

      const allIntervals = await JitsiInterval.findAll({ where: { jitsiAttendanceId: att.id } });
      const totalSeconds = allIntervals.reduce((sum, intv) => sum + (intv.durationSeconds || 0), 0);
      const totalMinutes = Math.round((totalSeconds / 60) * 10) / 10;
      const scheduledMins = att.scheduledDurationMinutes || 60;
      const attPct = Math.min(100, Math.round((totalMinutes / scheduledMins) * 100));

      await att.update({
        totalAttendedMinutes: totalMinutes,
        attendancePercentage: attPct,
        status: attPct >= 75 ? 'Completed' : 'Left Early',
        lastLeftAt: now
      });
    }

    const io = req.app.get('io');
    if (io) io.emit('jitsi_attendance_updated', { trainingId });

    res.json({ success: true, message: 'Meeting ended and attendance finalized.' });
  } catch (error) {
    console.error('POST /:id/end-meeting error:', error);
    res.status(500).json({ error: 'Failed to end meeting', details: error.message });
  }
});

module.exports = router;

