// routes/vault.js
// API routes for vault operations

import express from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { getNetworkConfig } from '../lib/getNetworkConfig.js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

/**
 * GET /api/vault/:projectId/balance
 * Get vault balance for a project
 */
router.get('/:projectId/balance', async (req, res) => {
    try {
        const { projectId } = req.params;

        // Get project from database
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('vault_token_account, project_name, subdomain')
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        if (!project.vault_token_account) {
            return res.status(400).json({
                success: false,
                error: 'Vault token account not initialized for this project'
            });
        }

        // Get network config and connection
        const config = await getNetworkConfig();
        const connection = new Connection(config.rpcUrl, 'confirmed');

        // Get token account balance
        const vaultTokenAccountPubkey = new PublicKey(project.vault_token_account);

        try {
            const balance = await connection.getTokenAccountBalance(vaultTokenAccountPubkey);

            return res.json({
                success: true,
                project: {
                    id: projectId,
                    name: project.project_name,
                    subdomain: project.subdomain
                },
                vault: {
                    address: project.vault_token_account,
                    balance: balance.value.amount,
                    decimals: balance.value.decimals,
                    uiAmount: balance.value.uiAmount,
                    uiAmountString: balance.value.uiAmountString
                },
                network: config.network
            });

        } catch (balanceError) {
            // Token account might not exist yet (not funded)
            if (balanceError.message.includes('could not find account')) {
                return res.json({
                    success: true,
                    project: {
                        id: projectId,
                        name: project.project_name,
                        subdomain: project.subdomain
                    },
                    vault: {
                        address: project.vault_token_account,
                        balance: '0',
                        decimals: 9,
                        uiAmount: 0,
                        uiAmountString: '0',
                        status: 'not_initialized'
                    },
                    network: config.network,
                    message: 'Vault token account not yet initialized. Fund it to create the account.'
                });
            }
            throw balanceError;
        }

    } catch (error) {
        console.error('Error getting vault balance:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get vault balance',
            details: error.message
        });
    }
});

/**
 * GET /api/vault/:projectId/info
 * Get detailed vault information
 */
router.get('/:projectId/info', async (req, res) => {
    try {
        const { projectId } = req.params;

        // Get project with all vault info
        const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Get network config
        const config = await getNetworkConfig();

        return res.json({
            success: true,
            project: {
                id: project.id,
                name: project.project_name,
                subdomain: project.subdomain
            },
            vault: {
                vault_pda: project.vault_pda,
                vault_authority_pda: project.vault_authority_pda,
                vault_token_account: project.vault_token_account,
                vault_wallet: project.vault_wallet
            },
            network: config.network
        });

    } catch (error) {
        console.error('Error getting vault info:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get vault info',
            details: error.message
        });
    }
});

/**
 * POST /api/vault/fund
 * Fund a vault (admin only - for initial setup)
 *
 * NOTE: This is a placeholder for future implementation
 * Actual funding will be done via Solana transactions
 */
router.post('/fund', async (req, res) => {
    try {
        const { projectId, amount } = req.body;

        if (!projectId || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, amount'
            });
        }

        // TODO: Implement actual funding logic
        // This will require:
        // 1. Creating the vault token account if it doesn't exist
        // 2. Transferring tokens from deploy wallet to vault
        // 3. Using the Anchor program to initialize vault

        return res.status(501).json({
            success: false,
            error: 'Vault funding not yet implemented',
            message: 'This endpoint will be implemented with Rust program integration'
        });

    } catch (error) {
        console.error('Error funding vault:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fund vault',
            details: error.message
        });
    }
});

export default router;
