#!/usr/bin/env node
/**
 * Estimate Mainnet Costs for Switchboard VRF
 *
 * This script helps you understand the real costs of using Switchboard VRF on mainnet.
 * It can either:
 * 1. Estimate costs without spending (--dry-run)
 * 2. Run actual transactions to measure real costs (requires SOL)
 *
 * Usage:
 *   node scripts/estimateMainnetCosts.js --dry-run              # Estimate only
 *   node scripts/estimateMainnetCosts.js --test --count 3       # Run 3 real VRF requests
 *   node scripts/estimateMainnetCosts.js --network mainnet-beta # Use mainnet
 */

import 'dotenv/config';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Randomness } from '@switchboard-xyz/on-demand';
import { getSwitchboardConstants, getSwitchboardProgram } from '../lib/switchboard.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        dryRun: true,
        network: 'devnet',
        count: 1,
        walletPath: null,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--test':
                config.dryRun = false;
                break;
            case '--dry-run':
                config.dryRun = true;
                break;
            case '--network':
            case '-n':
                config.network = args[++i];
                break;
            case '--count':
            case '-c':
                config.count = parseInt(args[++i], 10);
                break;
            case '--wallet':
            case '-w':
                config.walletPath = args[++i];
                break;
            case '--help':
            case '-h':
                console.log(`
Switchboard VRF Cost Estimator

Usage: node scripts/estimateMainnetCosts.js [options]

Options:
  --dry-run           Estimate costs without running transactions (default)
  --test              Actually run VRF requests (costs real SOL!)
  --network, -n       Network: devnet or mainnet-beta (default: devnet)
  --count, -c         Number of VRF requests to test (default: 1)
  --wallet, -w        Path to wallet keypair JSON (default: DEPLOY_WALLET_JSON env)
  --help, -h          Show this help message

Examples:
  node scripts/estimateMainnetCosts.js --dry-run
  node scripts/estimateMainnetCosts.js --test --count 3 --network devnet
  node scripts/estimateMainnetCosts.js --test --network mainnet-beta --count 5
`);
                process.exit(0);
        }
    }

    return config;
}

// Get RPC URL for network
function getRpcUrl(network) {
    if (network === 'mainnet-beta') {
        // Use mainnet RPC - you may need to use a paid RPC for reliability
        return process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';
    }
    return process.env.RPC_URL || 'https://api.devnet.solana.com';
}

// Load wallet
function loadWallet(walletPath) {
    if (walletPath) {
        const keyData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
        return Keypair.fromSecretKey(Uint8Array.from(keyData));
    }

    // Try DEPLOY_WALLET_JSON from env
    if (process.env.DEPLOY_WALLET_JSON) {
        const keyData = JSON.parse(process.env.DEPLOY_WALLET_JSON);
        return Keypair.fromSecretKey(Uint8Array.from(keyData));
    }

    throw new Error('No wallet provided. Use --wallet or set DEPLOY_WALLET_JSON');
}

// Estimate costs without running transactions
async function estimateCosts(network) {
    console.log('\n' + '='.repeat(60));
    console.log('  SWITCHBOARD VRF COST ESTIMATION');
    console.log('='.repeat(60));
    console.log(`\nNetwork: ${network}`);
    console.log('\nEstimated costs per box open/reveal cycle:\n');

    // Known costs (approximate)
    const costs = {
        randomnessAccountRent: 0.00423, // Rent-exempt minimum for randomness account
        oracleFee: 0.004,               // Oracle fee per request (based on actual tests)
        commitTxFee: 0.000005,          // Base transaction fee
        revealTxFee: 0.000005,          // Base transaction fee
        closeTxFee: 0.000005,           // Base transaction fee for closing account
    };

    const grossCost = costs.randomnessAccountRent + costs.oracleFee + costs.commitTxFee + costs.revealTxFee + costs.closeTxFee;
    const netCost = costs.oracleFee + costs.commitTxFee + costs.revealTxFee + costs.closeTxFee; // Rent is reclaimed

    console.log('  Component                    Cost (SOL)');
    console.log('  ' + '-'.repeat(45));
    console.log(`  Randomness Account Rent      ${costs.randomnessAccountRent.toFixed(6)} (temporary)`);
    console.log(`  Oracle Fee                   ${costs.oracleFee.toFixed(6)}`);
    console.log(`  Commit Transaction Fee       ${costs.commitTxFee.toFixed(6)}`);
    console.log(`  Reveal Transaction Fee       ${costs.revealTxFee.toFixed(6)}`);
    console.log(`  Close Transaction Fee        ${costs.closeTxFee.toFixed(6)}`);
    console.log('  ' + '-'.repeat(45));
    console.log(`  Gross per box:               ${grossCost.toFixed(6)} SOL`);
    console.log(`  Rent reclaimed:             -${costs.randomnessAccountRent.toFixed(6)} SOL`);
    console.log(`  NET COST PER BOX:            ${netCost.toFixed(6)} SOL`);

    console.log('\n  Volume Projections (NET after rent reclaim):');
    console.log('  ' + '-'.repeat(45));
    [10, 100, 1000, 10000].forEach(count => {
        const total = netCost * count;
        const usd = total * 150; // Assuming ~$150/SOL
        console.log(`  ${count.toString().padStart(5)} boxes:  ${total.toFixed(4)} SOL  (~$${usd.toFixed(2)} @ $150/SOL)`);
    });

    console.log('\n  Note: Rent (~0.00423 SOL) is reclaimed when randomness account is closed.');
    console.log('  Run with --test for actual costs. Oracle fees may vary.\n');

    return costs;
}

