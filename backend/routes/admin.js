// routes/admin.js
// Admin endpoints for platform configuration

import express from 'express';
import { PublicKey, Transaction, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import BN from 'bn.js';
import { getAnchorProgram } from '../lib/anchorClient.js';
import { derivePlatformConfigPDA, deriveTreasuryPDA, deriveTreasuryTokenAccount } from '../lib/pdaHelpers.js';
import { getNetworkConfig, getPlatformConfig, clearConfigCache } from '../lib/getNetworkConfig.js';
import { createClient } from '@supabase/supabase-js';
import logger, { EventTypes, Severity, ActorTypes } from '../lib/logger.js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

/**
 * POST /api/admin/update-platform-config
 * Updates the on-chain platform config PDA
 * Only callable by the platform admin (deploy wallet)
 */
router.post('/update-platform-config', async (req, res) => {
    try {
        const {
            // Luck parameters
            baseLuck,
            maxLuck,
            luckTimeInterval,
            // Payout multipliers (in basis points: 10000 = 1.0x)
            payoutDud,
            payoutRebate,
            payoutBreakeven,
            payoutProfit,
            payoutJackpot,
            // Tier 1 (luck 0 to tier1MaxLuck)
            tier1MaxLuck,
            tier1Dud,
            tier1Rebate,
            tier1Breakeven,
            tier1Profit,
            // Tier 2 (luck tier1MaxLuck+1 to tier2MaxLuck)
            tier2MaxLuck,
            tier2Dud,
            tier2Rebate,
            tier2Breakeven,
            tier2Profit,
            // Tier 3 (luck tier2MaxLuck+1 to maxLuck)
            tier3Dud,
            tier3Rebate,
            tier3Breakeven,
            tier3Profit,
            // Platform commission
            platformCommissionBps,
        } = req.body;

        console.log('\n========================================');
        console.log('  Update Platform Config');
        console.log('========================================');

        // Load deploy wallet from env
        const deployWalletJson = process.env.DEPLOY_WALLET_JSON;
        if (!deployWalletJson) {
            return res.status(500).json({
                success: false,
                error: 'Deploy wallet not configured on server',
            });
        }

        let adminKeypair;
        try {
            const secretKey = Uint8Array.from(JSON.parse(deployWalletJson));
            adminKeypair = Keypair.fromSecretKey(secretKey);
        } catch (e) {
            return res.status(500).json({
                success: false,
                error: 'Failed to parse deploy wallet keypair',
            });
        }

        console.log(`Admin wallet: ${adminKeypair.publicKey.toString()}`);

        // Get network config and program
        const config = await getNetworkConfig();
        const { program, connection, programId } = await getAnchorProgram();

        // Derive platform config PDA
        const [platformConfigPDA] = derivePlatformConfigPDA(programId);
        console.log(`Platform Config PDA: ${platformConfigPDA.toString()}`);

        // Check if platform config exists
        const existingAccount = await connection.getAccountInfo(platformConfigPDA);
        if (!existingAccount) {
            return res.status(400).json({
                success: false,
                error: 'Platform config not initialized. Run init-platform-config.js first.',
            });
        }

        // Build update params - only include fields that are provided
        const updateParams = {
            baseLuck: baseLuck !== undefined ? baseLuck : null,
            maxLuck: maxLuck !== undefined ? maxLuck : null,
            luckTimeInterval: luckTimeInterval !== undefined ? new BN(luckTimeInterval) : null,
            // Payout multipliers (passed as basis points from frontend)
            payoutDud: payoutDud !== undefined ? payoutDud : null,
            payoutRebate: payoutRebate !== undefined ? payoutRebate : null,
            payoutBreakeven: payoutBreakeven !== undefined ? payoutBreakeven : null,
            payoutProfit: payoutProfit !== undefined ? payoutProfit : null,
            payoutJackpot: payoutJackpot !== undefined ? payoutJackpot : null,
            // Tier 1 probabilities (passed as basis points: 5500 = 55%)
            tier1MaxLuck: tier1MaxLuck !== undefined ? tier1MaxLuck : null,
            tier1Dud: tier1Dud !== undefined ? tier1Dud : null,
            tier1Rebate: tier1Rebate !== undefined ? tier1Rebate : null,
            tier1Breakeven: tier1Breakeven !== undefined ? tier1Breakeven : null,
            tier1Profit: tier1Profit !== undefined ? tier1Profit : null,
            // Tier 2 probabilities
            tier2MaxLuck: tier2MaxLuck !== undefined ? tier2MaxLuck : null,
            tier2Dud: tier2Dud !== undefined ? tier2Dud : null,
            tier2Rebate: tier2Rebate !== undefined ? tier2Rebate : null,
            tier2Breakeven: tier2Breakeven !== undefined ? tier2Breakeven : null,
            tier2Profit: tier2Profit !== undefined ? tier2Profit : null,
            // Tier 3 probabilities
            tier3Dud: tier3Dud !== undefined ? tier3Dud : null,
            tier3Rebate: tier3Rebate !== undefined ? tier3Rebate : null,
            tier3Breakeven: tier3Breakeven !== undefined ? tier3Breakeven : null,
            tier3Profit: tier3Profit !== undefined ? tier3Profit : null,
            // Platform commission
            platformCommissionBps: platformCommissionBps !== undefined ? platformCommissionBps : null,
        };

        console.log('Update params:', {
            baseLuck: baseLuck ?? 'unchanged',
            maxLuck: maxLuck ?? 'unchanged',
            luckTimeInterval: luckTimeInterval ?? 'unchanged',
            payoutDud: payoutDud ?? 'unchanged',
            payoutRebate: payoutRebate ?? 'unchanged',
            payoutBreakeven: payoutBreakeven ?? 'unchanged',
            payoutProfit: payoutProfit ?? 'unchanged',
            payoutJackpot: payoutJackpot ?? 'unchanged',
        });

        // Build transaction
        // Note: Must include ALL parameters in order, including paused at the end
        const tx = await program.methods
            .updatePlatformConfig(
                updateParams.baseLuck,
                updateParams.maxLuck,
                updateParams.luckTimeInterval,
                updateParams.payoutDud,
                updateParams.payoutRebate,
                updateParams.payoutBreakeven,
                updateParams.payoutProfit,
                updateParams.payoutJackpot,
                updateParams.tier1MaxLuck,
                updateParams.tier1Dud,
                updateParams.tier1Rebate,
                updateParams.tier1Breakeven,
                updateParams.tier1Profit,
                updateParams.tier2MaxLuck,
                updateParams.tier2Dud,
                updateParams.tier2Rebate,
                updateParams.tier2Breakeven,
                updateParams.tier2Profit,
                updateParams.tier3Dud,
                updateParams.tier3Rebate,
                updateParams.tier3Breakeven,
                updateParams.tier3Profit,
                null, // paused - not changing
                updateParams.platformCommissionBps,
            )
            .accounts({
                admin: adminKeypair.publicKey,
                platformConfig: platformConfigPDA,
            })
            .transaction();

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.lastValidBlockHeight = lastValidBlockHeight;
        tx.feePayer = adminKeypair.publicKey;

        // Sign with admin keypair
        tx.sign(adminKeypair);

        // Send transaction
        console.log('Sending transaction...');
        const signature = await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });

        console.log(`Transaction sent: ${signature}`);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        }, 'confirmed');

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log('Platform config updated successfully!');

        // Log admin config update
        await logger.logAdminConfigUpdate({
            adminWallet: adminKeypair.publicKey.toString(),
            txSignature: signature,
            changes: {
                baseLuck: baseLuck ?? 'unchanged',
                maxLuck: maxLuck ?? 'unchanged',
                luckTimeInterval: luckTimeInterval ?? 'unchanged',
                payoutDud: payoutDud ?? 'unchanged',
                payoutRebate: payoutRebate ?? 'unchanged',
                payoutBreakeven: payoutBreakeven ?? 'unchanged',
                payoutProfit: payoutProfit ?? 'unchanged',
                payoutJackpot: payoutJackpot ?? 'unchanged',
                platformCommissionBps: platformCommissionBps ?? 'unchanged',
            },
        });

        // Clear config cache so next request fetches fresh on-chain data
        clearConfigCache();

        return res.json({
            success: true,
            message: 'Platform config updated on-chain',
            signature,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('Error updating platform config:', error);

        // Log the error
        await logger.logTransactionError({
            actorType: ActorTypes.ADMIN,
            errorCode: 'PLATFORM_CONFIG_UPDATE_FAILED',
            errorMessage: error.message,
            instruction: 'update-platform-config',
        });

        return res.status(500).json({
            success: false,
            error: 'Failed to update platform config',
            details: error.message,
        });
    }
});

