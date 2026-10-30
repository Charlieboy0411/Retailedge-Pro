#!/bin/bash
set -e

# ============================================================================
# RETAILEDGE PRO — CANONICAL PRODUCTION DEPLOYMENT & ROLLBACK RUNNER
# Version-controlled execution script for both automated CI and manual release
# ============================================================================

TARGET_SHA="${1:-$TARGET_SHA}"
ALLOW_ROLLBACK="${2:-${ALLOW_ROLLBACK:-false}}"
REQUIRE_SSL="${REQUIRE_SSL:-true}"
ALLOW_HTTP_ONLY="${ALLOW_HTTP_ONLY:-false}"
PRODUCTION_DOMAIN="${PRODUCTION_DOMAIN:-${DOMAIN_NAME:-retailedgepro.in}}"
CUSTOM_CA_BUNDLE="${CUSTOM_CA_BUNDLE:-${SSL_CA_BUNDLE:-}}"

APP_DIR="${APP_DIR:-$(pwd)}"
STATE_DIR="${STATE_DIR:-/var/www/retailedge_state}"
RELEASES_DIR="${RELEASES_DIR:-/var/www/retailedge_releases}"
LIVE_FE_PATH="${LIVE_FE_PATH:-/var/www/retailedge}"
NGINX_CONF_DIR="${NGINX_CONF_DIR:-/etc/nginx/conf.d}"
NGINX_SITES_DIR="${NGINX_SITES_DIR:-/etc/nginx/sites-enabled}"
NGINX_BACKUP_DIR="${STATE_DIR}/nginx_backup"
CANDIDATE_CONF_PATH="${CANDIDATE_CONF_PATH:-/tmp/retailedge_nginx_candidate.conf}"

HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:5000/api/health}"
APP_HEALTH_URL="${APP_HEALTH_URL:-http://127.0.0.1/api/health}"
APP_HTTPS_HEALTH_URL="${APP_HTTPS_HEALTH_URL:-https://${PRODUCTION_DOMAIN}/api/health}"

# Strict HTTPS certificate & hostname verification options (explicit CA and SNI validation required)
CURL_SSL_ARGS=()
if [ -n "$CUSTOM_CA_BUNDLE" ]; then
  if [ ! -f "$CUSTOM_CA_BUNDLE" ]; then
    echo "CRITICAL: Configured CUSTOM_CA_BUNDLE '$CUSTOM_CA_BUNDLE' not found!" >&2
    exit 1
  fi
  CURL_SSL_ARGS+=("--cacert" "$CUSTOM_CA_BUNDLE")
fi

EXTRACTED_HOST=$(echo "$APP_HTTPS_HEALTH_URL" | sed -e 's|^https://||' -e 's|/.*$||' -e 's|:.*$||')
RESOLVE_HOST="${PRODUCTION_DOMAIN:-$EXTRACTED_HOST}"
if [ -n "$RESOLVE_HOST" ] && [ "$RESOLVE_HOST" != "127.0.0.1" ] && [ "$RESOLVE_HOST" != "localhost" ]; then
  CURL_SSL_ARGS+=("--resolve" "${RESOLVE_HOST}:443:127.0.0.1")
fi

if [ -z "$TARGET_SHA" ]; then
  echo "CRITICAL: TARGET_SHA is required as first argument or environment variable!" >&2
  exit 1
fi

echo "======================================================================"
echo "🚀 RETAIL EDGE PRO — PRODUCTION DEPLOYMENT FOR COMMIT: $TARGET_SHA"
echo "======================================================================"

