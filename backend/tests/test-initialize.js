// test-initialize.js
// Test initializing a project on-chain directly

import 'dotenv/config';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import { getAnchorProgram } from './lib/anchorClient.js';
import { deriveAllPDAs } from './lib/pdaHelpers.js';

async function testInitialize() {
    console.log('\n🧪 Testing Project Initialization\n');

    const projectId = 1;
    const boxPrice = '1000000';
    const paymentTokenMint = 'BnL9bDB6yCUwFBckW5Lu3TZjaZobmqxecqnY85X1ti1h'; // tCATS
    const ownerWallet = '5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn';

    try {
        console.log('Loading Anchor program...');
        const { program, programId: progId } = await getAnchorProgram();

        console.log('Deriving PDAs...');
        const paymentTokenMintPubkey = new PublicKey(paymentTokenMint);
        const ownerPubkey = new PublicKey(ownerWallet);

        const pdas = await deriveAllPDAs(progId, projectId, paymentTokenMintPubkey);

        console.log(`Project Config PDA: ${pdas.projectConfig.address.toString()}`);
        console.log(`Vault Authority PDA: ${pdas.vaultAuthority.address.toString()}`);
        console.log(`Vault Token Account: ${pdas.vaultTokenAccount.address.toString()}`);

        console.log('\nPreparing transaction...');
        const boxPriceBN = new BN(boxPrice);
        const projectIdBN = new BN(projectId);

        console.log('Calling initialize_project...');
        const tx = await program.methods
            .initializeProject(projectIdBN, boxPriceBN)
            .accounts({
                owner: ownerPubkey,
                projectConfig: pdas.projectConfig.address,
                vaultAuthority: pdas.vaultAuthority.address,
                paymentTokenMint: paymentTokenMintPubkey,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .rpc();

        console.log(`\n✅ Transaction successful!`);
        console.log(`   Signature: ${tx}`);
        console.log(`   Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.logs) {
            console.error('\nTransaction Logs:');
            error.logs.forEach(log => console.error(`  ${log}`));
        }
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    }
}

testInitialize();
