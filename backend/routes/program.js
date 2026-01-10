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

        // Convert box price and launch fee to BN
        const boxPriceBN = new BN(boxPrice);
        const projectIdBN = new BN(projectId);
        const launchFeeBN = new BN(adminConfig.launch_fee_amount);

        console.log(`\n📝 Building initialize_project transaction...`);

        // Build transaction (don't send it)
        const transaction = await program.methods
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

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = ownerPubkey;

        // Serialize transaction to send to frontend
        const serializedTransaction = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        }).toString('base64');

        console.log(`\n✅ Transaction built successfully!`);
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
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - signature: string - Transaction signature
 * - pdas: object - PDA addresses { projectConfig, vaultAuthority, vaultTokenAccount }
 */
router.post('/confirm-project-init', async (req, res) => {
    try {
        const { projectId, signature, pdas } = req.body;

        if (!projectId || !signature || !pdas) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: projectId, signature, pdas'
            });
        }

        console.log(`\n✅ Confirming project ${projectId} initialization...`);
        console.log(`   Transaction: ${signature}`);

        // Update database with PDA addresses
        const { error: updateError } = await supabase
            .from('projects')
            .update({
                vault_pda: pdas.projectConfig,
                vault_authority_pda: pdas.vaultAuthority,
                vault_token_account: pdas.vaultTokenAccount,
            })
            .eq('project_numeric_id', projectId);

        if (updateError) {
            console.error('⚠️  Warning: Failed to update database with PDAs:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Failed to update database',
                details: updateError.message,
            });
        }

        console.log(`✅ Database updated with PDA addresses`);

        const config = await getNetworkConfig();

        return res.json({
            success: true,
            projectId,
            signature,
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
 * Build transaction for purchasing a lootbox
 *
 * Body:
 * - projectId: number - Numeric project ID
 * - buyerWallet: string - Buyer's wallet address
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

        // Prevent project owners from buying their own boxes
        if (project.owner_wallet === buyerWallet) {
            return res.status(403).json({
                success: false,
                error: 'Project owners cannot purchase boxes from their own project',
            });
        }

        console.log(`   Project: ${project.project_name}`);
        console.log(`   Box price: ${project.box_price / Math.pow(10, project.payment_token_decimals)  } ${project.payment_token_symbol}`);

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

        // Convert to BN
        const projectIdBN = new BN(projectId);

        // Build transaction (only pass projectId, not boxId)
        const boxPurchaseTx = await program.methods
            .createBox(projectIdBN)
            .accounts({
                buyer: buyerPubkey,
                projectConfig: projectConfigPDA,
                boxInstance: boxInstancePDA,
                vaultAuthority: vaultAuthorityPDA,
                vaultTokenAccount: vaultTokenAccount,
                buyerTokenAccount: buyerTokenAccount,
                paymentTokenMint: paymentTokenMintPubkey,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .transaction();

        // If vault doesn't exist, prepend instruction to create it
        let transaction;
        if (vaultNeedsCreation) {
            const createVaultIx = createAssociatedTokenAccountInstruction(
                buyerPubkey, // payer
                vaultTokenAccount, // ata
                vaultAuthorityPDA, // owner
                paymentTokenMintPubkey // mint
            );

            transaction = new anchor.web3.Transaction();
            transaction.add(createVaultIx);
            transaction.add(...boxPurchaseTx.instructions);
        } else {
            transaction = boxPurchaseTx;
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

        console.log(`✅ Transaction built successfully`);

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
 */
router.post('/confirm-box-creation', async (req, res) => {
    try {
        const { projectId, boxId, buyerWallet, signature, boxInstancePDA } = req.body;

        if (!projectId || boxId === undefined || !buyerWallet || !signature || !boxInstancePDA) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        console.log(`\n✅ Confirming box ${boxId} creation for project ${projectId}...`);
        console.log(`   Transaction: ${signature}`);

        // Fetch project from database to get UUID
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('project_numeric_id', projectId)
            .single();

        if (projectError || !project) {
            throw new Error('Project not found');
        }

        // Insert box record into database
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

export default router;
