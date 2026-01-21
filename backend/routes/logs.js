// routes/logs.js
// API routes for activity logs - Admin dashboard logging endpoints
// Enterprise-grade implementation with pagination, filtering, and aggregation

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import logger, { EventTypes, EventCategories, Severity } from '../lib/logger.js';

const router = express.Router();

// Initialize Supabase client with service role for full access
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// ============================================================================
// MIDDLEWARE - Verify super admin access
// Checks if wallet matches admin_wallet in super_admin_config
// ============================================================================

async function requireSuperAdmin(req, res, next) {
    try {
        const wallet = req.headers['x-wallet-address'];
        if (!wallet) {
            return res.status(401).json({
                success: false,
                error: 'Missing wallet address header',
            });
        }

        // Verify super admin status by checking against super_admin_config.admin_wallet
        const { data, error } = await supabase
            .from('super_admin_config')
            .select('admin_wallet')
            .eq('id', 1)
            .single();

        if (error || !data) {
            console.error('Failed to fetch admin config:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to verify admin status',
            });
        }

        // Check if the requesting wallet matches the admin wallet
        if (data.admin_wallet !== wallet) {
            return res.status(403).json({
                success: false,
                error: 'Access denied: Super admin required',
            });
        }

        req.adminWallet = wallet;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
        });
    }
}

// ============================================================================
// GET /api/logs - Fetch activity logs with filtering and pagination
// ============================================================================

router.get('/', requireSuperAdmin, async (req, res) => {
    try {
        const {
            // Pagination
            page = 1,
            limit = 50,

            // Filters
            eventType,
            category,
            severity,
            projectId,
            projectSubdomain,
            actorWallet,
            actorType,
            txSignature,

            // Date range
            startDate,
            endDate,

            // Search
            search,

            // Sorting
            sortBy = 'created_at',
            sortOrder = 'desc',
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build query
        let query = supabase
            .from('activity_logs')
            .select('*', { count: 'exact' });

        // Apply filters
        if (eventType) {
            query = query.eq('event_type', eventType);
        }

        if (category) {
            query = query.eq('event_category', category);
        }

        if (severity) {
            // Support comma-separated severities
            const severities = severity.split(',');
            query = query.in('severity', severities);
        }

        if (projectId) {
            query = query.eq('project_id', parseInt(projectId));
        }

        if (projectSubdomain) {
            query = query.ilike('project_subdomain', `%${projectSubdomain}%`);
        }

        if (actorWallet) {
            query = query.eq('actor_wallet', actorWallet);
        }

        if (actorType) {
            query = query.eq('actor_type', actorType);
        }

        if (txSignature) {
            query = query.eq('transaction_signature', txSignature);
        }

        if (startDate) {
            query = query.gte('created_at', startDate);
        }

        if (endDate) {
            query = query.lte('created_at', endDate);
        }

        // Text search in error_message - sanitize input to prevent injection
        if (search) {
            // Escape special PostgREST characters
            const sanitizedSearch = search
                .replace(/[%_\\]/g, '\\$&')  // Escape SQL wildcards
                .replace(/['"]/g, '')         // Remove quotes
                .substring(0, 100);           // Limit length
            query = query.ilike('error_message', `%${sanitizedSearch}%`);
        }

        // Apply sorting - whitelist allowed columns to prevent injection
        const ALLOWED_SORT_COLUMNS = ['created_at', 'severity', 'event_type', 'event_category', 'actor_wallet'];
        const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'created_at';
        const ascending = sortOrder.toLowerCase() === 'asc';
        query = query.order(safeSortBy, { ascending });

        // Apply pagination
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching logs:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch logs',
                details: error.message,
            });
        }

        res.json({
            success: true,
            data: {
                logs: data,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / parseInt(limit)),
                },
            },
        });

    } catch (error) {
        console.error('Exception fetching logs:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

// ============================================================================
// GET /api/logs/stats - Get log statistics and aggregates
// ============================================================================

router.get('/stats', requireSuperAdmin, async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000).toISOString();

        // Get counts by severity
        const { data: severityCounts, error: severityError } = await supabase
            .from('activity_logs')
            .select('severity')
            .gte('created_at', since);

        if (severityError) {
            throw severityError;
        }

        const severityStats = {
            debug: 0,
            info: 0,
            warning: 0,
            error: 0,
            critical: 0,
        };
        severityCounts?.forEach(log => {
            if (severityStats[log.severity] !== undefined) {
                severityStats[log.severity]++;
            }
        });

        // Get counts by category
        const { data: categoryCounts, error: categoryError } = await supabase
            .from('activity_logs')
            .select('event_category')
            .gte('created_at', since);

        if (categoryError) {
            throw categoryError;
        }

        const categoryStats = {};
        categoryCounts?.forEach(log => {
            categoryStats[log.event_category] = (categoryStats[log.event_category] || 0) + 1;
        });

        // Get recent errors
        const { data: recentErrors, error: errorsError } = await supabase
            .from('activity_logs')
            .select('*')
            .in('severity', ['error', 'critical'])
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(10);

        if (errorsError) {
            throw errorsError;
        }

        // Get top projects by activity
        const { data: projectActivity, error: projectError } = await supabase
            .from('activity_logs')
            .select('project_subdomain')
            .not('project_subdomain', 'is', null)
            .gte('created_at', since);

        if (projectError) {
            throw projectError;
        }

        const projectStats = {};
        projectActivity?.forEach(log => {
            projectStats[log.project_subdomain] = (projectStats[log.project_subdomain] || 0) + 1;
        });

        // Sort and take top 10 projects
        const topProjects = Object.entries(projectStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([subdomain, count]) => ({ subdomain, count }));

        // Total log count for the period
        const totalLogs = severityCounts?.length || 0;

        res.json({
            success: true,
            data: {
                period: {
                    hours: parseInt(hours),
                    since,
                },
                totalLogs,
                severity: severityStats,
                categories: categoryStats,
                topProjects,
                recentErrors,
            },
        });

    } catch (error) {
        console.error('Exception fetching log stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch log statistics',
        });
    }
});