# ─── REUSABLE ROLLBACK & RECOVERY PROCEDURE ───
perform_rollback() {
  local REASON="$1"
  local RECOVERY_STATUS="SUCCESS"
  local FAILED_RECOVERY_STEPS=()

  echo ""
  echo "======================================================================"
  echo "🚨 INITIATING CONTROLLED ROLLBACK: $REASON"
  echo "======================================================================"

  # 1. Roll back frontend symlink
  echo "--- Step 1: Restoring Frontend Target ---"
  local ROLLBACK_FE="$PREV_FE_TARGET"
  if [ -z "$ROLLBACK_FE" ] && [ -f "${STATE_DIR}/previous_frontend_target" ]; then
    ROLLBACK_FE=$(cat "${STATE_DIR}/previous_frontend_target" 2>/dev/null || echo "")
  fi

  if [ -n "$ROLLBACK_FE" ] && [ -d "$ROLLBACK_FE" ] && [ -s "$ROLLBACK_FE/index.html" ]; then
    echo "Restoring frontend symlink to: $ROLLBACK_FE"
    if sudo ln -sfn "$ROLLBACK_FE" "${LIVE_FE_PATH}_tmp" && sudo mv -T "${LIVE_FE_PATH}_tmp" "${LIVE_FE_PATH}"; then
      echo "✅ Frontend symlink successfully restored to $ROLLBACK_FE."
    else
      echo "❌ ERROR: Failed to switch symlink back to $ROLLBACK_FE!" >&2
      FAILED_RECOVERY_STEPS+=("frontend_symlink_switch")
      RECOVERY_STATUS="FAILED"
    fi
  else
    echo "❌ ERROR: No valid previous frontend target available for restoration (target: '$ROLLBACK_FE')!" >&2
    FAILED_RECOVERY_STEPS+=("frontend_no_valid_target")
    RECOVERY_STATUS="FAILED"
  fi

  # 2. Roll back Nginx configuration
  echo "--- Step 2: Restoring Nginx Configuration ---"
  if [ -d "${NGINX_BACKUP_DIR}" ]; then
    echo "Restoring Nginx configuration from backup..."
    local NGINX_RESTORE_OK=1
    if [ -d "${NGINX_BACKUP_DIR}/conf.d" ]; then
      sudo cp -a "${NGINX_BACKUP_DIR}/conf.d/." "${NGINX_CONF_DIR}/" 2>/dev/null || NGINX_RESTORE_OK=0
    fi
    if [ -d "${NGINX_BACKUP_DIR}/sites-enabled" ]; then
      sudo cp -a "${NGINX_BACKUP_DIR}/sites-enabled/." "${NGINX_SITES_DIR}/" 2>/dev/null || NGINX_RESTORE_OK=0
    fi

    if [ "$NGINX_RESTORE_OK" -eq 1 ] && sudo nginx -t; then
      if sudo systemctl reload nginx || sudo systemctl restart nginx; then
        echo "✅ Nginx configuration restored and reloaded successfully."
      else
        echo "❌ ERROR: Failed to reload/restart Nginx after restoring configuration!" >&2
        FAILED_RECOVERY_STEPS+=("nginx_reload_after_restore")
        RECOVERY_STATUS="FAILED"
      fi
    else
      echo "❌ ERROR: Restored Nginx configuration failed validation (nginx -t)!" >&2
      FAILED_RECOVERY_STEPS+=("nginx_config_validation_after_restore")
      RECOVERY_STATUS="FAILED"
    fi
  else
    echo "ℹ️ No Nginx backup directory found; skipping Nginx rollback."
  fi

  # 3. Roll back backend repository and PM2 process
  echo "--- Step 3: Restoring Backend Service ---"
  local ROLLBACK_SHA="$PREV_SHA"
  if [ -z "$ROLLBACK_SHA" ] && [ -f "${STATE_DIR}/previous_backend_sha" ]; then
    ROLLBACK_SHA=$(cat "${STATE_DIR}/previous_backend_sha" 2>/dev/null || echo "")
  fi

  if [ -n "$ROLLBACK_SHA" ]; then
    echo "Checking out previous backend SHA: $ROLLBACK_SHA"
    cd "${APP_DIR}"
    if git checkout "$ROLLBACK_SHA" && (cd backend && npm ci); then
      echo "Restarting backend PM2 process..."
      if pm2 restart ecosystem.config.cjs --update-env; then
        echo "✅ PM2 process restarted with previous backend commit."
      else
        echo "❌ ERROR: PM2 restart failed during backend rollback!" >&2
        FAILED_RECOVERY_STEPS+=("backend_pm2_restart")
        RECOVERY_STATUS="FAILED"
      fi
    else
      echo "❌ ERROR: Git checkout or dependency installation failed during backend rollback!" >&2
      FAILED_RECOVERY_STEPS+=("backend_git_checkout")
      RECOVERY_STATUS="FAILED"
    fi
  else
    echo "❌ ERROR: No previous backend SHA available for rollback!" >&2
    FAILED_RECOVERY_STEPS+=("backend_no_previous_sha")
    RECOVERY_STATUS="FAILED"
  fi

  # 4. Verify post-rollback health checks
  echo "--- Step 4: Verifying System Health Post-Rollback ---"
  local HEALTH_RESTORED=0
  for attempt in $(seq 1 10); do
    if curl -f -s "${HEALTH_URL}" > /dev/null 2>&1; then
      HEALTH_RESTORED=1
      break
    fi
    sleep 2
  done

  local APP_ENDPOINT_RESTORED=0
  if curl -f -s "${APP_HEALTH_URL}" > /dev/null 2>&1; then
    APP_ENDPOINT_RESTORED=1
  fi

  if [ "$REQUIRE_SSL" = "true" ]; then
    if curl -f -s "${CURL_SSL_ARGS[@]}" "${APP_HTTPS_HEALTH_URL}" > /dev/null 2>&1; then
      echo "✅ Rollback verified HTTPS endpoint on port 443 with valid TLS certificate for ${RESOLVE_HOST}."
    else
      echo "❌ ERROR: Rollback HTTPS health check failed TLS or endpoint verification for ${RESOLVE_HOST}!" >&2
      APP_ENDPOINT_RESTORED=0
    fi
  fi

  if [ "$HEALTH_RESTORED" -ne 1 ]; then
    echo "❌ ERROR: Backend health check failed post-rollback!" >&2
    FAILED_RECOVERY_STEPS+=("backend_health_check_post_rollback")
    RECOVERY_STATUS="FAILED"
  fi

  if [ "$APP_ENDPOINT_RESTORED" -ne 1 ]; then
    echo "❌ ERROR: Application endpoint health check via Nginx failed post-rollback!" >&2
    FAILED_RECOVERY_STEPS+=("app_endpoint_health_check_post_rollback")
    RECOVERY_STATUS="FAILED"
  fi

  echo "======================================================================"
  if [ "$RECOVERY_STATUS" = "SUCCESS" ]; then
    echo "✅ ROLLBACK COMPLETED & VERIFIED: System successfully restored to previous working release."
    echo "   Previous Backend SHA: $ROLLBACK_SHA"
    echo "   Previous Frontend Target: $ROLLBACK_FE"
  else
    echo "🚨 CRITICAL: ROLLBACK INCOMPLETE OR FAILED! Manual intervention required."
    echo "   Failed recovery steps: ${FAILED_RECOVERY_STEPS[*]}"
  fi
  echo "======================================================================"

  # ALWAYS return failed deployment status
  exit 1
}

