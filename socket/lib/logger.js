'use strict';

/**
 * One JSON object per line on stdout (errors on stderr). Callers pass plain objects and
 * must never include a token: the logger has no way to tell one apart from other text.
 *
 * Levels follow SOCKETCLUSTER_LOG_LEVEL: 0 = silent, 1 = errors, 2 = errors + info/warnings
 * (default), 3 = everything including debug.
 */
function createLogger({ level = 2, stdout = process.stdout, stderr = process.stderr, now = () => new Date() } = {}) {
    function write(stream, severity, record) {
        let line;
        try {
            line = JSON.stringify({ ts: now().toISOString(), level: severity, ...record });
        } catch (error) {
            line = JSON.stringify({ ts: now().toISOString(), level: severity, event: record && record.event, message: 'unserializable log record' });
        }
        stream.write(`${line}\n`);
    }

    return {
        level,
        error(record) {
            if (level >= 1) {
                write(stderr, 'error', record);
            }
        },
        warn(record) {
            if (level >= 2) {
                write(stdout, 'warn', record);
            }
        },
        info(record) {
            if (level >= 2) {
                write(stdout, 'info', record);
            }
        },
        debug(record) {
            if (level >= 3) {
                write(stdout, 'debug', record);
            }
        },
    };
}

/**
 * Reduces an error to name/message/code for logging. Stack traces are only included at
 * debug level by the caller if needed.
 */
function describeError(error) {
    if (!error || typeof error !== 'object') {
        return { message: String(error) };
    }
    const out = { name: error.name, message: error.message };
    if (error.code !== undefined) {
        out.code = error.code;
    }
    return out;
}

module.exports = { createLogger, describeError };