/**
 * GET /api/admin/platform-config
 * Reads the current platform config (on-chain as source of truth)
 * Uses the shared getPlatformConfig() which merges on-chain and database config
 */
router.get('/platform-config', async (req, res) => {
    try {
        // Force refresh to get latest on-chain data
        const forceRefresh = req.query.refresh === 'true';
        const config = await getPlatformConfig({ forceRefresh });

        // Derive PDA for reference
        const { programId } = await getAnchorProgram();
        const [platformConfigPDA] = derivePlatformConfigPDA(programId);

        return res.json({
            success: true,
            platformConfig: {
                pda: platformConfigPDA.toString(),
                admin: config.adminWallet,
                initialized: true, // If we got here, it's initialized
                paused: config.paused,
                baseLuck: config.baseLuck,
                maxLuck: config.maxLuck,
                luckTimeInterval: config.luckTimeInterval,
                payoutMultipliers: config.payoutMultipliers,
                tiers: config.tierProbabilities,
                platformCommissionBps: config.platformCommissionBps,
                platformCommissionPercent: config.platformCommissionPercent,
                treasuryBump: config.treasuryBump,
                // Additional metadata
                source: config.source,
                network: config.network,
            },
        });

    } catch (error) {
        console.error('Error fetching platform config:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch platform config',
            details: error.message,
        });
    }
});

