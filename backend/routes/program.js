// routes/program.js
// API routes for calling Anchor program instructions

import express from 'express';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    createAssociatedTokenAccountIdempotentInstruction,
    createTransferCheckedInstruction,
    getMint
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import {
    getAnchorProgram
} from '../lib/anchorClient.js';
import {
    deriveAllPDAs,
    derivePlatformConfigPDA,
    deriveProjectConfigPDA as deriveProjectConfigPDAStandalone,
    deriveBoxInstancePDA,
    deriveVaultAuthorityPDA,
    deriveVaultTokenAccount,
    deriveTreasuryPDA,
    deriveTreasuryTokenAccount,
    getTokenProgramForMint
} from '../lib/pdaHelpers.js';
import { getNetworkConfig } from '../lib/getNetworkConfig.js';
import { createClient } from '@supabase/supabase-js';
import {
    createRandomnessAccount,
    createCommitInstruction,
    createRevealInstruction,
    createCloseInstruction,
    loadRandomness,
    readRandomnessValue,
    serializeKeypair,
    getSwitchboardConstants,
    getSwitchboardProgram
} from '../lib/switchboard.js';
import {
    calculateMinimumVaultFunding,
    DEFAULT_TIER_PROBABILITIES,
    DEFAULT_PAYOUT_MULTIPLIERS,
} from '../lib/evCalculator.js';
import logger, { EventTypes, Severity, ActorTypes } from '../lib/logger.js';
import { getRandomBadgeId } from '../config/badges.js';
import { verifyTransaction, transactionInvokedProgram, sanitizeErrorMessage } from '../lib/utils.js';

const router = express.Router();

// ===== TESTING CONFIG =====
// Set to 30 for quick testing, 3600 for production (1 hour)
const REVEAL_WINDOW_SECONDS = 3600;
// ===========================

// Initialize Supabase client
// Use service role key for backend operations that need to bypass RLS
// (e.g., updating boxes after commit/reveal/settle)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * POST /api/program/build-initialize-project-tx
 * Build an initialize project transaction (returns serialized transaction for frontend to sign)
 *
 * Body:
 * - projectId: number - Numeric project ID (from database)
 * - boxPrice: number - Price per box in tokens (with decimals)
 * - paymentTokenMint: string - Payment token mint address
 * - ownerWallet: string - Project owner wallet address
 */
