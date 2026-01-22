#!/usr/bin/env node
/**
 * Process Treasury Fees
 *
 * This script processes accumulated treasury fees:
 * 1. Withdraws tokens from treasury to admin wallet
 * 2. Swaps tokens to SOL via Jupiter
 * 3. 90% of SOL used to buy $3EYES (stays in admin wallet for now)
 * 4. 10% of SOL sent to dev wallet
 *
 * Usage:
 *   node scripts/process-treasury-fees.js [options]
 *
 * Options:
 *   --dry-run              Simulate without executing transactions
 *   --withdraw-only        Only withdraw from treasury, skip swaps
 *   --token <mint>         Only process a specific token mint
 *   --min-sol <amount>     Minimum SOL value to process (default: 0.001)
 *   --test-multiplier <n>  Only process n% of each balance (e.g., 0.1 = 10%)
 *   --dev-wallet <address> Override dev wallet (default: admin wallet)
 *
 * Requirements:
 *   - DEPLOY_WALLET_JSON in .env
 *   - Program must be deployed
 *   - Jupiter API available (mainnet only)
 */

import 'dotenv/config';
import { Connection, Keypair, PublicKey, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import { derivePlatformConfigPDA, deriveTreasuryPDA, deriveTreasuryTokenAccount, getTokenProgramForMint } from '../lib/pdaHelpers.js';
import { getAnchorProgram } from '../lib/anchorClient.js';
import { getNetworkConfig } from '../lib/getNetworkConfig.js';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Constants
const BUYBACK_PERCENTAGE = 90; // 90% for $3EYES buyback
const DEV_PERCENTAGE = 10;     // 10% for dev wallet
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const BURN_ADDRESS = '1nc1nerator11111111111111111111111111111111'; // Standard burn address

/**
 * Log a treasury transaction to the database
 */
async function logTreasuryTransaction({
    actionType,
    tokenMint,
    tokenSymbol,
    amountWithdrawn = null,
    tokenAmount = null,
    solReceived = null,
    devSolAmount = null,
    buybackSolAmount = null,
    threeEyesBought = null,
    txSignature = null,
    swapToSolSignature = null,
    devTransferSignature = null,
    buybackSignature = null,
    status = 'completed',
    errorMessage = null,
    processedBy,
}) {
    try {
        const { error } = await supabase
            .from('treasury_processing_log')
            .insert({
                action_type: actionType,
                token_mint: tokenMint,
                token_amount: tokenAmount ? tokenAmount.toString() : null,
                amount_withdrawn: amountWithdrawn ? amountWithdrawn.toString() : null,
                sol_received: solReceived ? solReceived.toString() : 0,
                dev_sol_amount: devSolAmount ? devSolAmount.toString() : 0,
                buyback_sol_amount: buybackSolAmount ? buybackSolAmount.toString() : 0,
                three_eyes_bought: threeEyesBought ? threeEyesBought.toString() : 0,
                tx_signature: txSignature,
                swap_to_sol_signature: swapToSolSignature,
                dev_transfer_signature: devTransferSignature,
                buyback_signature: buybackSignature,
                status,
                error_message: errorMessage,
                processed_by: processedBy,
                processed_at: new Date().toISOString(),
            });

        if (error) {
            console.warn(`   Warning: Failed to log ${actionType} to database:`, error.message);
        } else {
            console.log(`   Logged ${actionType} to database`);
        }
    } catch (e) {
        console.warn(`   Warning: Exception logging to database:`, e.message);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const WITHDRAW_ONLY = args.includes('--withdraw-only');
const tokenIndex = args.indexOf('--token');
const SPECIFIC_TOKEN = tokenIndex !== -1 ? args[tokenIndex + 1] : null;
const minSolIndex = args.indexOf('--min-sol');
const MIN_SOL_VALUE = minSolIndex !== -1 ? parseFloat(args[minSolIndex + 1]) : 0.001;
const testMultiplierIndex = args.indexOf('--test-multiplier');
const TEST_MULTIPLIER = testMultiplierIndex !== -1 ? parseFloat(args[testMultiplierIndex + 1]) : 1.0;
const devWalletIndex = args.indexOf('--dev-wallet');
const DEV_WALLET_OVERRIDE = devWalletIndex !== -1 ? args[devWalletIndex + 1] : null;

async function getJupiterQuote(inputMint, outputMint, amount, retries = 3) {
    const apiKey = process.env.JUPITER_API_KEY;
    if (!apiKey) {
        console.log('   JUPITER_API_KEY not set - cannot get swap quote');
        return null;
    }

    const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: '100', // 1% slippage
    });

    // Jupiter API v1 (new endpoint as of Dec 2024)
    // Docs: https://dev.jup.ag/api-reference/swap/quote
    const url = `https://api.jup.ag/swap/v1/quote?${params}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`   Fetching Jupiter quote (attempt ${attempt}/${retries})...`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'x-api-key': apiKey,
                },
                signal: AbortSignal.timeout(15000), // 15 second timeout
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`   Jupiter quote API error: ${response.status} - ${errorText}`);
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error(`   Error getting Jupiter quote (attempt ${attempt}): ${error.message}`);
            if (attempt < retries) {
                console.log(`   Retrying in 2 seconds...`);
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
    return null;
}

async function getJupiterSwapTransaction(quoteResponse, userPublicKey) {
    const apiKey = process.env.JUPITER_API_KEY;
    if (!apiKey) {
        console.log('   JUPITER_API_KEY not set - cannot get swap transaction');
        return null;
    }

    try {
        // Jupiter API v1 (new endpoint as of Dec 2024)
        // Docs: https://dev.jup.ag/api-reference/swap/swap
        const response = await fetch('https://api.jup.ag/swap/v1/swap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({
                quoteResponse,
                userPublicKey: userPublicKey.toString(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 'auto',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`   Jupiter swap API error: ${response.status} - ${errorText}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('   Error getting Jupiter swap transaction:', error.message);
        return null;
    }
}

