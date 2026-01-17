// lib/logger.js
// Enterprise-grade Activity Logger for Fatebox Platform
// Provides structured logging with batching, retry logic, and async processing

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for write access
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// ============================================================================
// EVENT TYPES - Standardized event taxonomy
// ============================================================================

export const EventTypes = {
    // Project Events
    PROJECT_CREATED: 'project.created',
    PROJECT_UPDATED: 'project.updated',
    PROJECT_ACTIVATED: 'project.activated',
    PROJECT_DEACTIVATED: 'project.deactivated',
    PROJECT_LUCK_UPDATED: 'project.luck_updated',

    // Box Events
    BOX_PURCHASED: 'box.purchased',
    BOX_OPENED: 'box.opened',
    BOX_SETTLED: 'box.settled',
    BOX_EXPIRED: 'box.expired',

    // Treasury Events
    TREASURY_DEPOSITED: 'treasury.deposited',
    TREASURY_WITHDRAWN: 'treasury.withdrawn',
    TREASURY_FEE_COLLECTED: 'treasury.fee_collected',

    // Vault Events
    VAULT_FUNDED: 'vault.funded',
    LAUNCH_FEE_PAID: 'project.launch_fee_paid',

    // Withdrawal Events
    WITHDRAWAL_REQUESTED: 'withdrawal.requested',
    WITHDRAWAL_APPROVED: 'withdrawal.approved',
    WITHDRAWAL_COMPLETED: 'withdrawal.completed',
    WITHDRAWAL_FAILED: 'withdrawal.failed',

    // Admin Events
    ADMIN_CONFIG_UPDATED: 'admin.config_updated',
    ADMIN_PROJECT_VERIFIED: 'admin.project_verified',
    ADMIN_USER_BANNED: 'admin.user_banned',
    ADMIN_EMERGENCY_ACTION: 'admin.emergency_action',

    // Error Events
    ERROR_TRANSACTION_FAILED: 'error.transaction_failed',
    ERROR_RPC: 'error.rpc_error',
    ERROR_DATABASE: 'error.database_error',
    ERROR_VALIDATION: 'error.validation_error',

    // System Events
    SYSTEM_STARTUP: 'system.startup',
    SYSTEM_SHUTDOWN: 'system.shutdown',
    SYSTEM_HEALTH_CHECK: 'system.health_check',
    SYSTEM_MAINTENANCE: 'system.maintenance',
};

export const EventCategories = {
    PROJECT: 'project',
    BOX: 'box',
    TREASURY: 'treasury',
    VAULT: 'vault',
    WITHDRAWAL: 'withdrawal',
    ADMIN: 'admin',
    ERROR: 'error',
    SYSTEM: 'system',
};

export const Severity = {
    DEBUG: 'debug',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical',
};

export const ActorTypes = {
    USER: 'user',
    CREATOR: 'creator',
    ADMIN: 'admin',
    SYSTEM: 'system',
};

// ============================================================================
// ACTIVITY LOGGER CLASS
// ============================================================================

class ActivityLogger {
    constructor() {
        this.buffer = [];
        this.bufferSize = 10;      // Flush after 10 logs
        this.flushInterval = 5000; // Flush every 5 seconds
        this.isProcessing = false;
        this.retryQueue = [];
        this.maxRetries = 3;

        // Start periodic flush
        this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
    }

    /**
     * Get category from event type
     */
    getCategory(eventType) {
        const category = eventType.split('.')[0];
        return EventCategories[category.toUpperCase()] || 'system';
    }