// Run actual VRF requests to measure real costs
async function runActualTests(network, count, wallet) {
    console.log('\n' + '='.repeat(60));
    console.log('  SWITCHBOARD VRF ACTUAL COST TEST');
    console.log('='.repeat(60));
    console.log(`\nNetwork: ${network}`);
    console.log(`Wallet: ${wallet.publicKey.toString()}`);
    console.log(`Test count: ${count}`);

    const rpcUrl = getRpcUrl(network);
    console.log(`RPC: ${rpcUrl}`);

    const connection = new Connection(rpcUrl, 'confirmed');

    // Check wallet balance
    const initialBalance = await connection.getBalance(wallet.publicKey);
    console.log(`\nInitial balance: ${(initialBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

    if (initialBalance < 0.1 * LAMPORTS_PER_SOL) {
        console.error('\n*** WARNING: Low balance! Need at least 0.1 SOL for testing ***');
        if (network === 'mainnet-beta') {
            console.error('Please fund your wallet before running mainnet tests.');
            process.exit(1);
        }
    }

    // Set up Anchor provider
    const anchorWallet = new anchor.Wallet(wallet);
    const provider = new anchor.AnchorProvider(connection, anchorWallet, {
        commitment: 'confirmed',
    });

    const { queue } = getSwitchboardConstants(network);
    const sbProgram = await getSwitchboardProgram(provider, network);

    console.log(`\nSwitchboard Queue: ${queue.toString()}`);

    const results = [];

    for (let i = 0; i < count; i++) {
        console.log(`\n--- Test ${i + 1}/${count} ---`);

        const balanceBefore = await connection.getBalance(wallet.publicKey);

        try {
            // Create randomness account
            console.log('Creating randomness account...');
            const rngKeypair = Keypair.generate();
            const [randomness, createIx] = await Randomness.create(
                sbProgram,
                rngKeypair,
                queue,
                wallet.publicKey
            );
            console.log(`  Randomness: ${randomness.pubkey.toString()}`);

            // Get commit instruction
            const commitIx = await randomness.commitIx(queue, wallet.publicKey);

            // Build and send commit transaction
            const { Transaction } = await import('@solana/web3.js');
            const commitTx = new Transaction();
            commitTx.add(createIx);
            commitTx.add(commitIx);

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            commitTx.recentBlockhash = blockhash;
            commitTx.lastValidBlockHeight = lastValidBlockHeight;
            commitTx.feePayer = wallet.publicKey;

            // Sign with both wallet and randomness keypair
            commitTx.sign(wallet, rngKeypair);

            const commitSig = await connection.sendRawTransaction(commitTx.serialize(), {
                skipPreflight: false,
            });
            console.log(`  Commit tx: ${commitSig}`);
            await connection.confirmTransaction(commitSig, 'confirmed');

            const balanceAfterCommit = await connection.getBalance(wallet.publicKey);
            const commitCost = (balanceBefore - balanceAfterCommit) / LAMPORTS_PER_SOL;
            console.log(`  Commit cost: ${commitCost.toFixed(6)} SOL`);

            // Wait for oracle
            console.log('  Waiting for oracle (10s)...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Get reveal instruction
            console.log('  Getting reveal instruction...');
            const revealIx = await randomness.revealIx();

            // Build and send reveal transaction
            const revealTx = new Transaction();
            revealTx.add(revealIx);

            const { blockhash: revealBlockhash, lastValidBlockHeight: revealHeight } =
                await connection.getLatestBlockhash('confirmed');
            revealTx.recentBlockhash = revealBlockhash;
            revealTx.lastValidBlockHeight = revealHeight;
            revealTx.feePayer = wallet.publicKey;
            revealTx.sign(wallet);

            const revealSig = await connection.sendRawTransaction(revealTx.serialize(), {
                skipPreflight: false,
            });
            console.log(`  Reveal tx: ${revealSig}`);
            await connection.confirmTransaction(revealSig, 'confirmed');

            const balanceAfterReveal = await connection.getBalance(wallet.publicKey);
            const revealCost = (balanceAfterCommit - balanceAfterReveal) / LAMPORTS_PER_SOL;

            console.log(`  Reveal cost: ${revealCost.toFixed(6)} SOL`);

            // Close randomness account to reclaim rent
            console.log('  Closing randomness account (reclaiming rent)...');
            const closeIx = await randomness.closeIx();

            const closeTx = new Transaction();
            closeTx.add(closeIx);

            const { blockhash: closeBlockhash, lastValidBlockHeight: closeHeight } =
                await connection.getLatestBlockhash('confirmed');
            closeTx.recentBlockhash = closeBlockhash;
            closeTx.lastValidBlockHeight = closeHeight;
            closeTx.feePayer = wallet.publicKey;
            closeTx.sign(wallet);

            const closeSig = await connection.sendRawTransaction(closeTx.serialize(), {
                skipPreflight: false,
            });
            console.log(`  Close tx: ${closeSig}`);
            await connection.confirmTransaction(closeSig, 'confirmed');

            const balanceAfterClose = await connection.getBalance(wallet.publicKey);
            const rentReclaimed = (balanceAfterClose - balanceAfterReveal) / LAMPORTS_PER_SOL;
            const totalCost = (balanceBefore - balanceAfterClose) / LAMPORTS_PER_SOL;

            console.log(`  Rent reclaimed: ${rentReclaimed.toFixed(6)} SOL`);
            console.log(`  Net total cost: ${totalCost.toFixed(6)} SOL`);

            results.push({
                success: true,
                commitCost,
                revealCost,
                rentReclaimed,
                totalCost,
                commitSig,
                revealSig,
                closeSig,
            });

        } catch (error) {
            console.error(`  ERROR: ${error.message}`);
            results.push({
                success: false,
                error: error.message,
            });
        }
    }

    // Summary
    const finalBalance = await connection.getBalance(wallet.publicKey);
    const totalSpent = (initialBalance - finalBalance) / LAMPORTS_PER_SOL;
    const successfulTests = results.filter(r => r.success);

    console.log('\n' + '='.repeat(60));
    console.log('  SUMMARY');
    console.log('='.repeat(60));
    console.log(`\nSuccessful tests: ${successfulTests.length}/${count}`);
    console.log(`Total SOL spent: ${totalSpent.toFixed(6)} SOL`);

    if (successfulTests.length > 0) {
        const avgCommit = successfulTests.reduce((s, r) => s + r.commitCost, 0) / successfulTests.length;
        const avgReveal = successfulTests.reduce((s, r) => s + r.revealCost, 0) / successfulTests.length;
        const avgRentReclaimed = successfulTests.reduce((s, r) => s + (r.rentReclaimed || 0), 0) / successfulTests.length;
        const avgTotal = successfulTests.reduce((s, r) => s + r.totalCost, 0) / successfulTests.length;

        console.log(`\nAverage costs per VRF request:`);
        console.log(`  Commit (create + commit): ${avgCommit.toFixed(6)} SOL`);
        console.log(`  Reveal:                   ${avgReveal.toFixed(6)} SOL`);
        console.log(`  Rent reclaimed:          +${avgRentReclaimed.toFixed(6)} SOL`);
        console.log(`  Net total:                ${avgTotal.toFixed(6)} SOL`);

        console.log(`\nProjected costs (based on actual):`);
        [100, 1000, 10000].forEach(n => {
            const projected = avgTotal * n;
            const usd = projected * 150;
            console.log(`  ${n.toString().padStart(5)} boxes: ${projected.toFixed(4)} SOL (~$${usd.toFixed(2)} @ $150/SOL)`);
        });
    }

    console.log(`\nFinal balance: ${(finalBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL\n`);

    // Save results
    const reportPath = path.join(__dirname, '../logs', `vrf-cost-test-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
        network,
        timestamp: new Date().toISOString(),
        count,
        successfulTests: successfulTests.length,
        totalSpent,
        results,
        averages: successfulTests.length > 0 ? {
            commitCost: successfulTests.reduce((s, r) => s + r.commitCost, 0) / successfulTests.length,
            revealCost: successfulTests.reduce((s, r) => s + r.revealCost, 0) / successfulTests.length,
            rentReclaimed: successfulTests.reduce((s, r) => s + (r.rentReclaimed || 0), 0) / successfulTests.length,
            totalCost: successfulTests.reduce((s, r) => s + r.totalCost, 0) / successfulTests.length,
        } : null,
    }, null, 2));
    console.log(`Report saved: ${reportPath}`);

    return results;
}

// Main
async function main() {
    const config = parseArgs();

    if (config.dryRun) {
        await estimateCosts(config.network);
    } else {
        const wallet = loadWallet(config.walletPath);
        await runActualTests(config.network, config.count, wallet);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
