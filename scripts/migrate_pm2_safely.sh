#!/bin/bash
set -euo pipefail

# ============================================================================
# RETAILEDGE PRO — SAFE & CONTROLLED PM2 PROCESS MIGRATION
# Version-controlled runbook script to migrate from legacy 'quizhive-api' to 'retailedge-pro'
# ============================================================================

APP_DIR="${APP_DIR:-$(pwd)}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:5000/api/health}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/pm2_migration_$(date +%Y%m%d_%H%M%S)}"

echo "======================================================================"
echo "🔄 RETAIL EDGE PRO — CONTROLLED PM2 PROCESS MIGRATION"
echo "======================================================================"

# ─── PHASE 1: PRE-MIGRATION STATE AUDIT & EVIDENCE CAPTURE ───
echo "=== Phase 1: Pre-migration state verification & evidence capture ==="
if ! command -v pm2 &> /dev/null; then
  echo "CRITICAL: pm2 binary not found in PATH! Halting migration." >&2
  exit 1
fi

RUNNING_APPS=$(pm2 jlist 2>/dev/null || echo "[]")
HAS_QUIZHIVE=$(node -e "try { const list = $RUNNING_APPS; console.log(list.some(a => a.name === 'quizhive-api') ? 'yes' : 'no'); } catch(e) { console.log('no'); }")
HAS_RETAILEDGE=$(node -e "try { const list = $RUNNING_APPS; console.log(list.some(a => a.name === 'retailedge-pro') ? 'yes' : 'no'); } catch(e) { console.log('no'); }")

if [ "$HAS_QUIZHIVE" != "yes" ]; then
  if [ "$HAS_RETAILEDGE" = "yes" ]; then
    echo "✅ Standardized process 'retailedge-pro' is already registered in PM2. No migration required."
    exit 0
  else
    echo "CRITICAL: Neither 'quizhive-api' nor 'retailedge-pro' found in PM2! Pre-migration layout unknown. Halting." >&2
    exit 1
  fi
fi

if [ "$HAS_RETAILEDGE" = "yes" ]; then
  echo "CRITICAL: Both 'quizhive-api' and 'retailedge-pro' exist in PM2! Ambiguous state. Halting to avoid duplicate port 5000 binding." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
echo "Capturing legacy process definition to $BACKUP_DIR..."

pm2 describe quizhive-api > "${BACKUP_DIR}/quizhive_describe.txt" 2>&1 || {
  echo "CRITICAL: Failed to describe 'quizhive-api'! Halting before any changes." >&2
  exit 1
}

echo "$RUNNING_APPS" > "${BACKUP_DIR}/pm2_process_dump.json"

# ─── PHASE 2: VERIFY RECOVERABILITY OF LEGACY PROCESS DEFINITION ───
echo "=== Phase 2: Verifying recoverability of legacy process definition ==="
LEGACY_CHECK_JSON=$(node -e "
try {
  const list = JSON.parse(process.argv[1]);
  const proc = list.find(a => a.name === 'quizhive-api');
  if (!proc) { console.log(JSON.stringify({ ok: false, reason: 'missing_process_definition' })); process.exit(0); }
  const env = proc.pm2_env || {};
  const execPath = env.pm_exec_path;
  const cwd = env.pm_cwd;
  if (!execPath || !cwd) { console.log(JSON.stringify({ ok: false, reason: 'incomplete_environment_configuration' })); process.exit(0); }
  console.log(JSON.stringify({ ok: true, execPath, cwd, pid: proc.pid }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, reason: e.message }));
}
" "$RUNNING_APPS")

IS_RECOVERABLE=$(node -e "try { const r = JSON.parse(process.argv[1]); console.log(r.ok ? 'yes' : 'no'); } catch(e) { console.log('no'); }" "$LEGACY_CHECK_JSON")
if [ "$IS_RECOVERABLE" != "yes" ]; then
  REASON=$(node -e "try { const r = JSON.parse(process.argv[1]); console.log(r.reason || 'unknown'); } catch(e) { console.log('unknown'); }" "$LEGACY_CHECK_JSON")
  echo "CRITICAL: Legacy process 'quizhive-api' is NOT safely recoverable (reason: $REASON)!" >&2
  echo "Halting migration immediately without stopping or modifying 'quizhive-api'." >&2
  echo "Operator-approved recovery plan required." >&2
  exit 1
