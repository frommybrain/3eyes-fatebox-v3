// scripts/verify-setup.js
// Verify backend setup is correct

import 'dotenv/config';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { loadDeployWallet } from '../lib/loadDeployWallet.js';
import { getNetworkConfig } from '../lib/getNetworkConfig.js';

console.log('\n🔍 Verifying 3Eyes Backend Setup...\n');

async function verifySetup() {
    let hasErrors = false;

    // 1. Check environment variables
    console.log('1️⃣  Checking environment variables...');
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'DEPLOY_WALLET_JSON'];

    for (const varName of requiredVars) {
        if (process.env[varName]) {
            console.log(`   ✅ ${varName} is set`);
        } else {
            console.log(`   ❌ ${varName} is MISSING`);
            hasErrors = true;
        }
    }

    // 2. Load deploy wallet
    console.log('\n2️⃣  Loading deploy wallet...');
    try {
        const deployWallet = loadDeployWallet();
        console.log(`   ✅ Deploy wallet loaded`);
        console.log(`      Public Key: ${deployWallet.publicKey.toString()}`);

        // Check balance on devnet
        console.log('\n   💰 Checking devnet balance...');
        const devnetConnection = new Connection('https://api.devnet.solana.com', 'confirmed');
        const devnetBalance = await devnetConnection.getBalance(deployWallet.publicKey);
        console.log(`      Devnet: ${devnetBalance / LAMPORTS_PER_SOL} SOL`);

        if (devnetBalance === 0) {
            console.log('      ⚠️  No devnet balance. Run: solana airdrop 5 ' + deployWallet.publicKey.toString() + ' --url devnet');
        }
    } catch (error) {
        console.log(`   ❌ Failed to load deploy wallet: ${error.message}`);
        hasErrors = true;
    }

    // 3. Load network config from database
    console.log('\n3️⃣  Loading network configuration from database...');
    try {
        const config = await getNetworkConfig();
        console.log(`   ✅ Network config loaded`);
        console.log(`      Network: ${config.network}`);
        console.log(`      RPC URL: ${config.rpcUrl}`);
        console.log(`      Program ID: ${config.programId.toString()}`);
        console.log(`      $3EYES Mint: ${config.threeEyesMint.toString()}`);
        console.log(`      Admin Wallet: ${config.adminWallet.toString()}`);
        console.log(`      Launch Fee: ${Number(config.launchFeeAmount) / 1e9} tokens`);
        console.log(`      Withdrawal Fee: ${config.withdrawalFeePercentage}%`);
    } catch (error) {
        console.log(`   ❌ Failed to load network config: ${error.message}`);
        console.log(`      Make sure Supabase credentials are correct and database is set up.`);
        hasErrors = true;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    if (hasErrors) {
        console.log('❌ Setup incomplete. Please fix the errors above.');
        process.exit(1);
    } else {
        console.log('✅ All checks passed! Backend is ready to use.');
        console.log('\nRun: npm run dev');
    }
    console.log('='.repeat(60) + '\n');
}

verifySetup().catch(error => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
});
