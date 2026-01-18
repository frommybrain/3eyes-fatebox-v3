#!/usr/bin/env node
/**
 * Create a new test wallet and optionally airdrop SOL
 *
 * Usage: node scripts/createTestWallet.js [--output ./test-wallet.json] [--airdrop]
 */

import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

async function main() {
    const args = process.argv.slice(2);
    let outputPath = path.join(__dirname, '../test-wallet.json');
    let doAirdrop = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--output' || args[i] === '-o') {
            outputPath = args[++i];
        } else if (args[i] === '--airdrop' || args[i] === '-a') {
            doAirdrop = true;
        }
    }

    // Generate new keypair
    const keypair = Keypair.generate();

    // Save to file
    fs.writeFileSync(outputPath, JSON.stringify(Array.from(keypair.secretKey)));

    console.log('='.repeat(50));
    console.log('New Test Wallet Created');
    console.log('='.repeat(50));
    console.log(`Public Key: ${keypair.publicKey.toString()}`);
    console.log(`Saved to: ${outputPath}`);

    if (doAirdrop) {
        console.log('\nRequesting airdrop...');
        const connection = new Connection(RPC_URL, 'confirmed');

        try {
            // Try multiple airdrops
            for (let i = 0; i < 2; i++) {
                try {
                    const sig = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
                    await connection.confirmTransaction(sig, 'confirmed');
                    console.log(`Airdrop ${i + 1}: 2 SOL received`);
                    await new Promise(r => setTimeout(r, 1000));
                } catch (err) {
                    console.log(`Airdrop ${i + 1} failed: ${err.message}`);
                }
            }

            const balance = await connection.getBalance(keypair.publicKey);
            console.log(`\nFinal balance: ${balance / LAMPORTS_PER_SOL} SOL`);
        } catch (err) {
            console.error('Airdrop failed:', err.message);
        }
    }

    console.log('\nTo fund this wallet with tokens, send tokens to:');
    console.log(keypair.publicKey.toString());
    console.log('\nTo use with the test script:');
    console.log(`node scripts/automatedBoxTest.js --boxes 10 --project 1 --wallet ${outputPath}`);
}

main().catch(console.error);
