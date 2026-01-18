#!/usr/bin/env node
/**
 * Automated Box Testing Script
 *
 * This script automates the full box lifecycle:
 * 1. Buy N boxes
 * 2. Wait 30+ seconds (randomized), commit each box
 * 3. Wait 10s cooldown, reveal each box
 * 4. Settle boxes with rewards
 * 5. Generate a report
 *
 * Usage: node scripts/automatedBoxTest.js --boxes 10 --project 1 --wallet /path/to/keypair.json
 */

import { Connection, Keypair, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3333';
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const COMMIT_COOLDOWN_MIN = 31; // Minimum seconds to wait before commit (30s + buffer)
const COMMIT_COOLDOWN_MAX = 45; // Maximum seconds for randomization
const REVEAL_COOLDOWN = 11; // Seconds to wait before reveal (10s + buffer)

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        boxes: 10,
        projectId: null,
        walletPath: null,
        concurrency: 5, // Max parallel operations
        dryRun: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--boxes':
            case '-n':
                config.boxes = parseInt(args[++i], 10);
                break;
            case '--project':
            case '-p':
                config.projectId = parseInt(args[++i], 10);
                break;
            case '--wallet':
            case '-w':
                config.walletPath = args[++i];
                break;
            case '--concurrency':
            case '-c':
                config.concurrency = parseInt(args[++i], 10);
                break;
            case '--dry-run':
                config.dryRun = true;
                break;
            case '--help':
            case '-h':
                printUsage();
                process.exit(0);
        }
    }

    return config;
}

function printUsage() {
    console.log(`
Automated Box Testing Script

Usage: node scripts/automatedBoxTest.js [options]

Options:
  --boxes, -n <number>      Number of boxes to test (default: 10)
  --project, -p <id>        Project numeric ID (required)
  --wallet, -w <path>       Path to wallet keypair JSON file (required)
  --concurrency, -c <num>   Max parallel operations (default: 5)
  --dry-run                 Show what would happen without executing
  --help, -h                Show this help message

Example:
  node scripts/automatedBoxTest.js --boxes 20 --project 1 --wallet ./test-wallet.json
`);
}

// Stats tracking
const stats = {
    startTime: null,
    endTime: null,
    initialSolBalance: 0,
    finalSolBalance: 0,
    initialTokenBalance: 0,
    finalTokenBalance: 0,
    boxesPurchased: 0,
    boxesCommitted: 0,
    boxesRevealed: 0,
    boxesSettled: 0,
    boxesFailed: [],
    results: {
        dud: 0,
        rebate: 0,
        breakeven: 0,
        profit: 0,
        jackpot: 0,
        refunded: 0,
    },
    totalPayout: 0,
    totalSpent: 0,
    txSignatures: [],
    errors: [],
    // Detailed error tracking by phase
    errorsByPhase: {
        purchase: [],
        commit: [],
        reveal: [],
        settle: [],
    },
};

// Helper: Sleep with logging
function sleep(ms, message = '') {
    if (message) {
        process.stdout.write(`\r${message} (${Math.ceil(ms / 1000)}s)...`);
    }
    return new Promise(resolve => {
        const interval = setInterval(() => {
            ms -= 1000;
            if (message && ms > 0) {
                process.stdout.write(`\r${message} (${Math.ceil(ms / 1000)}s)...  `);
            }
        }, 1000);
        setTimeout(() => {
            clearInterval(interval);
            if (message) process.stdout.write('\r' + ' '.repeat(50) + '\r');
            resolve();
        }, ms);
    });
}

// Helper: Random delay between min and max seconds
function randomDelay(minSec, maxSec) {
    return (Math.random() * (maxSec - minSec) + minSec) * 1000;
}

// Helper: Fetch with retry
async function fetchWithRetry(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (err) {
            if (i === retries - 1) throw err;
            await sleep(1000 * (i + 1));
        }
    }
}

// Get project details
async function getProject(projectId) {
    const response = await fetchWithRetry(`${BACKEND_URL}/api/projects/by-numeric-id/${projectId}`);
    const data = await response.json();
    if (!data.success) throw new Error(`Failed to get project: ${data.error}`);
    return data.project;
}

