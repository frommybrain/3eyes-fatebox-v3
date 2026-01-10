// test-box-purchase.js
// Test script to simulate box purchase and see detailed errors

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import fetch from 'node-fetch';

async function testBoxPurchase() {
    const buyerWallet = 'DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN';
    const projectId = 15;
    const paymentTokenMint = 'BnL9bDB6yCUwFBckW5Lu3TZjaZobmqxecqnY85X1ti1h'; // TCATS

    console.log('\n🧪 Testing box purchase transaction...\n');

    // Step 1: Check buyer's token balance
    console.log('1️⃣ Checking buyer token balance...');
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const buyerPubkey = new PublicKey(buyerWallet);
    const tokenMintPubkey = new PublicKey(paymentTokenMint);

    const buyerTokenAccount = await getAssociatedTokenAddress(tokenMintPubkey, buyerPubkey);
    console.log(`   Buyer token account: ${buyerTokenAccount.toString()}`);

    try {
        const accountInfo = await connection.getAccountInfo(buyerTokenAccount);
        if (!accountInfo) {
            console.log('   ❌ Buyer token account does NOT exist!');
            console.log('   💡 Solution: Create the token account first or airdrop tokens');
            return;
        }

        // Parse token balance (amount at offset 64)
        const amount = accountInfo.data.readBigUInt64LE(64);
        const balance = Number(amount) / 1e9;
        console.log(`   ✅ Buyer token balance: ${balance} TCATS`);

        if (balance < 100) {
            console.log('   ⚠️  Insufficient balance! Need 100 TCATS');
            return;
        }
    } catch (error) {
        console.log(`   ❌ Error checking balance: ${error.message}`);
        return;
    }

    // Step 2: Build transaction via backend
    console.log('\n2️⃣ Building transaction via backend...');
    const response = await fetch('http://localhost:3333/api/program/build-create-box-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, buyerWallet }),
    });

    const result = await response.json();

    if (!result.success) {
        console.log(`   ❌ Failed: ${result.error}`);
        console.log(`   Details: ${result.details}`);
        return;
    }

    console.log('   ✅ Transaction built successfully');
    console.log(`   Box ID: ${result.boxId}`);
    console.log(`   Box PDA: ${result.boxInstancePDA}`);

    // Step 3: Simulate transaction
    console.log('\n3️⃣ Simulating transaction on-chain...');
    try {
        const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));

        // Get fresh blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = buyerPubkey;

        console.log('   Transaction details:');
        console.log(`   - Instructions: ${transaction.instructions.length}`);
        console.log(`   - Fee payer: ${transaction.feePayer.toString()}`);
        console.log(`   - Blockhash: ${transaction.recentBlockhash}`);

        // Simulate the transaction
        const simulation = await connection.simulateTransaction(transaction);

        if (simulation.value.err) {
            console.log('\n   ❌ SIMULATION FAILED:');
            console.log(JSON.stringify(simulation.value, null, 2));

            // Parse common errors
            if (simulation.value.logs) {
                console.log('\n   📜 Transaction logs:');
                simulation.value.logs.forEach(log => console.log(`      ${log}`));
            }
        } else {
            console.log('   ✅ Simulation successful!');
            console.log(`   Units consumed: ${simulation.value.unitsConsumed}`);

            if (simulation.value.logs) {
                console.log('\n   📜 Transaction logs:');
                simulation.value.logs.forEach(log => console.log(`      ${log}`));
            }
        }
    } catch (error) {
        console.log(`   ❌ Simulation error: ${error.message}`);
        if (error.logs) {
            console.log('\n   📜 Error logs:');
            error.logs.forEach(log => console.log(`      ${log}`));
        }
    }

    console.log('\n✅ Test complete\n');
}

testBoxPurchase().catch(console.error);