    /**
     * Log an activity event
     * @param {Object} event - Event data
     * @returns {Promise<void>}
     */
    async log(event) {
        const logEntry = {
            // Event classification
            event_type: event.eventType,
            event_category: event.category || this.getCategory(event.eventType),
            severity: event.severity || Severity.INFO,

            // Actor
            actor_type: event.actorType || ActorTypes.SYSTEM,
            actor_wallet: event.actorWallet || null,
            actor_id: event.actorId || null,

            // Target/Subject
            project_id: event.projectId || null,
            project_subdomain: event.projectSubdomain || null,
            box_id: event.boxId || null,

            // Transaction
            transaction_signature: event.txSignature || null,
            transaction_status: event.txStatus || null,

            // Financial
            amount_lamports: event.amountLamports || null,
            amount_tokens: event.amountTokens || null,
            token_mint: event.tokenMint || null,

            // Context
            metadata: event.metadata || {},
            error_code: event.errorCode || null,
            error_message: event.errorMessage || null,
            request_id: event.requestId || null,
            ip_address: event.ipAddress || null,
            user_agent: event.userAgent || null,

            // Timestamp
            created_at: new Date().toISOString(),
        };

        // Add to buffer
        this.buffer.push(logEntry);

        // Flush if buffer is full
        if (this.buffer.length >= this.bufferSize) {
            await this.flush();
        }

        // For critical/error severity, also log immediately to console
        if (event.severity === Severity.ERROR || event.severity === Severity.CRITICAL) {
            console.error(`[${event.severity.toUpperCase()}] ${event.eventType}:`, {
                ...logEntry,
                metadata: JSON.stringify(logEntry.metadata),
            });
        }

        return logEntry;
    }

    /**
     * Flush buffered logs to database
     */
    async flush() {
        if (this.buffer.length === 0 || this.isProcessing) return;

        this.isProcessing = true;
        const logsToFlush = [...this.buffer];
        this.buffer = [];

        try {
            const { error } = await supabase
                .from('activity_logs')
                .insert(logsToFlush);

            if (error) {
                console.error('Failed to flush logs to database:', error);
                // Add failed logs to retry queue
                this.retryQueue.push(...logsToFlush.map(log => ({
                    log,
                    retries: 0,
                })));
            }
        } catch (error) {
            console.error('Exception flushing logs:', error);
            this.retryQueue.push(...logsToFlush.map(log => ({
                log,
                retries: 0,
            })));
        } finally {
            this.isProcessing = false;
        }

        // Process retry queue
        await this.processRetryQueue();
    }

    /**
     * Process failed logs in retry queue
     */
    async processRetryQueue() {
        if (this.retryQueue.length === 0) return;

        const toRetry = this.retryQueue.filter(item => item.retries < this.maxRetries);
        this.retryQueue = [];

        for (const item of toRetry) {
            try {
                const { error } = await supabase
                    .from('activity_logs')
                    .insert(item.log);

                if (error && item.retries < this.maxRetries - 1) {
                    this.retryQueue.push({
                        log: item.log,
                        retries: item.retries + 1,
                    });
                }
            } catch (error) {
                if (item.retries < this.maxRetries - 1) {
                    this.retryQueue.push({
                        log: item.log,
                        retries: item.retries + 1,
                    });
                }
            }
        }
    }

    /**
     * Log immediately without buffering (for critical events)
     */
    async logImmediate(event) {
        const logEntry = await this.log(event);
        await this.flush();
        return logEntry;
    }