/**
 * POST /api/admin/toggle-pause
 * Toggles the platform pause state
 */
router.post('/toggle-pause', async (req, res) => {
    try {
        const { paused } = req.body;

        console.log(`\nToggling platform pause: ${paused ? 'PAUSING' : 'UNPAUSING'}`);

        // Load deploy wallet
        const deployWalletJson = process.env.DEPLOY_WALLET_JSON;
        if (!deployWalletJson) {
            return res.status(500).json({
                success: false,
                error: 'Deploy wallet not configured',
            });
        }

        const secretKey = Uint8Array.from(JSON.parse(deployWalletJson));
        const adminKeypair = Keypair.fromSecretKey(secretKey);

        const config = await getNetworkConfig();
        const { program, connection, programId } = await getAnchorProgram();
        const [platformConfigPDA] = derivePlatformConfigPDA(programId);

        // For pausing, we need to use update_platform_config with all null except we'd need a dedicated pause instruction
        // Since we don't have a dedicated pause instruction, we'll need to add one or use update_platform_config creatively
        // For now, return a message that this needs implementation

        return res.status(501).json({
            success: false,
            error: 'Pause toggle not yet implemented. Add a dedicated pause instruction to the program.',
        });

    } catch (error) {
        console.error('Error toggling pause:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to toggle pause',
            details: error.message,
        });
    }
});

/**
 * GET /api/admin/treasury/:tokenMint
 * Get treasury balance for a specific token mint
 */