// Get token balance
async function getTokenBalance(connection, walletPubkey, tokenMint) {
    try {
        const ata = await getAssociatedTokenAddress(new PublicKey(tokenMint), walletPubkey);
        const account = await getAccount(connection, ata);
        return Number(account.amount);
    } catch (err) {
        return 0;
    }
}

// Buy a single box
async function buyBox(connection, wallet, project) {
    const walletAddress = wallet.publicKey.toString();

    // Build transaction
    const buildResponse = await fetchWithRetry(`${BACKEND_URL}/api/program/build-create-box-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId: project.project_numeric_id,
            buyerWallet: walletAddress,
        }),
    });

    const buildResult = await buildResponse.json();
    if (!buildResult.success) {
        throw new Error(`Build failed: ${buildResult.error}`);
    }

    // Sign and send
    const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = wallet.publicKey;
    transaction.sign(wallet);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: true,
    });
    await connection.confirmTransaction(signature, 'confirmed');

    // Confirm with backend
    const confirmResponse = await fetchWithRetry(`${BACKEND_URL}/api/program/confirm-box-creation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId: project.project_numeric_id,
            boxId: buildResult.boxId,
            buyerWallet: walletAddress,
            signature,
            boxInstancePDA: buildResult.boxInstancePDA,
        }),
    });

    const confirmResult = await confirmResponse.json();
    if (!confirmResult.success) {
        console.warn(`Warning: Backend confirm failed for box ${buildResult.boxId}: ${confirmResult.error}`);
    }

    return {
        boxNumber: buildResult.boxId,
        signature,
    };
}

// Commit a box
async function commitBox(connection, wallet, project, boxNumber) {
    const walletAddress = wallet.publicKey.toString();

    // Build transaction
    const buildResponse = await fetchWithRetry(`${BACKEND_URL}/api/program/build-commit-box-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId: project.project_numeric_id,
            boxId: boxNumber,
            ownerWallet: walletAddress,
        }),
    });

    const buildResult = await buildResponse.json();
    if (!buildResult.success) {
        throw new Error(`Commit build failed: ${buildResult.error}`);
    }

    // Sign and send with randomness keypair
    const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
    const randomnessKeypair = Keypair.fromSecretKey(Buffer.from(buildResult.randomnessKeypair, 'base64'));

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = wallet.publicKey;
    transaction.partialSign(wallet);
    transaction.partialSign(randomnessKeypair);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: true,
    });
    await connection.confirmTransaction(signature, 'confirmed');

    // Confirm with backend
    await fetchWithRetry(`${BACKEND_URL}/api/program/confirm-commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId: project.project_numeric_id,
            boxId: boxNumber,
            signature,
            randomnessAccount: buildResult.randomnessAccount,
        }),
    });

    return { signature };
}

// Reveal a box
async function revealBox(connection, wallet, project, boxNumber) {
    const walletAddress = wallet.publicKey.toString();

    // Build transaction
    const buildResponse = await fetchWithRetry(`${BACKEND_URL}/api/program/build-reveal-box-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId: project.project_numeric_id,
            boxId: boxNumber,
            ownerWallet: walletAddress,
        }),
    });

    const buildResult = await buildResponse.json();
    if (!buildResult.success) {
        // Check if already revealed
        if (buildResult.alreadyRevealed && buildResult.reward) {
            return {
                signature: null,
                reward: buildResult.reward,
                alreadyRevealed: true,
            };
        }
        throw new Error(`Reveal build failed: ${buildResult.error}`);
    }

    // Sign and send
    const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = wallet.publicKey;
    transaction.sign(wallet);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: true,
    });
    await connection.confirmTransaction(signature, 'confirmed');

    // Confirm with backend to get reward
    const confirmResponse = await fetchWithRetry(`${BACKEND_URL}/api/program/confirm-reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId: project.project_numeric_id,
            boxId: boxNumber,
            ownerWallet: walletAddress,
            signature,
        }),
    });

    const confirmResult = await confirmResponse.json();

    return {
        signature,
        reward: confirmResult.reward,
    };
}

