// routes/vault.js
// API routes for vault operations

import express from 'express';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import { getNetworkConfig, getPlatformConfig } from '../lib/getNetworkConfig.js';
import { getAnchorProgram } from '../lib/anchorClient.js';
import { testJupiterConnection, KNOWN_TOKENS } from '../lib/priceOracle.js';
import { deriveVaultAuthorityPDA, derivePlatformConfigPDA } from '../lib/pdaHelpers.js';
import {
    calculateUnopenedBoxReserve,
    calculateExpectedReserve,
    DEFAULT_TIER_PROBABILITIES,
    DEFAULT_PAYOUT_MULTIPLIERS,
} from '../lib/evCalculator.js';
import logger from '../lib/logger.js';
import { verifyTransaction, transactionInvokedProgram, verifyWithdrawalTransaction, validateNumericId, sanitizeErrorMessage } from '../lib/utils.js';

const router = express.Router();

// Initialize Supabase client
// Use service role key for backend operations that need to bypass RLS
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
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
            details: sanitizeErrorMessage(error.message)
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
            details: sanitizeErrorMessage(error.message)
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
            details: sanitizeErrorMessage(error.message)
        });
    }
});

/**
 * GET /api/vault/balance/:projectId
 * Fetch vault token account balance from on-chain
 *
 * Returns the current balance of tokens in the project's vault
 */
