// routes/vault.js
// API routes for vault operations

import express from 'express';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import { getNetworkConfig } from '../lib/getNetworkConfig.js';
import { getAnchorProgram } from '../lib/anchorClient.js';
import { calculateWithdrawalFee, getTokenPriceUSD, testJupiterConnection, KNOWN_TOKENS } from '../lib/priceOracle.js';
import { deriveVaultAuthorityPDA } from '../lib/pdaHelpers.js';

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

/**
 * GET /api/vault/balance/:projectId
 * Fetch vault token account balance from on-chain
 *
 * Returns the current balance of tokens in the project's vault
 */
router.get('/balance/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;

        console.log(`\n💰 Fetching vault balance for project ${projectId}...`);

        // Fetch project from database
        const { data: project, error: dbError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_numeric_id', parseInt(projectId))
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
            details: error.message,
        });
    }
});

// ============================================
// WITHDRAWAL ENDPOINTS
// ============================================

/**
 * Statistical expected payout multiplier at max luck (60)
 * Based on probability distribution:
 * - 30% Dud (0x) = 0
 * - 25% Rebate (0.8x) = 0.2
 * - 20% Break-even (1x) = 0.2
 * - 20% Profit (2.5x) = 0.5
 * - 5% Jackpot (10x) = 0.5
 * Total = 1.4x expected per box at max luck
 */
const EXPECTED_PAYOUT_MULTIPLIER = 1.4;

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

        console.log(`\n💰 Calculating withdrawal info for project ${projectId}...`);

        // Fetch project from database
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

        // Verify owner if wallet provided
        if (ownerWallet && project.owner_wallet !== ownerWallet) {
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

        // Calculate reserved amount for unopened boxes
        // Reserve = unopened_boxes * box_price * expected_payout_multiplier
        const boxPrice = BigInt(project.box_price || 0);
        const reservedForUnopened = BigInt(Math.ceil(
            Number(boxPrice) * unopenedBoxes * EXPECTED_PAYOUT_MULTIPLIER
        ));

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

        // Get creator's platform token balance (fee is paid from their wallet, not the vault)
        let creatorPlatformTokenBalance = BigInt(0);
        const platformTokenMint = config.threeEyesMint?.toString();

        if (platformTokenMint && ownerWallet) {
            try {
                const ownerPubkey = new PublicKey(ownerWallet);
                const platformMintPubkey = new PublicKey(platformTokenMint);
                const creatorPlatformATA = await getAssociatedTokenAddress(
                    platformMintPubkey,
                    ownerPubkey
                );
                const accountInfo = await connection.getAccountInfo(creatorPlatformATA);
                if (accountInfo) {
                    const amountBN = new BN(accountInfo.data.slice(64, 72), 'le');
                    creatorPlatformTokenBalance = BigInt(amountBN.toString());
                }
            } catch (e) {
                console.log('   Creator platform token account not found or empty');
            }
        }

        // Get fee estimate for a sample withdrawal (use maxWithdrawable)
        let feeEstimate = null;
        if (maxWithdrawable > BigInt(0) && platformTokenMint) {
            const feeResult = await calculateWithdrawalFee(
                maxWithdrawable,
                config.withdrawalFeePercentage || 2.5,
                project.payment_token_mint,
                platformTokenMint,
                project.payment_token_decimals || 9,
                9 // Platform token decimals
            );

            if (feeResult.success) {
                feeEstimate = {
                    feePercentage: config.withdrawalFeePercentage || 2.5,
                    feeInProjectToken: feeResult.feeInProjectToken.toString(),
                    feeInPlatformToken: feeResult.feeInPlatformToken.toString(),
                    exchangeRate: feeResult.exchangeRate,
                    projectTokenPriceUSD: feeResult.projectTokenPriceUSD,
                    platformTokenPriceUSD: feeResult.platformTokenPriceUSD,
                    isMockPrice: feeResult.isMockPrice || false,
                };
            } else {
                feeEstimate = {
                    error: feeResult.error,
                };
            }
        }

        // Format values for response
        const decimals = project.payment_token_decimals || 9;
        const formatAmount = (amount) => ({
            raw: amount.toString(),
            formatted: (Number(amount) / Math.pow(10, decimals)).toFixed(decimals),
        });

        // Format platform token balance (9 decimals)
        const formatPlatformAmount = (amount) => ({
            raw: amount.toString(),
            formatted: (Number(amount) / Math.pow(10, 9)).toFixed(9),
        });

        console.log(`✅ Withdrawal info calculated:`);
        console.log(`   Vault balance: ${vaultBalance}`);
        console.log(`   Unopened boxes: ${unopenedBoxes}`);
        console.log(`   Reserved: ${totalReserved}`);
        console.log(`   Max withdrawable: ${maxWithdrawable}`);
        console.log(`   Creator platform token balance: ${creatorPlatformTokenBalance}`);

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
                multiplierUsed: EXPECTED_PAYOUT_MULTIPLIER,
            },
            withdrawable: {
                maxAmount: formatAmount(maxWithdrawable),
                profitOnly: formatAmount(withdrawableProfit),
                profit: formatAmount(profit > BigInt(0) ? profit : BigInt(0)),
                isInLoss: profit < BigInt(0),
                lossAmount: profit < BigInt(0) ? formatAmount(-profit) : null,
            },
            // Creator's platform token balance (for paying withdrawal fee)
            creatorFeeWallet: {
                balance: formatPlatformAmount(creatorPlatformTokenBalance),
                tokenSymbol: 't3EYES2', // Platform token symbol
                tokenMint: platformTokenMint,
            },
            canCloseProject,
            feeEstimate,
            network: config.network,
        });

    } catch (error) {
        console.error('❌ Error calculating withdrawal info:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to calculate withdrawal info',
            details: error.message,
        });
    }
});