    /**
     * Graceful shutdown - flush all pending logs
     */
    async shutdown() {
        clearInterval(this.flushTimer);
        await this.flush();

        // Wait for retry queue
        let attempts = 0;
        while (this.retryQueue.length > 0 && attempts < 5) {
            await this.processRetryQueue();
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // ========================================================================
    // CONVENIENCE METHODS - Pre-configured logging helpers
    // ========================================================================

    /**
     * Log project creation
     */
    async logProjectCreated(params) {
        return this.log({
            eventType: EventTypes.PROJECT_CREATED,
            severity: Severity.INFO,
            actorType: ActorTypes.CREATOR,
            actorWallet: params.creatorWallet,
            projectId: params.projectId,
            projectSubdomain: params.subdomain,
            txSignature: params.txSignature,
            metadata: {
                boxPrice: params.boxPrice,
                tokenMint: params.tokenMint,
                luckInterval: params.luckInterval,
            },
        });
    }

    /**
     * Log project updated
     */
    async logProjectUpdated(params) {
        return this.log({
            eventType: EventTypes.PROJECT_UPDATED,
            severity: Severity.INFO,
            actorType: ActorTypes.CREATOR,
            actorWallet: params.creatorWallet,
            projectId: params.projectId,
            projectSubdomain: params.subdomain,
            txSignature: params.txSignature,
            metadata: {
                changes: params.changes,
            },
        });
    }

    /**
     * Log luck interval update
     */
    async logLuckIntervalUpdated(params) {
        return this.log({
            eventType: EventTypes.PROJECT_LUCK_UPDATED,
            severity: Severity.INFO,
            actorType: ActorTypes.CREATOR,
            actorWallet: params.creatorWallet,
            projectId: params.projectId,
            projectSubdomain: params.subdomain,
            txSignature: params.txSignature,
            metadata: {
                oldInterval: params.oldInterval,
                newInterval: params.newInterval,
            },
        });
    }

    /**
     * Log box purchase
     */
    async logBoxPurchased(params) {
        return this.log({
            eventType: EventTypes.BOX_PURCHASED,
            severity: Severity.INFO,
            actorType: ActorTypes.USER,
            actorWallet: params.buyerWallet,
            projectId: params.projectId,
            projectSubdomain: params.subdomain,
            boxId: params.boxId,
            txSignature: params.txSignature,
            amountTokens: params.amount,
            tokenMint: params.tokenMint,
            metadata: {
                boxPrice: params.boxPrice,
            },
        });
    }

    /**
     * Log box opened (committed)
     */
    async logBoxOpened(params) {
        return this.log({
            eventType: EventTypes.BOX_OPENED,
            severity: Severity.INFO,
            actorType: ActorTypes.USER,
            actorWallet: params.userWallet,
            projectId: params.projectId,
            boxId: params.boxId,
            txSignature: params.txSignature,
            metadata: {
                luck: params.luck,
                holdTime: params.holdTime,
            },
        });
    }

    /**
     * Log box settled
     */
    async logBoxSettled(params) {
        return this.log({
            eventType: EventTypes.BOX_SETTLED,
            severity: Severity.INFO,
            actorType: ActorTypes.USER,
            actorWallet: params.userWallet,
            projectId: params.projectId,
            boxId: params.boxId,
            txSignature: params.txSignature,
            amountTokens: params.payout,
            metadata: {
                outcome: params.outcome,
                tier: params.tier,
                multiplier: params.multiplier,
                luck: params.luck,
            },
        });
    }

    /**
     * Log treasury deposit
     */
    async logTreasuryDeposit(params) {
        return this.log({
            eventType: EventTypes.TREASURY_DEPOSITED,
            severity: Severity.INFO,
            actorType: ActorTypes.CREATOR,
            actorWallet: params.creatorWallet,
            projectId: params.projectId,
            projectSubdomain: params.subdomain,
            txSignature: params.txSignature,
            amountTokens: params.amount,
            tokenMint: params.tokenMint,
        });
    }

    /**
     * Log treasury withdrawal
     */
    async logTreasuryWithdrawal(params) {
        return this.log({
            eventType: EventTypes.TREASURY_WITHDRAWN,
            severity: Severity.INFO,
            actorType: ActorTypes.CREATOR,
            actorWallet: params.creatorWallet,
            projectId: params.projectId,
            projectSubdomain: params.subdomain,
            txSignature: params.txSignature,
            amountTokens: params.amount,
            metadata: {
                fee: params.fee,
                netAmount: params.netAmount,
            },
        });
    }

    /**
     * Log vault funding (creator funding their project vault)
     */
    async logVaultFunded(params) {
        return this.log({
            eventType: EventTypes.VAULT_FUNDED,
            severity: Severity.INFO,
            actorType: ActorTypes.CREATOR,
            actorWallet: params.creatorWallet,
            projectId: params.projectId,
            projectSubdomain: params.subdomain,
            txSignature: params.txSignature,
            amountTokens: params.amount,
            tokenMint: params.tokenMint,
            metadata: {
                boxPrice: params.boxPrice,
                description: 'Creator funded project vault for payouts',
            },
        });
    }

    /**
     * Log project vault withdrawal (creator withdrawing from their project)
     */
    async logProjectWithdrawal(params) {
        return this.log({
            eventType: EventTypes.WITHDRAWAL_COMPLETED,
            severity: Severity.INFO,
            actorType: ActorTypes.CREATOR,
            actorWallet: params.creatorWallet,
            projectId: params.projectId,
            projectSubdomain: params.subdomain,
            txSignature: params.txSignature,
            amountTokens: params.amount,
            tokenMint: params.tokenMint,
            metadata: {
                withdrawalType: params.withdrawalType,
                vaultBalanceBefore: params.vaultBalanceBefore,
                vaultBalanceAfter: params.vaultBalanceAfter,
                reservedForBoxes: params.reservedForBoxes,
                unopenedBoxes: params.unopenedBoxes,
            },
        });
    }

    /**
     * Log launch fee payment (fee paid to platform treasury)
     */
    async logLaunchFeePaid(params) {
        return this.log({
            eventType: EventTypes.LAUNCH_FEE_PAID,
            severity: Severity.INFO,
            actorType: ActorTypes.CREATOR,
            actorWallet: params.creatorWallet,
            projectId: params.projectId,
            projectSubdomain: params.subdomain,
            txSignature: params.txSignature,
            amountTokens: params.amount,
            tokenMint: params.tokenMint,
            metadata: {
                description: 'Platform launch fee paid to treasury',
            },
        });
    }

    /**
     * Log admin config update
     */
    async logAdminConfigUpdate(params) {
        return this.logImmediate({
            eventType: EventTypes.ADMIN_CONFIG_UPDATED,
            severity: Severity.WARNING,
            actorType: ActorTypes.ADMIN,
            actorWallet: params.adminWallet,
            txSignature: params.txSignature,
            metadata: {
                configChanges: params.changes,
            },
        });
    }

    /**
     * Log transaction error
     */
    async logTransactionError(params) {
        return this.logImmediate({
            eventType: EventTypes.ERROR_TRANSACTION_FAILED,
            severity: Severity.ERROR,
            actorType: params.actorType || ActorTypes.SYSTEM,
            actorWallet: params.wallet,
            projectId: params.projectId,
            txSignature: params.txSignature,
            errorCode: params.errorCode,
            errorMessage: params.errorMessage,
            metadata: {
                instruction: params.instruction,
                accounts: params.accounts,
            },
        });
    }

    /**
     * Log RPC error
     */
    async logRpcError(params) {
        return this.logImmediate({
            eventType: EventTypes.ERROR_RPC,
            severity: Severity.ERROR,
            actorType: ActorTypes.SYSTEM,
            errorCode: params.errorCode,
            errorMessage: params.errorMessage,
            metadata: {
                rpcUrl: params.rpcUrl,
                method: params.method,
            },
        });
    }

    /**
     * Log validation error
     */
    async logValidationError(params) {
        return this.log({
            eventType: EventTypes.ERROR_VALIDATION,
            severity: Severity.WARNING,
            actorType: params.actorType || ActorTypes.USER,
            actorWallet: params.wallet,
            projectId: params.projectId,
            errorCode: params.errorCode,
            errorMessage: params.errorMessage,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            metadata: {
                field: params.field,
                value: params.value,
                expectedFormat: params.expectedFormat,
            },
        });
    }

    /**
     * Log database error
     */
    async logDatabaseError(params) {
        return this.logImmediate({
            eventType: EventTypes.ERROR_DATABASE,
            severity: Severity.ERROR,
            actorType: ActorTypes.SYSTEM,
            errorCode: params.errorCode,
            errorMessage: params.errorMessage,
            metadata: {
                table: params.table,
                operation: params.operation,
                query: params.query,
            },
        });
    }

    /**
     * Log system startup
     */
    async logSystemStartup(params = {}) {
        return this.logImmediate({
            eventType: EventTypes.SYSTEM_STARTUP,
            severity: Severity.INFO,
            actorType: ActorTypes.SYSTEM,
            metadata: {
                version: params.version,
                environment: process.env.NODE_ENV,
                network: params.network,
            },
        });
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const logger = new ActivityLogger();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, flushing logs...');
    await logger.shutdown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, flushing logs...');
    await logger.shutdown();
    process.exit(0);
});

export default logger;

// Named exports for convenience
export { ActivityLogger, logger };