// ============================================================================
// GET /api/logs/event-types - Get available event types for filtering
// ============================================================================

router.get('/event-types', requireSuperAdmin, async (req, res) => {
    res.json({
        success: true,
        data: {
            eventTypes: EventTypes,
            categories: EventCategories,
            severities: Severity,
        },
    });
});

// ============================================================================
// GET /api/logs/project/:projectId - Get logs for a specific project
// ============================================================================

router.get('/project/:projectId', requireSuperAdmin, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { data, error, count } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact' })
            .eq('project_id', parseInt(projectId))
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: {
                logs: data,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / parseInt(limit)),
                },
            },
        });

    } catch (error) {
        console.error('Exception fetching project logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project logs',
        });
    }
});

// ============================================================================
// GET /api/logs/wallet/:wallet - Get logs for a specific wallet
// ============================================================================

router.get('/wallet/:wallet', requireSuperAdmin, async (req, res) => {
    try {
        const { wallet } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { data, error, count } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact' })
            .eq('actor_wallet', wallet)
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: {
                logs: data,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / parseInt(limit)),
                },
            },
        });

    } catch (error) {
        console.error('Exception fetching wallet logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch wallet logs',
        });
    }
});

// ============================================================================
// GET /api/logs/tx/:signature - Get logs for a specific transaction
// ============================================================================

router.get('/tx/:signature', requireSuperAdmin, async (req, res) => {
    try {
        const { signature } = req.params;

        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('transaction_signature', signature)
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: {
                logs: data,
            },
        });

    } catch (error) {
        console.error('Exception fetching transaction logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction logs',
        });
    }
});

// ============================================================================
// POST /api/logs - Manually log an event (for testing/admin use)
// ============================================================================

router.post('/', requireSuperAdmin, async (req, res) => {
    try {
        const { eventType, severity, message, metadata } = req.body;

        if (!eventType) {
            return res.status(400).json({
                success: false,
                error: 'eventType is required',
            });
        }

        const logEntry = await logger.logImmediate({
            eventType,
            severity: severity || Severity.INFO,
            actorType: 'admin',
            actorWallet: req.adminWallet,
            errorMessage: message,
            metadata: metadata || {},
        });

        res.json({
            success: true,
            data: logEntry,
        });

    } catch (error) {
        console.error('Exception creating log:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create log entry',
        });
    }
});

// ============================================================================
// DELETE /api/logs/archive - Archive old logs (admin maintenance)
// ============================================================================

router.delete('/archive', requireSuperAdmin, async (req, res) => {
    try {
        const { daysToKeep = 30 } = req.body;

        // Call the archive function
        const { data, error } = await supabase.rpc('archive_old_activity_logs', {
            days_to_keep: parseInt(daysToKeep),
        });

        if (error) {
            throw error;
        }

        // Log the archive action
        await logger.logImmediate({
            eventType: EventTypes.SYSTEM_MAINTENANCE,
            severity: Severity.WARNING,
            actorType: 'admin',
            actorWallet: req.adminWallet,
            metadata: {
                action: 'archive_logs',
                daysToKeep,
                archivedCount: data,
            },
        });

        res.json({
            success: true,
            data: {
                archivedCount: data,
                message: `Archived ${data} logs older than ${daysToKeep} days`,
            },
        });

    } catch (error) {
        console.error('Exception archiving logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to archive logs',
        });
    }
});

export default router;