fi

LEGACY_PID=$(node -e "try { const r = JSON.parse(process.argv[1]); console.log(r.pid || ''); } catch(e) { console.log(''); }" "$LEGACY_CHECK_JSON")
echo "Legacy process 'quizhive-api' verified recoverable (PID: $LEGACY_PID)."

# ─── PHASE 3: CONTROLLED STOP & SOCKET VERIFICATION ───
echo "=== Phase 3: Stopping legacy process & verifying socket release ==="
echo "Stopping 'quizhive-api' (retaining definition in PM2 memory)..."
if ! pm2 stop quizhive-api; then
  echo "CRITICAL: Failed to stop 'quizhive-api'! Process remains untouched. Halting." >&2
  exit 1
fi

PORT_FREED=0
for i in $(seq 1 10); do
  if ! curl -s -f "${HEALTH_URL}" >/dev/null 2>&1; then
    PORT_FREED=1
    break
  fi
  sleep 1
done

if [ "$PORT_FREED" -ne 1 ]; then
  echo "CRITICAL: Port 5000 is still responding after stopping 'quizhive-api'!" >&2
  echo "Unexpected background worker or foreign process detected. Aborting and restoring legacy process..." >&2
  pm2 restart quizhive-api || true
  exit 1
fi
echo "Port 5000 verified free."

# ─── PHASE 4: START STANDARDIZED PROCESS VIA ECOSYSTEM ───
echo "=== Phase 4: Starting standardized process 'retailedge-pro' ==="
cd "${APP_DIR}"
if ! pm2 start ecosystem.config.cjs; then
  echo "CRITICAL: Failed to start 'retailedge-pro' via ecosystem.config.cjs!" >&2
  echo "Initiating immediate recovery of legacy process..." >&2
  pm2 stop retailedge-pro 2>/dev/null || true
  pm2 delete retailedge-pro 2>/dev/null || true
  if pm2 restart quizhive-api; then
    echo "Legacy process 'quizhive-api' successfully restored."
  else
    echo "EMERGENCY: Failed to restart legacy process! Manual operator intervention required." >&2
  fi
  exit 1
fi

# ─── PHASE 5: VERIFY NEW PROCESS & BOUNDED HEALTH CHECK ───
echo "=== Phase 5: Verifying new process PID and health check ==="
NEW_PID=$(pm2 pid retailedge-pro 2>/dev/null || echo "")
if [ -z "$NEW_PID" ] || [ "$NEW_PID" = "0" ]; then
  echo "CRITICAL: 'retailedge-pro' started but PM2 failed to report a valid PID!" >&2
  echo "Initiating recovery of legacy process..." >&2
  pm2 stop retailedge-pro 2>/dev/null || true
  pm2 delete retailedge-pro 2>/dev/null || true
  if pm2 restart quizhive-api; then
    echo "Legacy process 'quizhive-api' successfully restored."
  else
    echo "EMERGENCY: Failed to restart legacy process! Manual operator intervention required." >&2
  fi
  exit 1
fi
echo "Confirmed 'retailedge-pro' running with PID $NEW_PID."

HEALTH_PASSED=0
for i in $(seq 1 15); do
  if curl -s -f "${HEALTH_URL}" >/dev/null 2>&1; then
    HEALTH_PASSED=1
    echo "Health check passed on attempt $i."
    break
  fi
  sleep 2
done

if [ "$HEALTH_PASSED" -ne 1 ]; then
  echo "CRITICAL: 'retailedge-pro' failed health check on port 5000!" >&2
  echo "Initiating recovery of legacy process..." >&2
  pm2 stop retailedge-pro 2>/dev/null || true
  pm2 delete retailedge-pro 2>/dev/null || true
  if pm2 restart quizhive-api; then
    echo "Legacy process 'quizhive-api' successfully restored."
  else
    echo "EMERGENCY: Failed to restart legacy process! Manual operator intervention required." >&2
  fi
  exit 1
fi

# ─── PHASE 6: CLEANUP & PERSISTENCE ───
echo "=== Phase 6: Finalizing migration and saving PM2 state ==="
pm2 delete quizhive-api
pm2 save

echo "======================================================================"
echo "✅ PM2 MIGRATION COMPLETED SUCCESSFULLY: 'retailedge-pro' is now active"
echo "======================================================================"
exit 0
