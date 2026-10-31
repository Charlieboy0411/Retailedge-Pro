const path = require('path');

module.exports = {
  apps: [
    {
      name: 'retailedge-pro',
      script: path.join(__dirname, 'backend', 'server.js'),
      cwd: path.join(__dirname, 'backend'),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
