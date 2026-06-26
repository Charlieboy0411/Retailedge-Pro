const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const Client = require('../models/Client');
const Project = require('../models/Project');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'client_logos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// GET /api/clients
router.get('/', requireAuth, async (req, res) => {
  try {
    const clients = await Client.findAll({
      order: [['name', 'ASC']]
    });

    // Count active projects for each client
    const clientsWithProjectCounts = await Promise.all(clients.map(async (client) => {
      const activeProjectsCount = await Project.count({
        where: { clientId: client.id, status: 'Active' }
      });
      const plainClient = client.get({ plain: true });
      plainClient.activeProjectsCount = activeProjectsCount;
      return plainClient;
    }));

    res.json(clientsWithProjectCounts);
  } catch (error) {
    console.error('Fetch Clients Error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// POST /api/clients
router.post('/', requireAuth, upload.single('logo'), async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only administrators can create clients' });
    }

    const clientData = req.body;
    
    if (req.file) {
      clientData.client_logo = `/uploads/client_logos/${req.file.filename}`;
    }

    if (!clientData.name || !clientData.client_code) {
      return res.status(400).json({ error: 'Client Name and Code are required' });
    }

    // Check if client code exists
    const existing = await Client.findOne({ where: { client_code: clientData.client_code } });
    if (existing) {
      return res.status(400).json({ error: 'Client Code already exists' });
    }

    const client = await Client.create(clientData);
    res.status(201).json(client);
  } catch (error) {
    console.error('Create Client Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create client' });
  }
});

// PUT /api/clients/:id
router.put('/:id', requireAuth, upload.single('logo'), async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only administrators can modify clients' });
    }

    const client = await Client.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const clientData = req.body;
    
    if (req.file) {
      clientData.client_logo = `/uploads/client_logos/${req.file.filename}`;
      // Optional: Delete old logo file to save space
    }

    if (clientData.client_code && clientData.client_code !== client.client_code) {
      const existing = await Client.findOne({ where: { client_code: clientData.client_code } });
      if (existing) {
        return res.status(400).json({ error: 'Another client with this Code already exists' });
      }
    }

    await client.update(clientData);
    res.json(client);
  } catch (error) {
    console.error('Update Client Error:', error);
    res.status(500).json({ error: error.message || 'Failed to update client' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Only administrators can delete clients' });
    }

    const client = await Client.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const activeProjects = await Project.count({ where: { clientId: client.id, status: 'Active' } });
    if (activeProjects > 0) {
      return res.status(400).json({ error: `Cannot delete client because they have ${activeProjects} active project(s).` });
    }

    await client.destroy();
    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete Client Error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

module.exports = router;
