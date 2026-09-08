#!/bin/bash
set -e

echo "============================================="
echo " 🚀 RETAIL EDGE PRO - LINUX EC2 DEPLOYMENT   "
echo "============================================="

# 1. Install dependencies
echo "📦 Installing root, backend, and frontend dependencies..."
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Build frontend for production
echo "🔨 Building frontend React bundle into frontend/dist..."
cd frontend && npm run build && cd ..

# 3. Test Database Connection
echo "🩺 Verifying database connectivity..."
node backend/db_health_check.js

# 4. Start or restart PM2 process
if command -v pm2 &> /dev/null; then
    echo "🔄 Starting/Reloading PM2 service..."
    pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs
    pm2 save
    echo "✅ PM2 process is running."
else
    echo "ℹ️ PM2 not found. You can start the server directly using: npm start"
fi

echo "============================================="
echo " ✅ DEPLOYMENT COMPLETE!                     "
echo " Backend & Frontend serving on port 5000     "
echo "============================================="
