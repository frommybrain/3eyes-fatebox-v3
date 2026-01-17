// middleware/auth.js
// Authentication and authorization middleware

import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// =============================================================================
// WALLET VERIFICATION
// =============================================================================

/**
 * Verify a wallet signature to prove ownership
 * @param {string} message - The message that was signed
 * @param {string} signature - Base58 or Base64 encoded signature
 * @param {string} publicKey - Public key of the signer
 * @returns {boolean} - True if signature is valid
 */
export function verifyWalletSignature(message, signature, publicKey) {
    try {
        const messageBytes = new TextEncoder().encode(message);

        // Try Base64 first, then Base58
        let signatureBytes;
        try {
            signatureBytes = Buffer.from(signature, 'base64');
        } catch {
            // Could add Base58 decoding here if needed
            return false;
        }

        const publicKeyBytes = new PublicKey(publicKey).toBuffer();

        return nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKeyBytes
        );
    } catch (error) {
        console.error('Signature verification failed:', error.message);
        return false;
    }
}

/**
 * Generate a nonce for signing (prevents replay attacks)
 * @returns {string} - Unique nonce
 */
export function generateNonce() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Verify a nonce is valid (within time window)
 * @param {string} nonce - Nonce to verify
 * @param {number} maxAgeMs - Maximum age in milliseconds (default: 5 minutes)
 * @returns {boolean} - True if nonce is valid
 */
export function verifyNonce(nonce, maxAgeMs = 5 * 60 * 1000) {
    try {
        const [timestamp] = nonce.split('_');
        const nonceTime = parseInt(timestamp);
        return Date.now() - nonceTime < maxAgeMs;
    } catch {
        return false;
    }
}

// =============================================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Middleware to verify the request is from the super admin
 * Checks both wallet address and optionally signature
 *
 * Usage:
 * - Header: X-Wallet-Address (required)
 * - For write operations: X-Signature and X-Message headers (for signature verification)
 */
export async function requireSuperAdmin(req, res, next) {
    try {
        const walletAddress = req.headers['x-wallet-address'];

        if (!walletAddress) {
            return res.status(401).json({
                success: false,
                error: 'Missing wallet address header',
            });
        }

        // Validate wallet format
        try {
            new PublicKey(walletAddress);
        } catch {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format',
            });
        }

        // Get admin wallet from database
        const { data: config, error } = await supabase
            .from('super_admin_config')
            .select('admin_wallet')
            .eq('id', 1)
            .single();

        if (error || !config) {
            console.error('Failed to fetch admin config:', error?.message);
            return res.status(500).json({
                success: false,
                error: 'Failed to verify admin status',
            });
        }

        // Compare wallet addresses
        if (config.admin_wallet !== walletAddress) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized - admin access required',
            });
        }

        // For write operations (POST, PUT, DELETE), optionally verify signature
        // This provides an extra layer of security
        const signature = req.headers['x-signature'];
        const message = req.headers['x-message'];

        if (signature && message) {
            if (!verifyWalletSignature(message, signature, walletAddress)) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid signature',
                });
            }

            // Verify message contains valid nonce (prevent replay)
            try {
                const messageData = JSON.parse(message);
                if (messageData.nonce && !verifyNonce(messageData.nonce)) {
                    return res.status(401).json({
                        success: false,
                        error: 'Message expired - please sign again',
                    });
                }
            } catch {
                // Message isn't JSON with nonce - that's okay for simple checks
            }
        }

        // Attach admin info to request
        req.adminWallet = walletAddress;
        req.isAdmin = true;

        next();
    } catch (error) {
        console.error('Admin auth error:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed',
        });
    }
}

/**
 * Middleware to verify the request wallet owns the project
 */
export async function requireProjectOwner(req, res, next) {
    try {
        const walletAddress = req.headers['x-wallet-address'] || req.body.ownerWallet;
        const projectId = req.params.projectId || req.body.projectId;

        if (!walletAddress) {
            return res.status(401).json({
                success: false,
                error: 'Missing wallet address',
            });
        }

        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'Missing project ID',
            });
        }

        // Validate wallet format
        try {
            new PublicKey(walletAddress);
        } catch {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format',
            });
        }

        // Get project from database
        const { data: project, error } = await supabase
            .from('projects')
            .select('owner_wallet')
            .eq('project_numeric_id', parseInt(projectId))
            .single();

        if (error || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
            });
        }

        // Compare wallet addresses
        if (project.owner_wallet !== walletAddress) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized - project owner access required',
            });
        }

        req.projectOwner = walletAddress;
        req.projectId = projectId;

        next();
    } catch (error) {
        console.error('Project owner auth error:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Authorization failed',
        });
    }
}

/**
 * Middleware to verify the request wallet owns the box
 */
export async function requireBoxOwner(req, res, next) {
    try {
        const walletAddress = req.headers['x-wallet-address'] || req.body.ownerWallet;
        const boxId = req.params.boxId || req.body.boxId;
        const projectId = req.params.projectId || req.body.projectId;

        if (!walletAddress || !boxId || !projectId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters (wallet, boxId, projectId)',
            });
        }

        // Validate wallet format
        try {
            new PublicKey(walletAddress);
        } catch {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format',
            });
        }

        // Get box from database
        const { data: box, error } = await supabase
            .from('boxes')
            .select('owner_wallet, project_id, projects!inner(project_numeric_id)')
            .eq('box_number', parseInt(boxId))
            .eq('projects.project_numeric_id', parseInt(projectId))
            .single();

        if (error || !box) {
            return res.status(404).json({
                success: false,
                error: 'Box not found',
            });
        }

        // Compare wallet addresses
        if (box.owner_wallet !== walletAddress) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized - box owner access required',
            });
        }

        req.boxOwner = walletAddress;
        req.boxId = boxId;
        req.projectId = projectId;

        next();
    } catch (error) {
        console.error('Box owner auth error:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Authorization failed',
        });
    }
}

/**
 * Optional middleware to extract wallet from header
 * Doesn't require authentication, just makes wallet available
 */
export function extractWallet(req, res, next) {
    const walletAddress = req.headers['x-wallet-address'];

    if (walletAddress) {
        try {
            new PublicKey(walletAddress);
            req.walletAddress = walletAddress;
        } catch {
            // Invalid wallet format - ignore
        }
    }

    next();
}

export default {
    verifyWalletSignature,
    generateNonce,
    verifyNonce,
    requireSuperAdmin,
    requireProjectOwner,
    requireBoxOwner,
    extractWallet,
};