router.get('/treasury/:tokenMint', async (req, res) => {
    try {
        const { tokenMint } = req.params;

        console.log(`\n💰 Fetching treasury balance for token: ${tokenMint}`);

        const { connection, programId } = await getAnchorProgram();

        // Derive treasury PDA and token account
        const [treasuryPDA] = deriveTreasuryPDA(programId);
        const tokenMintPubkey = new PublicKey(tokenMint);
        const treasuryTokenAccount = await deriveTreasuryTokenAccount(treasuryPDA, tokenMintPubkey);

        console.log(`   Treasury PDA: ${treasuryPDA.toString()}`);
        console.log(`   Treasury Token Account: ${treasuryTokenAccount.toString()}`);

        // Fetch token account info
        const accountInfo = await connection.getAccountInfo(treasuryTokenAccount);

        if (!accountInfo) {
            return res.json({
                success: true,
                tokenMint,
                treasuryPDA: treasuryPDA.toString(),
                treasuryTokenAccount: treasuryTokenAccount.toString(),
                balance: '0',
                balanceFormatted: 0,
                exists: false,
            });
        }

        // Parse token account balance (offset 64 for amount in SPL token account)
        const balanceBN = new BN(accountInfo.data.subarray(64, 72), 'le');

        return res.json({
            success: true,
            tokenMint,
            treasuryPDA: treasuryPDA.toString(),
            treasuryTokenAccount: treasuryTokenAccount.toString(),
            balance: balanceBN.toString(),
            exists: true,
        });

    } catch (error) {
        console.error('Error fetching treasury balance:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch treasury balance',
            details: error.message,
        });
    }
});

/**
 * GET /api/admin/treasury-balances
 * Get all treasury balances across all tokens that have been collected
 * Fetches from database which tokens have been used
 */
router.get('/treasury-balances', async (req, res) => {
    try {
        console.log(`\n💰 Fetching all treasury balances...`);

        const networkConfig = await getNetworkConfig();
        const { connection, programId } = await getAnchorProgram();
        const [treasuryPDA] = deriveTreasuryPDA(programId);

        // Fetch all unique payment token mints from projects
        const { data: projects, error: dbError } = await supabase
            .from('projects')
            .select('payment_token_mint, payment_token_symbol, payment_token_decimals')
            .not('payment_token_mint', 'is', null);

        if (dbError) {
            throw new Error('Failed to fetch projects from database');
        }

        // Get unique token mints
        const uniqueMints = [...new Map(
            projects.map(p => [p.payment_token_mint, p])
        ).values()];

        const balances = [];

        // Always check $3EYES balance first (even if 0)
        const threeEyesMint = networkConfig.threeEyesMint?.toString();
        if (threeEyesMint) {
            const threeEyesMintPubkey = new PublicKey(threeEyesMint);
            const threeEyesTreasuryAccount = await deriveTreasuryTokenAccount(treasuryPDA, threeEyesMintPubkey);
            const threeEyesAccountInfo = await connection.getAccountInfo(threeEyesTreasuryAccount);

            let threeEyesBalance = '0';
            let threeEyesBalanceFormatted = 0;
            if (threeEyesAccountInfo) {
                const balanceBN = new BN(threeEyesAccountInfo.data.subarray(64, 72), 'le');
                threeEyesBalance = balanceBN.toString();
                threeEyesBalanceFormatted = Number(threeEyesBalance) / Math.pow(10, 9);
            }

            balances.push({
                tokenMint: threeEyesMint,
                symbol: '$3EYES',
                decimals: 9,
                treasuryTokenAccount: threeEyesTreasuryAccount.toString(),
                balance: threeEyesBalance,
                balanceFormatted: threeEyesBalanceFormatted,
                isPlatformToken: true,
            });
        }

        // Then add other project tokens
        for (const project of uniqueMints) {
            // Skip if it's the $3EYES token (already added)
            if (threeEyesMint && project.payment_token_mint === threeEyesMint) {
                continue;
            }

            const tokenMintPubkey = new PublicKey(project.payment_token_mint);
            const treasuryTokenAccount = await deriveTreasuryTokenAccount(treasuryPDA, tokenMintPubkey);

            // Fetch token account info
            const accountInfo = await connection.getAccountInfo(treasuryTokenAccount);

            if (accountInfo) {
                const balanceBN = new BN(accountInfo.data.subarray(64, 72), 'le');
                const decimals = project.payment_token_decimals || 9;
                balances.push({
                    tokenMint: project.payment_token_mint,
                    symbol: project.payment_token_symbol || 'Unknown',
                    decimals,
                    treasuryTokenAccount: treasuryTokenAccount.toString(),
                    balance: balanceBN.toString(),
                    balanceFormatted: Number(balanceBN.toString()) / Math.pow(10, decimals),
                });
            }
        }

        return res.json({
            success: true,
            treasuryPDA: treasuryPDA.toString(),
            balances,
            totalTokenTypes: balances.filter(b => parseFloat(b.balance) > 0).length,
        });

    } catch (error) {
        console.error('Error fetching treasury balances:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch treasury balances',
            details: error.message,
        });
    }
});