router.post('/build-initialize-project-tx', async (req, res) => {
    try {
        const { projectId, boxPrice, paymentTokenMint, ownerWallet, luckIntervalSeconds } = req.body;

        // Validate input
        if (!projectId || !boxPrice || !paymentTokenMint || !ownerWallet) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, boxPrice, paymentTokenMint, ownerWallet'
            });
        }

        // Default luck interval to 0 (use platform default) if not provided
        const luckInterval = luckIntervalSeconds ?? 0;

        console.log(`\n🔨 Building initialize project transaction for project ${projectId}...`);
        console.log(`   Box price: ${boxPrice}`);
        console.log(`   Payment token: ${paymentTokenMint}`);
        console.log(`   Owner: ${ownerWallet}`);
        console.log(`   Luck interval: ${luckInterval} (0 = platform default)`);

        // Get Anchor program and network config
        const { program, provider, connection, programId } = await getAnchorProgram();
        const config = await getNetworkConfig();

        // Fetch admin config from database for launch fee settings
        const { data: adminConfig, error: configError } = await supabase
            .from('super_admin_config')
            .select('*')
            .eq('id', 1)
            .single();

        if (configError || !adminConfig) {
            throw new Error('Failed to fetch admin config');
        }

        console.log(`\n💰 Launch fee: ${adminConfig.launch_fee_amount / 1e6} ${adminConfig.three_eyes_mint.substring(0, 8)}...`); // 3EYES uses 6 decimals

        // Calculate dynamic vault fund amount based on box price
        // Uses worst-case (99th percentile) reserve calculation for ~100 boxes at max luck
        // Minimum is 30x box price (based on Grok's variance analysis)
        const boxPriceBigInt = BigInt(boxPrice);
        const vaultFundAmount = calculateMinimumVaultFunding(
            boxPriceBigInt,
            DEFAULT_TIER_PROBABILITIES.tier3,
            DEFAULT_PAYOUT_MULTIPLIERS
        );
        console.log(`💰 Dynamic vault fund amount: ${Number(vaultFundAmount) / 1e9} tokens (based on ${Number(boxPriceBigInt) / 1e9} box price)`);

        // Convert inputs to proper types
        const paymentTokenMintPubkey = new PublicKey(paymentTokenMint);
        const ownerPubkey = new PublicKey(ownerWallet);
        const feeTokenMintPubkey = new PublicKey(adminConfig.three_eyes_mint);

        // Detect token programs for both payment token and fee token (Token vs Token-2022)
        const paymentTokenProgram = await getTokenProgramForMint(connection, paymentTokenMintPubkey);
        const feeTokenProgram = await getTokenProgramForMint(connection, feeTokenMintPubkey);

        console.log(`   Payment token program: ${paymentTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'}`);
        console.log(`   Fee token program: ${feeTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'}`);

        // Find an available project ID (auto-advance if PDA already exists on-chain)
        let currentProjectId = parseInt(projectId);
        let pdas;
        let projectConfigPDA;
        let projectConfigInfo;
        const maxAttempts = 20; // Safety limit to prevent infinite loops

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            pdas = await deriveAllPDAs(programId, currentProjectId, paymentTokenMintPubkey, connection);
            projectConfigPDA = pdas.projectConfig.address;
            projectConfigInfo = await connection.getAccountInfo(projectConfigPDA);

            if (!projectConfigInfo) {
                // Found an available ID
                if (currentProjectId !== parseInt(projectId)) {
                    console.log(`⚠️  Project ID ${projectId} already exists on-chain, using ${currentProjectId} instead`);

                    // Update the database counter to stay in sync
                    // This advances the counter so future projects get IDs after this one
                    await supabase.rpc('setval_project_counter', { new_val: currentProjectId });

                    // Update the project record with the new ID
                    const { error: updateIdError } = await supabase
                        .from('projects')
                        .update({ project_numeric_id: currentProjectId })
                        .eq('project_numeric_id', parseInt(projectId));

                    if (updateIdError) {
                        console.error('Failed to update project numeric ID:', updateIdError);
                        // Continue anyway - the on-chain ID is what matters
                    }
                }
                break;
            }

            console.log(`🔍 Project ID ${currentProjectId} already exists on-chain, trying ${currentProjectId + 1}...`);
            currentProjectId++;
        }

        // If we exhausted all attempts, fail
        if (projectConfigInfo) {
            console.error(`❌ Could not find available project ID after ${maxAttempts} attempts`);
            return res.status(409).json({
                success: false,
                error: 'No available project IDs',
                details: `Tried project IDs ${projectId} through ${currentProjectId - 1}, all already exist on-chain. Please contact an administrator.`,
            });
        }

        const vaultAuthorityPDA = pdas.vaultAuthority.address;
        const vaultAuthorityBump = pdas.vaultAuthority.bump;
        const treasuryPDA = pdas.treasury.address;

        console.log(`\n📍 Derived PDAs (Project ID: ${currentProjectId}):`);
        console.log(`   Project Config: ${projectConfigPDA.toString()}`);
        console.log(`   Vault Authority: ${vaultAuthorityPDA.toString()}`);
        console.log(`   Vault Authority Bump: ${vaultAuthorityBump}`);
        console.log(`   Treasury PDA: ${treasuryPDA.toString()}`);

        const vaultTokenAccount = pdas.vaultTokenAccount.address;

        console.log(`   Vault Token Account: ${vaultTokenAccount.toString()}`);

        // Derive fee token ATAs (for launch fee payment) - using correct token program
        const ownerFeeTokenAccount = getAssociatedTokenAddressSync(
            feeTokenMintPubkey,
            ownerPubkey,
            false,
            feeTokenProgram,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Launch fee goes to treasury PDA's token account (not admin wallet)
        const treasuryFeeTokenAccount = getAssociatedTokenAddressSync(
            feeTokenMintPubkey,
            treasuryPDA,
            true, // allowOwnerOffCurve - PDAs can own token accounts
            feeTokenProgram,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        console.log(`\n💳 Fee token accounts:`);
        console.log(`   Owner fee account: ${ownerFeeTokenAccount.toString()}`);
        console.log(`   Treasury fee account: ${treasuryFeeTokenAccount.toString()}`);

        // Get owner's payment token account (for vault funding) - using correct token program
        const ownerPaymentTokenAccount = getAssociatedTokenAddressSync(
            paymentTokenMintPubkey,
            ownerPubkey,
            false,
            paymentTokenProgram,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        console.log(`   Owner payment token account: ${ownerPaymentTokenAccount.toString()}`);

        // Convert box price and launch fee to BN
        const boxPriceBN = new BN(boxPrice);
        const projectIdBN = new BN(currentProjectId); // Use the validated/adjusted project ID
        const launchFeeBN = new BN(adminConfig.launch_fee_amount);

        console.log(`\n📝 Building initialize_project transaction with vault funding...`);

        // Build the combined transaction
        const combinedTransaction = new Transaction();

        // Step 1a: Create vault ATA (idempotent - no-op if exists, avoids RPC cache issues)
        const createVaultAtaIx = createAssociatedTokenAccountIdempotentInstruction(
            ownerPubkey, // payer
            vaultTokenAccount, // ata
            vaultAuthorityPDA, // owner
            paymentTokenMintPubkey, // mint
            paymentTokenProgram, // Token or Token-2022
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        combinedTransaction.add(createVaultAtaIx);
        console.log(`   Added: Create vault ATA instruction (idempotent, ${paymentTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'})`);

        // Step 1b: Create treasury fee token account (idempotent - for launch fee)
        const createTreasuryFeeAtaIx = createAssociatedTokenAccountIdempotentInstruction(
            ownerPubkey, // payer
            treasuryFeeTokenAccount, // ata
            treasuryPDA, // owner (treasury PDA)
            feeTokenMintPubkey, // mint (3EYES token)
            feeTokenProgram, // Token or Token-2022
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        combinedTransaction.add(createTreasuryFeeAtaIx);
        console.log(`   Added: Create treasury fee ATA instruction (idempotent, ${feeTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'})`);

        // Step 2: Build the Anchor initialize_project instruction
        // Note: The token_program in initialize_project is used for the launch fee transfer (fee token)
        const luckIntervalBN = new BN(luckInterval);
        const initProjectTx = await program.methods
            .initializeProject(
                projectIdBN,
                boxPriceBN,
                launchFeeBN,
                luckIntervalBN
            )
            .accounts({
                owner: ownerPubkey,
                projectConfig: projectConfigPDA,
                vaultAuthority: vaultAuthorityPDA,
                paymentTokenMint: paymentTokenMintPubkey,
                ownerFeeTokenAccount: ownerFeeTokenAccount,
                platformFeeTokenAccount: treasuryFeeTokenAccount, // Launch fee goes to treasury PDA
                feeTokenMint: feeTokenMintPubkey,
                systemProgram: SystemProgram.programId,
                tokenProgram: feeTokenProgram, // Use fee token's program (Token or Token-2022)
                rent: SYSVAR_RENT_PUBKEY,
            })
            .transaction();

        // Add all instructions from the Anchor transaction
        combinedTransaction.add(...initProjectTx.instructions);

        // Step 3: Transfer payment tokens to vault for funding
        // Must use TransferChecked for Token-2022 compatibility
        const mintInfo = await getMint(connection, paymentTokenMintPubkey, 'confirmed', paymentTokenProgram);
        const fundVaultIx = createTransferCheckedInstruction(
            ownerPaymentTokenAccount, // source
            paymentTokenMintPubkey, // mint
            vaultTokenAccount, // destination
            ownerPubkey, // owner of source
            vaultFundAmount, // amount
            mintInfo.decimals, // decimals
            [], // multiSigners
            paymentTokenProgram // Token or Token-2022
        );
        combinedTransaction.add(fundVaultIx);

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        combinedTransaction.recentBlockhash = blockhash;
        combinedTransaction.feePayer = ownerPubkey;

        // Serialize transaction to send to frontend
        const serializedTransaction = combinedTransaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString('base64');

        console.log(`\n✅ Transaction built successfully!`);
        console.log(`   Transaction includes:`);
        console.log(`   - Create vault ATA (idempotent)`);
        console.log(`   - Create treasury fee ATA (idempotent)`);
        console.log(`   - Initialize project on-chain`);
        console.log(`   - Fund vault with ${Number(vaultFundAmount) / 1e9} tokens (dynamic: ~${Math.round(Number(vaultFundAmount) / Number(boxPriceBigInt))}x box price)`);
        console.log(`   Transaction will be signed by frontend wallet`);

        // Return transaction for frontend to sign and submit
        return res.json({
            success: true,
            transaction: serializedTransaction,
            projectId: currentProjectId, // Use the validated/adjusted project ID
            originalProjectId: parseInt(projectId), // Include original for debugging
            projectIdAdjusted: currentProjectId !== parseInt(projectId), // Flag if ID was changed
            pdas: {
                projectConfig: projectConfigPDA.toString(),
                vaultAuthority: vaultAuthorityPDA.toString(),
                vaultAuthorityBump,
                vaultTokenAccount: vaultTokenAccount.toString(),
            },
            vaultFunding: {
                amount: vaultFundAmount.toString(),
                formatted: Number(vaultFundAmount) / Math.pow(10, mintInfo.decimals),
                decimals: mintInfo.decimals,
            },
            launchFee: {
                amount: adminConfig.launch_fee_amount.toString(),
                formatted: Number(adminConfig.launch_fee_amount) / 1e6, // 3EYES uses 6 decimals
            },
            network: config.network,
        });

    } catch (error) {
        console.error('❌ Error building transaction:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to build initialize project transaction',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/confirm-project-init
 * Update database with PDAs after frontend successfully submits transaction
 * Now also marks vault as funded since funding happens in the same transaction
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - signature: string - Transaction signature
 * - pdas: object - PDA addresses { projectConfig, vaultAuthority, vaultTokenAccount }
 * - vaultFunding: object (optional) - { amount, formatted } - Vault funding details
 * - launchFee: object (optional) - { amount, formatted } - Launch fee paid to treasury
 */
router.post('/confirm-project-init', async (req, res) => {
    try {
        const { projectId, signature, pdas, vaultFunding, launchFee } = req.body;

        if (!projectId || !signature || !pdas) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, signature, pdas'
            });
        }

        console.log(`\n✅ Confirming project ${projectId} initialization...`);
        console.log(`   Transaction: ${signature}`);
        if (vaultFunding) {
            console.log(`   Vault funded with: ${vaultFunding.formatted} tokens`);
        }

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

        // Update database with PDA addresses and vault funding status
        const updateData = {
            vault_pda: pdas.projectConfig,
            vault_authority_pda: pdas.vaultAuthority,
            vault_token_account: pdas.vaultTokenAccount,
        };

        // If vault funding info is provided, mark vault as funded
        if (vaultFunding) {
            updateData.vault_funded = true;
            updateData.vault_funded_amount = vaultFunding.amount;
            updateData.vault_funded_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
            .from('projects')
            .update(updateData)
            .eq('project_numeric_id', projectId);

        if (updateError) {
            console.error('⚠️  Warning: Failed to update database with PDAs:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to update database',
                details: updateError.message,
            });
        }

        console.log(`✅ Database updated with PDA addresses${vaultFunding ? ' and vault funding status' : ''}`);

        const config = await getNetworkConfig();

        // Fetch project details for logging
        const { data: project } = await supabase
            .from('projects')
            .select('subdomain, owner_wallet, box_price, payment_token_mint')
            .eq('project_numeric_id', projectId)
            .single();

        // Log project creation
        await logger.logProjectCreated({
            creatorWallet: project?.owner_wallet,
            projectId,
            subdomain: project?.subdomain,
            txSignature: signature,
            boxPrice: project?.box_price,
            tokenMint: project?.payment_token_mint,
        });

        // Log launch fee payment (paid to platform treasury)
        if (launchFee) {
            await logger.logLaunchFeePaid({
                creatorWallet: project?.owner_wallet,
                projectId,
                subdomain: project?.subdomain,
                txSignature: signature,
                amount: launchFee.amount,
                tokenMint: project?.payment_token_mint,
            });
        }

        // Log vault funding (creator funding their own project vault)
        if (vaultFunding) {
            await logger.logVaultFunded({
                creatorWallet: project?.owner_wallet,
                projectId,
                subdomain: project?.subdomain,
                txSignature: signature,
                amount: vaultFunding.amount,
                tokenMint: project?.payment_token_mint,
                boxPrice: project?.box_price,
            });
        }

        return res.json({
            success: true,
            projectId,
            signature,
            vaultFunded: !!vaultFunding,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming project init:', error);

        // Log the error
        await logger.logTransactionError({
            actorType: ActorTypes.CREATOR,
            projectId: req.body?.projectId,
            txSignature: req.body?.signature,
            errorCode: 'PROJECT_INIT_FAILED',
            errorMessage: error.message,
            instruction: 'confirm-project-init',
        });

        return res.status(500).json({
            success: false,
            error: 'Failed to confirm project initialization',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/build-fund-vault-tx
 * Build transaction for funding a project vault with tokens
 * This is required after project initialization - the owner must fund the vault
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - ownerWallet: string - Project owner wallet address
 * - amount: number (optional) - Amount to fund (defaults to config.vaultFundAmount)
 */
router.post('/build-fund-vault-tx', async (req, res) => {
    try {
        const { projectId, ownerWallet, amount } = req.body;

        // Validate input
        if (!projectId || !ownerWallet) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, ownerWallet'
            });
        }

        console.log(`\n💰 Building fund vault transaction for project ${projectId}...`);
        console.log(`   Owner: ${ownerWallet}`);

        // Get network config
        const config = await getNetworkConfig();
        const { connection, programId } = await getAnchorProgram();

        // Fetch project from database
        const { data: project, error: dbError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_numeric_id', projectId)
            .single();

        if (dbError || !project) {
            throw new Error('Project not found in database');
        }

        // Verify ownership
        if (project.owner_wallet !== ownerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized - you are not the owner of this project',
            });
        }

        console.log(`   Project: ${project.project_name}`);
        console.log(`   Payment token: ${project.payment_token_mint}`);

        // Determine fund amount - use provided amount or config default
        const fundAmount = amount ? BigInt(amount) : config.vaultFundAmount;
        const fundAmountFormatted = Number(fundAmount) / Math.pow(10, project.payment_token_decimals || 9);

        console.log(`   Fund amount: ${fundAmountFormatted} ${project.payment_token_symbol || 'tokens'}`);

        // Convert addresses to PublicKeys
        const ownerPubkey = new PublicKey(ownerWallet);
        const paymentTokenMintPubkey = new PublicKey(project.payment_token_mint);

        // Detect token program (Token vs Token-2022)
        const paymentTokenProgram = await getTokenProgramForMint(connection, paymentTokenMintPubkey);
        console.log(`   Token program: ${paymentTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'}`);

        // Derive PDAs with correct token program
        const [vaultAuthorityPDA] = deriveVaultAuthorityPDA(programId, projectId, paymentTokenMintPubkey);
        const vaultTokenAccount = deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMintPubkey, paymentTokenProgram);

        // Get owner's token account with correct token program
        const ownerTokenAccount = getAssociatedTokenAddressSync(
            paymentTokenMintPubkey,
            ownerPubkey,
            false,
            paymentTokenProgram,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        console.log(`   Vault token account: ${vaultTokenAccount.toString()}`);
        console.log(`   Owner token account: ${ownerTokenAccount.toString()}`);

        // Build transaction
        const transaction = new Transaction();

        // Create vault ATA (idempotent - no-op if exists, avoids RPC cache issues)
        const createVaultAtaIx = createAssociatedTokenAccountIdempotentInstruction(
            ownerPubkey, // payer
            vaultTokenAccount, // ata
            vaultAuthorityPDA, // owner
            paymentTokenMintPubkey, // mint
            paymentTokenProgram, // Token or Token-2022
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        transaction.add(createVaultAtaIx);
        console.log(`   Added: Create vault ATA instruction (idempotent)`);

        // Add SPL token transfer instruction
        // Must use TransferChecked for Token-2022 compatibility
        const mintInfo = await getMint(connection, paymentTokenMintPubkey, 'confirmed', paymentTokenProgram);
        const transferIx = createTransferCheckedInstruction(
            ownerTokenAccount, // source
            paymentTokenMintPubkey, // mint
            vaultTokenAccount, // destination
            ownerPubkey, // owner of source
            BigInt(fundAmount.toString()), // amount
            mintInfo.decimals, // decimals
            [], // multiSigners
            paymentTokenProgram // Token or Token-2022
        );
        transaction.add(transferIx);

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        // Serialize transaction
        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString('base64');

        console.log(`✅ Fund vault transaction built successfully`);

        return res.json({
            success: true,
            transaction: serializedTransaction,
            projectId,
            fundAmount: fundAmount.toString(),
            fundAmountFormatted,
            symbol: project.payment_token_symbol || 'tokens',
            vaultTokenAccount: vaultTokenAccount.toString(),
            network: config.network,
        });

    } catch (error) {
        console.error('❌ Error building fund vault transaction:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to build fund vault transaction',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/confirm-vault-funding
 * Record vault funding confirmation in database
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - signature: string - Transaction signature
 * - amount: string - Amount funded
 */
router.post('/confirm-vault-funding', async (req, res) => {
    try {
        const { projectId, signature, amount } = req.body;

        if (!projectId || !signature || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, signature, amount'
            });
        }

        console.log(`\n✅ Confirming vault funding for project ${projectId}...`);
        console.log(`   Transaction: ${signature}`);
        console.log(`   Amount: ${amount}`);

        // Verify transaction on-chain before updating database
        const { connection } = await getAnchorProgram();
        const verification = await verifyTransaction(connection, signature);

        if (!verification.verified) {
            console.error(`❌ Transaction verification failed: ${verification.error}`);
            return res.status(400).json({
                success: false,
                error: 'Transaction verification failed',
                details: verification.error,
            });
        }

        console.log('   ✓ Transaction verified on-chain');

        // Update database to mark vault as funded
        const { error: updateError } = await supabase
            .from('projects')
            .update({
                vault_funded: true,
                vault_funded_amount: amount,
                vault_funded_at: new Date().toISOString(),
            })
            .eq('project_numeric_id', projectId);

        if (updateError) {
            console.error('⚠️  Warning: Failed to update vault funding status:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to update database',
                details: updateError.message,
            });
        }

        console.log(`✅ Vault funding recorded in database`);

        const config = await getNetworkConfig();

        return res.json({
            success: true,
            projectId,
            signature,
            amount,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming vault funding:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to confirm vault funding',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * GET /api/program/project/:projectId
 * Fetch on-chain project state
 */
router.get('/project/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;

        const config = await getNetworkConfig();
        const { connection, program } = await getAnchorProgram();
        const [projectConfigPDA] = deriveProjectConfigPDAStandalone(config.programId, parseInt(projectId));

        // Fetch account info directly from connection
        const accountInfo = await connection.getAccountInfo(projectConfigPDA);

        if (!accountInfo) {
            return res.status(404).json({
                success: false,
                error: 'Project not initialized on-chain',
                details: 'The project exists in the database but has not been initialized on-chain yet.',
            });
        }

        // Manually deserialize ProjectConfig account data
        // Skip 8-byte discriminator
        let offset = 8;
        const data = accountInfo.data;

        // Read fields in order from Rust struct
        const projectIdBN = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;

        const owner = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        const paymentTokenMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        const boxPriceBN = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;

        const vaultAuthorityBump = data[offset];
        offset += 1;

        const totalBoxesCreatedBN = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;

        const totalBoxesSettledBN = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;

        const totalRevenueBN = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;

        const totalPaidOutBN = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;

        const active = data[offset] === 1;
        offset += 1;

        const launchFeePaid = data[offset] === 1;
        offset += 1;

        const createdAtBN = new BN(data.slice(offset, offset + 8), 'le');

        return res.json({
            success: true,
            projectId,
            onChainData: {
                projectId: projectIdBN.toString(),
                owner: owner.toString(),
                paymentTokenMint: paymentTokenMint.toString(),
                boxPrice: boxPriceBN.toString(),
                vaultAuthorityBump,
                totalBoxesCreated: totalBoxesCreatedBN.toString(),
                totalBoxesSettled: totalBoxesSettledBN.toString(),
                totalRevenue: totalRevenueBN.toString(),
                totalPaidOut: totalPaidOutBN.toString(),
                active,
                launchFeePaid,
                createdAt: new Date(createdAtBN.toNumber() * 1000).toISOString(),
            },
            pda: projectConfigPDA.toString(),
        });

    } catch (error) {
        console.error('Error fetching project:', error);

        // Check if account doesn't exist
        if (error.message?.includes('Account does not exist')) {
            return res.status(404).json({
                success: false,
                error: 'Project not initialized on-chain',
                details: 'The project exists in the database but has not been initialized on-chain yet.',
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Failed to fetch project',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/derive-pdas
 * Derive PDAs for a project (utility endpoint for testing)
 */
router.post('/derive-pdas', async (req, res) => {
    try {
        const { projectId, paymentTokenMint } = req.body;

        if (!projectId || !paymentTokenMint) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, paymentTokenMint'
            });
        }

        console.log(`\n🔑 Deriving PDAs for project ${projectId}...`);

        const config = await getNetworkConfig();
        const programId = config.programId;

        console.log(`   Program ID: ${programId.toString()}`);

        const paymentTokenMintPubkey = new PublicKey(paymentTokenMint);
        console.log(`   Payment token: ${paymentTokenMintPubkey.toString()}`);

        const pdas = await deriveAllPDAs(programId, parseInt(projectId), paymentTokenMintPubkey);

        console.log(`✅ PDAs derived successfully`);
        console.log(`   Project Config PDA: ${pdas.projectConfig.address.toString()}`);
        console.log(`   Vault Authority PDA: ${pdas.vaultAuthority.address.toString()}`);
        console.log(`   Vault Token Account: ${pdas.vaultTokenAccount.address.toString()}`);

        return res.json({
            success: true,
            projectId: parseInt(projectId),
            paymentTokenMint,
            pdas: {
                projectConfig: {
                    address: pdas.projectConfig.address.toString(),
                    bump: pdas.projectConfig.bump,
                    seeds: ['project', projectId],
                },
                vaultAuthority: {
                    address: pdas.vaultAuthority.address.toString(),
                    bump: pdas.vaultAuthority.bump,
                    seeds: ['vault', projectId, paymentTokenMint],
                },
                vaultTokenAccount: {
                    address: pdas.vaultTokenAccount.address.toString(),
                    type: 'Associated Token Account',
                },
            },
        });

    } catch (error) {
        console.error('❌ Error deriving PDAs:', error);
        console.error('Stack trace:', error.stack);
        return res.status(500).json({
            success: false,
            error: 'Failed to derive PDAs',
            details: sanitizeErrorMessage(error.message),
            stack: error.stack,
        });
    }
});

/**
 * POST /api/program/build-create-box-tx
 * Build transaction for purchasing a lootbox (payment only, no randomness)
 *
 * The transaction includes:
 * 1. Create vault ATA if needed
 * 2. Create box (payment transfer to vault)
 *
 * Box is created in "pending" state. User must later call commit_box to open it.
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - buyerWallet: string - Buyer's wallet address
 *
 * Returns:
 * - transaction: Serialized transaction for buyer to sign
 * - boxId: The ID of the box being created
 * - boxInstancePDA: PDA address of the box
 */
router.post('/build-create-box-tx', async (req, res) => {
    try {
        const { projectId, buyerWallet } = req.body;

        // Validate input
        if (!projectId || !buyerWallet) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, buyerWallet'
            });
        }

        console.log(`\n🎲 Building create box transaction for project ${projectId}...`);
        console.log(`   Buyer: ${buyerWallet}`);

        // Get Anchor program and network config
        const { program, provider, connection, programId } = await getAnchorProgram();
        const config = await getNetworkConfig();

        // Fetch project from database
        const { data: project, error: dbError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_numeric_id', projectId)
            .single();

        if (dbError || !project) {
            throw new Error('Project not found in database');
        }

        // Prevent project owners from buying their own boxes
        if (project.owner_wallet === buyerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Project owners cannot purchase boxes from their own project',
            });
        }

        console.log(`   Project: ${project.project_name}`);
        console.log(`   Box price: ${project.box_price / Math.pow(10, project.payment_token_decimals)} ${project.payment_token_symbol}`);

        // Fetch on-chain project config to get current box count
        const [projectConfigPDA] = deriveProjectConfigPDAStandalone(new PublicKey(config.programId), projectId);
        const accountInfo = await connection.getAccountInfo(projectConfigPDA);

        if (!accountInfo) {
            throw new Error('Project not initialized on-chain');
        }

        // Read total_boxes_created from on-chain data (offset 41)
        let offset = 8 + 8 + 32 + 32 + 8 + 1; // Skip to total_boxes_created
        const totalBoxesCreatedBN = new BN(accountInfo.data.slice(offset, offset + 8), 'le');
        // Smart contract uses total_boxes_created + 1 for the box ID seeds
        const nextBoxId = totalBoxesCreatedBN.toNumber() + 1;

        console.log(`   Current boxes created: ${totalBoxesCreatedBN.toNumber()}`);
        console.log(`   Next box ID (counter + 1): ${nextBoxId}`);

        // Convert addresses to PublicKeys
        const buyerPubkey = new PublicKey(buyerWallet);
        const paymentTokenMintPubkey = new PublicKey(project.payment_token_mint);

        // Detect token program (Token vs Token-2022)
        const paymentTokenProgram = await getTokenProgramForMint(connection, paymentTokenMintPubkey);
        console.log(`   Token program: ${paymentTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'}`);

        // Derive PDAs
        const [platformConfigPDA] = derivePlatformConfigPDA(programId);
        const [boxInstancePDA, boxInstanceBump] = deriveBoxInstancePDA(programId, projectId, nextBoxId);
        const [vaultAuthorityPDA] = deriveVaultAuthorityPDA(programId, projectId, paymentTokenMintPubkey);
        const vaultTokenAccount = deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMintPubkey, paymentTokenProgram);

        // Derive treasury PDAs for commission collection
        const [treasuryPDA] = deriveTreasuryPDA(programId);
        const treasuryTokenAccount = deriveTreasuryTokenAccount(treasuryPDA, paymentTokenMintPubkey, paymentTokenProgram);

        // Derive buyer's token account with correct program
        const buyerTokenAccount = getAssociatedTokenAddressSync(
            paymentTokenMintPubkey,
            buyerPubkey,
            false,
            paymentTokenProgram,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        console.log(`   Platform config PDA: ${platformConfigPDA.toString()}`);
        console.log(`   Box instance PDA: ${boxInstancePDA.toString()}`);
        console.log(`   Vault token account: ${vaultTokenAccount.toString()}`);
        console.log(`   Treasury PDA: ${treasuryPDA.toString()}`);
        console.log(`   Treasury token account: ${treasuryTokenAccount.toString()}`);
        console.log(`   Buyer token account: ${buyerTokenAccount.toString()}`);

        // Fetch platform config to get commission rate
        const platformConfigInfo = await connection.getAccountInfo(platformConfigPDA);
        let commissionBps = 500; // Default 5% if can't read
        if (platformConfigInfo) {
            // Commission is stored at a specific offset in the platform config
            // Skip: discriminator(8) + admin(32) + initialized(1) + paused(1) + baseLuck(1) + maxLuck(1) + luckTimeInterval(8)
            // + payouts(5*4=20) + tier1(1+4*2=9) + tier2(1+4*2=9) + tier3(4*2=8) = 8+32+1+1+1+1+8+20+9+9+8 = 98
            const commissionOffset = 98;
            commissionBps = platformConfigInfo.data.readUInt16LE(commissionOffset);
        }

        // Calculate fee split
        const boxPriceRaw = BigInt(project.box_price);
        const commissionAmount = (boxPriceRaw * BigInt(commissionBps)) / BigInt(10000);
        const creatorAmount = boxPriceRaw - commissionAmount;
        const decimals = project.payment_token_decimals;
        const symbol = project.payment_token_symbol;

        console.log(`\n💰 Fee split (${commissionBps / 100}% platform commission):`);
        console.log(`   Total box price: ${Number(boxPriceRaw) / Math.pow(10, decimals)} ${symbol}`);
        console.log(`   → Platform treasury: ${Number(commissionAmount) / Math.pow(10, decimals)} ${symbol} (${commissionBps / 100}%)`);
        console.log(`   → Creator vault: ${Number(creatorAmount) / Math.pow(10, decimals)} ${symbol} (${(10000 - commissionBps) / 100}%)`);

        // ========================================
        // BUILD TRANSACTION (no Switchboard - that happens at commit time)
        // ========================================
        console.log(`\n📝 Building purchase transaction...`);

        const transaction = new Transaction();

        // 1. Create vault ATA (idempotent - no-op if exists, avoids RPC cache issues)
        const createVaultIx = createAssociatedTokenAccountIdempotentInstruction(
            buyerPubkey, // payer
            vaultTokenAccount, // ata
            vaultAuthorityPDA, // owner
            paymentTokenMintPubkey, // mint
            paymentTokenProgram, // Token or Token-2022
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        transaction.add(createVaultIx);
        console.log(`   Added: Create vault ATA instruction (idempotent, ${paymentTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'})`);

        // 2. Create treasury ATA (idempotent - no-op if exists, avoids RPC cache issues)
        const createTreasuryIx = createAssociatedTokenAccountIdempotentInstruction(
            buyerPubkey, // payer
            treasuryTokenAccount, // ata
            treasuryPDA, // owner
            paymentTokenMintPubkey, // mint
            paymentTokenProgram, // Token or Token-2022
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        transaction.add(createTreasuryIx);
        console.log(`   Added: Create treasury ATA instruction (idempotent, ${paymentTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'})`);


        // 3. Create box (no randomness - will be committed when user opens)
        // Payment is split: creator portion to vault, commission to treasury
        const projectIdBN = new BN(projectId);
        const boxPurchaseTx = await program.methods
            .createBox(projectIdBN)
            .accounts({
                buyer: buyerPubkey,
                platformConfig: platformConfigPDA,
                projectConfig: projectConfigPDA,
                boxInstance: boxInstancePDA,
                buyerTokenAccount: buyerTokenAccount,
                vaultAuthority: vaultAuthorityPDA,
                vaultTokenAccount: vaultTokenAccount,
                treasuryTokenAccount: treasuryTokenAccount,
                treasury: treasuryPDA,
                tokenProgram: paymentTokenProgram, // Token or Token-2022
                systemProgram: SystemProgram.programId,
            })
            .transaction();

        transaction.add(...boxPurchaseTx.instructions);
        console.log(`   Added: Create box instruction (pending state, with commission split)`);

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = buyerPubkey;

        // Serialize transaction (without signatures - buyer will sign on frontend)
        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString('base64');

        console.log(`\n✅ Transaction built successfully!`);
        console.log(`   Total instructions: ${transaction.instructions.length}`);
        console.log(`   Box will be created in PENDING state (no randomness yet)`);

        return res.json({
            success: true,
            transaction: serializedTransaction,
            boxId: nextBoxId,
            boxInstancePDA: boxInstancePDA.toString(),
            projectId,
            network: config.network,
        });

    } catch (error) {
        console.error('❌ Error building create box transaction:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to build create box transaction',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/confirm-box-creation
 * Record box creation in database after on-chain confirmation
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - boxId: number - Box ID
 * - buyerWallet: string - Buyer's wallet address
 * - signature: string - Transaction signature
 * - boxInstancePDA: string - Box instance PDA address
 * - randomnessAccount: string - Switchboard randomness account address
 */
router.post('/confirm-box-creation', async (req, res) => {
    try {
        const { projectId, boxId, buyerWallet, signature, boxInstancePDA, randomnessAccount } = req.body;

        if (!projectId || boxId === undefined || !buyerWallet || !signature || !boxInstancePDA) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        console.log(`\n✅ Confirming box ${boxId} creation for project ${projectId}...`);
        console.log(`   Transaction: ${signature}`);
        if (randomnessAccount) {
            console.log(`   Randomness account: ${randomnessAccount}`);
        }

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

        // Fetch project from database to get UUID
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('project_numeric_id', projectId)
            .single();

        if (projectError || !project) {
            throw new Error('Project not found');
        }

        // Insert box record into database (with randomness account if provided)
        const { error: insertError } = await supabase
            .from('boxes')
            .insert({
                project_id: project.id,
                box_number: boxId,
                owner_wallet: buyerWallet,
                box_result: 0, // Pending (DB: 0=pending, 1-5=results; On-chain uses 0-4 for tiers)
                payout_amount: 0,
                opened_at: null,
                created_at: new Date().toISOString(),
                randomness_account: randomnessAccount || null,
                randomness_committed: !!randomnessAccount,
                // New verification columns
                purchase_tx_signature: signature,
                box_pda: boxInstancePDA,
            });

        if (insertError) {
            console.error('Failed to insert box into database:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to record box in database',
                details: insertError.message,
            });
        }

        // Update boxes_created counter in projects table
        const { error: updateError } = await supabase
            .from('projects')
            .update({ boxes_created: boxId })
            .eq('id', project.id);

        if (updateError) {
            console.warn('Warning: Failed to update boxes_created counter:', updateError);
        }

        console.log(`✅ Box recorded in database`);

        const config = await getNetworkConfig();

        // Fetch project details for logging
        const { data: projectDetails } = await supabase
            .from('projects')
            .select('subdomain, box_price, payment_token_mint')
            .eq('project_numeric_id', projectId)
            .single();

        // Log box purchase
        await logger.logBoxPurchased({
            buyerWallet,
            projectId,
            subdomain: projectDetails?.subdomain,
            boxId,
            txSignature: signature,
            amount: projectDetails?.box_price,
            tokenMint: projectDetails?.payment_token_mint,
            boxPrice: projectDetails?.box_price,
        });

        return res.json({
            success: true,
            projectId,
            boxId,
            signature,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming box creation:', error);

        // Log the error
        await logger.logTransactionError({
            actorType: ActorTypes.USER,
            wallet: req.body?.buyerWallet,
            projectId: req.body?.projectId,
            txSignature: req.body?.signature,
            errorCode: 'BOX_CREATION_FAILED',
            errorMessage: error.message,
            instruction: 'confirm-box-creation',
        });

        return res.status(500).json({
            success: false,
            error: 'Failed to confirm box creation',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/build-create-boxes-batch-tx
 * Build transactions for purchasing multiple lootboxes in batch
 *
 * Creates multiple transactions (up to 3 boxes per transaction) to handle
 * Solana's transaction size limits while allowing batch purchases of up to 10 boxes.
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - buyerWallet: string - Buyer's wallet address
 * - quantity: number - Number of boxes to purchase (1-10)
 *
 * Returns:
 * - transactions: Array of { transaction, boxIds, boxInstancePDAs } for sequential signing
 * - totalBoxes: Total number of boxes being purchased
 * - totalPrice: Total price in token base units
 */
router.post('/build-create-boxes-batch-tx', async (req, res) => {
    try {
        const { projectId, buyerWallet, quantity } = req.body;

        // Validate input
        if (!projectId || !buyerWallet || !quantity) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, buyerWallet, quantity'
            });
        }

        const boxQuantity = parseInt(quantity);
        if (boxQuantity < 1 || boxQuantity > 10) {
            return res.status(400).json({
                success: false,
                error: 'Quantity must be between 1 and 10'
            });
        }

        console.log(`\n🎲 Building batch create box transaction for ${boxQuantity} boxes in project ${projectId}...`);
        console.log(`   Buyer: ${buyerWallet}`);

        // Get Anchor program and network config
        const { program, provider, connection, programId } = await getAnchorProgram();
        const config = await getNetworkConfig();

        // Fetch project from database
        const { data: project, error: dbError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_numeric_id', projectId)
            .single();

        if (dbError || !project) {
            throw new Error('Project not found in database');
        }

        // Prevent project owners from buying their own boxes
        if (project.owner_wallet === buyerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Project owners cannot purchase boxes from their own project',
            });
        }

        console.log(`   Project: ${project.project_name}`);
        console.log(`   Box price: ${project.box_price / Math.pow(10, project.payment_token_decimals)} ${project.payment_token_symbol}`);
        console.log(`   Total: ${(project.box_price * boxQuantity) / Math.pow(10, project.payment_token_decimals)} ${project.payment_token_symbol}`);

        // Fetch on-chain project config to get current box count
        const [projectConfigPDA] = deriveProjectConfigPDAStandalone(new PublicKey(config.programId), projectId);
        const accountInfo = await connection.getAccountInfo(projectConfigPDA);

        if (!accountInfo) {
            throw new Error('Project not initialized on-chain');
        }

        // Read total_boxes_created from on-chain data
        let offset = 8 + 8 + 32 + 32 + 8 + 1;
        const totalBoxesCreatedBN = new BN(accountInfo.data.slice(offset, offset + 8), 'le');
        const startBoxId = totalBoxesCreatedBN.toNumber() + 1;

        console.log(`   Current boxes created: ${totalBoxesCreatedBN.toNumber()}`);
        console.log(`   Will create boxes ${startBoxId} to ${startBoxId + boxQuantity - 1}`);

        // Convert addresses to PublicKeys
        const buyerPubkey = new PublicKey(buyerWallet);
        const paymentTokenMintPubkey = new PublicKey(project.payment_token_mint);

        // Detect token program (Token vs Token-2022)
        const paymentTokenProgram = await getTokenProgramForMint(connection, paymentTokenMintPubkey);
        console.log(`   Token program: ${paymentTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'}`);

        // Derive common PDAs (shared across all transactions)
        const [platformConfigPDA] = derivePlatformConfigPDA(programId);
        const [vaultAuthorityPDA] = deriveVaultAuthorityPDA(programId, projectId, paymentTokenMintPubkey);
        const vaultTokenAccount = deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMintPubkey, paymentTokenProgram);
        const [treasuryPDA] = deriveTreasuryPDA(programId);
        const treasuryTokenAccount = deriveTreasuryTokenAccount(treasuryPDA, paymentTokenMintPubkey, paymentTokenProgram);
        const buyerTokenAccount = getAssociatedTokenAddressSync(paymentTokenMintPubkey, buyerPubkey, false, paymentTokenProgram, ASSOCIATED_TOKEN_PROGRAM_ID);

        // Fetch platform config to get commission rate
        const platformConfigInfo = await connection.getAccountInfo(platformConfigPDA);
        let commissionBps = 500;
        if (platformConfigInfo) {
            const commissionOffset = 98;
            commissionBps = platformConfigInfo.data.readUInt16LE(commissionOffset);
        }

        // Calculate fee info for logging
        const boxPriceRaw = BigInt(project.box_price);
        const commissionAmount = (boxPriceRaw * BigInt(commissionBps)) / BigInt(10000);
        const creatorAmount = boxPriceRaw - commissionAmount;
        const decimals = project.payment_token_decimals;
        const symbol = project.payment_token_symbol;

        console.log(`\n💰 Fee split per box (${commissionBps / 100}% platform commission):`);
        console.log(`   Box price: ${Number(boxPriceRaw) / Math.pow(10, decimals)} ${symbol}`);
        console.log(`   → Platform treasury: ${Number(commissionAmount) / Math.pow(10, decimals)} ${symbol}`);
        console.log(`   → Creator vault: ${Number(creatorAmount) / Math.pow(10, decimals)} ${symbol}`);

        // Group boxes into transactions (max 3 per transaction to stay within size limits)
        const MAX_BOXES_PER_TX = 3;
        const transactions = [];
        let currentBoxId = startBoxId;

        while (currentBoxId < startBoxId + boxQuantity) {
            const remainingBoxes = startBoxId + boxQuantity - currentBoxId;
            const boxesInThisTx = Math.min(MAX_BOXES_PER_TX, remainingBoxes);
            const isFirstTx = transactions.length === 0;

            console.log(`\n📝 Building transaction ${transactions.length + 1} (boxes ${currentBoxId} to ${currentBoxId + boxesInThisTx - 1})...`);

            const transaction = new Transaction();
            const boxIdsInTx = [];
            const boxPDAsInTx = [];

            // Always add idempotent ATA creation in first transaction to avoid RPC cache issues
            // The idempotent instruction is a no-op if the account already exists
            if (isFirstTx) {
                const createVaultIx = createAssociatedTokenAccountIdempotentInstruction(
                    buyerPubkey,
                    vaultTokenAccount,
                    vaultAuthorityPDA,
                    paymentTokenMintPubkey,
                    paymentTokenProgram,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                );
                transaction.add(createVaultIx);
                console.log(`   Added: Create vault ATA instruction (idempotent, ${paymentTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'})`);

                const createTreasuryIx = createAssociatedTokenAccountIdempotentInstruction(
                    buyerPubkey,
                    treasuryTokenAccount,
                    treasuryPDA,
                    paymentTokenMintPubkey,
                    paymentTokenProgram,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                );
                transaction.add(createTreasuryIx);
                console.log(`   Added: Create treasury ATA instruction (idempotent, ${paymentTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'})`);
            }

            // Add create_box instructions for each box in this transaction
            for (let i = 0; i < boxesInThisTx; i++) {
                const boxId = currentBoxId + i;
                const [boxInstancePDA] = deriveBoxInstancePDA(programId, projectId, boxId);

                const projectIdBN = new BN(projectId);
                const boxPurchaseTx = await program.methods
                    .createBox(projectIdBN)
                    .accounts({
                        buyer: buyerPubkey,
                        platformConfig: platformConfigPDA,
                        projectConfig: projectConfigPDA,
                        boxInstance: boxInstancePDA,
                        buyerTokenAccount: buyerTokenAccount,
                        vaultAuthority: vaultAuthorityPDA,
                        vaultTokenAccount: vaultTokenAccount,
                        treasuryTokenAccount: treasuryTokenAccount,
                        treasury: treasuryPDA,
                        tokenProgram: paymentTokenProgram,
                        systemProgram: SystemProgram.programId,
                    })
                    .transaction();

                transaction.add(...boxPurchaseTx.instructions);
                boxIdsInTx.push(boxId);
                boxPDAsInTx.push(boxInstancePDA.toString());
                console.log(`   Added: Create box ${boxId} instruction`);
            }

            // Get recent blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = buyerPubkey;

            // Serialize transaction
            const serializedTransaction = transaction.serialize({
                requireAllSignatures: false,
                verifySignatures: false,
            }).toString('base64');

            transactions.push({
                transaction: serializedTransaction,
                boxIds: boxIdsInTx,
                boxInstancePDAs: boxPDAsInTx,
                instructionCount: transaction.instructions.length,
            });

            currentBoxId += boxesInThisTx;
        }

        console.log(`\n✅ Batch transactions built successfully!`);
        console.log(`   Total transactions: ${transactions.length}`);
        console.log(`   Total boxes: ${boxQuantity}`);
        console.log(`   Total price: ${(Number(boxPriceRaw) * boxQuantity) / Math.pow(10, decimals)} ${symbol}`);

        return res.json({
            success: true,
            transactions,
            totalBoxes: boxQuantity,
            totalPrice: (boxPriceRaw * BigInt(boxQuantity)).toString(),
            pricePerBox: boxPriceRaw.toString(),
            projectId,
            network: config.network,
        });

    } catch (error) {
        console.error('❌ Error building batch create box transaction:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to build batch create box transaction',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/confirm-boxes-batch
 * Record multiple box creations in database after on-chain confirmation
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - boxIds: number[] - Array of box IDs
 * - buyerWallet: string - Buyer's wallet address
 * - signature: string - Transaction signature
 * - boxInstancePDAs: string[] - Array of box instance PDA addresses
 */
router.post('/confirm-boxes-batch', async (req, res) => {
    try {
        const { projectId, boxIds, buyerWallet, signature, boxInstancePDAs } = req.body;

        if (!projectId || !boxIds || !Array.isArray(boxIds) || !buyerWallet || !signature || !boxInstancePDAs) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        console.log(`\n✅ Confirming batch of ${boxIds.length} boxes for project ${projectId}...`);
        console.log(`   Box IDs: ${boxIds.join(', ')}`);
        console.log(`   Transaction: ${signature}`);

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

        // Fetch project from database to get UUID
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('project_numeric_id', projectId)
            .single();

        if (projectError || !project) {
            throw new Error('Project not found');
        }

        // Build array of box records for batch insert
        const boxRecords = boxIds.map((boxId, index) => ({
            project_id: project.id,
            box_number: boxId,
            owner_wallet: buyerWallet,
            box_result: 0, // Pending
            payout_amount: 0,
            opened_at: null,
            created_at: new Date().toISOString(),
            randomness_account: null,
            randomness_committed: false,
            purchase_tx_signature: signature,
            box_pda: boxInstancePDAs[index],
        }));

        // Batch insert all boxes
        const { error: insertError } = await supabase
            .from('boxes')
            .insert(boxRecords);

        if (insertError) {
            console.error('Failed to insert boxes into database:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to record boxes in database',
                details: insertError.message,
            });
        }

        // Update boxes_created counter to the highest box ID
        const maxBoxId = Math.max(...boxIds);
        const { error: updateError } = await supabase
            .from('projects')
            .update({ boxes_created: maxBoxId })
            .eq('id', project.id);

        if (updateError) {
            console.warn('Warning: Failed to update boxes_created counter:', updateError);
        }

        console.log(`✅ ${boxIds.length} boxes recorded in database`);

        const config = await getNetworkConfig();

        // Fetch project details for logging
        const { data: projectDetails } = await supabase
            .from('projects')
            .select('subdomain, box_price, payment_token_mint')
            .eq('project_numeric_id', projectId)
            .single();

        // Log each box purchase
        for (const boxId of boxIds) {
            await logger.logBoxPurchased({
                buyerWallet,
                projectId,
                subdomain: projectDetails?.subdomain,
                boxId,
                txSignature: signature,
                amount: projectDetails?.box_price,
                tokenMint: projectDetails?.payment_token_mint,
                boxPrice: projectDetails?.box_price,
            });
        }

        return res.json({
            success: true,
            projectId,
            boxIds,
            boxCount: boxIds.length,
            signature,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming batch box creation:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to confirm batch box creation',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/build-commit-box-tx
 * Build transaction for opening a box (committing Switchboard VRF randomness)
 *
 * Called when user clicks "Open Box" on a pending box.
 * This commits randomness and freezes luck at the current time.
 * User then has 1 hour to call reveal.
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - boxId: number - Box ID to open
 * - ownerWallet: string - Box owner's wallet address
 *
 * Returns:
 * - transaction: Serialized transaction for owner to sign
 * - randomnessKeypair: Serialized keypair that must be included as signer
 * - randomnessAccount: Public key of the randomness account
 */
router.post('/build-commit-box-tx', async (req, res) => {
    try {
        const { projectId, boxId, ownerWallet } = req.body;

        // Validate input
        if (!projectId || boxId === undefined || !ownerWallet) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, boxId, ownerWallet'
            });
        }

        console.log(`\n📦 Building commit box transaction for box ${boxId} in project ${projectId}...`);
        console.log(`   Owner: ${ownerWallet}`);

        // Get Anchor program and network config
        const { program, provider, connection, programId } = await getAnchorProgram();
        const config = await getNetworkConfig();

        // Fetch box from database
        const { data: box, error: boxError } = await supabase
            .from('boxes')
            .select('*, projects!inner(project_numeric_id, payment_token_mint)')
            .eq('box_number', boxId)
            .eq('projects.project_numeric_id', projectId)
            .single();

        if (boxError || !box) {
            return res.status(404).json({
                success: false,
                error: 'Box not found'
            });
        }

        // Verify ownership
        if (box.owner_wallet !== ownerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Not the owner of this box'
            });
        }

        // Check if already committed
        if (box.randomness_committed) {
            return res.status(400).json({
                success: false,
                error: 'Box already opened (randomness already committed)'
            });
        }

        // Check if already revealed (DB: 0=pending, 1-5=results; On-chain: 0-4)
        if (box.box_result !== 0) {
            return res.status(400).json({
                success: false,
                error: 'Box already revealed'
            });
        }

        // Derive PDAs
        const [platformConfigPDA] = derivePlatformConfigPDA(programId);
        const [projectConfigPDA] = deriveProjectConfigPDAStandalone(new PublicKey(config.programId), projectId);
        const [boxInstancePDA] = deriveBoxInstancePDA(programId, projectId, boxId);

        const ownerPubkey = new PublicKey(ownerWallet);

        console.log(`   Platform config PDA: ${platformConfigPDA.toString()}`);
        console.log(`   Box instance PDA: ${boxInstancePDA.toString()}`);
        console.log(`   Project config PDA: ${projectConfigPDA.toString()}`);

        // ========================================
        // SWITCHBOARD VRF: Create randomness account and commit
        // ========================================
        console.log(`\n🎰 Setting up Switchboard VRF randomness...`);

        // Create Switchboard randomness account - pass owner as payer
        const { keypair: rngKeypair, randomness, createInstruction: createRandomnessIx, publicKey: randomnessAccountPubkey } =
            await createRandomnessAccount(provider, config.network, ownerPubkey);

        console.log(`   Randomness account: ${randomnessAccountPubkey.toString()}`);

        // Create commit instruction
        const commitIx = await createCommitInstruction(randomness, config.network, ownerPubkey);

        // ========================================
        // BUILD TRANSACTION
        // ========================================
        console.log(`\n📝 Building commit transaction...`);

        const transaction = new Transaction();

        // 1. Create Switchboard randomness account (owner pays)
        transaction.add(createRandomnessIx);
        console.log(`   Added: Create randomness account instruction`);

        // 2. Commit to randomness (request VRF)
        transaction.add(commitIx);
        console.log(`   Added: Commit to randomness instruction`);

        // 3. Call commit_box on our program
        const projectIdBN = new BN(projectId);
        const boxIdBN = new BN(boxId);
        const commitBoxTx = await program.methods
            .commitBox(projectIdBN, boxIdBN, randomnessAccountPubkey)
            .accounts({
                owner: ownerPubkey,
                platformConfig: platformConfigPDA,
                projectConfig: projectConfigPDA,
                boxInstance: boxInstancePDA,
            })
            .transaction();

        transaction.add(...commitBoxTx.instructions);
        console.log(`   Added: commit_box instruction`);

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        // Serialize transaction
        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString('base64');

        // Serialize the randomness keypair so frontend can include it as signer
        const serializedRandomnessKeypair = serializeKeypair(rngKeypair);

        console.log(`\n✅ Commit transaction built successfully!`);
        console.log(`   Total instructions: ${transaction.instructions.length}`);
        console.log(`   User has 1 HOUR to reveal after this commits`);

        return res.json({
            success: true,
            transaction: serializedTransaction,
            randomnessKeypair: serializedRandomnessKeypair,
            randomnessAccount: randomnessAccountPubkey.toString(),
            boxId,
            projectId,
            network: config.network,
        });

    } catch (error) {
        console.error('❌ Error building commit box transaction:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to build commit box transaction',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/confirm-commit
 * Record box commit (open) in database after on-chain confirmation
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - boxId: number - Box ID
 * - signature: string - Transaction signature
 * - randomnessAccount: string - Switchboard randomness account address
 */
router.post('/confirm-commit', async (req, res) => {
    try {
        const { projectId, boxId, signature, randomnessAccount } = req.body;

        if (!projectId || boxId === undefined || !signature || !randomnessAccount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, boxId, signature, randomnessAccount'
            });
        }

        console.log(`\n✅ Confirming commit for box ${boxId} in project ${projectId}...`);
        console.log(`   Transaction: ${signature}`);
        console.log(`   Randomness account: ${randomnessAccount}`);

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

        // Fetch box from database
        const { data: box, error: boxError } = await supabase
            .from('boxes')
            .select('id, box_pda, projects!inner(project_numeric_id)')
            .eq('box_number', boxId)
            .eq('projects.project_numeric_id', projectId)
            .single();

        if (boxError || !box) {
            return res.status(404).json({
                success: false,
                error: 'Box not found'
            });
        }

        // Read the on-chain created_at timestamp for accurate luck calculation
        // The on-chain timestamp is set when the transaction was processed, not when DB recorded it
        const config = await getNetworkConfig();
        // connection and programId already obtained above for transaction verification

        const [boxInstancePDA] = deriveBoxInstancePDA(programId, parseInt(projectId), parseInt(boxId));
        const boxAccountInfo = await connection.getAccountInfo(boxInstancePDA);

        let boxCreatedAt;
        if (boxAccountInfo) {
            // Parse on-chain created_at: skip discriminator(8) + box_id(8) + project_id(8) + owner(32)
            const createdAtOffset = 8 + 8 + 8 + 32;
            const createdAtBN = new BN(boxAccountInfo.data.subarray(createdAtOffset, createdAtOffset + 8), 'le');
            boxCreatedAt = createdAtBN.toNumber(); // Unix timestamp in seconds
            console.log(`   On-chain created_at: ${new Date(boxCreatedAt * 1000).toISOString()}`);
        } else {
            // Fallback to now if box not found on-chain (shouldn't happen)
            boxCreatedAt = Math.floor(Date.now() / 1000);
            console.warn('   Warning: Could not read on-chain created_at, using current time');
        }

        const now = Math.floor(Date.now() / 1000);
        const holdTimeSeconds = now - boxCreatedAt;
        const luckIntervalSeconds = config.luckIntervalSeconds || 3;
        const calculatedLuck = calculateLuckScore(holdTimeSeconds, luckIntervalSeconds);

        console.log(`   Hold time at commit: ${holdTimeSeconds} seconds`);
        console.log(`   Luck locked in: ${calculatedLuck}/60`);

        // Update box with commit info and locked-in luck value
        const committedAt = new Date().toISOString();
        const { error: updateError } = await supabase
            .from('boxes')
            .update({
                randomness_account: randomnessAccount,
                randomness_committed: true,
                committed_at: committedAt,
                commit_tx_signature: signature,
                luck_value: calculatedLuck,
                max_luck: 60,
            })
            .eq('id', box.id);

        if (updateError) {
            console.error('Failed to update box commit status:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to record commit in database',
                details: updateError.message,
            });
        }

        console.log(`✅ Box commit recorded in database`);
        console.log(`   Committed at: ${committedAt}`);
        console.log(`   Luck: ${calculatedLuck}/60 (locked in)`);
        console.log(`   User has until: ${new Date(Date.now() + REVEAL_WINDOW_SECONDS * 1000).toISOString()} to reveal`);

        return res.json({
            success: true,
            projectId,
            boxId,
            signature,
            committedAt,
            expiresAt: new Date(Date.now() + REVEAL_WINDOW_SECONDS * 1000).toISOString(),
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming commit:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to confirm commit',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * Calculate reward tier based on luck score and random percentage
 * Uses the v1 probability distribution system
 *
 * @param {number} luckScore - Luck score from 5-60
 * @param {number} randomPercentage - Random value 0-100
 * @param {number} boxPrice - Price of the box in smallest units
 * @returns {{ rewardAmount: number, tierName: string, tierId: number }}
 */
function calculateRewardTier(luckScore, randomPercentage, boxPrice) {
    // Probability tables based on luck score (matching v1 exactly)
    let dudChance, rebateChance, breakEvenChance, profitChance;

    if (luckScore <= 5) {
        [dudChance, rebateChance, breakEvenChance, profitChance] = [55.0, 30.0, 10.0, 4.5];
    } else if (luckScore <= 13) {
        // Linear interpolation between 5 and 13
        const ratio = (luckScore - 5) / 8.0;
        dudChance = 55.0 + (45.0 - 55.0) * ratio;        // 55% → 45%
        rebateChance = 30.0 + (30.0 - 30.0) * ratio;     // 30% → 30%
        breakEvenChance = 10.0 + (15.0 - 10.0) * ratio;  // 10% → 15%
        profitChance = 4.5 + (8.5 - 4.5) * ratio;        // 4.5% → 8.5%
    } else {
        // Linear interpolation between 13 and 60
        const ratio = (luckScore - 13) / 47.0;
        dudChance = 45.0 + (30.0 - 45.0) * ratio;        // 45% → 30%
        rebateChance = 30.0 + (25.0 - 30.0) * ratio;     // 30% → 25%
        breakEvenChance = 15.0 + (20.0 - 15.0) * ratio;  // 15% → 20%
        profitChance = 8.5 + (20.0 - 8.5) * ratio;       // 8.5% → 20%
    }

    // Jackpot chance is the remainder (0.5% at luck 5, 5% at luck 60)

    // Determine tier based on cumulative probabilities
    let cumulative = 0;

    cumulative += dudChance;
    if (randomPercentage <= cumulative) {
        return { rewardAmount: 0, tierName: 'Dud', tierId: 0 };
    }

    cumulative += rebateChance;
    if (randomPercentage <= cumulative) {
        // Rebate: 0.8x box price
        return { rewardAmount: Math.floor(boxPrice * 0.8), tierName: 'Rebate', tierId: 1 };
    }

    cumulative += breakEvenChance;
    if (randomPercentage <= cumulative) {
        // Break-even: 1.0x box price
        return { rewardAmount: boxPrice, tierName: 'Break-even', tierId: 2 };
    }

    cumulative += profitChance;
    if (randomPercentage <= cumulative) {
        // Profit: 2.5x box price
        return { rewardAmount: Math.floor(boxPrice * 2.5), tierName: 'Profit', tierId: 3 };
    }

    // Jackpot: 10x box price (NOT 50% of vault - per user's specification)
    return { rewardAmount: Math.floor(boxPrice * 10), tierName: 'Jackpot', tierId: 4 };
}

/**
 * Calculate luck score based on hold time
 *
 * @param {number} holdTimeSeconds - How long the box has been held in seconds
 * @param {number} luckIntervalSeconds - Seconds per luck point (from config)
 * @returns {number} Luck score (5-60)
 */
function calculateLuckScore(holdTimeSeconds, luckIntervalSeconds) {
    const baseScore = 5;
    const bonusPoints = Math.floor(holdTimeSeconds / luckIntervalSeconds);
    return Math.min(baseScore + bonusPoints, 60); // Cap at 60
}

/**
 * POST /api/program/build-reveal-box-tx
 * Build transaction for revealing a lootbox with Switchboard VRF randomness
 *
 * The transaction includes:
 * 1. Switchboard revealIx (reveals the committed randomness)
 * 2. reveal_box instruction (reads randomness and calculates reward)
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - boxId: number - Box ID to reveal
 * - ownerWallet: string - Box owner's wallet address
 */
router.post('/build-reveal-box-tx', async (req, res) => {
    try {
        const { projectId, boxId, ownerWallet } = req.body;

        // Validate input
        if (!projectId || boxId === undefined || !ownerWallet) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, boxId, ownerWallet'
            });
        }

        console.log(`\n🎰 Building reveal box transaction with Switchboard VRF...`);
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Box ID: ${boxId}`);
        console.log(`   Owner: ${ownerWallet}`);

        // Get Anchor program and network config
        const { program, provider, connection, programId } = await getAnchorProgram();
        const config = await getNetworkConfig();

        // Fetch project from database
        const { data: project, error: dbError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_numeric_id', projectId)
            .single();

        if (dbError || !project) {
            throw new Error('Project not found in database');
        }

        // Fetch box from database
        const { data: box, error: boxError } = await supabase
            .from('boxes')
            .select('*')
            .eq('project_id', project.id)
            .eq('box_number', boxId)
            .single();

        if (boxError || !box) {
            throw new Error('Box not found in database');
        }

        // Verify ownership
        if (box.owner_wallet !== ownerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized - you do not own this box',
            });
        }

        // Check if already revealed (DB: 0=pending, 1-5=results; On-chain: 0-4)
        if (box.box_result !== 0) {
            return res.status(400).json({
                success: false,
                error: 'Box has already been revealed',
                result: box.box_result,
            });
        }

        // Verify randomness was committed
        if (!box.randomness_account || !box.randomness_committed) {
            return res.status(400).json({
                success: false,
                error: 'Box has not been opened yet. Click "Open Box" first to commit randomness.',
            });
        }

        // Check if commit has expired (uses REVEAL_WINDOW_SECONDS config)
        if (box.committed_at) {
            const committedAtTime = new Date(box.committed_at).getTime();
            const now = Date.now();
            const revealWindowMs = REVEAL_WINDOW_SECONDS * 1000;

            if (now - committedAtTime > revealWindowMs) {
                // Mark box as expired/dud in database
                console.log(`   ⚠️ Box commit has EXPIRED - marking as Dud`);

                await supabase
                    .from('boxes')
                    .update({
                        box_result: 1, // Dud tier (DB: 1=dud; On-chain: 0=dud)
                        payout_amount: 0,
                        opened_at: new Date().toISOString(),
                        luck_value: box.luck_value || 5,
                    })
                    .eq('id', box.id);

                return res.status(400).json({
                    success: false,
                    error: 'Reveal window expired. Box has become a Dud.',
                    expired: true,
                    committedAt: box.committed_at,
                    expiredAt: new Date(committedAtTime + revealWindowMs).toISOString(),
                });
            }

            const timeRemaining = revealWindowMs - (now - committedAtTime);
            console.log(`   Time remaining to reveal: ${Math.floor(timeRemaining / 1000)} seconds`);
        }

        console.log(`   Randomness account: ${box.randomness_account}`);

        // Convert addresses to PublicKeys
        const ownerPubkey = new PublicKey(ownerWallet);
        const paymentTokenMintPubkey = new PublicKey(project.payment_token_mint);
        const randomnessAccountPubkey = new PublicKey(box.randomness_account);

        // Derive PDAs
        const [platformConfigPDA] = derivePlatformConfigPDA(programId);
        const [projectConfigPDA] = deriveProjectConfigPDAStandalone(new PublicKey(config.programId), projectId);
        const [boxInstancePDA] = deriveBoxInstancePDA(programId, projectId, boxId);
        const [vaultAuthorityPDA] = deriveVaultAuthorityPDA(programId, projectId, paymentTokenMintPubkey);
        const vaultTokenAccount = await deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMintPubkey);

        console.log(`   Platform Config PDA: ${platformConfigPDA.toString()}`);
        console.log(`   Project Config PDA: ${projectConfigPDA.toString()}`);
        console.log(`   Box Instance PDA: ${boxInstancePDA.toString()}`);

        // Read on-chain box state to verify it exists and isn't revealed
        const boxAccountInfo = await connection.getAccountInfo(boxInstancePDA);
        if (!boxAccountInfo) {
            throw new Error('Box not found on-chain');
        }

        // Parse box data to check revealed status
        // Skip 8-byte discriminator
        let offset = 8;
        const data = boxAccountInfo.data;

        // BoxInstance struct layout (updated with committed_at):
        // - box_id: u64 (8 bytes)
        // - project_id: u64 (8 bytes)
        // - owner: Pubkey (32 bytes)
        // - created_at: i64 (8 bytes)
        // - committed_at: i64 (8 bytes) <- NEW FIELD
        // - luck: u8 (1 byte)
        // - revealed: bool (1 byte)
        // Skip to luck field
        offset += 8 + 8 + 32 + 8 + 8;

        // Read luck (1 byte)
        const currentLuck = data[offset];
        offset += 1;

        // Read revealed (1 byte)
        const isRevealed = data[offset] === 1;
        offset += 1;

        if (isRevealed) {
            // Box is already revealed on-chain - read the result and sync to database
            console.log(`   ⚠️ Box already revealed on-chain - recovering result...`);

            // Continue parsing BoxInstance to get result:
            // settled: bool (1 byte)
            const isSettled = data[offset] === 1;
            offset += 1;

            // reward_amount: u64 (8 bytes, little-endian)
            const rewardAmount = data.readBigUInt64LE(offset);
            offset += 8;

            // is_jackpot: bool (1 byte)
            const isJackpot = data[offset] === 1;
            offset += 1;

            // random_percentage: f64 (8 bytes)
            const randomPercentage = data.readDoubleLE(offset);
            offset += 8;

            // reward_tier: u8 (1 byte) - On-chain: 0=Dud, 1=Rebate, 2=Break-even, 3=Profit, 4=Jackpot
            const rewardTierOnChain = data[offset];

            // Convert on-chain tier (0-4) to DB tier (1-5) - DB uses 1-indexed
            const rewardTierDB = rewardTierOnChain + 1;

            console.log(`   On-chain result found:`);
            console.log(`   - Reward tier: ${rewardTierOnChain} (on-chain) / ${rewardTierDB} (DB)`);
            console.log(`   - Reward amount: ${rewardAmount}`);
            console.log(`   - Is jackpot: ${isJackpot}`);
            console.log(`   - Random %: ${(randomPercentage * 100).toFixed(2)}%`);
            console.log(`   - Settled: ${isSettled}`);

            // Assign a random badge for winning tiers (2-5)
            const recoveredBadgeImageId = getRandomBadgeId(rewardTierDB);

            // Update database with on-chain result
            const { error: updateError } = await supabase
                .from('boxes')
                .update({
                    box_result: rewardTierDB,
                    payout_amount: Number(rewardAmount),
                    luck_value: currentLuck,
                    opened_at: new Date().toISOString(),
                    badge_image_id: recoveredBadgeImageId,
                })
                .eq('id', box.id);

            if (updateError) {
                console.error(`   Failed to sync result to database:`, updateError);
            } else {
                console.log(`   ✅ Result synced to database`);
            }

            // Return the recovered result
            const tierNames = ['Dud', 'Rebate', 'Break-even', 'Profit', 'Jackpot'];
            return res.json({
                success: true,
                alreadyRevealed: true,
                recovered: true,
                reward: {
                    tier: rewardTierDB,
                    tierName: tierNames[rewardTierOnChain] || 'Unknown',
                    payoutAmount: Number(rewardAmount),
                    isJackpot,
                    randomPercentage: randomPercentage / 100, // Convert basis points to percentage (0-100)
                    luck: currentLuck,
                    badgeImageId: recoveredBadgeImageId,
                },
                message: 'Box was already revealed on-chain. Result has been recovered.',
            });
        }

        // Use the luck value that was locked in at commit time
        // This ensures users can't game the system by waiting longer after committing
        const lockedLuck = box.luck_value || 5; // Fallback to minimum if somehow not set

        console.log(`   Box created at: ${new Date(box.created_at).toISOString()}`);
        console.log(`   Box committed at: ${box.committed_at}`);
        console.log(`   Luck (locked at commit): ${lockedLuck}/60`);

        // ========================================
        // SWITCHBOARD VRF: Check if already revealed, otherwise create reveal instruction
        // ========================================
        console.log(`\n🎰 Checking Switchboard VRF randomness status...`);

        // Load the existing randomness account
        const randomness = await loadRandomness(provider, randomnessAccountPubkey, config.network);

        // Check if randomness is already revealed by reading the account
        let randomnessAlreadyRevealed = false;
        try {
            const result = await readRandomnessValue(connection, randomnessAccountPubkey);
            if (result.revealSlot > 0) {
                console.log(`   ✅ Randomness already revealed at slot ${result.revealSlot}`);
                console.log(`   Random value: ${result.randomU64}`);
                randomnessAlreadyRevealed = true;
            }
        } catch (error) {
            // Not revealed yet - this is expected
            console.log(`   Randomness not revealed yet - will include reveal instruction`);
        }

        // ========================================
        // BUILD COMBINED TRANSACTION
        // ========================================
        console.log(`\n📝 Building combined reveal transaction...`);

        const transaction = new Transaction();

        // 1. Switchboard reveal instruction (only if not already revealed)
        if (!randomnessAlreadyRevealed) {
            // Create Switchboard reveal instruction - pass owner as payer and network for crossbar fallback
            const revealIx = await createRevealInstruction(randomness, ownerPubkey, config.network);

            // Re-check if randomness was revealed during the revealIx call (can take 4-5 seconds)
            // The oracle might have already revealed while we were getting the instruction
            // This prevents "Transaction already processed" errors from race conditions
            let skipSwitchboardReveal = false;
            try {
                const recheckResult = await readRandomnessValue(connection, randomnessAccountPubkey);
                if (recheckResult.revealSlot > 0) {
                    console.log(`   ⚠️ Race condition: Randomness was revealed during revealIx call`);
                    console.log(`   Randomness is revealed - checking if BoxInstance is also revealed...`);

                    // Check if our box is already revealed too
                    const boxAccountInfoRefresh = await connection.getAccountInfo(boxInstancePDA);
                    if (boxAccountInfoRefresh) {
                        const dataRefresh = boxAccountInfoRefresh.data;
                        let offsetRefresh = 8 + 8 + 8 + 32 + 8 + 8 + 1; // Skip to revealed field
                        const revealedRefresh = dataRefresh[offsetRefresh] === 1;

                        if (revealedRefresh) {
                            // Both randomness AND box are revealed - full recovery needed
                            console.log(`   BoxInstance is also revealed - triggering full recovery...`);
                            offsetRefresh += 1; // Move past revealed

                            // Parse the result
                            const settledRefresh = dataRefresh[offsetRefresh] === 1;
                            offsetRefresh += 1;
                            const rewardAmountRefresh = dataRefresh.readBigUInt64LE(offsetRefresh);
                            offsetRefresh += 8;
                            const isJackpotRefresh = dataRefresh[offsetRefresh] === 1;
                            offsetRefresh += 1;
                            const randomPercentageRefresh = dataRefresh.readDoubleLE(offsetRefresh);
                            offsetRefresh += 8;
                            const rewardTierOnChainRefresh = dataRefresh[offsetRefresh];
                            const rewardTierDBRefresh = rewardTierOnChainRefresh + 1;

                            // Get luck from before revealed field
                            const luckRefresh = dataRefresh[8 + 8 + 8 + 32 + 8 + 8]; // luck offset

                            // Assign a random badge for winning tiers (2-5)
                            const raceConditionBadgeId = getRandomBadgeId(rewardTierDBRefresh);

                            // Update database
                            await supabase
                                .from('boxes')
                                .update({
                                    box_result: rewardTierDBRefresh,
                                    payout_amount: Number(rewardAmountRefresh),
                                    luck_value: luckRefresh,
                                    opened_at: new Date().toISOString(),
                                    badge_image_id: raceConditionBadgeId,
                                })
                                .eq('id', box.id);

                            const tierNames = ['Dud', 'Rebate', 'Break-even', 'Profit', 'Jackpot'];
                            return res.json({
                                success: true,
                                alreadyRevealed: true,
                                recovered: true,
                                reward: {
                                    tier: rewardTierDBRefresh,
                                    tierName: tierNames[rewardTierOnChainRefresh] || 'Unknown',
                                    payoutAmount: Number(rewardAmountRefresh),
                                    isJackpot: isJackpotRefresh,
                                    randomPercentage: randomPercentageRefresh,
                                    luck: luckRefresh,
                                    badgeImageId: raceConditionBadgeId,
                                },
                                message: 'Race condition detected - result recovered from on-chain.',
                            });
                        } else {
                            // Randomness is revealed but box is NOT - skip Switchboard, only run our reveal_box
                            console.log(`   BoxInstance NOT revealed yet - will only include reveal_box instruction`);
                            console.log(`   (Skipping Switchboard revealIx to avoid "already processed" error)`);
                            skipSwitchboardReveal = true;
                        }
                    }
                }
            } catch (recheckError) {
                // Still not revealed, continue with normal flow
                console.log(`   Randomness still not revealed after revealIx call - continuing with full transaction`);
            }

            if (!skipSwitchboardReveal) {
                transaction.add(revealIx);
                console.log(`   Added: Switchboard reveal instruction`);
            } else {
                console.log(`   Skipped: Switchboard reveal instruction (already processed by oracle)`);
            }
        } else {
            console.log(`   Skipping: Switchboard reveal (already revealed)`);
        }

        // 2. Our program's reveal_box instruction (reads randomness from account)
        const projectIdBN = new BN(projectId);
        const boxIdBN = new BN(boxId);

        const revealBoxTx = await program.methods
            .revealBox(projectIdBN, boxIdBN)
            .accounts({
                owner: ownerPubkey,
                platformConfig: platformConfigPDA,
                projectConfig: projectConfigPDA,
                boxInstance: boxInstancePDA,
                vaultAuthority: vaultAuthorityPDA,
                vaultTokenAccount: vaultTokenAccount,
                randomnessAccount: randomnessAccountPubkey,
            })
            .transaction();

        transaction.add(...revealBoxTx.instructions);
        console.log(`   Added: reveal_box instruction with randomness account`);

        // 3. Close randomness account instruction (reclaims rent to user)
        // This MUST be after reveal_box since the randomness data is read during reveal
        try {
            const closeIx = await createCloseInstruction(randomness);
            transaction.add(closeIx);
            console.log(`   Added: close randomness account instruction (reclaims ~0.006 SOL rent)`);
        } catch (closeError) {
            // If close instruction fails to build, still allow reveal to proceed
            // User can manually close later or we can add a cleanup script
            console.warn(`   Warning: Could not create close instruction: ${closeError.message}`);
            console.warn(`   Proceeding without close - user may need to manually reclaim rent later`);
        }

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        // Serialize transaction
        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString('base64');

        console.log(`\n✅ Reveal transaction built successfully with Switchboard VRF!`);
        console.log(`   Total instructions: ${transaction.instructions.length}`);

        return res.json({
            success: true,
            transaction: serializedTransaction,
            projectId,
            boxId,
            boxInstancePDA: boxInstancePDA.toString(),
            randomnessAccount: box.randomness_account,
            luckScore: lockedLuck,
            network: config.network,
            message: 'Randomness will be read from Switchboard VRF on-chain. Luck was locked at commit time.',
        });

    } catch (error) {
        console.error('❌ Error building reveal box transaction:', error);

        const { projectId, boxId, ownerWallet } = req.body;

        // Classify the error for better frontend handling
        let errorCode = 'REVEAL_ERROR';
        let errorMessage = 'Failed to build reveal box transaction';
        let isRetryable = false;
        let retryAfterSeconds = null;
        let isOracleFailure = false;

        // Check for Switchboard oracle/DNS failures
        if (error.message?.includes('ENOTFOUND') ||
            error.message?.includes('xip.switchboard-oracles') ||
            error.message?.includes('getaddrinfo') ||
            error.message?.includes('oracle unavailable')) {
            errorCode = 'ORACLE_UNAVAILABLE';
            errorMessage = 'Switchboard oracle service is temporarily unavailable. This is not your fault - the oracle network is experiencing issues.';
            isRetryable = true;
            retryAfterSeconds = 60; // Suggest retry after 1 minute
            isOracleFailure = true;
        }
        // Check for oracle timeout/503 errors
        else if (error.message?.includes('503') ||
                 error.message?.includes('Service Unavailable') ||
                 error.message?.includes('ETIMEDOUT') ||
                 error.message?.includes('ECONNREFUSED')) {
            errorCode = 'ORACLE_TIMEOUT';
            errorMessage = 'Switchboard oracle is not responding. Please try again in a few minutes.';
            isRetryable = true;
            retryAfterSeconds = 30;
            isOracleFailure = true;
        }
        // Check for insufficient funds
        else if (error.message?.includes('insufficient') ||
                 error.message?.includes('0x1') ||
                 error.message?.includes('InsufficientFunds')) {
            errorCode = 'INSUFFICIENT_FUNDS';
            errorMessage = 'Insufficient SOL for transaction fees. Please add SOL to your wallet.';
            isRetryable = true;
        }
        // Check for reveal window expired
        else if (error.message?.includes('RevealWindowExpired') ||
                 error.message?.includes('window expired')) {
            errorCode = 'REVEAL_EXPIRED';
            errorMessage = 'The 1-hour reveal window has expired. The box is now a Dud.';
            isRetryable = false;
        }

        // Mark box as refund-eligible if it's an oracle failure (not user's fault)
        if (isOracleFailure && projectId && boxId !== undefined) {
            try {
                // Get project UUID first
                const { data: project } = await supabase
                    .from('projects')
                    .select('id')
                    .eq('project_numeric_id', projectId)
                    .single();

                if (project) {
                    const { error: updateError } = await supabase
                        .from('boxes')
                        .update({ refund_eligible: true })
                        .eq('project_id', project.id)
                        .eq('box_number', boxId)
                        .eq('owner_wallet', ownerWallet)
                        .eq('box_result', 0); // Only if still pending

                    if (updateError) {
                        console.error('   Failed to mark box as refund-eligible:', updateError);
                    } else {
                        console.log(`   ⚠️ Marked box ${boxId} as refund-eligible due to oracle failure`);
                    }
                }
            } catch (dbError) {
                console.error('   Error marking box as refund-eligible:', dbError.message);
            }
        }

        return res.status(500).json({
            success: false,
            error: errorMessage,
            errorCode,
            details: sanitizeErrorMessage(error.message),
            isRetryable,
            retryAfterSeconds,
            refundEligible: isOracleFailure,
        });
    }
});

/**
 * POST /api/program/confirm-reveal
 * Update database after box reveal transaction confirms
 * IMPORTANT: Reads the actual reward from on-chain state (not from client) for security
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - boxId: number - Box ID
 * - ownerWallet: string - Box owner's wallet address
 * - signature: string - Transaction signature
 */
router.post('/confirm-reveal', async (req, res) => {
    try {
        const { projectId, boxId, ownerWallet, signature } = req.body;

        if (!projectId || boxId === undefined || !ownerWallet || !signature) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        console.log(`\n✅ Confirming box ${boxId} reveal for project ${projectId}...`);
        console.log(`   Transaction: ${signature}`);

        // Get connection to read on-chain state
        const { connection, programId } = await getAnchorProgram();

        // Verify transaction on-chain before updating database
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

        // Fetch project from database to get UUID
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, payment_token_decimals, payment_token_symbol')
            .eq('project_numeric_id', projectId)
            .single();

        if (projectError || !project) {
            throw new Error('Project not found');
        }

        // Read on-chain box state to get the ACTUAL reward (don't trust client)
        const [boxInstancePDA] = deriveBoxInstancePDA(programId, projectId, boxId);
        const boxAccountInfo = await connection.getAccountInfo(boxInstancePDA);

        if (!boxAccountInfo) {
            throw new Error('Box not found on-chain');
        }

        // Parse box data to get reward amount and tier
        // Skip 8-byte discriminator
        let offset = 8;
        const data = boxAccountInfo.data;

        // Skip box_id (8), project_id (8), owner (32), created_at (8), committed_at (8)
        offset += 8 + 8 + 32 + 8 + 8;

        // Read luck (1 byte)
        const luck = data[offset];
        offset += 1;

        // Read revealed (1 byte)
        const revealed = data[offset] === 1;
        offset += 1;

        // Read settled (1 byte)
        offset += 1;

        // Read reward_amount (8 bytes) - use BN for safety
        const rewardAmountBN = new BN(data.subarray(offset, offset + 8), 'le');
        const rewardAmount = rewardAmountBN.toString();
        offset += 8;

        // Read is_jackpot (1 byte)
        const isJackpot = data[offset] === 1;
        offset += 1;

        // Read random_percentage (8 bytes - f64)
        // Copy to aligned buffer to avoid Float64Array alignment issues
        const randomPercentageBytes = new Uint8Array(8);
        randomPercentageBytes.set(data.subarray(offset, offset + 8));
        const randomPercentage = new Float64Array(randomPercentageBytes.buffer)[0];
        offset += 8;

        // Read reward_tier (1 byte)
        const rewardTier = data[offset];

        // Map tier to name
        const tierNames = ['Dud', 'Rebate', 'Break-even', 'Profit', 'Jackpot'];
        const tierName = tierNames[rewardTier] || 'Unknown';

        console.log(`   On-chain reward: ${tierName} (tier ${rewardTier}) - ${rewardAmountBN.toString()} (${Number(rewardAmount) / Math.pow(10, project.payment_token_decimals || 9)} ${project.payment_token_symbol})`);
        // Note: randomPercentage is stored on-chain as basis points (0-10000), so divide by 100 to get actual percentage
        console.log(`   Luck: ${luck}/60, Random: ${(randomPercentage / 100).toFixed(2)}%`);

        if (!revealed) {
            throw new Error('Box is not revealed on-chain');
        }

        // Update box record in database with ON-CHAIN values
        // NOTE: DB uses 0=pending, 1-5=results; On-chain uses 0-4 for results
        // We add 1 to on-chain tier to get DB value
        const dbTier = rewardTier + 1;

        // Assign a random badge for winning tiers (2-5)
        const badgeImageId = getRandomBadgeId(dbTier);

        const { error: updateError } = await supabase
            .from('boxes')
            .update({
                box_result: dbTier, // DB: 1=dud, 2=rebate, 3=break-even, 4=profit, 5=jackpot (on-chain + 1)
                payout_amount: rewardAmount,
                opened_at: new Date().toISOString(),
                // New verification columns
                reveal_tx_signature: signature,
                luck_value: luck,
                max_luck: 60, // Max luck score is always 60
                random_percentage: randomPercentage / 100, // On-chain stores basis points (0-10000), divide by 100 to get percentage (0-100)
                // Randomness account is closed as part of reveal transaction (reclaims rent to user)
                randomness_closed: true,
                // Trophy badge for winning tiers
                badge_image_id: badgeImageId,
            })
            .eq('project_id', project.id)
            .eq('box_number', boxId);

        if (updateError) {
            console.error('Failed to update box in database:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to update box in database',
                details: updateError.message,
            });
        }

        console.log(`✅ Box reveal recorded in database`);

        const config = await getNetworkConfig();

        // Fetch owner wallet from box record for logging
        const { data: boxData } = await supabase
            .from('boxes')
            .select('owner_wallet')
            .eq('project_id', project.id)
            .eq('box_number', boxId)
            .single();

        // Log box opened (revealed)
        await logger.logBoxOpened({
            userWallet: boxData?.owner_wallet,
            projectId,
            boxId,
            txSignature: signature,
            luck,
            holdTime: null, // Could calculate from created_at vs committed_at if needed
        });

        return res.json({
            success: true,
            projectId,
            boxId,
            signature,
            reward: {
                // Use consistent field names that frontend expects
                tier: rewardTier + 1, // Frontend expects 1-indexed (1=Dud, 2=Rebate, etc.)
                tierName,
                payoutAmount: Number(rewardAmount), // Raw amount in base units
                formatted: Number(rewardAmount) / Math.pow(10, project.payment_token_decimals || 9),
                isJackpot,
                luck,
                randomPercentage: randomPercentage / 100, // Convert basis points to percentage (0-100)
                badgeImageId, // Trophy badge ID for winning tiers (null for duds)
            },
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming box reveal:', error);

        // Log the error
        await logger.logTransactionError({
            actorType: ActorTypes.USER,
            projectId: req.body?.projectId,
            txSignature: req.body?.signature,
            errorCode: 'BOX_REVEAL_FAILED',
            errorMessage: error.message,
            instruction: 'confirm-reveal',
        });

        return res.status(500).json({
            success: false,
            error: 'Failed to confirm box reveal',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/build-settle-box-tx
 * Build transaction for claiming box reward (transferring from vault to user)
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - boxId: number - Box ID to settle
 * - ownerWallet: string - Box owner's wallet address
 */
router.post('/build-settle-box-tx', async (req, res) => {
    try {
        const { projectId, boxId, ownerWallet } = req.body;

        // Validate input
        if (!projectId || boxId === undefined || !ownerWallet) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, boxId, ownerWallet'
            });
        }

        console.log(`\n💰 Building settle box transaction...`);
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Box ID: ${boxId}`);
        console.log(`   Owner: ${ownerWallet}`);

        // Get Anchor program and network config
        const { program, connection, programId } = await getAnchorProgram();
        const config = await getNetworkConfig();

        // Fetch project from database
        const { data: project, error: dbError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_numeric_id', projectId)
            .single();

        if (dbError || !project) {
            throw new Error('Project not found in database');
        }

        // Fetch box from database
        const { data: box, error: boxError } = await supabase
            .from('boxes')
            .select('*')
            .eq('project_id', project.id)
            .eq('box_number', boxId)
            .single();

        if (boxError || !box) {
            throw new Error('Box not found in database');
        }

        // Verify ownership
        if (box.owner_wallet !== ownerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized - you do not own this box',
            });
        }

        // Check if revealed (DB: 0=pending, 1-5=revealed)
        if (box.box_result === 0) {
            return res.status(400).json({
                success: false,
                error: 'Box has not been revealed yet. Please reveal before claiming.',
            });
        }

        // Convert addresses to PublicKeys
        const ownerPubkey = new PublicKey(ownerWallet);
        const paymentTokenMintPubkey = new PublicKey(project.payment_token_mint);

        // Detect token program (Token vs Token-2022)
        const paymentTokenProgram = await getTokenProgramForMint(connection, paymentTokenMintPubkey);
        console.log(`   Token program: ${paymentTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'}`);

        // Derive PDAs
        const [projectConfigPDA] = deriveProjectConfigPDAStandalone(new PublicKey(config.programId), projectId);
        const [boxInstancePDA] = deriveBoxInstancePDA(programId, projectId, boxId);
        const [vaultAuthorityPDA] = deriveVaultAuthorityPDA(programId, projectId, paymentTokenMintPubkey);
        const vaultTokenAccount = deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMintPubkey, paymentTokenProgram);

        // Get owner's token account with correct program
        const ownerTokenAccount = getAssociatedTokenAddressSync(
            paymentTokenMintPubkey,
            ownerPubkey,
            false,
            paymentTokenProgram,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        console.log(`   Project Config PDA: ${projectConfigPDA.toString()}`);
        console.log(`   Box Instance PDA: ${boxInstancePDA.toString()}`);
        console.log(`   Vault Token Account: ${vaultTokenAccount.toString()}`);
        console.log(`   Owner Token Account: ${ownerTokenAccount.toString()}`);

        // Read on-chain box state to check if already settled
        const boxAccountInfo = await connection.getAccountInfo(boxInstancePDA);
        if (!boxAccountInfo) {
            throw new Error('Box not found on-chain');
        }

        // Parse box data to check settled status
        let offset = 8; // Skip discriminator
        const data = boxAccountInfo.data;

        // Skip box_id (8), project_id (8), owner (32), created_at (8), committed_at (8), luck (1), revealed (1)
        offset += 8 + 8 + 32 + 8 + 8 + 1 + 1;

        // Read settled (1 byte)
        const isSettled = data[offset] === 1;

        if (isSettled) {
            return res.status(400).json({
                success: false,
                error: 'Box has already been settled (reward claimed)',
            });
        }

        // Check vault balance before attempting settlement
        const vaultAccountInfo = await connection.getAccountInfo(vaultTokenAccount);
        if (vaultAccountInfo && box.payout_amount > 0) {
            // Parse token account data to get balance (offset 64 for amount in SPL token account)
            // Use BN to handle large token amounts safely (avoids 53-bit limit)
            const vaultBalanceBN = new BN(vaultAccountInfo.data.subarray(64, 72), 'le');
            const payoutBN = new BN(box.payout_amount.toString());

            if (vaultBalanceBN.lt(payoutBN)) {
                const decimals = project.payment_token_decimals || 9;
                const vaultBalanceFormatted = Number(vaultBalanceBN.toString()) / Math.pow(10, decimals);
                const payoutFormatted = Number(box.payout_amount) / Math.pow(10, decimals);
                console.error(`❌ Vault balance insufficient: ${vaultBalanceBN.toString()} < ${box.payout_amount}`);
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient vault balance to pay reward',
                    details: `Vault has ${vaultBalanceFormatted} ${project.payment_token_symbol} but reward is ${payoutFormatted} ${project.payment_token_symbol}. The project owner needs to fund the vault.`,
                    vaultBalance: vaultBalanceBN.toString(),
                    requiredAmount: box.payout_amount.toString(),
                });
            }
        }

        // Check if owner token account exists, create it if needed
        const ownerTokenAccountInfo = await connection.getAccountInfo(ownerTokenAccount);
        const ownerAtaNeedsCreation = !ownerTokenAccountInfo;

        // Build settle transaction
        const projectIdBN = new BN(projectId);
        const boxIdBN = new BN(boxId);

        const settleTx = await program.methods
            .settleBox(projectIdBN, boxIdBN)
            .accounts({
                owner: ownerPubkey,
                projectConfig: projectConfigPDA,
                boxInstance: boxInstancePDA,
                vaultAuthority: vaultAuthorityPDA,
                paymentTokenMint: paymentTokenMintPubkey,
                vaultTokenAccount: vaultTokenAccount,
                ownerTokenAccount: ownerTokenAccount,
                tokenProgram: paymentTokenProgram, // Token or Token-2022
            })
            .transaction();

        // If owner ATA doesn't exist, prepend instruction to create it
        let transaction;
        if (ownerAtaNeedsCreation) {
            console.log(`   ⚠️  Owner token account doesn't exist - will create it`);
            const createAtaIx = createAssociatedTokenAccountInstruction(
                ownerPubkey, // payer
                ownerTokenAccount, // ata
                ownerPubkey, // owner
                paymentTokenMintPubkey, // mint
                paymentTokenProgram, // Token or Token-2022
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            transaction = new anchor.web3.Transaction();
            transaction.add(createAtaIx);
            transaction.add(...settleTx.instructions);
        } else {
            transaction = settleTx;
        }

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        // Serialize transaction
        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString('base64');

        console.log(`✅ Settle transaction built successfully`);
        console.log(`   Reward to claim: ${box.payout_amount / Math.pow(10, project.payment_token_decimals)} ${project.payment_token_symbol}`);

        return res.json({
            success: true,
            transaction: serializedTransaction,
            projectId,
            boxId,
            boxInstancePDA: boxInstancePDA.toString(),
            reward: {
                amount: box.payout_amount,
                formatted: box.payout_amount / Math.pow(10, project.payment_token_decimals),
                symbol: project.payment_token_symbol,
            },
            network: config.network,
        });

    } catch (error) {
        console.error('❌ Error building settle box transaction:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to build settle box transaction',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/confirm-settle
 * Update database after box settle transaction confirms
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - boxId: number - Box ID
 * - signature: string - Transaction signature
 */
router.post('/confirm-settle', async (req, res) => {
    try {
        const { projectId, boxId, signature } = req.body;

        if (!projectId || boxId === undefined || !signature) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        console.log(`\n✅ Confirming box ${boxId} settlement for project ${projectId}...`);
        console.log(`   Transaction: ${signature}`);

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

        // Fetch project from database
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_numeric_id', projectId)
            .single();

        if (projectError || !project) {
            throw new Error('Project not found');
        }

        // Fetch box to get payout amount for stats update
        const { data: box, error: boxError } = await supabase
            .from('boxes')
            .select('payout_amount, box_result')
            .eq('project_id', project.id)
            .eq('box_number', boxId)
            .single();

        if (boxError || !box) {
            throw new Error('Box not found');
        }

        // Update box settled_at timestamp and settle transaction signature
        const { error: boxUpdateError } = await supabase
            .from('boxes')
            .update({
                settled_at: new Date().toISOString(),
                settle_tx_signature: signature,
            })
            .eq('project_id', project.id)
            .eq('box_number', boxId);

        if (boxUpdateError) {
            console.warn('Warning: Failed to update box settled_at:', boxUpdateError);
        }

        console.log(`✅ Box settlement confirmed`);

        const config = await getNetworkConfig();

        // Fetch box owner wallet for logging
        const { data: boxOwnerData } = await supabase
            .from('boxes')
            .select('owner_wallet, luck_value')
            .eq('project_id', project.id)
            .eq('box_number', boxId)
            .single();

        // Map tier ID to name
        const tierNames = ['Pending', 'Dud', 'Rebate', 'Break-even', 'Profit', 'Jackpot'];

        // Log box settled
        await logger.logBoxSettled({
            userWallet: boxOwnerData?.owner_wallet,
            projectId,
            boxId,
            txSignature: signature,
            payout: box.payout_amount,
            outcome: tierNames[box.box_result] || 'Unknown',
            tier: box.box_result,
            multiplier: null, // Could calculate based on box_price vs payout
            luck: boxOwnerData?.luck_value,
        });

        return res.json({
            success: true,
            projectId,
            boxId,
            signature,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming box settlement:', error);

        // Log the error
        await logger.logTransactionError({
            actorType: ActorTypes.USER,
            projectId: req.body?.projectId,
            txSignature: req.body?.signature,
            errorCode: 'BOX_SETTLE_FAILED',
            errorMessage: error.message,
            instruction: 'confirm-settle',
        });

        return res.status(500).json({
            success: false,
            error: 'Failed to confirm box settlement',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * GET /api/program/box/:projectId/:boxId
 * Fetch on-chain box state
 */
router.get('/box/:projectId/:boxId', async (req, res) => {
    try {
        const { projectId, boxId } = req.params;

        const config = await getNetworkConfig();
        const { connection, programId } = await getAnchorProgram();

        const [boxInstancePDA] = deriveBoxInstancePDA(programId, parseInt(projectId), parseInt(boxId));

        // Fetch account info directly
        const accountInfo = await connection.getAccountInfo(boxInstancePDA);

        if (!accountInfo) {
            return res.status(404).json({
                success: false,
                error: 'Box not found on-chain',
            });
        }

        // Manually deserialize BoxInstance account data
        let offset = 8; // Skip discriminator
        const data = accountInfo.data;

        const boxIdBN = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;

        const projectIdBN = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;

        const owner = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        const createdAtBN = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;

        // committed_at (8 bytes) - added in commit_box
        const committedAtBN = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;

        const luck = data[offset];
        offset += 1;

        const revealed = data[offset] === 1;
        offset += 1;

        const settled = data[offset] === 1;
        offset += 1;

        const rewardAmountBN = new BN(data.slice(offset, offset + 8), 'le');
        offset += 8;

        const isJackpot = data[offset] === 1;
        offset += 1;

        // Random percentage is f64 (8 bytes)
        // Copy to aligned buffer to avoid Float64Array alignment issues
        const randomPercentageBytes = new Uint8Array(8);
        randomPercentageBytes.set(data.slice(offset, offset + 8));
        const randomPercentage = new Float64Array(randomPercentageBytes.buffer)[0];

        return res.json({
            success: true,
            boxId: parseInt(boxId),
            projectId: parseInt(projectId),
            onChainData: {
                boxId: boxIdBN.toString(),
                projectId: projectIdBN.toString(),
                owner: owner.toString(),
                createdAt: new Date(createdAtBN.toNumber() * 1000).toISOString(),
                committedAt: committedAtBN.toNumber() > 0 ? new Date(committedAtBN.toNumber() * 1000).toISOString() : null,
                luck,
                revealed,
                settled,
                rewardAmount: rewardAmountBN.toString(),
                isJackpot,
                randomPercentage: randomPercentage / 100, // Convert basis points to percentage (0-100)
            },
            pda: boxInstancePDA.toString(),
        });

    } catch (error) {
        console.error('Error fetching box:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch box',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/build-update-project-tx
 * Build transaction for updating project settings (box price, active status, luck interval)
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - ownerWallet: string - Project owner wallet address
 * - newBoxPrice: number (optional) - New box price
 * - newActive: boolean (optional) - New active status
 * - newLuckIntervalSeconds: number (optional) - New luck interval (0 = platform default)
 */
router.post('/build-update-project-tx', async (req, res) => {
    try {
        const { projectId, ownerWallet, newBoxPrice, newActive, newLuckIntervalSeconds } = req.body;

        // Validate input
        if (!projectId || !ownerWallet) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, ownerWallet'
            });
        }

        // At least one field must be provided to update
        if (newBoxPrice === undefined && newActive === undefined && newLuckIntervalSeconds === undefined) {
            return res.status(400).json({
                success: false,
                error: 'At least one field to update must be provided (newBoxPrice, newActive, or newLuckIntervalSeconds)'
            });
        }

        console.log(`\n🔨 Building update project transaction for project ${projectId}...`);
        console.log(`   Owner: ${ownerWallet}`);
        if (newBoxPrice !== undefined) console.log(`   New box price: ${newBoxPrice}`);
        if (newActive !== undefined) console.log(`   New active status: ${newActive}`);
        if (newLuckIntervalSeconds !== undefined) console.log(`   New luck interval: ${newLuckIntervalSeconds}`);

        // Get Anchor program
        const { program, connection, programId } = await getAnchorProgram();
        const config = await getNetworkConfig();

        const ownerPubkey = new PublicKey(ownerWallet);

        // Derive project config PDA
        const [projectConfigPDA] = deriveProjectConfigPDAStandalone(programId, projectId);

        // Build the update transaction
        const projectIdBN = new BN(projectId);
        const updateTx = await program.methods
            .updateProject(
                projectIdBN,
                newBoxPrice !== undefined ? new BN(newBoxPrice) : null,
                newActive !== undefined ? newActive : null,
                newLuckIntervalSeconds !== undefined ? new BN(newLuckIntervalSeconds) : null
            )
            .accounts({
                owner: ownerPubkey,
                projectConfig: projectConfigPDA,
            })
            .transaction();

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        updateTx.recentBlockhash = blockhash;
        updateTx.feePayer = ownerPubkey;

        // Serialize transaction
        const serializedTransaction = updateTx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString('base64');

        console.log(`\n✅ Update project transaction built successfully!`);

        return res.json({
            success: true,
            transaction: serializedTransaction,
            projectId,
            updates: {
                boxPrice: newBoxPrice,
                active: newActive,
                luckIntervalSeconds: newLuckIntervalSeconds,
            },
            network: config.network,
        });

    } catch (error) {
        console.error('❌ Error building update project transaction:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to build update project transaction',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/confirm-project-update
 * Update database after project settings have been updated on-chain
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - signature: string - Transaction signature
 * - updates: object - Fields that were updated { boxPrice?, luckIntervalSeconds? }
 */
router.post('/confirm-project-update', async (req, res) => {
    try {
        const { projectId, signature, updates } = req.body;

        if (!projectId || !signature || !updates) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, signature, updates'
            });
        }

        console.log(`\n✅ Confirming project ${projectId} update...`);
        console.log(`   Transaction: ${signature}`);
        console.log(`   Updates:`, updates);

        // Build the database update object
        const dbUpdates = {};
        if (updates.boxPrice !== undefined) {
            dbUpdates.box_price = updates.boxPrice;
        }
        if (updates.luckIntervalSeconds !== undefined) {
            dbUpdates.luck_interval_seconds = updates.luckIntervalSeconds || null;
        }

        if (Object.keys(dbUpdates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid updates provided'
            });
        }

        // Update database using project_numeric_id
        const { error: dbError } = await supabase
            .from('projects')
            .update(dbUpdates)
            .eq('project_numeric_id', projectId);

        if (dbError) {
            console.error('Database update failed:', dbError);
            return res.status(500).json({
                success: false,
                error: 'Failed to update database',
                details: dbError.message,
            });
        }

        console.log(`✅ Database updated successfully`);

        const config = await getNetworkConfig();

        return res.json({
            success: true,
            projectId,
            signature,
            updates: dbUpdates,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming project update:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to confirm project update',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/mark-reveal-failed
 * Mark a box as failed to reveal due to system issues (oracle unavailable, etc.)
 * This makes the box eligible for a refund after the reveal window expires.
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - boxId: number - Box ID
 * - ownerWallet: string - Box owner's wallet address
 * - failureReason: string - Reason for failure (oracle_unavailable, randomness_account_missing, etc.)
 */
router.post('/mark-reveal-failed', async (req, res) => {
    try {
        const { projectId, boxId, ownerWallet, failureReason } = req.body;

        if (!projectId || boxId === undefined || !ownerWallet || !failureReason) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, boxId, ownerWallet, failureReason',
            });
        }

        console.log(`\n⚠️ Marking box as reveal failed...`);
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Box ID: ${boxId}`);
        console.log(`   Owner: ${ownerWallet}`);
        console.log(`   Reason: ${failureReason}`);

        // Get project UUID from numeric ID
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('project_numeric_id', projectId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
            });
        }

        // Update box with failure info
        const { data: box, error: updateError } = await supabase
            .from('boxes')
            .update({
                reveal_failed_at: new Date().toISOString(),
                reveal_failure_reason: failureReason,
                refund_eligible: true,
            })
            .eq('project_id', project.id)
            .eq('box_number', boxId)
            .eq('owner_wallet', ownerWallet)
            .select()
            .single();

        if (updateError) {
            console.error('Database update error:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to update box',
                details: updateError.message,
            });
        }

        console.log(`✅ Box marked as refund-eligible`);

        return res.json({
            success: true,
            message: 'Box marked as refund-eligible',
            box: {
                boxId,
                projectId,
                refundEligible: true,
                failureReason,
            },
        });

    } catch (error) {
        console.error('❌ Error marking reveal failed:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to mark reveal failed',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/build-refund-box-tx
 * Build a transaction to refund a box that failed due to system issues.
 *
 * Requirements:
 * - Box must be marked as refund_eligible in database
 * - Box must be committed but not revealed
 * - Reveal window must have expired (1 hour)
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - boxId: number - Box ID
 * - ownerWallet: string - Box owner's wallet address
 */
router.post('/build-refund-box-tx', async (req, res) => {
    try {
        const { projectId, boxId, ownerWallet } = req.body;

        if (!projectId || boxId === undefined || !ownerWallet) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, boxId, ownerWallet',
            });
        }

        console.log(`\n💰 Building refund box transaction...`);
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Box ID: ${boxId}`);
        console.log(`   Owner: ${ownerWallet}`);

        // Get project from database
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('project_numeric_id', projectId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
            });
        }

        // Get box from database
        const { data: box, error: boxError } = await supabase
            .from('boxes')
            .select('*')
            .eq('project_id', project.id)
            .eq('box_number', boxId)
            .eq('owner_wallet', ownerWallet)
            .single();

        if (boxError || !box) {
            return res.status(404).json({
                success: false,
                error: 'Box not found',
            });
        }

        // Verify box is eligible for refund
        if (!box.refund_eligible) {
            return res.status(400).json({
                success: false,
                error: 'Box is not eligible for refund. Only boxes that failed due to system issues can be refunded.',
            });
        }

        if (!box.randomness_committed) {
            return res.status(400).json({
                success: false,
                error: 'Box has not been committed yet',
            });
        }

        if (box.box_result !== 0) {
            return res.status(400).json({
                success: false,
                error: 'Box has already been revealed or settled',
            });
        }

        // Note: We do NOT check the reveal window expiry here.
        // If a box is marked as refund_eligible, it means a system fault was detected
        // (oracle error, network issue, etc.) and the user should be able to claim
        // their refund immediately - they don't need to wait for the 1 hour window.
        // The 1-hour window only applies to normal reveals, not refunds for system errors.

        // Initialize Anchor program
        const { program, connection, programId } = await getAnchorProgram();
        const config = await getNetworkConfig();

        const ownerPubkey = new PublicKey(ownerWallet);
        const paymentTokenMintPubkey = new PublicKey(project.payment_token_mint);

        // Detect token program (Token vs Token-2022)
        const paymentTokenProgram = await getTokenProgramForMint(connection, paymentTokenMintPubkey);
        console.log(`   Token program: ${paymentTokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'}`);

        // Derive PDAs
        const [projectConfigPDA] = deriveProjectConfigPDAStandalone(programId, projectId);
        const [vaultAuthorityPDA] = deriveVaultAuthorityPDA(programId, projectId, paymentTokenMintPubkey);
        const vaultTokenAccount = deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMintPubkey, paymentTokenProgram);

        // Verify on-chain box state before building transaction
        // This catches database/on-chain state mismatches early
        try {
            const boxInstancePDA = new PublicKey(box.box_pda);
            const onChainBox = await program.account.boxInstance.fetch(boxInstancePDA);

            console.log(`   On-chain state: randomness_committed=${onChainBox.randomnessCommitted}, revealed=${onChainBox.revealed}, settled=${onChainBox.settled}`);

            if (!onChainBox.randomnessCommitted) {
                return res.status(400).json({
                    success: false,
                    error: 'Box has not been committed on-chain. Database and on-chain state are out of sync.',
                    details: 'The box appears committed in database but not on-chain. This may require manual investigation.',
                });
            }

            if (onChainBox.revealed) {
                return res.status(400).json({
                    success: false,
                    error: 'Box has already been revealed on-chain',
                });
            }

            if (onChainBox.settled) {
                return res.status(400).json({
                    success: false,
                    error: 'Box has already been settled on-chain',
                });
            }
        } catch (fetchError) {
            console.error('Failed to verify on-chain box state:', fetchError);
            return res.status(400).json({
                success: false,
                error: 'Could not verify on-chain box state',
                details: fetchError.message,
            });
        }

        // Get owner's token account with correct program
        const ownerTokenAccount = getAssociatedTokenAddressSync(
            paymentTokenMintPubkey,
            ownerPubkey,
            false,
            paymentTokenProgram,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Build refund transaction
        const projectIdBN = new BN(projectId);
        const boxIdBN = new BN(boxId);

        const refundTx = await program.methods
            .refundBox(projectIdBN, boxIdBN)
            .accounts({
                owner: ownerPubkey,
                projectConfig: projectConfigPDA,
                boxInstance: new PublicKey(box.box_pda),
                vaultAuthority: vaultAuthorityPDA,
                paymentTokenMint: paymentTokenMintPubkey,
                vaultTokenAccount: vaultTokenAccount,
                ownerTokenAccount: ownerTokenAccount,
                tokenProgram: paymentTokenProgram, // Token or Token-2022
            })
            .transaction();

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        refundTx.recentBlockhash = blockhash;
        refundTx.feePayer = ownerPubkey;

        // Serialize transaction
        const serializedTransaction = refundTx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString('base64');

        console.log(`\n✅ Refund transaction built successfully!`);
        console.log(`   Refund amount: ${project.box_price / Math.pow(10, project.payment_token_decimals)} ${project.payment_token_symbol}`);

        return res.json({
            success: true,
            transaction: serializedTransaction,
            refundAmount: project.box_price,
            refundAmountFormatted: `${project.box_price / Math.pow(10, project.payment_token_decimals)} ${project.payment_token_symbol}`,
            projectId,
            boxId,
            network: config.network,
        });

    } catch (error) {
        console.error('❌ Error building refund transaction:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to build refund transaction',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

/**
 * POST /api/program/confirm-refund
 * Update database after refund transaction confirms
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - boxId: number - Box ID
 * - ownerWallet: string - Box owner's wallet address
 * - signature: string - Transaction signature
 */
router.post('/confirm-refund', async (req, res) => {
    try {
        const { projectId, boxId, ownerWallet, signature } = req.body;

        if (!projectId || boxId === undefined || !ownerWallet || !signature) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, boxId, ownerWallet, signature',
            });
        }

        console.log(`\n✅ Confirming refund...`);
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Box ID: ${boxId}`);
        console.log(`   Signature: ${signature}`);

        // Initialize Anchor program to verify on-chain state
        const { program, programId, connection } = await getAnchorProgram();

        // Verify transaction on-chain before updating database
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

        // Derive box PDA
        const [boxInstancePDA] = deriveBoxInstancePDA(programId, projectId, boxId);

        // Read on-chain box state to verify refund actually happened
        let onChainBox;
        try {
            onChainBox = await program.account.boxInstance.fetch(boxInstancePDA);
        } catch (fetchError) {
            console.error('Failed to fetch on-chain box:', fetchError);
            return res.status(400).json({
                success: false,
                error: 'Could not verify on-chain refund status',
                details: fetchError.message,
            });
        }

        // Verify the box was actually refunded on-chain
        // On-chain: reward_tier = 6, settled = true, revealed = true
        if (onChainBox.rewardTier !== 6 || !onChainBox.settled) {
            console.error('On-chain verification failed:', {
                rewardTier: onChainBox.rewardTier,
                settled: onChainBox.settled,
                revealed: onChainBox.revealed,
            });
            return res.status(400).json({
                success: false,
                error: 'On-chain refund not confirmed. The refund transaction may have failed.',
            });
        }

        console.log(`   On-chain verified: reward_tier=${onChainBox.rewardTier}, settled=${onChainBox.settled}`);

        // Get project UUID from numeric ID
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id, box_price')
            .eq('project_numeric_id', projectId)
            .single();

        if (projectError || !project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
            });
        }

        // Update box with refund info (on-chain verified)
        const { data: box, error: updateError } = await supabase
            .from('boxes')
            .update({
                box_result: 6, // REFUNDED (must match on-chain reward_tier)
                payout_amount: project.box_price,
                refunded_at: new Date().toISOString(),
                refund_tx_signature: signature,
                settled_at: new Date().toISOString(),
            })
            .eq('project_id', project.id)
            .eq('box_number', boxId)
            .eq('owner_wallet', ownerWallet)
            .select()
            .single();

        if (updateError) {
            console.error('Database update error:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to update box in database (refund was successful on-chain)',
                details: updateError.message,
            });
        }

        console.log(`✅ Refund confirmed and recorded (on-chain verified)`);

        return res.json({
            success: true,
            message: 'Refund confirmed',
            box: {
                boxId,
                projectId,
                result: 'REFUNDED',
                refundAmount: project.box_price,
            },
        });

    } catch (error) {
        console.error('❌ Error confirming refund:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to confirm refund',
            details: sanitizeErrorMessage(error.message),
        });
    }
});

export default router;
