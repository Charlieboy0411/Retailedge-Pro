/**
 * logger.js — Structured logger for QuizHive backend.
 *
 * Outputs JSON lines with consistent fields for every event:
 *   { ts, level, module, room, session, message, ...extra }
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('QuizEngine', roomCode, sessionId, 'Participant joined', { name });
 *   logger.error('QuizEngine', roomCode, sessionId, 'DB error', error);
 */

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const MIN_LEVEL   = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

function buildEntry(level, module, room, session, message, extra = {}) {
  return {
    ts:      new Date().toISOString(),
    level,
    module:  module  || 'App',
    room:    room    || null,
    session: session || null,
    message,
    ...extra,
  };
}

const logger = {
  debug(module, room, session, message, extra = {}) {
    if (MIN_LEVEL > LOG_LEVELS.DEBUG) return;
    console.debug(JSON.stringify(buildEntry('DEBUG', module, room, session, message, extra)));
  },

  info(module, room, session, message, extra = {}) {
    if (MIN_LEVEL > LOG_LEVELS.INFO) return;
    console.log(JSON.stringify(buildEntry('INFO', module, room, session, message, extra)));
  },

  warn(module, room, session, message, extra = {}) {
    if (MIN_LEVEL > LOG_LEVELS.WARN) return;
    console.warn(JSON.stringify(buildEntry('WARN', module, room, session, message, extra)));
  },

  /**
   * @param {string}     module
   * @param {string|null} room
   * @param {string|null} session
   * @param {string}     message
   * @param {Error|null} [error]
   */
  error(module, room, session, message, error) {
    const extra = {};
    if (error instanceof Error) {
      extra.errorMessage = error.message;
      extra.stack        = error.stack;
    } else if (error !== undefined) {
      extra.errorDetails = String(error);
    }
    console.error(JSON.stringify(buildEntry('ERROR', module, room, session, message, extra)));
  },
};

module.exports = logger;
