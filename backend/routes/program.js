// routes/program.js
// API routes for calling Anchor program instructions

import express from 'express';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import {
    getAnchorProgram
} from '../lib/anchorClient.js';
import {
    deriveAllPDAs,
    deriveProjectConfigPDA as deriveProjectConfigPDAStandalone,
    deriveBoxInstancePDA,
    deriveVaultAuthorityPDA,
    deriveVaultTokenAccount
} from '../lib/pdaHelpers.js';
import { getNetworkConfig } from '../lib/getNetworkConfig.js';
import { createClient } from '@supabase/supabase-js';
import {
    createRandomnessAccount,
    createCommitInstruction,
    createRevealInstruction,
    loadRandomness,
    serializeKeypair,
    getSwitchboardConstants,
    getSwitchboardProgram
} from '../lib/switchboard.js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
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
        const { projectId, boxPrice, paymentTokenMint, ownerWallet } = req.body;

        // Validate input
        if (!projectId || !boxPrice || !paymentTokenMint || !ownerWallet) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, boxPrice, paymentTokenMint, ownerWallet'
            });
        }

        console.log(`\n🔨 Building initialize project transaction for project ${projectId}...`);
        console.log(`   Box price: ${boxPrice}`);
        console.log(`   Payment token: ${paymentTokenMint}`);
        console.log(`   Owner: ${ownerWallet}`);

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

        console.log(`\n💰 Launch fee: ${adminConfig.launch_fee_amount / 1e9} ${adminConfig.three_eyes_mint.substring(0, 8)}...`);

        // Get vault fund amount from config
        const vaultFundAmount = BigInt(adminConfig.vault_fund_amount || '50000000000000000'); // Default 50M with 9 decimals
        console.log(`💰 Vault fund amount: ${Number(vaultFundAmount) / 1e9} tokens`);

        // Convert inputs to proper types
        const paymentTokenMintPubkey = new PublicKey(paymentTokenMint);
        const ownerPubkey = new PublicKey(ownerWallet);
        const feeTokenMintPubkey = new PublicKey(adminConfig.three_eyes_mint);
        const platformFeeAccountPubkey = new PublicKey(adminConfig.platform_fee_account);

        // Derive PDAs using standalone helpers
        const pdas = await deriveAllPDAs(programId, parseInt(projectId), paymentTokenMintPubkey);
        const projectConfigPDA = pdas.projectConfig.address;
        const vaultAuthorityPDA = pdas.vaultAuthority.address;
        const vaultAuthorityBump = pdas.vaultAuthority.bump;

        console.log(`\n📍 Derived PDAs:`);
        console.log(`   Project Config: ${projectConfigPDA.toString()}`);
        console.log(`   Vault Authority: ${vaultAuthorityPDA.toString()}`);
        console.log(`   Vault Authority Bump: ${vaultAuthorityBump}`);

        const vaultTokenAccount = pdas.vaultTokenAccount.address;

        console.log(`   Vault Token Account: ${vaultTokenAccount.toString()}`);

        // Derive fee token ATAs (for launch fee payment)
        const ownerFeeTokenAccount = await getAssociatedTokenAddress(
            feeTokenMintPubkey,
            ownerPubkey
        );

        const platformFeeTokenAccount = await getAssociatedTokenAddress(
            feeTokenMintPubkey,
            platformFeeAccountPubkey
        );

        console.log(`\n💳 Fee token accounts:`);
        console.log(`   Owner fee account: ${ownerFeeTokenAccount.toString()}`);
        console.log(`   Platform fee account: ${platformFeeTokenAccount.toString()}`);

        // Get owner's payment token account (for vault funding)
        const ownerPaymentTokenAccount = await getAssociatedTokenAddress(
            paymentTokenMintPubkey,
            ownerPubkey
        );

        console.log(`   Owner payment token account: ${ownerPaymentTokenAccount.toString()}`);

        // Check if vault token account already exists
        const vaultAccountInfo = await connection.getAccountInfo(vaultTokenAccount);
        const vaultNeedsCreation = !vaultAccountInfo;

        if (vaultNeedsCreation) {
            console.log(`   ⚠️  Vault token account doesn't exist - will create it`);
        }

        // Convert box price and launch fee to BN
        const boxPriceBN = new BN(boxPrice);
        const projectIdBN = new BN(projectId);
        const launchFeeBN = new BN(adminConfig.launch_fee_amount);

        console.log(`\n📝 Building initialize_project transaction with vault funding...`);

        // Build the combined transaction
        const combinedTransaction = new Transaction();

        // Step 1: Create vault ATA if it doesn't exist
        if (vaultNeedsCreation) {
            const createVaultAtaIx = createAssociatedTokenAccountInstruction(
                ownerPubkey, // payer
                vaultTokenAccount, // ata
                vaultAuthorityPDA, // owner
                paymentTokenMintPubkey // mint
            );
            combinedTransaction.add(createVaultAtaIx);
        }

        // Step 2: Build the Anchor initialize_project instruction
        const initProjectTx = await program.methods
            .initializeProject(
                projectIdBN,
                boxPriceBN,
                launchFeeBN
            )
            .accounts({
                owner: ownerPubkey,
                projectConfig: projectConfigPDA,
                vaultAuthority: vaultAuthorityPDA,
                paymentTokenMint: paymentTokenMintPubkey,
                ownerFeeTokenAccount: ownerFeeTokenAccount,
                platformFeeTokenAccount: platformFeeTokenAccount,
                feeTokenMint: feeTokenMintPubkey,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .transaction();

        // Add all instructions from the Anchor transaction
        combinedTransaction.add(...initProjectTx.instructions);

        // Step 3: Transfer payment tokens to vault for funding
        const { createTransferInstruction } = await import('@solana/spl-token');
        const fundVaultIx = createTransferInstruction(
            ownerPaymentTokenAccount, // source
            vaultTokenAccount, // destination
            ownerPubkey, // owner of source
            vaultFundAmount, // amount
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
        console.log(`   - Create vault ATA (if needed): ${vaultNeedsCreation}`);
        console.log(`   - Initialize project on-chain`);
        console.log(`   - Fund vault with ${Number(vaultFundAmount) / 1e9} tokens`);
        console.log(`   Transaction will be signed by frontend wallet`);

        // Return transaction for frontend to sign and submit
        return res.json({
            success: true,
            transaction: serializedTransaction,
            projectId,
            pdas: {
                projectConfig: projectConfigPDA.toString(),
                vaultAuthority: vaultAuthorityPDA.toString(),
                vaultAuthorityBump,
                vaultTokenAccount: vaultTokenAccount.toString(),
            },
            vaultFunding: {
                amount: vaultFundAmount.toString(),
                formatted: Number(vaultFundAmount) / 1e9,
            },
            network: config.network,
        });

    } catch (error) {
        console.error('❌ Error building transaction:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to build initialize project transaction',
            details: error.message,
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
 */
router.post('/confirm-project-init', async (req, res) => {
    try {
        const { projectId, signature, pdas, vaultFunding } = req.body;

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

        return res.json({
            success: true,
            projectId,
            signature,
            vaultFunded: !!vaultFunding,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming project init:', error);

        return res.status(500).json({
            success: false,
            error: 'Failed to confirm project initialization',
            details: error.message,
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

        // Derive PDAs
        const [vaultAuthorityPDA] = deriveVaultAuthorityPDA(programId, projectId, paymentTokenMintPubkey);
        const vaultTokenAccount = await deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMintPubkey);

        // Get owner's token account
        const ownerTokenAccount = await getAssociatedTokenAddress(
            paymentTokenMintPubkey,
            ownerPubkey
        );

        console.log(`   Vault token account: ${vaultTokenAccount.toString()}`);
        console.log(`   Owner token account: ${ownerTokenAccount.toString()}`);

        // Check if vault token account exists
        const vaultAccountInfo = await connection.getAccountInfo(vaultTokenAccount);
        const vaultNeedsCreation = !vaultAccountInfo;

        if (vaultNeedsCreation) {
            console.log(`   ⚠️  Vault token account doesn't exist - will create it`);
        }

        // Build transaction
        const transaction = new Transaction();

        // If vault ATA doesn't exist, add instruction to create it
        if (vaultNeedsCreation) {
            const createVaultAtaIx = createAssociatedTokenAccountInstruction(
                ownerPubkey, // payer
                vaultTokenAccount, // ata
                vaultAuthorityPDA, // owner
                paymentTokenMintPubkey // mint
            );
            transaction.add(createVaultAtaIx);
        }

        // Add SPL token transfer instruction
        // Using @solana/spl-token's createTransferInstruction
        const { createTransferInstruction } = await import('@solana/spl-token');
        const transferIx = createTransferInstruction(
            ownerTokenAccount, // source
            vaultTokenAccount, // destination
            ownerPubkey, // owner of source
            BigInt(fundAmount.toString()), // amount
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
            details: error.message,
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
            details: error.message,
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
            details: error.message,
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
            details: error.message,
            stack: error.stack,
        });
    }
});

/**
 * POST /api/program/build-create-box-tx
 * Build transaction for purchasing a lootbox with Switchboard VRF randomness
 *
 * The transaction includes:
 * 1. Create Switchboard randomness account (buyer pays)
 * 2. Commit to randomness request
 * 3. Create box with randomness account reference
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - buyerWallet: string - Buyer's wallet address
 *
 * Returns:
 * - transaction: Serialized transaction for buyer to sign
 * - randomnessKeypair: Serialized keypair that must be included as signer
 * - randomnessAccount: Public key of the randomness account
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

        console.log(`\n🎲 Building create box transaction with Switchboard VRF for project ${projectId}...`);
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

        // Derive PDAs
        const [boxInstancePDA, boxInstanceBump] = deriveBoxInstancePDA(programId, projectId, nextBoxId);
        const [vaultAuthorityPDA] = deriveVaultAuthorityPDA(programId, projectId, paymentTokenMintPubkey);
        const vaultTokenAccount = await deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMintPubkey);

        // Derive buyer's token account
        const buyerTokenAccount = await getAssociatedTokenAddress(
            paymentTokenMintPubkey,
            buyerPubkey
        );

        console.log(`   Box instance PDA: ${boxInstancePDA.toString()}`);
        console.log(`   Vault token account: ${vaultTokenAccount.toString()}`);
        console.log(`   Buyer token account: ${buyerTokenAccount.toString()}`);

        // Check if vault token account exists, create it if needed
        const vaultAccountInfo = await connection.getAccountInfo(vaultTokenAccount);
        const vaultNeedsCreation = !vaultAccountInfo;

        if (vaultNeedsCreation) {
            console.log(`   ⚠️  Vault token account doesn't exist - will create it`);
        }

        // ========================================
        // SWITCHBOARD VRF: Create randomness account and commit
        // ========================================
        console.log(`\n🎰 Setting up Switchboard VRF randomness...`);

        // Create Switchboard randomness account - pass buyer as payer so they pay the fees
        const { keypair: rngKeypair, randomness, createInstruction: createRandomnessIx, publicKey: randomnessAccountPubkey } =
            await createRandomnessAccount(provider, config.network, buyerPubkey);

        console.log(`   Randomness account: ${randomnessAccountPubkey.toString()}`);
        console.log(`   Randomness keypair generated (will be returned for signing)`);

        // Create commit instruction - pass buyer as authority to avoid loading non-existent account
        const commitIx = await createCommitInstruction(randomness, config.network, buyerPubkey);

        // ========================================
        // BUILD COMBINED TRANSACTION
        // ========================================
        console.log(`\n📝 Building combined transaction...`);

        const transaction = new Transaction();

        // 1. Create vault ATA if needed (buyer pays)
        if (vaultNeedsCreation) {
            const createVaultIx = createAssociatedTokenAccountInstruction(
                buyerPubkey, // payer
                vaultTokenAccount, // ata
                vaultAuthorityPDA, // owner
                paymentTokenMintPubkey // mint
            );
            transaction.add(createVaultIx);
            console.log(`   Added: Create vault ATA instruction`);
        }

        // 2. Create Switchboard randomness account (buyer pays)
        transaction.add(createRandomnessIx);
        console.log(`   Added: Create randomness account instruction`);

        // 3. Commit to randomness (request VRF)
        transaction.add(commitIx);
        console.log(`   Added: Commit to randomness instruction`);

        // 4. Create box with randomness account reference
        const projectIdBN = new BN(projectId);
        const boxPurchaseTx = await program.methods
            .createBox(projectIdBN, randomnessAccountPubkey)
            .accounts({
                buyer: buyerPubkey,
                projectConfig: projectConfigPDA,
                boxInstance: boxInstancePDA,
                vaultTokenAccount: vaultTokenAccount,
                buyerTokenAccount: buyerTokenAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .transaction();

        transaction.add(...boxPurchaseTx.instructions);
        console.log(`   Added: Create box instruction with randomness reference`);

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = buyerPubkey;

        // Serialize transaction (without signatures - buyer and randomness keypair will sign on frontend)
        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString('base64');

        // Serialize the randomness keypair so frontend can include it as signer
        const serializedRandomnessKeypair = serializeKeypair(rngKeypair);

        console.log(`\n✅ Transaction built successfully with Switchboard VRF!`);
        console.log(`   Total instructions: ${transaction.instructions.length}`);

        return res.json({
            success: true,
            transaction: serializedTransaction,
            randomnessKeypair: serializedRandomnessKeypair,
            randomnessAccount: randomnessAccountPubkey.toString(),
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
            details: error.message,
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
                box_result: 0, // Pending reveal
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

        return res.json({
            success: true,
            projectId,
            boxId,
            signature,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming box creation:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to confirm box creation',
            details: error.message,
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

        // Check if already revealed
        if (box.box_result !== 0) {
            return res.status(400).json({
                success: false,
                error: 'Box has already been revealed',
                result: box.box_result,
            });
        }

        // Verify randomness was committed
        if (!box.randomness_account) {
            return res.status(400).json({
                success: false,
                error: 'Box does not have a randomness account committed. Please create a new box.',
            });
        }

        console.log(`   Randomness account: ${box.randomness_account}`);

        // Convert addresses to PublicKeys
        const ownerPubkey = new PublicKey(ownerWallet);
        const paymentTokenMintPubkey = new PublicKey(project.payment_token_mint);
        const randomnessAccountPubkey = new PublicKey(box.randomness_account);

        // Derive PDAs
        const [projectConfigPDA] = deriveProjectConfigPDAStandalone(new PublicKey(config.programId), projectId);
        const [boxInstancePDA] = deriveBoxInstancePDA(programId, projectId, boxId);
        const [vaultAuthorityPDA] = deriveVaultAuthorityPDA(programId, projectId, paymentTokenMintPubkey);
        const vaultTokenAccount = await deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMintPubkey);

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

        // Skip box_id (8), project_id (8), owner (32), created_at (8)
        offset += 8 + 8 + 32 + 8;

        // Read luck (1 byte)
        const currentLuck = data[offset];
        offset += 1;

        // Read revealed (1 byte)
        const isRevealed = data[offset] === 1;

        if (isRevealed) {
            return res.status(400).json({
                success: false,
                error: 'Box has already been revealed on-chain',
            });
        }

        // Calculate hold time and luck score
        const boxCreatedAt = new Date(box.created_at).getTime() / 1000; // Unix timestamp
        const now = Math.floor(Date.now() / 1000);
        const holdTimeSeconds = now - boxCreatedAt;

        // Get luck interval from config (default 3 seconds for dev)
        const luckIntervalSeconds = config.luckIntervalSeconds || 3;
        const calculatedLuck = calculateLuckScore(holdTimeSeconds, luckIntervalSeconds);

        console.log(`   Box created at: ${new Date(box.created_at).toISOString()}`);
        console.log(`   Hold time: ${holdTimeSeconds} seconds`);
        console.log(`   Luck interval: ${luckIntervalSeconds} seconds`);
        console.log(`   Calculated luck: ${calculatedLuck}/60`);

        // ========================================
        // SWITCHBOARD VRF: Create reveal instruction
        // ========================================
        console.log(`\n🎰 Creating Switchboard VRF reveal instruction...`);

        // Load the existing randomness account
        const randomness = await loadRandomness(provider, randomnessAccountPubkey, config.network);

        // Create Switchboard reveal instruction - pass owner as payer and network for crossbar fallback
        const revealIx = await createRevealInstruction(randomness, ownerPubkey, config.network);

        // ========================================
        // BUILD COMBINED TRANSACTION
        // ========================================
        console.log(`\n📝 Building combined reveal transaction...`);

        const transaction = new Transaction();

        // 1. Switchboard reveal instruction (reveals the committed randomness)
        transaction.add(revealIx);
        console.log(`   Added: Switchboard reveal instruction`);

        // 2. Our program's reveal_box instruction (reads randomness from account)
        const projectIdBN = new BN(projectId);
        const boxIdBN = new BN(boxId);

        const revealBoxTx = await program.methods
            .revealBox(projectIdBN, boxIdBN)
            .accounts({
                owner: ownerPubkey,
                projectConfig: projectConfigPDA,
                boxInstance: boxInstancePDA,
                vaultTokenAccount: vaultTokenAccount,
                randomnessAccount: randomnessAccountPubkey,
            })
            .transaction();

        transaction.add(...revealBoxTx.instructions);
        console.log(`   Added: reveal_box instruction with randomness account`);

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
            luckScore: calculatedLuck,
            holdTimeSeconds,
            network: config.network,
            message: 'Randomness will be read from Switchboard VRF on-chain. Reward calculated after reveal.',
        });

    } catch (error) {
        console.error('❌ Error building reveal box transaction:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to build reveal box transaction',
            details: error.message,
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

        // Skip box_id (8), project_id (8), owner (32), created_at (8)
        offset += 8 + 8 + 32 + 8;

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
        console.log(`   Luck: ${luck}/60, Random: ${(randomPercentage * 100).toFixed(2)}%`);

        if (!revealed) {
            throw new Error('Box is not revealed on-chain');
        }

        // Update box record in database with ON-CHAIN values
        const { error: updateError } = await supabase
            .from('boxes')
            .update({
                box_result: rewardTier + 1, // 1=dud, 2=rebate, 3=break-even, 4=profit, 5=jackpot
                payout_amount: rewardAmount,
                opened_at: new Date().toISOString(),
                // New verification columns
                reveal_tx_signature: signature,
                luck_value: luck,
                max_luck: 60, // Max luck score is always 60
                random_percentage: randomPercentage * 100, // Store as percentage (0-100)
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

        return res.json({
            success: true,
            projectId,
            boxId,
            signature,
            reward: {
                amount: rewardAmount,
                formatted: Number(rewardAmount) / Math.pow(10, project.payment_token_decimals || 9),
                tierId: rewardTier,
                tierName,
                isJackpot,
            },
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming box reveal:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to confirm box reveal',
            details: error.message,
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

        // Check if revealed (box_result > 0 means revealed)
        if (box.box_result === 0) {
            return res.status(400).json({
                success: false,
                error: 'Box has not been revealed yet. Please reveal before claiming.',
            });
        }

        // Convert addresses to PublicKeys
        const ownerPubkey = new PublicKey(ownerWallet);
        const paymentTokenMintPubkey = new PublicKey(project.payment_token_mint);

        // Derive PDAs
        const [projectConfigPDA] = deriveProjectConfigPDAStandalone(new PublicKey(config.programId), projectId);
        const [boxInstancePDA] = deriveBoxInstancePDA(programId, projectId, boxId);
        const [vaultAuthorityPDA] = deriveVaultAuthorityPDA(programId, projectId, paymentTokenMintPubkey);
        const vaultTokenAccount = await deriveVaultTokenAccount(vaultAuthorityPDA, paymentTokenMintPubkey);

        // Get owner's token account
        const ownerTokenAccount = await getAssociatedTokenAddress(
            paymentTokenMintPubkey,
            ownerPubkey
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

        // Skip box_id (8), project_id (8), owner (32), created_at (8), luck (1), revealed (1)
        offset += 8 + 8 + 32 + 8 + 1 + 1;

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
                tokenProgram: TOKEN_PROGRAM_ID,
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
                paymentTokenMintPubkey // mint
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
            details: error.message,
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

        // Update project stats if jackpot was hit
        if (box.box_result === 5) { // 5 = Jackpot
            const { error: statsError } = await supabase
                .from('projects')
                .update({
                    total_jackpots_hit: (project.total_jackpots_hit || 0) + 1,
                })
                .eq('id', project.id);

            if (statsError) {
                console.warn('Warning: Failed to update jackpot stats:', statsError);
            }
        }

        console.log(`✅ Box settlement confirmed`);

        const config = await getNetworkConfig();

        return res.json({
            success: true,
            projectId,
            boxId,
            signature,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('❌ Error confirming box settlement:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to confirm box settlement',
            details: error.message,
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
                luck,
                revealed,
                settled,
                rewardAmount: rewardAmountBN.toString(),
                isJackpot,
                randomPercentage,
            },
            pda: boxInstancePDA.toString(),
        });

    } catch (error) {
        console.error('Error fetching box:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch box',
            details: error.message,
        });
    }
});

export default router;
