// lib/validation.js
// Input validation schemas using Zod

import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';

// =============================================================================
// CUSTOM VALIDATORS
// =============================================================================

/**
 * Validate a Solana public key
 */
const solanaPublicKey = z.string().refine(
    (value) => {
        try {
            new PublicKey(value);
            return true;
        } catch {
            return false;
        }
    },
    { message: 'Invalid Solana public key' }
);

/**
 * Validate a subdomain (lowercase alphanumeric with hyphens)
 */
const subdomain = z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(50, 'Subdomain must be at most 50 characters')
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Subdomain must be lowercase alphanumeric with hyphens, cannot start or end with hyphen');

/**
 * Validate a positive integer
 */
const positiveInt = z.number().int().positive();

/**
 * Validate a non-negative integer
 */
const nonNegativeInt = z.number().int().nonnegative();

// =============================================================================
// PROJECT SCHEMAS
// =============================================================================

export const CreateProjectSchema = z.object({
    project_name: z.string()
        .min(3, 'Project name must be at least 3 characters')
        .max(100, 'Project name must be at most 100 characters'),
    subdomain: subdomain,
    owner_wallet: solanaPublicKey,
    payment_token_mint: solanaPublicKey,
    payment_token_symbol: z.string().min(1).max(10),
    payment_token_decimals: z.number().int().min(0).max(18),
    box_price: z.union([z.string(), z.number()])
        .transform(v => BigInt(v))
        .refine(v => v > 0n, 'Box price must be positive'),
    luck_interval_seconds: z.number().int().nonnegative().optional().default(0),
});

export const UpdateProjectSchema = z.object({
    projectId: z.union([z.string(), z.number()]).transform(v => parseInt(String(v))),
    ownerWallet: solanaPublicKey,
    active: z.boolean().optional(),
    boxPrice: z.union([z.string(), z.number()])
        .transform(v => BigInt(v))
        .refine(v => v > 0n, 'Box price must be positive')
        .optional(),
    luckIntervalSeconds: z.number().int().nonnegative().optional(),
});

// =============================================================================
// BOX SCHEMAS
// =============================================================================

export const CreateBoxSchema = z.object({
    projectId: z.union([z.string(), z.number()]).transform(v => parseInt(String(v))),
    buyerWallet: solanaPublicKey,
    quantity: z.number().int().min(1).max(10).optional().default(1),
});

export const CommitBoxSchema = z.object({
    projectId: z.union([z.string(), z.number()]).transform(v => parseInt(String(v))),
    boxId: z.union([z.string(), z.number()]).transform(v => parseInt(String(v))),
    ownerWallet: solanaPublicKey,
});

export const RevealBoxSchema = z.object({
    projectId: z.union([z.string(), z.number()]).transform(v => parseInt(String(v))),
    boxId: z.union([z.string(), z.number()]).transform(v => parseInt(String(v))),
    ownerWallet: solanaPublicKey,
    randomnessKeypair: z.string().optional(), // Base64 encoded keypair
});

export const SettleBoxSchema = z.object({
    projectId: z.union([z.string(), z.number()]).transform(v => parseInt(String(v))),
    boxId: z.union([z.string(), z.number()]).transform(v => parseInt(String(v))),
    ownerWallet: solanaPublicKey,
});

// =============================================================================
// ADMIN SCHEMAS
// =============================================================================

export const UpdatePlatformConfigSchema = z.object({
    baseLuck: z.number().int().min(0).max(255).optional(),
    maxLuck: z.number().int().min(0).max(255).optional(),
    luckTimeInterval: z.number().int().positive().optional(),
    platformCommissionBps: z.number().int().min(0).max(5000).optional(), // Max 50%
    payoutDud: z.number().int().min(0).optional(),
    payoutRebate: z.number().int().min(0).optional(),
    payoutBreakeven: z.number().int().min(0).optional(),
    payoutProfit: z.number().int().min(0).optional(),
    payoutJackpot: z.number().int().min(0).optional(),
});

export const WithdrawTreasurySchema = z.object({
    tokenMint: solanaPublicKey,
    amount: z.union([z.string(), z.number()])
        .transform(v => BigInt(v))
        .refine(v => v > 0n, 'Amount must be positive'),
});

// =============================================================================
// VAULT SCHEMAS
// =============================================================================

export const WithdrawVaultSchema = z.object({
    projectId: z.union([z.string(), z.number()]).transform(v => parseInt(String(v))),
    ownerWallet: solanaPublicKey,
    amount: z.union([z.string(), z.number()])
        .transform(v => BigInt(v))
        .refine(v => v > 0n, 'Amount must be positive'),
});

export const FundVaultSchema = z.object({
    projectId: z.union([z.string(), z.number()]).transform(v => parseInt(String(v))),
    ownerWallet: solanaPublicKey,
    amount: z.union([z.string(), z.number()])
        .transform(v => BigInt(v))
        .refine(v => v > 0n, 'Amount must be positive'),
});

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

export const PaginationSchema = z.object({
    page: z.union([z.string(), z.number()]).transform(v => Math.max(1, parseInt(String(v)) || 1)).optional().default(1),
    limit: z.union([z.string(), z.number()]).transform(v => Math.min(100, Math.max(1, parseInt(String(v)) || 50))).optional().default(50),
});

export const BoxQuerySchema = z.object({
    wallet: solanaPublicKey.optional(),
    projectId: z.union([z.string(), z.number()]).transform(v => parseInt(String(v))).optional(),
    status: z.enum(['pending', 'opened', 'revealed', 'settled', 'expired']).optional(),
}).merge(PaginationSchema);

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Create Express middleware that validates request body against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} - Express middleware
 */
export function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            next(error);
        }
    };
}

/**
 * Create Express middleware that validates request query against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} - Express middleware
 */
export function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid query parameters',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            next(error);
        }
    };
}

/**
 * Create Express middleware that validates request params against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} - Express middleware
 */
export function validateParams(schema) {
    return (req, res, next) => {
        try {
            req.params = schema.parse(req.params);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid URL parameters',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            next(error);
        }
    };
}

// Export all schemas and validators
export default {
    // Schemas
    CreateProjectSchema,
    UpdateProjectSchema,
    CreateBoxSchema,
    CommitBoxSchema,
    RevealBoxSchema,
    SettleBoxSchema,
    UpdatePlatformConfigSchema,
    WithdrawTreasurySchema,
    WithdrawVaultSchema,
    FundVaultSchema,
    PaginationSchema,
    BoxQuerySchema,

    // Middleware
    validateBody,
    validateQuery,
    validateParams,

    // Common validators
    solanaPublicKey,
    subdomain,
    positiveInt,
    nonNegativeInt,
};