router.get('/balance/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;

        // Validate project ID
        const idValidation = validateNumericId(projectId);
        if (!idValidation.valid) {
            return res.status(400).json({
                success: false,
                error: idValidation.error,
            });
        }

        console.log(`\n💰 Fetching vault balance for project ${idValidation.value}...`);

        // Fetch project from database
        const { data: project, error: dbError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_numeric_id', idValidation.value)
            .single();

        if (dbError || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        if (!project.vault_token_account) {
            return res.json({
                success: true,
                balance: '0',
                formatted: '0',
                tokenMint: project.payment_token_mint,
                tokenSymbol: project.payment_token_symbol,
                decimals: project.payment_token_decimals,
            });
        }

        // Get connection
        const { connection } = await getAnchorProgram();

        // Fetch vault token account
        const vaultTokenAccountPubkey = new PublicKey(project.vault_token_account);
        const accountInfo = await connection.getAccountInfo(vaultTokenAccountPubkey);

        if (!accountInfo) {
            return res.json({
                success: true,
                balance: '0',
                formatted: '0',
                tokenMint: project.payment_token_mint,
                tokenSymbol: project.payment_token_symbol,
                decimals: project.payment_token_decimals,
            });
        }

        // Parse token account data
        // Token account layout: https://github.com/solana-labs/solana-program-library/blob/master/token/program/src/state.rs
        // Amount is at offset 64 (u64, 8 bytes)
        const data = accountInfo.data;
        const amountBN = new BN(data.slice(64, 72), 'le');
        const balance = amountBN.toString();

        // Format balance for display
        const decimals = project.payment_token_decimals || 9;
        const formatted = (parseInt(balance) / Math.pow(10, decimals)).toFixed(decimals);

        console.log(`✅ Vault balance: ${formatted} ${project.payment_token_symbol}`);

        return res.json({
            success: true,
            balance,
            formatted,
            tokenMint: project.payment_token_mint,
            tokenSymbol: project.payment_token_symbol,
            decimals,
        });

    } catch (error) {
        console.error('❌ Error fetching vault balance:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch vault balance',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

// ============================================
// WITHDRAWAL ENDPOINTS
// ============================================

/**
 * Reserve calculation uses EV-based calculation from evCalculator.js
 * Based on probability analysis from Claude, ChatGPT, and Grok (Jan 2026)
 *
 * Default model (Grok's no-dud approach):
 * - Tier 3 (max luck): 94% RTP, 6% house edge
 * - 2% jackpot at 4x multiplier
 * - Reserve = RTP × box_price × unopened_count (straight expected value)
 *
 * See: backend/lib/evCalculator.js for full calculation
 */

/**
 * GET /api/vault/withdrawal-info/:projectId
 * Calculate withdrawable amounts and fee preview
 *
 * This endpoint provides all the information needed before a withdrawal:
 * - Current vault balance
 * - Amount reserved for unopened boxes
 * - Maximum withdrawable amount
 * - Profit calculation
 * - Fee estimate in platform tokens
 */
router.get('/withdrawal-info/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { ownerWallet } = req.query;

        // Validate project ID
        const idValidation = validateNumericId(projectId);
        if (!idValidation.valid) {
            return res.status(400).json({
                success: false,
                error: idValidation.error,
            });
        }

        console.log(`\n💰 Calculating withdrawal info for project ${idValidation.value}...`);

        // Fetch project from database
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_numeric_id', idValidation.value)
            .single();

        if (projectError || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
            });
        }

        // SECURITY: Always require owner wallet for withdrawal info
        // This prevents information disclosure about vault balances
        if (!ownerWallet) {
            return res.status(400).json({
                success: false,
                error: 'ownerWallet query parameter is required',
            });
        }

        if (project.owner_wallet !== ownerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Not project owner',
            });
        }

        // Get network config
        const config = await getNetworkConfig();

        // Count unopened boxes (box_result = 0 means pending/unopened)
        const { count: unopenedCount, error: countError } = await supabase
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .eq('box_result', 0);

        if (countError) {
            console.error('Error counting boxes:', countError);
        }

        const unopenedBoxes = unopenedCount || 0;

        // Count unclaimed boxes (revealed but not settled, excluding duds which have no payout)
        // box_result: 1=dud, 2=rebate, 3=break-even, 4=profit, 5=jackpot
        // Duds (1) have 0 payout so they don't need to be "claimed"
        const { count: unclaimedCount } = await supabase
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .gt('box_result', 1) // Exclude duds (result = 1)
            .is('settled_at', null);

        const unclaimedBoxes = unclaimedCount || 0;

        // Get actual unclaimed reward amounts (only boxes with payouts, not duds)
        const { data: unclaimedBoxesData } = await supabase
            .from('boxes')
            .select('payout_amount')
            .eq('project_id', project.id)
            .gt('box_result', 1) // Exclude duds
            .is('settled_at', null);

        const unclaimedRewards = unclaimedBoxesData?.reduce(
            (sum, box) => sum + BigInt(box.payout_amount || 0),
            BigInt(0)
        ) || BigInt(0);

        // Get current vault balance
        const { connection } = await getAnchorProgram();
        let vaultBalance = BigInt(0);

        if (project.vault_token_account) {
            try {
                const vaultPubkey = new PublicKey(project.vault_token_account);
                const accountInfo = await connection.getAccountInfo(vaultPubkey);
                if (accountInfo) {
                    const amountBN = new BN(accountInfo.data.slice(64, 72), 'le');
                    vaultBalance = BigInt(amountBN.toString());
                }
            } catch (e) {
                console.error('Error fetching vault balance:', e);
            }
        }

        // Calculate reserved amount for unopened boxes using EV calculator
        // Reserve = RTP × box_price × count (Tier 3 RTP varies based on on-chain config)
        const boxPrice = BigInt(project.box_price || 0);

        // Fetch platform config (on-chain as source of truth, database as fallback)
        const platformConfig = await getPlatformConfig();

        // Use on-chain values for tier probabilities and payout multipliers
        const tier3Probs = platformConfig.tierProbabilities?.tier3 || DEFAULT_TIER_PROBABILITIES.tier3;
        const payoutMultipliers = platformConfig.payoutMultipliers || DEFAULT_PAYOUT_MULTIPLIERS;

        const reservedForUnopened = calculateUnopenedBoxReserve(
            boxPrice,
            unopenedBoxes,
            tier3Probs,
            payoutMultipliers
        );

        // Calculate the reserve multiplier used (for display purposes)
        // This is the expected RTP for Tier 3 based on current on-chain settings
        const reserveMultiplier = unopenedBoxes > 0
            ? calculateExpectedReserve(tier3Probs, payoutMultipliers)
            : 0;

        // Total reserved = reserved for unopened + actual unclaimed rewards
        const totalReserved = reservedForUnopened + unclaimedRewards;

        // Calculate initial vault amount (what they put in)
        const initialVaultAmount = BigInt(project.initial_vault_amount || project.vault_funded_amount || 0);

        // Calculate profit
        // Profit = vault_balance - initial_vault_amount
        // (Can be negative if payouts exceeded deposits)
        const profit = vaultBalance - initialVaultAmount;

        // Maximum withdrawable = vault_balance - total_reserved
        // Cannot go below 0
        const maxWithdrawable = vaultBalance > totalReserved
            ? vaultBalance - totalReserved
            : BigInt(0);

        // Withdrawable profits = min(profit, max_withdrawable)
        // Only positive profit can be withdrawn
        const withdrawableProfit = profit > BigInt(0)
            ? (profit < maxWithdrawable ? profit : maxWithdrawable)
            : BigInt(0);

        // Can close project? Only if no unopened and no unclaimed boxes
        const canCloseProject = unopenedBoxes === 0 && unclaimedBoxes === 0;

        // Note: No platform fee for project vault withdrawals
        // Platform only takes commission on box purchases (on-chain)

        // Format values for response
        const decimals = project.payment_token_decimals || 9;
        const formatAmount = (amount) => ({
            raw: amount.toString(),
            formatted: (Number(amount) / Math.pow(10, decimals)).toFixed(decimals),
        });

        console.log(`✅ Withdrawal info calculated:`);
        console.log(`   Vault balance: ${vaultBalance}`);
        console.log(`   Unopened boxes: ${unopenedBoxes}`);
        console.log(`   Reserved: ${totalReserved}`);
        console.log(`   Max withdrawable: ${maxWithdrawable}`);

        return res.json({
            success: true,
            project: {
                id: project.id,
                numericId: project.project_numeric_id,
                name: project.project_name,
                tokenSymbol: project.payment_token_symbol,
                tokenDecimals: decimals,
            },
            vault: {
                balance: formatAmount(vaultBalance),
                initialFunded: formatAmount(initialVaultAmount),
            },
            boxes: {
                unopenedCount: unopenedBoxes,
                unclaimedCount: unclaimedBoxes,
                boxPrice: formatAmount(boxPrice),
            },
            reserved: {
                forUnopenedBoxes: formatAmount(reservedForUnopened),
                forUnclaimedRewards: formatAmount(unclaimedRewards),
                total: formatAmount(totalReserved),
                multiplierUsed: reserveMultiplier.toFixed(4),
            },
            withdrawable: {
                maxAmount: formatAmount(maxWithdrawable),
                profitOnly: formatAmount(withdrawableProfit),
                profit: formatAmount(profit > BigInt(0) ? profit : BigInt(0)),
                isInLoss: profit < BigInt(0),
                lossAmount: profit < BigInt(0) ? formatAmount(-profit) : null,
            },
            canCloseProject,
            network: config.network,
        });

    } catch (error) {
        console.error('❌ Error calculating withdrawal info:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to calculate withdrawal info',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/vault/build-withdraw-tx
 * Build withdrawal transaction for owner to sign
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - ownerWallet: string - Project owner's wallet address
 * - amount: string - Amount to withdraw (in smallest units)
 * - withdrawalType: 'profits' | 'partial' | 'full_close'
 */
router.post('/build-withdraw-tx', async (req, res) => {
    try {
        const { projectId, ownerWallet, amount, withdrawalType = 'partial' } = req.body;

        if (!projectId || !ownerWallet || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, ownerWallet, amount',
            });
        }

        console.log(`\n🏦 Building withdrawal transaction...`);
        console.log(`   Project: ${projectId}`);
        console.log(`   Owner: ${ownerWallet}`);
        console.log(`   Amount: ${amount}`);
        console.log(`   Type: ${withdrawalType}`);

        // Fetch project
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_numeric_id', parseInt(projectId))
            .single();

        if (projectError || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
            });
        }

        // Verify ownership
        if (project.owner_wallet !== ownerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Not project owner',
            });
        }

        // Get network config
        const config = await getNetworkConfig();
        const { connection, program, programId } = await getAnchorProgram();

        // Validate withdrawal amount against limits
        // (Re-calculate to ensure no race conditions)
        const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3333}`;
        const withdrawalInfoResponse = await fetch(
            `${apiBaseUrl}/api/vault/withdrawal-info/${projectId}?ownerWallet=${encodeURIComponent(ownerWallet)}`
        );
        const withdrawalInfo = await withdrawalInfoResponse.json();

        if (!withdrawalInfo.success) {
            return res.status(400).json({
                success: false,
                error: 'Could not validate withdrawal amount',
            });
        }

        const requestedAmount = BigInt(amount);
        const maxWithdrawable = BigInt(withdrawalInfo.withdrawable.maxAmount.raw);
        const pendingReserve = BigInt(withdrawalInfo.reserved.total.raw);

        if (requestedAmount > maxWithdrawable) {
            return res.status(400).json({
                success: false,
                error: `Requested amount exceeds maximum withdrawable. Max: ${withdrawalInfo.withdrawable.maxAmount.formatted} ${project.payment_token_symbol}`,
                maxWithdrawable: withdrawalInfo.withdrawable.maxAmount,
            });
        }

        console.log(`   Pending reserve (passed to on-chain): ${pendingReserve.toString()}`);

        // For full_close, we allow it even with pending boxes
        // The maxWithdrawable already accounts for reserved funds
        // Reserved funds stay in vault for users to claim their boxes
        if (withdrawalType === 'full_close') {
            console.log(`   Closing project with ${withdrawalInfo.boxes.unopenedCount} unopened and ${withdrawalInfo.boxes.unclaimedCount} unclaimed boxes`);
            console.log(`   Reserved funds: ${withdrawalInfo.reserved.total.formatted} ${project.payment_token_symbol}`);
        }

        // Note: No platform fee for project vault withdrawals
        // Platform only takes commission on box purchases (on-chain)

        // Build transaction
        const ownerPubkey = new PublicKey(ownerWallet);
        const paymentTokenMint = new PublicKey(project.payment_token_mint);

        // Derive PDAs
        const [platformConfigPDA] = derivePlatformConfigPDA(programId);
        const [vaultAuthority] = deriveVaultAuthorityPDA(
            programId,
            project.project_numeric_id,
            paymentTokenMint
        );

        const vaultTokenAccount = new PublicKey(project.vault_token_account);

        // Owner's token account
        const ownerTokenAccount = await getAssociatedTokenAddress(
            paymentTokenMint,
            ownerPubkey
        );

        // Build transaction
        const transaction = new Transaction();

        // Check if owner's project token account exists
        const ownerTokenAccountInfo = await connection.getAccountInfo(ownerTokenAccount);
        if (!ownerTokenAccountInfo) {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    ownerPubkey,
                    ownerTokenAccount,
                    ownerPubkey,
                    paymentTokenMint
                )
            );
        }

        // Add withdraw instruction from our program
        // Note: This assumes the Anchor program has a withdraw_earnings instruction
        // The pending_reserve parameter is passed to enforce on-chain reserve protection
        const withdrawIx = await program.methods
            .withdrawEarnings(
                new BN(project.project_numeric_id),
                new BN(amount),
                new BN(pendingReserve.toString())
            )
            .accounts({
                owner: ownerPubkey,
                platformConfig: platformConfigPDA,
                projectConfig: new PublicKey(project.vault_pda),
                vaultAuthority: vaultAuthority,
                vaultTokenAccount: vaultTokenAccount,
                ownerTokenAccount: ownerTokenAccount,
                paymentTokenMint: paymentTokenMint,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .instruction();

        transaction.add(withdrawIx);

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = ownerPubkey;

        // Serialize transaction
        const serializedTx = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString('base64');

        console.log(`✅ Withdrawal transaction built (no platform fee)`);

        return res.json({
            success: true,
            transaction: serializedTx,
            withdrawalDetails: {
                amount: amount,
                amountFormatted: (Number(amount) / Math.pow(10, project.payment_token_decimals || 9)).toFixed(project.payment_token_decimals || 9),
                type: withdrawalType,
            },
            accounts: {
                vaultAuthority: vaultAuthority.toString(),
                vaultTokenAccount: vaultTokenAccount.toString(),
                ownerTokenAccount: ownerTokenAccount.toString(),
            },
            vaultBalanceAfter: {
                raw: (BigInt(withdrawalInfo.vault.balance.raw) - requestedAmount).toString(),
            },
        });

    } catch (error) {
        console.error('❌ Error building withdrawal transaction:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to build withdrawal transaction',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/vault/confirm-withdraw
 * Confirm withdrawal and record in database
 *
 * Body:
 * - projectId: number
 * - signature: string - Withdrawal transaction signature
 * - withdrawalAmount: string
 * - withdrawalType: string
 * - feeAmount: string - Fee paid in platform tokens
 */
router.post('/confirm-withdraw', async (req, res) => {
    try {
        const {
            projectId,
            signature,
            withdrawalAmount,
            withdrawalType,
            feeAmount,
            feePercentage,
            exchangeRate,
            projectTokenPriceUSD,
            platformTokenPriceUSD,
        } = req.body;

        if (!projectId || !signature || !withdrawalAmount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        console.log(`\n✅ Confirming withdrawal for project ${projectId}...`);
        console.log(`   Signature: ${signature}`);

        // Verify transaction on-chain before updating database
        const { connection, programId } = await getAnchorProgram();
        const verification = await verifyTransaction(connection, signature);

        if (!verification.verified) {
            console.error(`❌ Transaction verification failed: ${verification.error}`);
            return res.status(400).json({
                success: false,
                error: 'Transaction verification failed',
                details: verification.error,
            });
        }

        // Verify the transaction invoked our program
        if (!transactionInvokedProgram(verification.transaction, programId.toString())) {
            console.error('❌ Transaction did not invoke the lootbox program');
            return res.status(400).json({
                success: false,
                error: 'Transaction did not invoke the lootbox program',
            });
        }

        console.log('   ✓ Transaction verified on-chain');

        // Fetch project
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_numeric_id', parseInt(projectId))
            .single();

        if (projectError || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
            });
        }

        // CRITICAL SECURITY: Verify the withdrawal transaction matches expected parameters
        // - Verify the signer is the project owner
        // - Verify the withdrawal amount matches what was claimed
        const withdrawalVerification = verifyWithdrawalTransaction(
            verification.transaction,
            project.owner_wallet,
            withdrawalAmount,
            100 // 1% tolerance for rounding
        );

        if (!withdrawalVerification.valid) {
            console.error(`❌ Withdrawal verification failed: ${withdrawalVerification.error}`);
            return res.status(400).json({
                success: false,
                error: 'Withdrawal verification failed',
                details: withdrawalVerification.error,
            });
        }

        console.log('   ✓ Withdrawal amount and signer verified');

        // Use the actual amount from the transaction (more reliable than user-provided)
        const verifiedWithdrawalAmount = withdrawalVerification.actualAmount;

        // Get current vault balance for history
        // connection already obtained above for transaction verification
        let vaultBalanceBefore = BigInt(0);
        let vaultBalanceAfter = BigInt(0);

        if (project.vault_token_account) {
            try {
                const vaultPubkey = new PublicKey(project.vault_token_account);
                const accountInfo = await connection.getAccountInfo(vaultPubkey);
                if (accountInfo) {
                    const amountBN = new BN(accountInfo.data.slice(64, 72), 'le');
                    vaultBalanceAfter = BigInt(amountBN.toString());
                    vaultBalanceBefore = vaultBalanceAfter + BigInt(withdrawalAmount);
                }
            } catch (e) {
                console.error('Error fetching vault balance:', e);
            }
        }

        // Count boxes for history
        const { count: unopenedCount } = await supabase
            .from('boxes')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .eq('box_result', 0);

        // Calculate reserved amount using proper EV calculation
        const boxPrice = BigInt(project.box_price || 0);
        const reservedForBoxes = calculateUnopenedBoxReserve(
            boxPrice,
            unopenedCount || 0,
            DEFAULT_TIER_PROBABILITIES.tier3,
            DEFAULT_PAYOUT_MULTIPLIERS
        );

        // Insert withdrawal history - use verified amount from transaction, not user-provided
        const actualWithdrawalAmount = verifiedWithdrawalAmount.toString();
        const { error: historyError } = await supabase
            .from('withdrawal_history')
            .insert({
                project_id: project.id,
                owner_wallet: project.owner_wallet,
                withdrawal_amount: actualWithdrawalAmount,
                withdrawal_type: withdrawalType || 'partial',
                fee_percentage: feePercentage || 0, // No platform fee on vault withdrawals
                fee_amount_in_project_token: 0, // No platform fee on vault withdrawals
                fee_amount_in_platform_token: feeAmount || 0,
                project_token_price_usd: projectTokenPriceUSD || null,
                platform_token_price_usd: platformTokenPriceUSD || null,
                exchange_rate: exchangeRate || null,
                withdrawal_tx_signature: signature,
                vault_balance_before: vaultBalanceBefore.toString(),
                vault_balance_after: vaultBalanceAfter.toString(),
                reserved_for_boxes: reservedForBoxes.toString(),
                unopened_boxes_count: unopenedCount || 0,
                confirmed_at: new Date().toISOString(),
            });

        if (historyError) {
            console.error('Error inserting withdrawal history:', historyError);
        }

        // Update project totals - use verified amount
        const newTotalWithdrawn = BigInt(project.total_withdrawn || 0) + verifiedWithdrawalAmount;

        const updateData = {
            total_withdrawn: newTotalWithdrawn.toString(),
            last_withdrawal_at: new Date().toISOString(),
        };

        // If full close, mark project as closed
        if (withdrawalType === 'full_close') {
            updateData.closed_at = new Date().toISOString();
            updateData.is_active = false;
        }

        const { error: updateError } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', project.id);

        if (updateError) {
            console.error('Error updating project:', updateError);
        }

        // Log to activity_logs for admin visibility
        await logger.logProjectWithdrawal({
            creatorWallet: project.owner_wallet,
            projectId: project.project_numeric_id,
            projectSubdomain: project.subdomain,
            txSignature: signature,
            amount: withdrawalAmount,
            tokenMint: project.payment_token_mint,
            withdrawalType: withdrawalType || 'partial',
            vaultBalanceBefore: vaultBalanceBefore.toString(),
            vaultBalanceAfter: vaultBalanceAfter.toString(),
            reservedForBoxes: reservedForBoxes.toString(),
            unopenedBoxes: unopenedCount || 0,
        });

        console.log(`✅ Withdrawal confirmed and recorded`);

        const config = await getNetworkConfig();

        return res.json({
            success: true,
            projectId,
            signature,
            withdrawalAmount,
            withdrawalType,
            explorerUrl: `https://solscan.io/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming withdrawal:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to confirm withdrawal',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * GET /api/vault/withdrawal-history/:projectId
 * Get withdrawal history for a project
 */
