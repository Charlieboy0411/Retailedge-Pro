const express = require('express');
const router = express.Router();
const Training = require('../models/Training');
const TrainingProgress = require('../models/TrainingProgress');
const Certificate = require('../models/Certificate');
const Project = require('../models/Project');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
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
      text: `Hi ${user.name},\n\nYou have been invited to a training meeting for project "${projectName}".\n\nDetails:\n- Topic: ${title}\n- Description: ${description || 'No description provided.'}\n- Date & Time: ${new Date(scheduledAt).toLocaleString()}\n- Join Link: ${url}\n\nPlease join the meeting on time.\n\nBest regards,\nLMS Training Team`,
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
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${new Date(scheduledAt).toLocaleString()}</td>
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
    } else if (!['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager'].includes(userRole)) {
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
      if (projectId) {
        if (!accessibleProjectIds.includes(projectId)) {
          return res.status(403).json({ error: 'Forbidden: You do not have permission for this project.' });
        }
        whereClause.projectId = projectId;
      } else {
        whereClause.projectId = { [Op.in]: accessibleProjectIds };
      }
    } else {
      // For Admins/PMs, support filter by project if query is passed
      const { projectId } = req.query;
      if (projectId) {
        if (String(projectId).includes(',')) {
          whereClause.projectId = { [Op.in]: String(projectId).split(',').map(id => id.trim()).filter(Boolean) };
        } else {
          whereClause.projectId = projectId;
        }
      }
    }

    const trainings = await Training.findAll({
      where: whereClause,
      include: [{ model: Project, attributes: ['id', 'name'] }],
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

// POST /api/trainings - Create new training material (Admin/Trainer/PM only)
router.post('/', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager']), upload.single('file'), async (req, res) => {
  try {
    const { title, description, type, url, duration, projectId, scheduledAt } = req.body;
    let finalUrl = url;

    if (req.file) {
      finalUrl = `/uploads/${req.file.filename}`;
    }

    if (!title || !finalUrl) {
      return res.status(400).json({ error: 'Title and URL/File are required' });
    }

    if (projectId && !['Admin', 'Super Admin'].includes(req.user.role)) {
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
    } else if (!projectId && req.user.role === 'T&D Manager') {
      return res.status(400).json({ error: 'Project is required for T&D Manager training material creation.' });
    }

    let formattedUrl = finalUrl.trim();
    if (formattedUrl && !req.file && !/^https?:\/\//i.test(formattedUrl) && !formattedUrl.startsWith('/uploads/')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newTraining = await Training.create({
      title,
      description,
      type: type || 'Video',
      url: formattedUrl,
      duration: duration || '10 mins',
      projectId: projectId || null,
      scheduledAt: scheduledAt || null
    });

    res.status(201).json(newTraining);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create training', details: error.message });
  }
});

// POST /api/trainings/:id/guest-join - Create a guest user and return token for a specific meeting
router.post('/:id/guest-join', async (req, res) => {
  try {
    const trainingId = req.params.id;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const training = await Training.findByPk(trainingId);
    if (!training) {
      return res.status(404).json({ error: 'Training material not found' });
    }

    const User = require('../models/User');
    const Role = require('../models/Role');
    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcrypt');

    const employeeRole = await Role.findOne({ where: { role_name: 'Employee' } });
    if (!employeeRole) {
      return res.status(500).json({ error: 'Employee role not found' });
    }

    const guestEmail = `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@guest.quizhive.com`;
    const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);

    const guestUser = await User.create({
      name: name.trim(),
      email: guestEmail,
      password: tempPassword,
      roleId: employeeRole.id,
      projectId: training.projectId || null,
      department: 'Guest Attendee'
    });

    // Create initial progress to track that they joined
    await TrainingProgress.create({
      userId: guestUser.id,
      trainingId: training.id,
      completed: false,
      timeSpent: 1
    });

    const token = jwt.sign(
      { id: guestUser.id, email: guestUser.email, role: 'Employee', projectId: guestUser.projectId },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    // Return the token and user so the frontend can log them in
    res.json({ token, user: guestUser });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process guest join', details: error.message });
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
router.put('/:id', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager']), upload.single('file'), async (req, res) => {
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

    const { title, description, type, url, duration, projectId, scheduledAt } = req.body;
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
    if (scheduledAt !== undefined) training.scheduledAt = scheduledAt || null;

    await training.save();
    res.json(training);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update training', details: error.message });
  }
});

// DELETE /api/trainings/:id - Delete a training material
router.delete('/:id', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager']), async (req, res) => {
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

    await training.destroy();
    res.json({ message: 'Training material deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete training', details: error.message });
  }
});

