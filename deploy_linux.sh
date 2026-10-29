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

# 4. Standardized PM2 process identity verification and startup
if command -v pm2 &> /dev/null; then
    echo "🔄 Verifying standardized PM2 process identity ('retailedge-pro')..."

    # Check currently running PM2 apps
    RUNNING_APPS=$(pm2 jlist 2>/dev/null || echo "[]")
    HAS_RETAILEDGE=$(node -e "try { const list = $RUNNING_APPS; console.log(list.some(a => a.name === 'retailedge-pro') ? 'yes' : 'no'); } catch(e) { console.log('no'); }")
    HAS_QUIZHIVE=$(node -e "try { const list = $RUNNING_APPS; console.log(list.some(a => a.name === 'quizhive-api') ? 'yes' : 'no'); } catch(e) { console.log('no'); }")

    INITIAL_PID=""
    if [ "$HAS_RETAILEDGE" = "yes" ]; then
        INITIAL_PID=$(pm2 pid retailedge-pro 2>/dev/null || echo "")
        echo "Found existing 'retailedge-pro' process (PID: $INITIAL_PID). Restarting via ecosystem.config.cjs..."
        pm2 restart ecosystem.config.cjs --update-env
    elif [ "$HAS_QUIZHIVE" = "yes" ]; then
        echo "CRITICAL: Ambiguous PM2 process identity detected! Legacy 'quizhive-api' is registered in PM2."
        echo "Halting deployment safely to avoid duplicate port 5000 binding."
        echo "Authorized operator intervention required: run 'bash scripts/migrate_pm2_safely.sh' to execute the safe, reversible migration sequence."
        exit 1
    else
        # Neither retailedge-pro nor quizhive-api registered in PM2
        # Verify port 5000 is not already occupied by an unmanaged process
        if curl -s -f http://127.0.0.1:5000/api/health >/dev/null 2>&1; then
            echo "CRITICAL: Port 5000 is already in use by an unrecognized process, but 'retailedge-pro' is not in PM2!"
            echo "Halting deployment to prevent process collision. Pre-deployment host inspection required."
            exit 1
        fi
        echo "Starting fresh PM2 process using ecosystem.config.cjs..."
        pm2 start ecosystem.config.cjs
    fi

    pm2 save

    # Verify newly started process
    NEW_PID=$(pm2 pid retailedge-pro 2>/dev/null || echo "")
    if [ -z "$NEW_PID" ] || [ "$NEW_PID" = "0" ]; then
        echo "CRITICAL: PM2 failed to report a valid PID for 'retailedge-pro'!"
        exit 1
    fi

    if [ -n "$INITIAL_PID" ] && [ "$NEW_PID" = "$INITIAL_PID" ]; then
        echo "CRITICAL: PM2 PID did not change after restart (PID remains $INITIAL_PID). Process restart unconfirmed."
        exit 1
    fi

    echo "✅ PM2 process 'retailedge-pro' running with verified PID $NEW_PID."

    # Validate health check
    echo "🩺 Validating local application health on port 5000..."
    HEALTH_OK=0
    for i in $(seq 1 15); do
        if curl -f -s http://127.0.0.1:5000/api/health > /dev/null 2>&1; then
            HEALTH_OK=1
            echo "Health check passed on attempt $i."
            break
        fi
        echo "Health check attempt $i failed. Retrying in 2s..."
        sleep 2
    done

    if [ "$HEALTH_OK" -ne 1 ]; then
        echo "CRITICAL: Health check failed after process startup!"
        exit 1
    fi
else
    echo "ℹ️ PM2 not found. You can start the server directly using: npm start"
fi

echo "============================================="
echo " ✅ DEPLOYMENT COMPLETE!                     "
echo " Backend & Frontend serving on port 5000     "
echo "============================================="