# ─── STAGE 1: STATE PRESERVATION & EXACT COMMIT CHECKOUT ───
echo "=== Stage 1: Preserving state and checking out target commit ==="
sudo mkdir -p "${STATE_DIR}" "${RELEASES_DIR}"
sudo chmod 755 "${STATE_DIR}" "${RELEASES_DIR}"

cd "${APP_DIR}"
PREV_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
echo "$PREV_SHA" | sudo tee "${STATE_DIR}/previous_backend_sha" > /dev/null
echo "Previous backend SHA recorded: $PREV_SHA"

git checkout -- .
git fetch origin main
git checkout "$TARGET_SHA"
CURRENT_CHECKOUT=$(git rev-parse HEAD)
if [ "$CURRENT_CHECKOUT" != "$TARGET_SHA" ]; then
  echo "CRITICAL: Git checkout failed to match target SHA $TARGET_SHA (current: $CURRENT_CHECKOUT)" >&2
  exit 1
fi
echo "Target commit $TARGET_SHA successfully checked out."

# ─── STAGE 2: BACKEND DEPENDENCIES & MIGRATION GATE ───
echo "=== Stage 2: Installing backend dependencies & running migration gate ==="
cd "${APP_DIR}/backend"
npm ci

echo "Executing database migration gate & schema verification..."
node scripts/deploy_migration_gate.js

# ─── STAGE 3: FRONTEND BUILD & ARTIFACT VALIDATION BEFORE LIVE MUTATION ───
echo "=== Stage 3: Building and validating frontend artifacts ==="
cd "${APP_DIR}/frontend"
npm ci
npm run build

echo "Validating frontend build output..."
if [ ! -s dist/index.html ]; then
  echo "CRITICAL: dist/index.html is missing or empty! Halting deployment before live changes." >&2
  exit 1
fi

