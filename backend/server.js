// server.js
// Main Express server for 3Eyes Lootbox Platform backend

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { verifyEnvironment, getPlatformConfig } from './lib/getNetworkConfig.js';
import logger from './lib/logger.js';

const app = express();
const PORT = process.env.PORT || 3333;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Trust proxy - needed for rate limiting behind Render/Vercel/etc.
// This tells Express to trust X-Forwarded-For headers from the proxy
app.set('trust proxy', 1);

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Helmet - adds security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for API server
    crossOriginEmbedderPolicy: false,
}));

// CORS - configured for wildcard subdomains
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
const platformDomain = process.env.PLATFORM_DOMAIN || 'degenbox.fun';

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        // In development, allow localhost
        if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
            return callback(null, true);
        }

        // Check explicit allowed origins
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Check wildcard subdomains for platform domain
        // Matches: https://catbox.degenbox.fun, https://www.degenbox.fun, https://degenbox.fun
        const domainPattern = new RegExp(`^https?://([a-z0-9-]+\\.)?${platformDomain.replace('.', '\\.')}$`, 'i');
        if (domainPattern.test(origin)) {
            return callback(null, true);
        }

        // Reject unknown origins in production
        if (!isDevelopment) {
            console.warn(`CORS blocked origin: ${origin}`);
            return callback(new Error('Not allowed by CORS'), false);
        }

        // Allow in development
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Wallet-Address', 'X-Request-ID'],
}));

// Check if rate limiting should be disabled (for stress testing)
const disableRateLimit = process.env.DISABLE_RATE_LIMIT === 'true';

// Rate limiting - general API
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 10000 : 100, // 10k in dev for stress testing, 100 in prod
    skip: () => disableRateLimit,
    message: {
        success: false,
        error: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting - stricter for admin endpoints
const adminLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDevelopment ? 1000 : 20, // 1k in dev, 20 in prod
    skip: () => disableRateLimit,
    message: {
        success: false,
        error: 'Too many admin requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting - transaction building (expensive operations)
const transactionLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: isDevelopment ? 1000 : 30, // 1k/min in dev for stress testing, 30 in prod
    skip: () => disableRateLimit,
    message: {
        success: false,
        error: 'Too many transaction requests, please slow down',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// JSON parsing
app.use(express.json({ limit: '1mb' }));

// =============================================================================
// REQUEST LOGGING (conditional for production)
// =============================================================================

app.use((req, res, next) => {
    if (isDevelopment) {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    }
    // Add request ID for tracking
    req.requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
    });
});

// =============================================================================
// PUBLIC CONFIG ENDPOINT
// =============================================================================

/**
 * GET /api/config
 * Public endpoint for frontend to fetch platform configuration
 * Returns on-chain config as source of truth, with database fallback
 */
app.get('/api/config', async (req, res) => {
    try {
        const config = await getPlatformConfig();

        // Return frontend-friendly format
        res.json({
            success: true,
            config: {
                // Network info
                network: config.network,
                programId: config.programId,

                // Platform status
                paused: config.paused,
                maintenanceMode: config.maintenanceMode,

                // Luck settings (from on-chain)
                baseLuck: config.baseLuck,
                maxLuck: config.maxLuck,
                luckIntervalSeconds: config.luckTimeInterval,

                // Payout multipliers (from on-chain)
                payoutMultipliers: config.payoutMultipliers,

                // Tier probabilities (from on-chain)
                tierProbabilities: config.tierProbabilities,

                // Platform commission (from on-chain)
                platformCommissionBps: config.platformCommissionBps,
                platformCommissionPercent: config.platformCommissionPercent,

                // Admin wallet (from on-chain or database)
                adminWallet: config.adminWallet,

                // Metadata
                source: config.source,
            },
        });
    } catch (error) {
        console.error('Error fetching config:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch platform configuration',
        });
    }
});

// =============================================================================
// API ROUTES
// =============================================================================

import projectRoutes from './routes/projects.js';
import vaultRoutes from './routes/vault.js';
import programRoutes from './routes/program.js';
import adminRoutes from './routes/admin.js';
import logsRoutes from './routes/logs.js';

app.use('/api/projects', projectRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/program', transactionLimiter, programRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/logs', adminLimiter, logsRoutes);

// =============================================================================
// ERROR HANDLERS
// =============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
});

// Global error handler - sanitizes error messages for production
app.use((err, req, res, next) => {
    // Log full error server-side
    console.error('Server error:', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        error: err.message,
        stack: isDevelopment ? err.stack : undefined,
    });

    // Log to activity logger for monitoring
    logger.log({
        eventType: 'error.server',
        eventCategory: 'error',
        severity: 'error',
        actorType: 'system',
        metadata: {
            requestId: req.requestId,
            method: req.method,
            path: req.path,
            error: err.message,
        },
    }).catch(() => {}); // Don't let logging failure break the response

    // Return sanitized error to client
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: isDevelopment ? err.message : 'Internal server error',
        requestId: req.requestId,
    });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer() {
    try {
        // Verify environment matches network configuration
        await verifyEnvironment();

        app.listen(PORT, async () => {
            console.log(`\n3Eyes Backend API running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
            if (isDevelopment) {
                console.log(`Health check: http://localhost:${PORT}/health\n`);
            }

            // Log system startup
            await logger.logSystemStartup({
                version: '1.0.0',
                network: process.env.SOLANA_NETWORK || 'devnet',
            });
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();

// Export for testing
export { app, adminLimiter, transactionLimiter };