// Settle a box
async function settleBox(connection, wallet, project, boxNumber) {
    const walletAddress = wallet.publicKey.toString();

    // Build transaction
    const buildResponse = await fetchWithRetry(`${BACKEND_URL}/api/program/build-settle-box-tx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId: project.project_numeric_id,
            boxId: boxNumber,
            ownerWallet: walletAddress,
        }),
    });

    const buildResult = await buildResponse.json();
    if (!buildResult.success) {
        throw new Error(`Settle build failed: ${buildResult.error}`);
    }

    // Sign and send
    const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = wallet.publicKey;
    transaction.sign(wallet);

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: true,
    });
    await connection.confirmTransaction(signature, 'confirmed');

    // Confirm with backend
    await fetchWithRetry(`${BACKEND_URL}/api/program/confirm-settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId: project.project_numeric_id,
            boxId: boxNumber,
            signature,
        }),
    });

    return { signature };
}

// Process a single box through its full lifecycle
async function processBox(connection, wallet, project, boxInfo, index, total) {
    const { boxNumber } = boxInfo;
    const prefix = `[Box ${index + 1}/${total} #${boxNumber}]`;
    let currentPhase = 'commit';

    try {
        // Wait random time before commit (30-45 seconds)
        const commitDelay = randomDelay(COMMIT_COOLDOWN_MIN, COMMIT_COOLDOWN_MAX);
        await sleep(commitDelay, `${prefix} Waiting to commit`);

        // Commit
        console.log(`${prefix} Committing...`);
        currentPhase = 'commit';
        let commitResult;
        try {
            commitResult = await commitBox(connection, wallet, project, boxNumber);
            stats.boxesCommitted++;
            stats.txSignatures.push({ type: 'commit', boxNumber, signature: commitResult.signature });
            console.log(`${prefix} Committed: ${commitResult.signature.slice(0, 8)}...`);
        } catch (commitErr) {
            const errorInfo = { boxNumber, error: commitErr.message, phase: 'commit', timestamp: new Date().toISOString() };
            stats.errors.push(errorInfo);
            stats.errorsByPhase.commit.push(errorInfo);
            console.error(`${prefix} COMMIT FAILED: ${commitErr.message}`);
            stats.boxesFailed.push(boxNumber);
            return { success: false, boxNumber, error: commitErr.message, phase: 'commit' };
        }

        // Wait for reveal cooldown (10 seconds + buffer)
        await sleep(REVEAL_COOLDOWN * 1000, `${prefix} Waiting to reveal`);

        // Reveal (with retry logic for oracle issues)
        console.log(`${prefix} Revealing...`);
        currentPhase = 'reveal';
        let revealResult;
        let revealRetries = 3;

        while (revealRetries > 0) {
            try {
                revealResult = await revealBox(connection, wallet, project, boxNumber);
                break; // Success, exit retry loop
            } catch (revealErr) {
                revealRetries--;
                const isOracleError = revealErr.message.includes('oracle') ||
                                      revealErr.message.includes('Oracle') ||
                                      revealErr.message.includes('ECONNECT') ||
                                      revealErr.message.includes('timeout');

                if (revealRetries > 0 && isOracleError) {
                    console.log(`${prefix} Reveal failed (oracle issue), retrying in 5s... (${revealRetries} retries left)`);
                    await sleep(5000);
                } else {
                    const errorInfo = {
                        boxNumber,
                        error: revealErr.message,
                        phase: 'reveal',
                        timestamp: new Date().toISOString(),
                        isOracleError
                    };
                    stats.errors.push(errorInfo);
                    stats.errorsByPhase.reveal.push(errorInfo);
                    console.error(`${prefix} REVEAL FAILED: ${revealErr.message}`);

                    // Mark box as refund-eligible for any reveal failure (not user's fault)
                    const isExpiredError = revealErr.message?.includes('expired') || revealErr.message?.includes('Expired');
                    if (!isExpiredError) {
                        try {
                            await fetchWithRetry(`${BACKEND_URL}/api/program/mark-reveal-failed`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    projectId: project.project_numeric_id,
                                    boxId: boxNumber,
                                    ownerWallet: wallet.publicKey.toString(),
                                    failureReason: `system_error: ${revealErr.message?.substring(0, 200)}`,
                                }),
                            });
                            console.log(`${prefix} Marked as refund-eligible`);
                        } catch (markErr) {
                            console.error(`${prefix} Failed to mark as refund-eligible:`, markErr.message);
                        }
                    }

                    stats.boxesFailed.push(boxNumber);
                    return { success: false, boxNumber, error: revealErr.message, phase: 'reveal' };
                }
            }
        }

        stats.boxesRevealed++;
        if (revealResult.signature) {
            stats.txSignatures.push({ type: 'reveal', boxNumber, signature: revealResult.signature });
        }

        const reward = revealResult.reward;
        const tierName = getTierName(reward?.tier);
        console.log(`${prefix} Revealed: ${tierName} (Payout: ${reward?.payoutAmount || 0})`);

        // Track result
        if (reward) {
            switch (reward.tier) {
                case 1: stats.results.dud++; break;
                case 2: stats.results.rebate++; break;
                case 3: stats.results.breakeven++; break;
                case 4: stats.results.profit++; break;
                case 5: stats.results.jackpot++; break;
                case 6: stats.results.refunded++; break;
            }
            stats.totalPayout += reward.payoutAmount || 0;
        }

        // Settle if there's a reward
        currentPhase = 'settle';
        if (reward && reward.payoutAmount > 0) {
            console.log(`${prefix} Settling...`);
            try {
                const settleResult = await settleBox(connection, wallet, project, boxNumber);
                stats.boxesSettled++;
                stats.txSignatures.push({ type: 'settle', boxNumber, signature: settleResult.signature });
                console.log(`${prefix} Settled: ${settleResult.signature.slice(0, 8)}...`);
            } catch (settleErr) {
                const errorInfo = { boxNumber, error: settleErr.message, phase: 'settle', timestamp: new Date().toISOString() };
                stats.errors.push(errorInfo);
                stats.errorsByPhase.settle.push(errorInfo);
                console.error(`${prefix} SETTLE FAILED: ${settleErr.message}`);
                // Don't mark as completely failed - reveal succeeded
                return { success: 'partial', boxNumber, reward, error: settleErr.message, phase: 'settle' };
            }
        } else {
            console.log(`${prefix} No reward to settle`);
            stats.boxesSettled++; // Count as "settled" even if no payout
        }

        return { success: true, boxNumber, reward };

    } catch (err) {
        console.error(`${prefix} FAILED at ${currentPhase}: ${err.message}`);
        const errorInfo = { boxNumber, error: err.message, phase: currentPhase, timestamp: new Date().toISOString() };
        stats.errors.push(errorInfo);
        stats.errorsByPhase[currentPhase]?.push(errorInfo);
        stats.boxesFailed.push(boxNumber);
        return { success: false, boxNumber, error: err.message, phase: currentPhase };
    }
}