// POST /api/trainings/schedule-meeting - Schedule a training meeting & send simulated emails
router.post('/schedule-meeting', requireAuth, requireRole(['Admin', 'Super Admin', 'Program Manager', 'Trainer', 'T&D Manager']), async (req, res) => {
  try {
    const { title, description, projectId, scheduledAt, url, inviteeIds } = req.body;

    if (!title || !url || !scheduledAt) {
      return res.status(400).json({ error: 'Title, URL, and Date/Time are required' });
    }

    if (projectId && !['Admin', 'Super Admin'].includes(req.user.role)) {
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
    }

    let formattedUrl = url.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    // 1. Create the Training meeting
    const newMeeting = await Training.create({
      title,
      description,
      type: 'Meeting',
      url: formattedUrl,
      duration: '1 hour', // default duration
      projectId: projectId || null,
      scheduledAt: new Date(scheduledAt)
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

    // 4. Simulate sending emails by logging to backend console
    console.log('\n================================================================================');
    console.log(`✉️  SIMULATED EMAIL NOTIFICATIONS FOR MEETING: "${title}"`);
    console.log(`Project: ${projectName}`);
    console.log(`Scheduled At: ${new Date(scheduledAt).toLocaleString()}`);
    console.log(`Google Meet Link: ${url}`);
    console.log('================================================================================');
    
    for (const user of invitees) {
      console.log(`\nTo: ${user.name} <${user.email}>`);
      console.log(`Subject: Meeting Invitation: ${title} - ${projectName}`);
      console.log(`Body:\nHi ${user.name},\n\nYou have been invited to a training meeting for project "${projectName}".\n\nDetails:\n- Topic: ${title}\n- Description: ${description || 'No description provided.'}\n- Date & Time: ${new Date(scheduledAt).toLocaleString()}\n- Join Link: ${url}\n\nPlease join the meeting on time.\n\nBest regards,\nLMS Training Team`);
      console.log('--------------------------------------------------------------------------------');
      
      const defaultZone = getZoneFromCoords(null, null, user.location);

      // Auto-populate TrainingProgress for the invited users so they have it pending/incomplete in their training logs
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
      message: 'Meeting scheduled successfully and invitation emails sent (simulated).',
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

// POST /api/trainings/:id/jitsi-event - Handle join/leave/heartbeat events
router.post('/:id/jitsi-event', async (req, res) => {
  try {
    const trainingId = req.params.id;
    const {
      event, // 'join' | 'leave' | 'heartbeat'
      participantName,
      employeeId,
      userId,
      jitsiParticipantId,
      scheduledDurationMinutes = 60
    } = req.body;

    const training = await Training.findByPk(trainingId);
    if (!training) {
      return res.status(404).json({ error: 'Training not found' });
    }

    // Non-authoritative Observer Mode for Supervisor & Client:
    // Observer presence must NEVER create, alter, or inflate participant attendance records
    if (userId || ['Supervisor', 'Client'].includes(req.body.role)) {
      const User = require('../models/User');
      const Role = require('../models/Role');
      let userRole = req.body.role;
      if (!userRole && userId) {
        const u = await User.findByPk(userId, { include: [Role] });
        userRole = u?.Role?.role_name;
      }
      if (['Supervisor', 'Client'].includes(userRole)) {
        return res.json({
          message: `${userRole} observer presence recorded (non-authoritative; zero attendance mutation)`,
          observer: true,
          attendancePercentage: 0
        });
      }
    }

    let attendance = await JitsiAttendance.findOne({
      where: {
        trainingId,
        [require('sequelize').Op.or]: [
          ...(userId ? [{ userId }] : []),
          ...(employeeId ? [{ employeeId }] : []),
          { participantName: participantName || 'Guest' }
        ]
      }
    });

    const now = new Date();

    if (event === 'join') {
      if (!attendance) {
        attendance = await JitsiAttendance.create({
          trainingId,
          projectId: training.projectId,
          userId: userId || null,
          participantName: participantName || 'Guest Attendee',
          employeeId: employeeId || null,
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
        // Rejoin event
        const rejoins = (attendance.rejoinCount || 0) + 1;
        await attendance.update({
          status: 'Online',
          rejoinCount: rejoins,
          lastHeartbeatAt: now,
          ...(jitsiParticipantId ? { jitsiParticipantId } : {})
        });
      }

      // Create new open interval
      await JitsiInterval.create({
        jitsiAttendanceId: attendance.id,
        joinedAt: now
      });

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
router.post('/:id/end-meeting', requireAuth, requireRole(['Trainer', 'Admin', 'Super Admin', 'Program Manager']), async (req, res) => {
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