async function withdrawFromTreasury(program, connection, adminKeypair, treasuryPDA, tokenMint, amount, adminTokenAccount, treasuryTokenAccount, tokenProgram) {
    const [platformConfigPDA] = derivePlatformConfigPDA(program.programId);

    console.log(`   Building withdraw_treasury transaction...`);
    console.log(`   Token program: ${tokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'Token'}`);

    // Convert BigInt to BN for Anchor
    const amountBN = new BN(amount.toString());

    const tx = await program.methods
        .withdrawTreasury(amountBN)
        .accounts({
            admin: adminKeypair.publicKey,
            platformConfig: platformConfigPDA,
            treasury: treasuryPDA,
            tokenMint: tokenMint,
            treasuryTokenAccount: treasuryTokenAccount,
            adminTokenAccount: adminTokenAccount,
            tokenProgram: tokenProgram,
        })
        .transaction();

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = adminKeypair.publicKey;

    // Sign with admin keypair
    tx.sign(adminKeypair);

    return tx;
}

async function main() {
    console.log('\n========================================');
    console.log('  Treasury Fee Processing');
    console.log('========================================\n');

    if (DRY_RUN) {
        console.log('*** DRY RUN MODE - No transactions will be executed ***\n');
    }
    if (WITHDRAW_ONLY) {
        console.log('*** WITHDRAW ONLY MODE - Tokens will be moved to admin wallet, no swaps ***\n');
    }
    if (TEST_MULTIPLIER < 1.0) {
        console.log(`*** TEST MODE - Only processing ${TEST_MULTIPLIER * 100}% of each balance ***\n`);
    }

    // Load deploy wallet from env
    const deployWalletJson = process.env.DEPLOY_WALLET_JSON;
    if (!deployWalletJson) {
        console.error('ERROR: DEPLOY_WALLET_JSON not found in .env');
        process.exit(1);
    }

    let adminKeypair;
    try {
        const secretKey = Uint8Array.from(JSON.parse(deployWalletJson));
        adminKeypair = Keypair.fromSecretKey(secretKey);
        console.log(`Admin wallet: ${adminKeypair.publicKey.toString()}`);
    } catch (e) {
        console.error('ERROR: Failed to parse DEPLOY_WALLET_JSON');
        console.error(e.message);
        process.exit(1);
    }

    // Get network config
    const config = await getNetworkConfig();
    console.log(`Network: ${config.network}`);
    console.log(`Program ID: ${config.programId.toString()}`);

    // Get Anchor program
    const { program, connection, programId } = await getAnchorProgram();

    // Derive PDAs
    const [treasuryPDA] = deriveTreasuryPDA(programId);
    console.log(`\nTreasury PDA: ${treasuryPDA.toString()}`);

    // Get $3EYES mint for buyback
    const threeEyesMint = config.threeEyesMint?.toString();
    if (!threeEyesMint) {
        console.warn('WARNING: $3EYES mint not configured - buyback will be skipped');
    } else {
        console.log(`$3EYES Mint: ${threeEyesMint}`);
    }

    // Fetch all unique payment tokens from projects
    const { data: projects, error: dbError } = await supabase
        .from('projects')
        .select('payment_token_mint, payment_token_symbol, payment_token_decimals')
        .not('payment_token_mint', 'is', null);

    if (dbError) {
        console.error('ERROR: Failed to fetch projects from database');
        process.exit(1);
    }

    // Get unique token mints
    const uniqueMints = [...new Map(
        projects.map(p => [p.payment_token_mint, p])
    ).values()];

    if (SPECIFIC_TOKEN) {
        const filtered = uniqueMints.filter(p => p.payment_token_mint === SPECIFIC_TOKEN);
        if (filtered.length === 0) {
            console.error(`ERROR: Token ${SPECIFIC_TOKEN} not found in projects`);
            process.exit(1);
        }
        uniqueMints.length = 0;
        uniqueMints.push(...filtered);
    }

    console.log(`\nFound ${uniqueMints.length} unique token(s) to process\n`);

    // Summary stats
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalSOLCollected = 0;

    for (const project of uniqueMints) {
        const { payment_token_mint, payment_token_symbol, payment_token_decimals } = project;
        const tokenMintPubkey = new PublicKey(payment_token_mint);
        const decimals = payment_token_decimals || 9;

        console.log('----------------------------------------');
        console.log(`Token: ${payment_token_symbol || 'Unknown'} (${payment_token_mint.slice(0, 8)}...)`);

        // Detect token program (Token vs Token-2022)
        const tokenProgram = await getTokenProgramForMint(connection, tokenMintPubkey);
        const isToken2022 = tokenProgram.equals(TOKEN_2022_PROGRAM_ID);
        console.log(`   Token program: ${isToken2022 ? 'Token-2022' : 'Token (legacy)'}`);

        // Get treasury token account with correct token program
        const treasuryTokenAccount = deriveTreasuryTokenAccount(treasuryPDA, tokenMintPubkey, tokenProgram);

        // Check balance
        let balance = BigInt(0);
        try {
            const accountInfo = await getAccount(connection, treasuryTokenAccount, 'confirmed', tokenProgram);
            balance = accountInfo.amount;
        } catch (e) {
            console.log('   No treasury token account found (0 balance)');
            totalSkipped++;
            continue;
        }

        if (balance === BigInt(0)) {
            console.log('   Balance: 0 - skipping');
            totalSkipped++;
            continue;
        }

        const fullBalance = balance;
        const uiFullBalance = Number(fullBalance) / Math.pow(10, decimals);
        console.log(`   Full Balance: ${uiFullBalance.toLocaleString()} ${payment_token_symbol || 'tokens'}`);

        // Apply test multiplier if set
        if (TEST_MULTIPLIER < 1.0) {
            balance = BigInt(Math.floor(Number(balance) * TEST_MULTIPLIER));
            const uiBalance = Number(balance) / Math.pow(10, decimals);
            console.log(`   Processing: ${uiBalance.toLocaleString()} ${payment_token_symbol} (${TEST_MULTIPLIER * 100}% of balance)`);
        }

        const uiBalance = Number(balance) / Math.pow(10, decimals);

        // Get quote for SOL value
        const quote = await getJupiterQuote(payment_token_mint, SOL_MINT, balance.toString());
        let estimatedSol = 0;

        if (quote) {
            estimatedSol = Number(quote.outAmount) / LAMPORTS_PER_SOL;
            console.log(`   Estimated SOL: ${estimatedSol.toFixed(6)} SOL`);

            if (estimatedSol < MIN_SOL_VALUE) {
                console.log(`   Below minimum (${MIN_SOL_VALUE} SOL) - skipping`);
                totalSkipped++;
                continue;
            }
        } else {
            console.log('   Could not get SOL quote (token may not be tradeable on Jupiter)');
            // For devnet testing, continue anyway
            if (config.network === 'mainnet-beta') {
                console.log('   Skipping - quote required for mainnet');
                totalSkipped++;
                continue;
            }
        }

        if (DRY_RUN) {
            console.log('\n   [DRY RUN] Would process:');
            console.log(`   - Withdraw ${uiBalance} ${payment_token_symbol} from treasury`);
            console.log(`   - Swap to ~${estimatedSol.toFixed(6)} SOL via Jupiter`);
            if (threeEyesMint) {
                console.log(`   - Use ${BUYBACK_PERCENTAGE}% (~${(estimatedSol * BUYBACK_PERCENTAGE / 100).toFixed(6)} SOL) for $3EYES buyback -> treasury`);
            }
            console.log(`   - Send ${DEV_PERCENTAGE}% (~${(estimatedSol * DEV_PERCENTAGE / 100).toFixed(6)} SOL) to dev wallet`);
            totalProcessed++;
            continue;
        }

        // === STEP 1: Withdraw from treasury to admin wallet ===
        console.log('\n   Step 1: Withdrawing from treasury...');

        // Get admin token account address with correct token program
        const adminTokenAccount = await getAssociatedTokenAddress(
            tokenMintPubkey,
            adminKeypair.publicKey,
            false, // allowOwnerOffCurve
            tokenProgram,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Check if admin token account exists, create if not
        const adminAccountInfo = await connection.getAccountInfo(adminTokenAccount);
        if (!adminAccountInfo) {
            console.log(`   Creating admin token account (${isToken2022 ? 'Token-2022' : 'Token'})...`);
            try {
                const { Transaction } = await import('@solana/web3.js');
                const createAtaTx = new Transaction().add(
                    createAssociatedTokenAccountInstruction(
                        adminKeypair.publicKey, // payer
                        adminTokenAccount, // ata
                        adminKeypair.publicKey, // owner
                        tokenMintPubkey, // mint
                        tokenProgram, // token program
                        ASSOCIATED_TOKEN_PROGRAM_ID // associated token program
                    )
                );

                const { blockhash } = await connection.getLatestBlockhash();
                createAtaTx.recentBlockhash = blockhash;
                createAtaTx.feePayer = adminKeypair.publicKey;
                createAtaTx.sign(adminKeypair);

                const createAtaSig = await connection.sendRawTransaction(createAtaTx.serialize());
                await connection.confirmTransaction(createAtaSig, 'confirmed');
                console.log(`   Admin ATA created: ${createAtaSig}`);
            } catch (ataError) {
                console.error(`   ERROR creating admin ATA: ${ataError.message}`);
                continue;
            }
        }

        try {
            const withdrawTx = await withdrawFromTreasury(
                program,
                connection,
                adminKeypair,
                treasuryPDA,
                tokenMintPubkey,
                balance,
                adminTokenAccount,
                treasuryTokenAccount,
                tokenProgram
            );

            const signature = await connection.sendRawTransaction(withdrawTx.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });

            console.log(`   Withdraw TX: ${signature}`);

            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');
            console.log('   Withdrawal confirmed!');

            // Log withdrawal to database
            await logTreasuryTransaction({
                actionType: 'withdraw',
                tokenMint: payment_token_mint,
                tokenSymbol: payment_token_symbol,
                amountWithdrawn: balance,
                txSignature: signature,
                status: 'completed',
                processedBy: adminKeypair.publicKey.toString(),
            });
        } catch (error) {
            console.error(`   ERROR withdrawing: ${error.message}`);
            if (error.logs) {
                error.logs.forEach(log => console.error(`   ${log}`));
            }
            // Log failed withdrawal
            await logTreasuryTransaction({
                actionType: 'withdraw',
                tokenMint: payment_token_mint,
                tokenSymbol: payment_token_symbol,
                amountWithdrawn: balance,
                status: 'failed',
                errorMessage: error.message,
                processedBy: adminKeypair.publicKey.toString(),
            });
            continue;
        }

        // If withdraw-only mode, stop here
        if (WITHDRAW_ONLY) {
            console.log('   [WITHDRAW ONLY] Tokens now in admin wallet - skipping swaps');
            totalProcessed++;
            continue;
        }

        // === STEP 2: Swap to SOL via Jupiter ===
        console.log('\n   Step 2: Swapping to SOL via Jupiter...');

        const swapQuote = await getJupiterQuote(payment_token_mint, SOL_MINT, balance.toString());

        if (!swapQuote) {
            console.log('   Could not get Jupiter quote - tokens remain in admin wallet');
            continue;
        }

        const outAmountLamports = BigInt(swapQuote.outAmount);
        const outAmountSOL = Number(outAmountLamports) / LAMPORTS_PER_SOL;
        console.log(`   Quote: ${uiBalance} ${payment_token_symbol} -> ${outAmountSOL.toFixed(6)} SOL`);

        const swapTxData = await getJupiterSwapTransaction(swapQuote, adminKeypair.publicKey);

        if (!swapTxData || !swapTxData.swapTransaction) {
            console.log('   Could not get Jupiter swap transaction - tokens remain in admin wallet');
            continue;
        }

        try {
            const swapTxBuf = Buffer.from(swapTxData.swapTransaction, 'base64');
            const swapTx = VersionedTransaction.deserialize(swapTxBuf);
            swapTx.sign([adminKeypair]);

            const swapSignature = await connection.sendRawTransaction(swapTx.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });

            console.log(`   Swap TX: ${swapSignature}`);

            await connection.confirmTransaction(swapSignature, 'confirmed');
            console.log('   Swap confirmed!');

            // Log swap to database
            await logTreasuryTransaction({
                actionType: 'swap',
                tokenMint: payment_token_mint,
                tokenSymbol: payment_token_symbol,
                tokenAmount: balance,
                solReceived: outAmountLamports,
                swapToSolSignature: swapSignature,
                status: 'completed',
                processedBy: adminKeypair.publicKey.toString(),
            });

            totalSOLCollected += outAmountSOL;
        } catch (error) {
            console.error(`   ERROR swapping: ${error.message}`);
            // Log failed swap
            await logTreasuryTransaction({
                actionType: 'swap',
                tokenMint: payment_token_mint,
                tokenSymbol: payment_token_symbol,
                tokenAmount: balance,
                status: 'failed',
                errorMessage: error.message,
                processedBy: adminKeypair.publicKey.toString(),
            });
            continue;
        }

        // === STEP 3: Distribute SOL (buyback + dev) ===
        console.log('\n   Step 3: Distributing SOL...');

        const buybackAmount = (outAmountLamports * BigInt(BUYBACK_PERCENTAGE)) / BigInt(100);
        const devAmount = outAmountLamports - buybackAmount;

        console.log(`   Buyback: ${Number(buybackAmount) / LAMPORTS_PER_SOL} SOL (${BUYBACK_PERCENTAGE}%)`);
        console.log(`   Dev: ${Number(devAmount) / LAMPORTS_PER_SOL} SOL (${DEV_PERCENTAGE}%)`);

        // Determine dev wallet (override or default to admin)
        const devWallet = DEV_WALLET_OVERRIDE
            ? new PublicKey(DEV_WALLET_OVERRIDE)
            : adminKeypair.publicKey;

        // Transfer dev portion if different wallet
        if (DEV_WALLET_OVERRIDE && devAmount > BigInt(0)) {
            console.log(`\n   Transferring ${Number(devAmount) / LAMPORTS_PER_SOL} SOL to dev wallet...`);
            try {
                const { Transaction, SystemProgram } = await import('@solana/web3.js');
                const transferTx = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: adminKeypair.publicKey,
                        toPubkey: devWallet,
                        lamports: devAmount,
                    })
                );

                const { blockhash } = await connection.getLatestBlockhash();
                transferTx.recentBlockhash = blockhash;
                transferTx.feePayer = adminKeypair.publicKey;
                transferTx.sign(adminKeypair);

                const devTxSig = await connection.sendRawTransaction(transferTx.serialize());
                await connection.confirmTransaction(devTxSig, 'confirmed');
                console.log(`   Dev transfer TX: ${devTxSig}`);

                // Log dev transfer to database
                await logTreasuryTransaction({
                    actionType: 'dev_transfer',
                    tokenMint: payment_token_mint,
                    tokenSymbol: payment_token_symbol,
                    devSolAmount: devAmount,
                    devTransferSignature: devTxSig,
                    status: 'completed',
                    processedBy: adminKeypair.publicKey.toString(),
                });
            } catch (error) {
                console.error(`   ERROR transferring to dev wallet: ${error.message}`);
                // Log failed dev transfer
                await logTreasuryTransaction({
                    actionType: 'dev_transfer',
                    tokenMint: payment_token_mint,
                    tokenSymbol: payment_token_symbol,
                    devSolAmount: devAmount,
                    status: 'failed',
                    errorMessage: error.message,
                    processedBy: adminKeypair.publicKey.toString(),
                });
            }
        } else {
            console.log(`   Dev SOL remains in admin wallet: ${adminKeypair.publicKey.toString()}`);
        }

        // Buy $3EYES with the buyback portion
        if (threeEyesMint && buybackAmount > BigInt(0)) {
            console.log(`\n   Buying $3EYES with ${Number(buybackAmount) / LAMPORTS_PER_SOL} SOL...`);

            const buybackQuote = await getJupiterQuote(SOL_MINT, threeEyesMint, buybackAmount.toString());

            if (buybackQuote) {
                const threeEyesAmount = Number(buybackQuote.outAmount) / Math.pow(10, 9);
                console.log(`   Quote: ${Number(buybackAmount) / LAMPORTS_PER_SOL} SOL -> ${threeEyesAmount.toLocaleString()} $3EYES`);

                const buybackTxData = await getJupiterSwapTransaction(buybackQuote, adminKeypair.publicKey);

                if (buybackTxData && buybackTxData.swapTransaction) {
                    try {
                        const buybackTxBuf = Buffer.from(buybackTxData.swapTransaction, 'base64');
                        const buybackTx = VersionedTransaction.deserialize(buybackTxBuf);
                        buybackTx.sign([adminKeypair]);

                        const buybackSig = await connection.sendRawTransaction(buybackTx.serialize(), {
                            skipPreflight: false,
                            preflightCommitment: 'confirmed',
                        });

                        console.log(`   Buyback TX: ${buybackSig}`);
                        await connection.confirmTransaction(buybackSig, 'confirmed');
                        console.log(`   $3EYES buyback confirmed! ${threeEyesAmount.toLocaleString()} $3EYES now in admin wallet`);

                        // Log buyback to database
                        await logTreasuryTransaction({
                            actionType: 'buyback',
                            tokenMint: payment_token_mint,
                            tokenSymbol: payment_token_symbol,
                            buybackSolAmount: buybackAmount,
                            threeEyesBought: BigInt(buybackQuote.outAmount),
                            buybackSignature: buybackSig,
                            status: 'completed',
                            processedBy: adminKeypair.publicKey.toString(),
                        });
                    } catch (error) {
                        console.error(`   ERROR buying $3EYES: ${error.message}`);
                        // Log failed buyback
                        await logTreasuryTransaction({
                            actionType: 'buyback',
                            tokenMint: payment_token_mint,
                            tokenSymbol: payment_token_symbol,
                            buybackSolAmount: buybackAmount,
                            status: 'failed',
                            errorMessage: error.message,
                            processedBy: adminKeypair.publicKey.toString(),
                        });
                    }
                } else {
                    console.log('   Could not get buyback transaction - SOL remains in admin wallet');
                }
            } else {
                console.log('   Could not get $3EYES quote - SOL remains in admin wallet');
            }
        }

        totalProcessed++;
    }

    console.log('\n========================================');
    console.log('  Processing Complete');
    console.log('========================================');
    console.log(`Processed: ${totalProcessed} token(s)`);
    console.log(`Skipped: ${totalSkipped} token(s)`);
    if (!DRY_RUN) {
        console.log(`Total SOL collected: ${totalSOLCollected.toFixed(6)} SOL`);
    }

    if (DRY_RUN) {
        console.log('\n*** This was a DRY RUN - no transactions were executed ***');
        console.log('Run without --dry-run to execute transactions.');
    }
}

main().catch(console.error);