function getTierName(tier) {
    switch (tier) {
        case 1: return 'Dud';
        case 2: return 'Rebate';
        case 3: return 'Break-even';
        case 4: return 'Profit';
        case 5: return 'Jackpot';
        case 6: return 'Refunded';
        default: return 'Unknown';
    }
}

// Generate final report
function generateReport(project) {
    const duration = (stats.endTime - stats.startTime) / 1000;
    const solSpent = (stats.initialSolBalance - stats.finalSolBalance) / LAMPORTS_PER_SOL;
    const tokenSpent = stats.initialTokenBalance - stats.finalTokenBalance;
    const decimals = project.payment_token_decimals || 9;
    const tokenSymbol = project.payment_token_symbol || 'tokens';

    const boxPrice = project.box_price / Math.pow(10, decimals);
    const totalBoxCost = boxPrice * stats.boxesPurchased;
    const totalPayoutFormatted = stats.totalPayout / Math.pow(10, decimals);
    const netTokenResult = totalPayoutFormatted - totalBoxCost;
    const rtp = totalBoxCost > 0 ? (totalPayoutFormatted / totalBoxCost * 100).toFixed(2) : 0;

    console.log('\n' + '='.repeat(60));
    console.log('                    TEST REPORT');
    console.log('='.repeat(60));
    console.log(`\nProject: ${project.project_name} (ID: ${project.project_numeric_id})`);
    console.log(`Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);
    console.log(`\n--- BOX STATISTICS ---`);
    console.log(`Boxes Purchased: ${stats.boxesPurchased}`);
    console.log(`Boxes Committed: ${stats.boxesCommitted}`);
    console.log(`Boxes Revealed:  ${stats.boxesRevealed}`);
    console.log(`Boxes Settled:   ${stats.boxesSettled}`);
    console.log(`Boxes Failed:    ${stats.boxesFailed.length}`);

    console.log(`\n--- RESULTS DISTRIBUTION ---`);
    console.log(`Dud:        ${stats.results.dud} (${(stats.results.dud / stats.boxesRevealed * 100 || 0).toFixed(1)}%)`);
    console.log(`Rebate:     ${stats.results.rebate} (${(stats.results.rebate / stats.boxesRevealed * 100 || 0).toFixed(1)}%)`);
    console.log(`Break-even: ${stats.results.breakeven} (${(stats.results.breakeven / stats.boxesRevealed * 100 || 0).toFixed(1)}%)`);
    console.log(`Profit:     ${stats.results.profit} (${(stats.results.profit / stats.boxesRevealed * 100 || 0).toFixed(1)}%)`);
    console.log(`Jackpot:    ${stats.results.jackpot} (${(stats.results.jackpot / stats.boxesRevealed * 100 || 0).toFixed(1)}%)`);

    console.log(`\n--- FINANCIAL SUMMARY ---`);
    console.log(`Box Price:       ${boxPrice.toFixed(4)} ${tokenSymbol}`);
    console.log(`Total Box Cost:  ${totalBoxCost.toFixed(4)} ${tokenSymbol}`);
    console.log(`Total Payout:    ${totalPayoutFormatted.toFixed(4)} ${tokenSymbol}`);
    console.log(`Net Token P/L:   ${netTokenResult >= 0 ? '+' : ''}${netTokenResult.toFixed(4)} ${tokenSymbol}`);
    console.log(`RTP (Actual):    ${rtp}%`);

    console.log(`\n--- SOL FEES ---`);
    console.log(`Initial SOL:     ${(stats.initialSolBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
    console.log(`Final SOL:       ${(stats.finalSolBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
    console.log(`SOL Spent:       ${solSpent.toFixed(6)} SOL`);
    console.log(`Avg SOL/Box:     ${(solSpent / stats.boxesPurchased).toFixed(6)} SOL`);

    if (stats.errors.length > 0) {
        console.log(`\n--- ERRORS BY PHASE ---`);

        if (stats.errorsByPhase.purchase.length > 0) {
            console.log(`\nPurchase Errors (${stats.errorsByPhase.purchase.length}):`);
            stats.errorsByPhase.purchase.forEach(e => {
                console.log(`  Box #${e.boxNumber || 'N/A'}: ${e.error}`);
            });
        }

        if (stats.errorsByPhase.commit.length > 0) {
            console.log(`\nCommit Errors (${stats.errorsByPhase.commit.length}):`);
            stats.errorsByPhase.commit.forEach(e => {
                console.log(`  Box #${e.boxNumber}: ${e.error}`);
            });
        }

        if (stats.errorsByPhase.reveal.length > 0) {
            console.log(`\nReveal Errors (${stats.errorsByPhase.reveal.length}):`);
            stats.errorsByPhase.reveal.forEach(e => {
                const oracleTag = e.isOracleError ? ' [ORACLE]' : '';
                console.log(`  Box #${e.boxNumber}: ${e.error}${oracleTag}`);
            });
        }

        if (stats.errorsByPhase.settle.length > 0) {
            console.log(`\nSettle Errors (${stats.errorsByPhase.settle.length}):`);
            stats.errorsByPhase.settle.forEach(e => {
                console.log(`  Box #${e.boxNumber}: ${e.error}`);
            });
        }
    }

    console.log('\n' + '='.repeat(60));

    // Save report to file
    const reportPath = path.join(__dirname, `../logs/test-report-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
        ...stats,
        project: {
            id: project.id,
            numericId: project.project_numeric_id,
            name: project.project_name,
            tokenSymbol: project.payment_token_symbol,
        },
        summary: {
            duration,
            solSpent,
            tokenSpent,
            totalBoxCost,
            totalPayout: totalPayoutFormatted,
            netTokenResult,
            rtp: parseFloat(rtp),
        },
    }, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);
}

// Main function
async function main() {
    const config = parseArgs();

    // Validate required args
    if (!config.projectId) {
        console.error('Error: --project is required');
        printUsage();
        process.exit(1);
    }

    if (!config.walletPath) {
        console.error('Error: --wallet is required');
        printUsage();
        process.exit(1);
    }

    // Load wallet
    if (!fs.existsSync(config.walletPath)) {
        console.error(`Error: Wallet file not found: ${config.walletPath}`);
        process.exit(1);
    }

    const walletData = JSON.parse(fs.readFileSync(config.walletPath, 'utf8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

    console.log('='.repeat(60));
    console.log('     AUTOMATED BOX TESTING SCRIPT');
    console.log('='.repeat(60));
    console.log(`\nConfiguration:`);
    console.log(`  Boxes to test:  ${config.boxes}`);
    console.log(`  Project ID:     ${config.projectId}`);
    console.log(`  Wallet:         ${wallet.publicKey.toString()}`);
    console.log(`  Concurrency:    ${config.concurrency}`);
    console.log(`  Backend URL:    ${BACKEND_URL}`);
    console.log(`  RPC URL:        ${RPC_URL}`);

    if (config.dryRun) {
        console.log('\n[DRY RUN MODE - No transactions will be sent]');
        return;
    }

    // Initialize connection
    const connection = new Connection(RPC_URL, 'confirmed');

    // Get project details
    console.log(`\nFetching project details...`);
    const project = await getProject(config.projectId);
    console.log(`  Project: ${project.project_name}`);
    console.log(`  Token: ${project.payment_token_symbol}`);
    console.log(`  Box Price: ${project.box_price / Math.pow(10, project.payment_token_decimals || 9)} ${project.payment_token_symbol}`);

    // Record initial balances
    stats.startTime = Date.now();
    stats.initialSolBalance = await connection.getBalance(wallet.publicKey);
    stats.initialTokenBalance = await getTokenBalance(connection, wallet.publicKey, project.payment_token_mint);

    console.log(`\nInitial Balances:`);
    console.log(`  SOL: ${(stats.initialSolBalance / LAMPORTS_PER_SOL).toFixed(6)}`);
    console.log(`  ${project.payment_token_symbol}: ${(stats.initialTokenBalance / Math.pow(10, project.payment_token_decimals || 9)).toFixed(4)}`);

    // Check if we have enough tokens
    const requiredTokens = project.box_price * config.boxes;
    if (stats.initialTokenBalance < requiredTokens) {
        console.error(`\nError: Insufficient tokens. Need ${requiredTokens / Math.pow(10, project.payment_token_decimals || 9)} ${project.payment_token_symbol}`);
        process.exit(1);
    }

    // Phase 1: Buy all boxes
    console.log(`\n--- PHASE 1: BUYING ${config.boxes} BOXES ---`);
    const purchasedBoxes = [];

    for (let i = 0; i < config.boxes; i++) {
        try {
            process.stdout.write(`\rBuying box ${i + 1}/${config.boxes}...`);
            const result = await buyBox(connection, wallet, project);
            purchasedBoxes.push(result);
            stats.boxesPurchased++;
            stats.txSignatures.push({ type: 'purchase', boxNumber: result.boxNumber, signature: result.signature });
            console.log(`\rBought box ${i + 1}/${config.boxes}: #${result.boxNumber}`);

            // Small delay between purchases to avoid rate limiting
            if (i < config.boxes - 1) {
                await sleep(500);
            }
        } catch (err) {
            console.error(`\nFailed to buy box ${i + 1}: ${err.message}`);
            stats.errors.push({ boxNumber: null, error: err.message, stage: 'purchase' });
        }
    }

    console.log(`\nPurchased ${purchasedBoxes.length} boxes`);

    if (purchasedBoxes.length === 0) {
        console.error('No boxes purchased. Exiting.');
        process.exit(1);
    }

    // Phase 2: Process boxes (commit, reveal, settle)
    console.log(`\n--- PHASE 2: PROCESSING BOXES ---`);

    // Process boxes with concurrency control
    const results = [];
    for (let i = 0; i < purchasedBoxes.length; i += config.concurrency) {
        const batch = purchasedBoxes.slice(i, i + config.concurrency);
        const batchPromises = batch.map((box, idx) =>
            processBox(connection, wallet, project, box, i + idx, purchasedBoxes.length)
        );
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    // Record final balances
    stats.endTime = Date.now();
    stats.finalSolBalance = await connection.getBalance(wallet.publicKey);
    stats.finalTokenBalance = await getTokenBalance(connection, wallet.publicKey, project.payment_token_mint);

    // Generate report
    generateReport(project);
}

// Run
main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
