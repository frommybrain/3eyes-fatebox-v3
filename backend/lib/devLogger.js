// lib/devLogger.js
// Development-only logging utility
// Only logs in development environment, silent in production

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Development logger - logs only in development mode
 * Drop-in replacement for console.log with optional prefixes
 */
const devLog = {
    /**
     * Standard log (like console.log)
     */
    log: (...args) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    /**
     * Info log with prefix
     */
    info: (...args) => {
        if (isDevelopment) {
            console.log('[INFO]', ...args);
        }
    },

    /**
     * Debug log with timestamp
     */
    debug: (...args) => {
        if (isDevelopment) {
            console.log(`[DEBUG ${new Date().toISOString()}]`, ...args);
        }
    },

    /**
     * Success log (green checkmark style)
     */
    success: (...args) => {
        if (isDevelopment) {
            console.log('[SUCCESS]', ...args);
        }
    },

    /**
     * Warning log - always logs (important for both dev and prod)
     */
    warn: (...args) => {
        console.warn('[WARN]', ...args);
    },

    /**
     * Error log - always logs (important for both dev and prod)
     */
    error: (...args) => {
        console.error('[ERROR]', ...args);
    },

    /**
     * Transaction-specific logging
     */
    tx: (message, data = {}) => {
        if (isDevelopment) {
            console.log('[TX]', message, JSON.stringify(data, null, 2));
        }
    },

    /**
     * API request logging
     */
    api: (method, path, data = null) => {
        if (isDevelopment) {
            if (data) {
                console.log(`[API] ${method} ${path}`, data);
            } else {
                console.log(`[API] ${method} ${path}`);
            }
        }
    },

    /**
     * Database operation logging
     */
    db: (operation, table, data = null) => {
        if (isDevelopment) {
            if (data) {
                console.log(`[DB] ${operation} ${table}`, data);
            } else {
                console.log(`[DB] ${operation} ${table}`);
            }
        }
    },

    /**
     * Check if development mode is active
     */
    isDev: () => isDevelopment,

    /**
     * Force log regardless of environment (for critical startup messages)
     */
    force: (...args) => {
        console.log(...args);
    },
};

export default devLog;
export { devLog };
