// routes/admin.js
// Admin endpoints for platform configuration

import express from 'express';
import { PublicKey, Transaction, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import BN from 'bn.js';
import { getAnchorProgram } from '../lib/anchorClient.js';
import { derivePlatformConfigPDA } from '../lib/pdaHelpers.js';
import { getNetworkConfig } from '../lib/getNetworkConfig.js';
import { createClient } from '@supabase/supabase-js';

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

        return res.json({
            success: true,
            message: 'Platform config updated on-chain',
            signature,
            explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${config.network}`,
        });

    } catch (error) {
        console.error('Error updating platform config:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update platform config',
            details: error.message,
        });
    }
});

/**
 * GET /api/admin/platform-config
 * Reads the current on-chain platform config
 */
router.get('/platform-config', async (req, res) => {
    try {
        const { program, connection, programId } = await getAnchorProgram();
        const config = await getNetworkConfig();

        // Derive platform config PDA
        const [platformConfigPDA] = derivePlatformConfigPDA(programId);

        // Fetch account
        const accountInfo = await connection.getAccountInfo(platformConfigPDA);
        if (!accountInfo) {
            return res.status(404).json({
                success: false,
                error: 'Platform config not initialized',
            });
        }

        // Parse account data (skip 8-byte discriminator)
        const data = accountInfo.data;
        let offset = 8;

        const admin = new PublicKey(data.subarray(offset, offset + 32));
        offset += 32;

        const initialized = data[offset] === 1;
        offset += 1;

        const paused = data[offset] === 1;
        offset += 1;

        const baseLuck = data[offset];
        offset += 1;

        const maxLuck = data[offset];
        offset += 1;

        const luckTimeInterval = new BN(data.subarray(offset, offset + 8), 'le').toNumber();
        offset += 8;

        // Payout multipliers (u32)
        const payoutDud = data.readUInt32LE(offset);
        offset += 4;
        const payoutRebate = data.readUInt32LE(offset);
        offset += 4;
        const payoutBreakeven = data.readUInt32LE(offset);
        offset += 4;
        const payoutProfit = data.readUInt32LE(offset);
        offset += 4;
        const payoutJackpot = data.readUInt32LE(offset);
        offset += 4;

        // Tier 1 probabilities (u8 max_luck + 4x u16 probabilities)
        const tier1MaxLuck = data[offset];
        offset += 1;
        const tier1Dud = data.readUInt16LE(offset);
        offset += 2;
        const tier1Rebate = data.readUInt16LE(offset);
        offset += 2;
        const tier1Breakeven = data.readUInt16LE(offset);
        offset += 2;
        const tier1Profit = data.readUInt16LE(offset);
        offset += 2;

        // Tier 2 probabilities
        const tier2MaxLuck = data[offset];
        offset += 1;
        const tier2Dud = data.readUInt16LE(offset);
        offset += 2;
        const tier2Rebate = data.readUInt16LE(offset);
        offset += 2;
        const tier2Breakeven = data.readUInt16LE(offset);
        offset += 2;
        const tier2Profit = data.readUInt16LE(offset);
        offset += 2;

        // Tier 3 probabilities (no max_luck, it goes up to max_luck)
        const tier3Dud = data.readUInt16LE(offset);
        offset += 2;
        const tier3Rebate = data.readUInt16LE(offset);
        offset += 2;
        const tier3Breakeven = data.readUInt16LE(offset);
        offset += 2;
        const tier3Profit = data.readUInt16LE(offset);
        offset += 2;

        return res.json({
            success: true,
            platformConfig: {
                pda: platformConfigPDA.toString(),
                admin: admin.toString(),
                initialized,
                paused,
                baseLuck,
                maxLuck,
                luckTimeInterval,
                payoutMultipliers: {
                    dud: payoutDud / 10000,
                    rebate: payoutRebate / 10000,
                    breakeven: payoutBreakeven / 10000,
                    profit: payoutProfit / 10000,
                    jackpot: payoutJackpot / 10000,
                },
                tiers: {
                    tier1: {
                        maxLuck: tier1MaxLuck,
                        dud: tier1Dud / 100,       // Convert to percentage
                        rebate: tier1Rebate / 100,
                        breakeven: tier1Breakeven / 100,
                        profit: tier1Profit / 100,
                        jackpot: (10000 - tier1Dud - tier1Rebate - tier1Breakeven - tier1Profit) / 100, // Calculate remainder
                    },
                    tier2: {
                        maxLuck: tier2MaxLuck,
                        dud: tier2Dud / 100,
                        rebate: tier2Rebate / 100,
                        breakeven: tier2Breakeven / 100,
                        profit: tier2Profit / 100,
                        jackpot: (10000 - tier2Dud - tier2Rebate - tier2Breakeven - tier2Profit) / 100,
                    },
                    tier3: {
                        dud: tier3Dud / 100,
                        rebate: tier3Rebate / 100,
                        breakeven: tier3Breakeven / 100,
                        profit: tier3Profit / 100,
                        jackpot: (10000 - tier3Dud - tier3Rebate - tier3Breakeven - tier3Profit) / 100,
                    },
                },
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

export default router;