/**
 * POST /api/admin/withdraw-treasury
 * Withdraw tokens from treasury to admin wallet
 * This is used for batch processing (swap to SOL, buyback, etc.)
 *
 * Body:
 * - tokenMint: string - Token mint address
 * - amount: string (optional) - Amount to withdraw (defaults to full balance)
 */
router.post('/withdraw-treasury', async (req, res) => {
    try {
        const { tokenMint, amount } = req.body;

        if (!tokenMint) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: tokenMint',
            });
        }

        console.log('\n========================================');
        console.log('  Withdraw from Treasury');
        console.log('========================================');
        console.log(`Token mint: ${tokenMint}`);

        // Load deploy wallet (admin)
        const deployWalletJson = process.env.DEPLOY_WALLET_JSON;
        if (!deployWalletJson) {
            return res.status(500).json({
                success: false,
                error: 'Deploy wallet not configured on server',
            });
        }

        let adminKeypair;
        try {
            const secretKey = Uint8Array.from(JSON.parse(deployWalletJson));
            adminKeypair = Keypair.fromSecretKey(secretKey);
        } catch (e) {
            return res.status(500).json({
                success: false,
                error: 'Failed to parse deploy wallet keypair',
            });
        }

        console.log(`Admin wallet: ${adminKeypair.publicKey.toString()}`);

        // Get network config and program
        const config = await getNetworkConfig();
        const { program, connection, programId } = await getAnchorProgram();

        // Derive PDAs
        const [platformConfigPDA] = derivePlatformConfigPDA(programId);
        const [treasuryPDA] = deriveTreasuryPDA(programId);
        const tokenMintPubkey = new PublicKey(tokenMint);
        const treasuryTokenAccount = await deriveTreasuryTokenAccount(treasuryPDA, tokenMintPubkey);

        console.log(`Treasury PDA: ${treasuryPDA.toString()}`);
        console.log(`Treasury token account: ${treasuryTokenAccount.toString()}`);

        // Check treasury balance
        const treasuryAccountInfo = await connection.getAccountInfo(treasuryTokenAccount);
        if (!treasuryAccountInfo) {
            return res.status(400).json({
                success: false,
                error: 'Treasury token account does not exist (no fees collected for this token)',
            });
        }

        const treasuryBalanceBN = new BN(treasuryAccountInfo.data.subarray(64, 72), 'le');
        console.log(`Treasury balance: ${treasuryBalanceBN.toString()}`);

        if (treasuryBalanceBN.isZero()) {
            return res.status(400).json({
                success: false,
                error: 'Treasury balance is zero',
            });
        }

        // Determine withdrawal amount
        let withdrawAmountBN;
        if (amount) {
            withdrawAmountBN = new BN(amount);
            if (withdrawAmountBN.gt(treasuryBalanceBN)) {
                return res.status(400).json({
                    success: false,
                    error: 'Withdrawal amount exceeds treasury balance',
                    treasuryBalance: treasuryBalanceBN.toString(),
                    requestedAmount: withdrawAmountBN.toString(),
                });
            }
        } else {
            // Default to full balance
            withdrawAmountBN = treasuryBalanceBN;
        }

        console.log(`Withdrawal amount: ${withdrawAmountBN.toString()}`);

        // Get admin's token account (destination)
        const adminTokenAccount = await getAssociatedTokenAddress(
            tokenMintPubkey,
            adminKeypair.publicKey
        );

        // Check if admin token account exists
        const adminTokenAccountInfo = await connection.getAccountInfo(adminTokenAccount);
        const adminAtaNeedsCreation = !adminTokenAccountInfo;

        console.log(`Admin token account: ${adminTokenAccount.toString()}`);
        if (adminAtaNeedsCreation) {
            console.log('Admin token account needs to be created');
        }

        // Build transaction
        const transaction = new Transaction();

        // Create admin ATA if needed
        if (adminAtaNeedsCreation) {
            const createAtaIx = createAssociatedTokenAccountInstruction(
                adminKeypair.publicKey, // payer
                adminTokenAccount, // ata
                adminKeypair.publicKey, // owner
                tokenMintPubkey // mint
            );
            transaction.add(createAtaIx);
            console.log('Added: Create admin ATA instruction');
        }

        // Build withdraw_treasury instruction
        const withdrawTx = await program.methods
            .withdrawTreasury(withdrawAmountBN)
            .accounts({
                admin: adminKeypair.publicKey,
                platformConfig: platformConfigPDA,
                treasury: treasuryPDA,
                tokenMint: tokenMintPubkey,
                treasuryTokenAccount: treasuryTokenAccount,
                adminTokenAccount: adminTokenAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .transaction();

        transaction.add(...withdrawTx.instructions);
        console.log('Added: withdraw_treasury instruction');

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = adminKeypair.publicKey;

        // Sign with admin keypair
        transaction.sign(adminKeypair);

        // Send transaction
        console.log('Sending transaction...');
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });

        console.log(`Transaction sent: ${signature}`);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        }, 'confirmed');

        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log('Treasury withdrawal successful!');

        // Log to database for tracking
        const { error: logError } = await supabase
            .from('treasury_processing_log')
            .insert({
                token_mint: tokenMint,
                amount_withdrawn: withdrawAmountBN.toString(),
                tx_signature: signature,
                processed_at: new Date().toISOString(),
                processed_by: adminKeypair.publicKey.toString(),
                action_type: 'withdraw',
                status: 'completed',
            });

        if (logError) {
            console.warn('Warning: Failed to log withdrawal to database:', logError);
        }

        return res.json({
            success: true,
            message: 'Treasury withdrawal successful',
            tokenMint,
            amount: withdrawAmountBN.toString(),
            signature,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('Error withdrawing from treasury:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to withdraw from treasury',
            details: error.message,
        });
    }
});

