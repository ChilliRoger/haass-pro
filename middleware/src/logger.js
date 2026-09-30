/**
 * logger.js
 *
 * Structured JSON logger with Pino-compatible interface.
 * Implements log levels, child loggers with context / correlation ID,
 * and direct stream writes without console.log.
 *
 * Strictly plain ASCII output - no emojis.
 */

const LOG_LEVELS = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 100,
};

/**
 * Creates a structured logger instance.
 *
 * @param {object} [options={}]
 * @param {string} [options.level='info']
 * @param {Record<string, unknown>} [options.context={}]
 * @returns {object} Logger instance
 */
export function createLogger(options = {}) {
  const currentLevelStr = (options.level || process.env.LOG_LEVEL || 'info').toLowerCase();
  const currentLevelNum = LOG_LEVELS[currentLevelStr] ?? LOG_LEVELS.info;
  const baseContext = options.context || {};

  function log(levelStr, msg, data = {}) {
    const levelNum = LOG_LEVELS[levelStr] ?? LOG_LEVELS.info;
    if (levelNum < currentLevelNum || currentLevelNum >= LOG_LEVELS.silent) {
      return;
    }

    let message = msg;
    let extra = data;

    // Handle (object, string) calling pattern common in Pino
    if (typeof msg === 'object' && msg !== null && typeof data === 'string') {
      message = data;
      extra = msg;
    } else if (typeof msg === 'object' && msg !== null) {
      extra = msg;
      message = msg.msg || msg.message || '';
    }

    const record = {
      level: levelStr,
      time: new Date().toISOString(),
      msg: String(message || ''),
      ...baseContext,
      ...extra,
    };

    if (extra instanceof Error) {
      record.error = {
        name: extra.name,
        message: extra.message,
        stack: extra.stack,
      };
    } else if (extra.err instanceof Error) {
      record.error = {
        name: extra.err.name,
        message: extra.err.message,
        stack: extra.err.stack,
      };
      delete record.err;
    }

    const serialized = JSON.stringify(record) + '\n';
    if (levelNum >= LOG_LEVELS.error) {
      process.stderr.write(serialized);
    } else {
      process.stdout.write(serialized);
    }
  }

  return {
    debug(msg, data) {
      log('debug', msg, data);
    },
    info(msg, data) {
      log('info', msg, data);
    },
    warn(msg, data) {
      log('warn', msg, data);
    },
    error(msg, data) {
      log('error', msg, data);
    },
    child(additionalContext = {}) {
      return createLogger({
        level: currentLevelStr,
        context: { ...baseContext, ...additionalContext },
      });
    },
  };
}

export const logger = createLogger();
export default logger;