/**
 * POST /api/vault/calculate-fee
 * Calculate exact fee for a specific withdrawal amount
 */
router.post('/calculate-fee', async (req, res) => {
    try {
        const { projectId, withdrawalAmount } = req.body;

        if (!projectId || !withdrawalAmount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, withdrawalAmount',
            });
        }

        console.log(`\n💵 Calculating fee for withdrawal of ${withdrawalAmount}...`);

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

        // Get network config
        const config = await getNetworkConfig();
        const platformTokenMint = config.threeEyesMint?.toString();

        if (!platformTokenMint) {
            return res.status(500).json({
                success: false,
                error: 'Platform token not configured',
            });
        }

        // Calculate fee
        const feeResult = await calculateWithdrawalFee(
            BigInt(withdrawalAmount),
            config.withdrawalFeePercentage || 2.5,
            project.payment_token_mint,
            platformTokenMint,
            project.payment_token_decimals || 9,
            9 // Platform token decimals
        );

        if (!feeResult.success) {
            return res.status(400).json({
                success: false,
                error: feeResult.error,
            });
        }

        const decimals = project.payment_token_decimals || 9;

        return res.json({
            success: true,
            withdrawalAmount: {
                raw: withdrawalAmount,
                formatted: (Number(withdrawalAmount) / Math.pow(10, decimals)).toFixed(decimals),
            },
            fee: {
                percentage: config.withdrawalFeePercentage || 2.5,
                inProjectToken: {
                    raw: feeResult.feeInProjectToken.toString(),
                    formatted: (Number(feeResult.feeInProjectToken) / Math.pow(10, decimals)).toFixed(decimals),
                },
                inPlatformToken: {
                    raw: feeResult.feeInPlatformToken.toString(),
                    formatted: (Number(feeResult.feeInPlatformToken) / Math.pow(10, 9)).toFixed(9),
                    symbol: 't3EYES2', // Platform token symbol
                },
            },
            exchangeRate: feeResult.exchangeRate,
            prices: {
                projectTokenUSD: feeResult.projectTokenPriceUSD,
                platformTokenUSD: feeResult.platformTokenPriceUSD,
            },
        });

    } catch (error) {
        console.error('❌ Error calculating fee:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to calculate fee',
            details: error.message,
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
        const withdrawalInfoResponse = await fetch(
            `http://localhost:${process.env.PORT || 3333}/api/vault/withdrawal-info/${projectId}?ownerWallet=${ownerWallet}`
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

        if (requestedAmount > maxWithdrawable) {
            return res.status(400).json({
                success: false,
                error: `Requested amount exceeds maximum withdrawable. Max: ${withdrawalInfo.withdrawable.maxAmount.formatted} ${project.payment_token_symbol}`,
                maxWithdrawable: withdrawalInfo.withdrawable.maxAmount,
            });
        }

        // For full_close, we allow it even with pending boxes
        // The maxWithdrawable already accounts for reserved funds
        // Reserved funds stay in vault for users to claim their boxes
        if (withdrawalType === 'full_close') {
            console.log(`   Closing project with ${withdrawalInfo.boxes.unopenedCount} unopened and ${withdrawalInfo.boxes.unclaimedCount} unclaimed boxes`);
            console.log(`   Reserved funds: ${withdrawalInfo.reserved.total.formatted} ${project.payment_token_symbol}`);
        }

        // Calculate fee
        const platformTokenMintStr = config.threeEyesMint?.toString();
        const feeResult = await calculateWithdrawalFee(
            requestedAmount,
            config.withdrawalFeePercentage || 2.5,
            project.payment_token_mint,
            platformTokenMintStr,
            project.payment_token_decimals || 9,
            9
        );

        if (!feeResult.success) {
            return res.status(400).json({
                success: false,
                error: `Fee calculation failed: ${feeResult.error}`,
            });
        }

        // Build transaction
        const ownerPubkey = new PublicKey(ownerWallet);
        const paymentTokenMint = new PublicKey(project.payment_token_mint);
        const platformTokenMint = config.threeEyesMint;
        const platformFeeAccount = config.platformFeeAccount;

        // Derive PDAs
        const [vaultAuthority] = deriveVaultAuthorityPDA(
            programId,
            project.project_numeric_id,
            paymentTokenMint
        );

        const vaultTokenAccount = new PublicKey(project.vault_token_account);

        // Owner's token accounts
        const ownerTokenAccount = await getAssociatedTokenAddress(
            paymentTokenMint,
            ownerPubkey
        );

        const ownerPlatformTokenAccount = await getAssociatedTokenAddress(
            platformTokenMint,
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
        const withdrawIx = await program.methods
            .withdrawEarnings(
                new BN(project.project_numeric_id),
                new BN(amount)
            )
            .accounts({
                owner: ownerPubkey,
                projectConfig: new PublicKey(project.vault_pda),
                vaultAuthority: vaultAuthority,
                vaultTokenAccount: vaultTokenAccount,
                ownerTokenAccount: ownerTokenAccount,
                paymentTokenMint: paymentTokenMint,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .instruction();

        transaction.add(withdrawIx);

        // Add fee transfer instruction (from creator's wallet to platform fee account)
        // The fee is paid in platform tokens ($3EYES) from the creator's wallet
        if (feeResult.feeInPlatformToken > BigInt(0)) {
            // Get platform fee token account (where fees go)
            const platformFeeTokenAccount = await getAssociatedTokenAddress(
                platformTokenMint,
                platformFeeAccount
            );

            // Check if platform fee account exists, create if not
            const platformFeeAccountInfo = await connection.getAccountInfo(platformFeeTokenAccount);
            if (!platformFeeAccountInfo) {
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        ownerPubkey, // payer
                        platformFeeTokenAccount,
                        platformFeeAccount, // owner of the ATA
                        platformTokenMint
                    )
                );
            }

            // Check if creator has the platform token ATA
            const ownerPlatformAccountInfo = await connection.getAccountInfo(ownerPlatformTokenAccount);
            if (!ownerPlatformAccountInfo) {
                return res.status(400).json({
                    success: false,
                    error: `You don't have a ${project.payment_token_symbol} token account. Please acquire some platform tokens first.`,
                });
            }

            // Verify creator has enough platform tokens for the fee
            const creatorPlatformBalance = new BN(ownerPlatformAccountInfo.data.slice(64, 72), 'le');
            if (BigInt(creatorPlatformBalance.toString()) < feeResult.feeInPlatformToken) {
                return res.status(400).json({
                    success: false,
                    error: `Insufficient platform token balance for fee. Need ${(Number(feeResult.feeInPlatformToken) / 1e9).toFixed(6)} but have ${(Number(creatorPlatformBalance.toString()) / 1e9).toFixed(6)}`,
                    required: feeResult.feeInPlatformToken.toString(),
                    available: creatorPlatformBalance.toString(),
                });
            }

            // Add fee transfer instruction
            const feeTransferIx = createTransferInstruction(
                ownerPlatformTokenAccount, // from: creator's platform token account
                platformFeeTokenAccount,   // to: platform fee account
                ownerPubkey,               // owner/signer
                BigInt(feeResult.feeInPlatformToken.toString())
            );
            transaction.add(feeTransferIx);

            console.log(`   Added fee transfer: ${feeResult.feeInPlatformToken} platform tokens`);
        }

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

        console.log(`✅ Withdrawal transaction built`);

        return res.json({
            success: true,
            transaction: serializedTx,
            withdrawalDetails: {
                amount: amount,
                amountFormatted: (Number(amount) / Math.pow(10, project.payment_token_decimals || 9)).toFixed(project.payment_token_decimals || 9),
                type: withdrawalType,
            },
            fee: {
                percentage: config.withdrawalFeePercentage || 2.5,
                amountInPlatformToken: feeResult.feeInPlatformToken.toString(),
                amountFormatted: (Number(feeResult.feeInPlatformToken) / Math.pow(10, 9)).toFixed(9),
                platformTokenSymbol: 't3EYES2',
                exchangeRate: feeResult.exchangeRate,
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
            details: error.message,
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

        // Get current vault balance for history
        const { connection } = await getAnchorProgram();
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

        // Calculate reserved amount
        const boxPrice = BigInt(project.box_price || 0);
        const reservedForBoxes = BigInt(Math.ceil(
            Number(boxPrice) * (unopenedCount || 0) * EXPECTED_PAYOUT_MULTIPLIER
        ));

        // Insert withdrawal history
        const { error: historyError } = await supabase
            .from('withdrawal_history')
            .insert({
                project_id: project.id,
                owner_wallet: project.owner_wallet,
                withdrawal_amount: withdrawalAmount,
                withdrawal_type: withdrawalType || 'partial',
                fee_percentage: feePercentage || 2.5,
                fee_amount_in_project_token: Math.ceil(Number(withdrawalAmount) * (feePercentage || 2.5) / 100),
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

        // Update project totals
        const newTotalWithdrawn = BigInt(project.total_withdrawn || 0) + BigInt(withdrawalAmount);

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
            details: error.message,
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
            details: error.message,
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
            details: error.message,
        });
    }
});

export default router;