if [ ! -d dist/assets ] || [ -z "$(ls -A dist/assets 2>/dev/null)" ]; then
  echo "CRITICAL: dist/assets directory is missing or empty! Halting deployment before live changes." >&2
  exit 1
fi

# Stage into immutable versioned release directory
RELEASE_DIR="${RELEASES_DIR}/${TARGET_SHA}"
echo "Staging frontend release to: $RELEASE_DIR"
sudo rm -rf "$RELEASE_DIR"
sudo mkdir -p "$RELEASE_DIR"
sudo cp -r dist/* "$RELEASE_DIR/"
sudo chown -R www-data:www-data "$RELEASE_DIR" 2>/dev/null || true
sudo chmod -R 755 "$RELEASE_DIR"

if [ ! -s "$RELEASE_DIR/index.html" ]; then
  echo "CRITICAL: Failed to populate $RELEASE_DIR/index.html! Halting deployment." >&2
  exit 1
fi
echo "Frontend release staged and validated at $RELEASE_DIR."

# ─── STAGE 4: STANDARDIZED PM2 RESTART & BOUNDED HEALTH CHECK VERIFICATION ───
echo "=== Stage 4: Verifying PM2 process identity and restarting service ==="
cd "${APP_DIR}"

RUNNING_APPS=$(pm2 jlist 2>/dev/null || echo "[]")
HAS_RETAILEDGE=$(node -e "try { const list = $RUNNING_APPS; console.log(list.some(a => a.name === 'retailedge-pro') ? 'yes' : 'no'); } catch(e) { console.log('no'); }")
HAS_QUIZHIVE=$(node -e "try { const list = $RUNNING_APPS; console.log(list.some(a => a.name === 'quizhive-api') ? 'yes' : 'no'); } catch(e) { console.log('no'); }")

INITIAL_PID=""
if [ "$HAS_RETAILEDGE" = "yes" ]; then
  INITIAL_PID=$(pm2 pid retailedge-pro 2>/dev/null || echo "")
  echo "Confirmed PM2 process 'retailedge-pro' registered (PID: $INITIAL_PID). Restarting via ecosystem.config.cjs..."
  if ! pm2 restart ecosystem.config.cjs --update-env; then
    echo "CRITICAL: Failed to restart PM2 process 'retailedge-pro'!" >&2
    perform_rollback "pm2_restart_failed"
  fi
elif [ "$HAS_QUIZHIVE" = "yes" ]; then
  echo "CRITICAL: Ambiguous PM2 process identity detected! 'quizhive-api' exists on production host instead of standardized 'retailedge-pro'." >&2
  echo "Automated rollout halted safely to avoid duplicate port 5000 binding." >&2
  echo "Authorized operator intervention required: run 'bash scripts/migrate_pm2_safely.sh' to execute the safe, reversible migration sequence." >&2
  exit 1
else
  # Verify port 5000 is not already occupied by an unrecognized process
  if curl -s -f "${HEALTH_URL}" >/dev/null 2>&1; then
    echo "CRITICAL: Port 5000 is already in use by an unrecognized process, but 'retailedge-pro' is not in PM2!" >&2
    echo "Automated rollout halted to prevent process collision. Authorized pre-deployment inspection required." >&2
    exit 1
  fi
  echo "Starting fresh PM2 process using ecosystem.config.cjs..."
  if ! pm2 start ecosystem.config.cjs; then
    echo "CRITICAL: Failed to start PM2 process 'retailedge-pro'!" >&2
    perform_rollback "pm2_start_failed"
  fi
fi

pm2 save

NEW_PID=$(pm2 pid retailedge-pro 2>/dev/null || echo "")
if [ -z "$NEW_PID" ] || [ "$NEW_PID" = "0" ]; then
  echo "CRITICAL: PM2 failed to report a valid PID for 'retailedge-pro'!" >&2
  perform_rollback "pm2_pid_missing"
fi

if [ -n "$INITIAL_PID" ] && [ "$NEW_PID" = "$INITIAL_PID" ]; then
  echo "CRITICAL: PM2 PID did not change after restart (still $INITIAL_PID)! Process restart unconfirmed." >&2
  perform_rollback "pm2_process_stale"
fi

echo "PM2 process 'retailedge-pro' active with verified PID: $NEW_PID"

echo "Polling backend health check (up to 30s)..."
HEALTH_OK=0
for i in $(seq 1 15); do
  if curl -f -s "${HEALTH_URL}" > /dev/null 2>&1; then
    HEALTH_OK=1
    echo "Backend health check passed on attempt $i."
    break
  fi
  echo "Health check attempt $i failed. Retrying in 2s..."
  sleep 2
done

if [ "$HEALTH_OK" -ne 1 ]; then
  echo "CRITICAL: Backend health check failed after restart!" >&2
  perform_rollback "backend_health_check_failed"
fi

# ─── STAGE 5: FRONTEND MIGRATION & ATOMIC SYMLINK SWITCH ───
echo "=== Stage 5: Managing frontend release target & atomic switch ==="
cd "${APP_DIR}"

PREV_FE_TARGET=""
LEGACY_BACKUP_DIR="${RELEASES_DIR}/legacy_baseline"

# Helper to test symlink in Linux/mock
is_symlink() {
  [ -L "$1" ] || [ -f "$1.__symlink" ]
}

if is_symlink "${LIVE_FE_PATH}"; then
  PREV_FE_TARGET=$(readlink -f "${LIVE_FE_PATH}" 2>/dev/null || readlink "${LIVE_FE_PATH}" 2>/dev/null || echo "")
  if [ -z "$PREV_FE_TARGET" ] || [ ! -d "$PREV_FE_TARGET" ] || [ ! -s "$PREV_FE_TARGET/index.html" ]; then
    echo "WARNING: Existing symlink ${LIVE_FE_PATH} points to invalid target '$PREV_FE_TARGET'!"
    if [ -f "${STATE_DIR}/previous_frontend_target" ]; then
      RECORDED_TARGET=$(cat "${STATE_DIR}/previous_frontend_target" 2>/dev/null || echo "")
      if [ -d "$RECORDED_TARGET" ] && [ -s "$RECORDED_TARGET/index.html" ]; then
        echo "Recovered valid previous target from state file: $RECORDED_TARGET"
        PREV_FE_TARGET="$RECORDED_TARGET"
      fi
    fi
  fi
elif [ -d "${LIVE_FE_PATH}" ]; then
  echo "Detected physical directory at ${LIVE_FE_PATH}. Initiating safe baseline migration..."
  if [ ! -s "${LIVE_FE_PATH}/index.html" ]; then
    echo "CRITICAL: Physical directory ${LIVE_FE_PATH} is missing index.html or empty! Cannot safely migrate unknown layout without inspection." >&2
    exit 1
  fi

  sudo mkdir -p "$LEGACY_BACKUP_DIR"
  sudo cp -r "${LIVE_FE_PATH}/"* "$LEGACY_BACKUP_DIR/"

  if [ ! -s "$LEGACY_BACKUP_DIR/index.html" ]; then
    echo "CRITICAL: Legacy baseline copy failed verification! $LEGACY_BACKUP_DIR/index.html is missing or empty. Live directory untouched." >&2
    exit 1
  fi

  ORIG_COUNT=$(find "${LIVE_FE_PATH}" -type f | wc -l)
  BACKUP_COUNT=$(find "$LEGACY_BACKUP_DIR" -type f | wc -l)
  if [ "$BACKUP_COUNT" -lt "$ORIG_COUNT" ]; then
    echo "CRITICAL: Integrity check failed: copied $BACKUP_COUNT files vs original $ORIG_COUNT files! Live directory untouched." >&2
    exit 1
  fi

  echo "Legacy frontend verified and backed up at $LEGACY_BACKUP_DIR."
  PREV_FE_TARGET="$LEGACY_BACKUP_DIR"
  sudo rm -rf "${LIVE_FE_PATH}"
else
  echo "Notice: No existing ${LIVE_FE_PATH} found. First deployment on fresh host."
  PREV_FE_TARGET=""
fi

echo "$PREV_FE_TARGET" | sudo tee "${STATE_DIR}/previous_frontend_target" > /dev/null
echo "Previous frontend target recorded: '$PREV_FE_TARGET'"

echo "Switching frontend symlink atomically to $RELEASE_DIR..."
sudo ln -sfn "$RELEASE_DIR" "${LIVE_FE_PATH}_tmp"
sudo mv -T "${LIVE_FE_PATH}_tmp" "${LIVE_FE_PATH}"

# ─── STAGE 6: NGINX CONFIGURATION BACKUP, VALIDATION & RELOAD ───
echo "=== Stage 6: Configuring Nginx safely with backup & validation ==="
sudo rm -rf "${NGINX_BACKUP_DIR}"
sudo mkdir -p "${NGINX_BACKUP_DIR}/conf.d" "${NGINX_BACKUP_DIR}/sites-enabled"
if [ -d "${NGINX_CONF_DIR}" ]; then
  sudo cp -a "${NGINX_CONF_DIR}/." "${NGINX_BACKUP_DIR}/conf.d/" 2>/dev/null || true
fi
if [ -d "${NGINX_SITES_DIR}" ]; then
  sudo cp -a "${NGINX_SITES_DIR}/." "${NGINX_BACKUP_DIR}/sites-enabled/" 2>/dev/null || true
fi

cd "${APP_DIR}/backend"
NGINX_CONFIG_ARGS=("--out" "${CANDIDATE_CONF_PATH}")
if [ "$REQUIRE_SSL" = "true" ]; then
  NGINX_CONFIG_ARGS+=("--require-ssl")
fi
if [ "$ALLOW_HTTP_ONLY" = "true" ]; then
  NGINX_CONFIG_ARGS+=("--allow-http-only")
fi
if [ -d "${NGINX_CONF_DIR}" ]; then
  NGINX_CONFIG_ARGS+=("--existing-conf-dir" "${NGINX_CONF_DIR}")
fi
if [ -d "${NGINX_SITES_DIR}" ]; then
  NGINX_CONFIG_ARGS+=("--existing-conf-dir" "${NGINX_SITES_DIR}")
fi

if ! python3 configure_nginx.py "${NGINX_CONFIG_ARGS[@]}"; then
  echo "CRITICAL: configure_nginx.py failed to generate candidate configuration (SSL gate or validation failed)!" >&2
  perform_rollback "nginx_config_generation_failed"
fi

sudo cp "${CANDIDATE_CONF_PATH}" "${NGINX_CONF_DIR}/quizhive.conf"

echo "Testing Nginx candidate configuration (nginx -t)..."
if ! sudo nginx -t; then
  echo "CRITICAL: Nginx test failed after applying candidate configuration! Restoring configuration..." >&2
  if [ -d "${NGINX_BACKUP_DIR}/conf.d" ]; then
    sudo cp -a "${NGINX_BACKUP_DIR}/conf.d/." "${NGINX_CONF_DIR}/" 2>/dev/null || true
  fi
  if [ -d "${NGINX_BACKUP_DIR}/sites-enabled" ]; then
    sudo cp -a "${NGINX_BACKUP_DIR}/sites-enabled/." "${NGINX_SITES_DIR}/" 2>/dev/null || true
  fi
  sudo nginx -t || true
  perform_rollback "nginx_config_test_failed"
fi

echo "Reloading Nginx service..."
if ! (sudo systemctl reload nginx || sudo systemctl restart nginx); then
  echo "CRITICAL: Both Nginx reload and restart failed!" >&2
  perform_rollback "nginx_reload_and_restart_failed"
fi

# ─── STAGE 7: FINAL END-TO-END HEALTH VERIFICATION ───
echo "=== Stage 7: Final post-deployment verification ==="
HEALTH_FINAL=0
for i in $(seq 1 10); do
  if curl -f -s "${HEALTH_URL}" > /dev/null 2>&1; then
    HEALTH_FINAL=1
    break
  fi
  sleep 2
done

APP_ENDPOINT_OK=0
if curl -f -s "${APP_HEALTH_URL}" > /dev/null 2>&1; then
  APP_ENDPOINT_OK=1
fi

APP_HTTPS_OK=1
if [ "$REQUIRE_SSL" = "true" ]; then
  APP_HTTPS_OK=0
  echo "Verifying HTTPS application health on port 443 with strict TLS certificate & hostname validation for ${RESOLVE_HOST}..."
  if curl -f -s "${CURL_SSL_ARGS[@]}" "${APP_HTTPS_HEALTH_URL}" > /dev/null 2>&1; then
    APP_HTTPS_OK=1
    echo "✅ Verified HTTPS application health on port 443 with valid TLS certificate for ${RESOLVE_HOST}."
  else
    echo "❌ CRITICAL: HTTPS application health check failed on port 443 (TLS certificate validation, hostname mismatch, or endpoint error)!" >&2
  fi
fi

if [ "$HEALTH_FINAL" -ne 1 ] || [ "$APP_ENDPOINT_OK" -ne 1 ] || [ "$APP_HTTPS_OK" -ne 1 ]; then
  echo "CRITICAL: Post-deployment final health check failed (backend: $HEALTH_FINAL, app HTTP: $APP_ENDPOINT_OK, app HTTPS: $APP_HTTPS_OK)!" >&2
  perform_rollback "final_health_check_failed"
fi

echo "$TARGET_SHA" | sudo tee "${STATE_DIR}/current_backend_sha" > /dev/null
echo "$RELEASE_DIR" | sudo tee "${STATE_DIR}/current_frontend_target" > /dev/null

# ─── STAGE 8: RELEASE RETENTION & SAFE PRUNING ───
echo "=== Stage 8: Release retention & safe pruning ==="
cd "${RELEASES_DIR}"

PROTECTED_TARGETS=()
if is_symlink "${LIVE_FE_PATH}"; then
  ACTIVE_REAL=$(readlink -f "${LIVE_FE_PATH}" 2>/dev/null || readlink "${LIVE_FE_PATH}" 2>/dev/null || echo "")
  if [ -n "$ACTIVE_REAL" ]; then
    PROTECTED_TARGETS+=("$(basename "$ACTIVE_REAL")")
  fi
fi

if [ -f "${STATE_DIR}/previous_frontend_target" ]; then
  PREV_STATE_TARGET=$(cat "${STATE_DIR}/previous_frontend_target" 2>/dev/null || echo "")
  if [ -n "$PREV_STATE_TARGET" ]; then
    PROTECTED_TARGETS+=("$(basename "$PREV_STATE_TARGET")")
  fi
fi

if [ -f "${STATE_DIR}/current_frontend_target" ]; then
  CURR_STATE_TARGET=$(cat "${STATE_DIR}/current_frontend_target" 2>/dev/null || echo "")
  if [ -n "$CURR_STATE_TARGET" ]; then
    PROTECTED_TARGETS+=("$(basename "$CURR_STATE_TARGET")")
  fi
fi

if [ -d "${RELEASES_DIR}/legacy_baseline" ]; then
  PROTECTED_TARGETS+=("legacy_baseline")
fi

PROTECTED_TARGETS+=("${TARGET_SHA}")
echo "Protected release targets: ${PROTECTED_TARGETS[*]}"

ALL_RELEASES=()
while IFS= read -r dir; do
  [ -n "$dir" ] && ALL_RELEASES+=("$(basename "$dir")")
done < <(ls -1td */ 2>/dev/null || true)