router.get('/withdrawal-history/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { limit = 10 } = req.query;

        console.log(`\n📜 Fetching withdrawal history for project ${projectId}...`);

        // Get project
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, project_numeric_id, payment_token_symbol, payment_token_decimals')
            .eq('project_numeric_id', parseInt(projectId))
            .single();

        if (projectError || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
            });
        }

        // Get withdrawal history
        const { data: history, error: historyError } = await supabase
            .from('withdrawal_history')
            .select('*')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (historyError) {
            console.error('Error fetching withdrawal history:', historyError);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch withdrawal history',
            });
        }

        const config = await getNetworkConfig();
        const decimals = project.payment_token_decimals || 9;

        // Format history entries
        const formattedHistory = (history || []).map(entry => ({
            id: entry.id,
            amount: {
                raw: entry.withdrawal_amount,
                formatted: (Number(entry.withdrawal_amount) / Math.pow(10, decimals)).toFixed(4),
            },
            type: entry.withdrawal_type,
            fee: {
                percentage: entry.fee_percentage,
                amountInPlatformToken: {
                    raw: entry.fee_amount_in_platform_token,
                    formatted: (Number(entry.fee_amount_in_platform_token) / Math.pow(10, 9)).toFixed(6),
                },
            },
            exchangeRate: entry.exchange_rate,
            signature: entry.withdrawal_tx_signature,
            explorerUrl: entry.withdrawal_tx_signature
                ? `https://solscan.io/tx/${entry.withdrawal_tx_signature}?cluster=${config.network}`
                : null,
            vaultState: {
                balanceBefore: (Number(entry.vault_balance_before) / Math.pow(10, decimals)).toFixed(4),
                balanceAfter: (Number(entry.vault_balance_after) / Math.pow(10, decimals)).toFixed(4),
                reservedForBoxes: (Number(entry.reserved_for_boxes) / Math.pow(10, decimals)).toFixed(4),
                unopenedBoxes: entry.unopened_boxes_count,
            },
            createdAt: entry.created_at,
            confirmedAt: entry.confirmed_at,
        }));

        return res.json({
            success: true,
            projectId: project.project_numeric_id,
            tokenSymbol: project.payment_token_symbol,
            history: formattedHistory,
            network: config.network,
        });

    } catch (error) {
        console.error('❌ Error fetching withdrawal history:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch withdrawal history',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * GET /api/vault/test-jupiter
 * Test Jupiter API connection with well-known mainnet tokens
 * Useful for verifying the price oracle is working
 */
router.get('/test-jupiter', async (req, res) => {
    try {
        console.log('\n🔍 Testing Jupiter API connection...');

        const result = await testJupiterConnection();

        return res.json({
            success: result.success,
            message: result.success
                ? 'Jupiter API is working correctly'
                : 'Jupiter API connection failed',
            prices: result.prices,
            knownTokens: KNOWN_TOKENS,
            apiKeyConfigured: !!process.env.JUPITER_API_KEY,
            mockPricesEnabled: process.env.USE_MOCK_PRICES === 'true' || process.env.NODE_ENV === 'development',
            error: result.error,
        });
    } catch (error) {
        console.error('❌ Error testing Jupiter:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to test Jupiter connection',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

export default router;