/**
 * GET /api/admin/treasury-logs
 * Fetches treasury processing logs with optional filtering
 */
router.get('/treasury-logs', async (req, res) => {
    try {
        const { limit = 50, action_type, token_mint, status } = req.query;

        let query = supabase
            .from('treasury_processing_log')
            .select('*')
            .order('processed_at', { ascending: false })
            .limit(parseInt(limit));

        // Apply filters if provided
        if (action_type) {
            query = query.eq('action_type', action_type);
        }
        if (token_mint) {
            query = query.eq('token_mint', token_mint);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data: logs, error } = await query;

        if (error) {
            console.error('Error fetching treasury logs:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch treasury logs',
                details: error.message,
            });
        }

        // Get network config for explorer URL
        const config = await getNetworkConfig();
        const cluster = config.network === 'mainnet-beta' ? '' : `?cluster=${config.network}`;

        // Enhance logs with explorer links
        const enhancedLogs = logs.map(log => ({
            ...log,
            explorer_links: {
                tx_signature: log.tx_signature
                    ? `https://solscan.io/tx/${log.tx_signature}${cluster}`
                    : null,
                swap_to_sol_signature: log.swap_to_sol_signature
                    ? `https://solscan.io/tx/${log.swap_to_sol_signature}${cluster}`
                    : null,
                dev_transfer_signature: log.dev_transfer_signature
                    ? `https://solscan.io/tx/${log.dev_transfer_signature}${cluster}`
                    : null,
                buyback_signature: log.buyback_signature
                    ? `https://solscan.io/tx/${log.buyback_signature}${cluster}`
                    : null,
            },
        }));

        return res.json({
            success: true,
            logs: enhancedLogs,
            count: enhancedLogs.length,
        });

    } catch (error) {
        console.error('Error fetching treasury logs:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch treasury logs',
            details: error.message,
        });
    }
});

export default router;
