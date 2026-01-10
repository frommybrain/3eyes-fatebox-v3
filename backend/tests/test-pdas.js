// test-pdas.js
// Quick test script for PDA derivation

import 'dotenv/config';
import { PublicKey } from '@solana/web3.js';
import { deriveAllPDAs } from './lib/pdaHelpers.js';

async function testPDADerivation() {
    console.log('\n🧪 Testing PDA Derivation\n');

    const programId = new PublicKey('GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat');
    const projectId = 1;
    const paymentTokenMint = new PublicKey('BnL9bDB6yCUwFBckW5Lu3TZjaZobmqxecqnY85X1ti1h'); // tCATS

    console.log(`Program ID: ${programId.toString()}`);
    console.log(`Project ID: ${projectId}`);
    console.log(`Payment Token: ${paymentTokenMint.toString()}\n`);

    try {
        const pdas = await deriveAllPDAs(programId, projectId, paymentTokenMint);

        console.log('✅ PDAs Derived Successfully:\n');
        console.log(`Project Config PDA: ${pdas.projectConfig.address.toString()}`);
        console.log(`  Bump: ${pdas.projectConfig.bump}`);
        console.log(`  Seeds: ["project", ${projectId}]\n`);

        console.log(`Vault Authority PDA: ${pdas.vaultAuthority.address.toString()}`);
        console.log(`  Bump: ${pdas.vaultAuthority.bump}`);
        console.log(`  Seeds: ["vault", ${projectId}, ${paymentTokenMint.toString()}]\n`);

        console.log(`Vault Token Account (ATA): ${pdas.vaultTokenAccount.address.toString()}`);
        console.log(`  (Associated Token Account for Vault Authority PDA)\n`);

        console.log('✅ All PDAs derived successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testPDADerivation();