if [ ${#ALL_RELEASES[@]} -eq 0 ]; then
  echo "No release directories found. Skipping pruning."
else
  RETAIN_COUNT=5
  PRUNE_CANDIDATES=()

  for idx in "${!ALL_RELEASES[@]}"; do
    rel="${ALL_RELEASES[$idx]}"
    if [ "$idx" -lt "$RETAIN_COUNT" ]; then
      continue
    fi

    IS_PROTECTED=0
    for prot in "${PROTECTED_TARGETS[@]}"; do
      if [ "$rel" = "$prot" ]; then
        IS_PROTECTED=1
        break
      fi
    done

    if [ "$IS_PROTECTED" -eq 1 ]; then
      echo "Preserving protected release: $rel"
    else
      PRUNE_CANDIDATES+=("$rel")
    fi
  done

  if [ ${#PRUNE_CANDIDATES[@]} -gt 0 ]; then
    echo "Pruning ${#PRUNE_CANDIDATES[@]} older unprotected release(s): ${PRUNE_CANDIDATES[*]}"
    for prune_rel in "${PRUNE_CANDIDATES[@]}"; do
      if [ -d "$prune_rel" ]; then
        sudo rm -rf "$prune_rel"
      fi
    done
    echo "Release pruning completed."
  else
    echo "All existing releases are within retention limit ($RETAIN_COUNT) or protected. No releases pruned."
  fi
fi

echo "======================================================================"
echo "✅ PRODUCTION DEPLOYMENT SUCCESSFULLY COMPLETED & VERIFIED: $TARGET_SHA"
echo "======================================================================"
exit 0
