// backend/routes/settle-instruction.js - Fixed version with proper vault token account handling
const express = require('express');
const router = express.Router();
const anchor = require("@coral-xyz/anchor");
const { Program } = anchor;
const { PublicKey, Transaction, SystemProgram } = require("@solana/web3.js");
const {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction
} = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

// Load environment and keypair helper
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

router.post('/', async (req, res) => {
    try {
        const { boxMintAddress, userPublicKey } = req.body;

        if (!boxMintAddress || !userPublicKey) {
            return res.status(400).json({
                success: false,
                error: 'Missing boxMintAddress or userPublicKey'
            });
        }

        console.log('🔧 Executing settlement directly from backend...');
        console.log('   Box mint:', boxMintAddress);
        console.log('   User wallet:', userPublicKey);

        // Validate environment variables
        if (!process.env.RANDOM_GUARD_PROGRAM_ID) {
            throw new Error("RANDOM_GUARD_PROGRAM_ID not found in .env");
        }

        if (!process.env.DEV_FATE_MINT) {
            throw new Error("DEV_FATE_MINT not found in .env");
        }

        if (!process.env.VAULT_ADDRESS) {
            throw new Error("VAULT_ADDRESS not found in .env");
        }

        // Setup connection
        const connection = new anchor.web3.Connection(
            process.env.RPC_URL || "https://api.devnet.solana.com",
            "confirmed"
        );

        // Load vault wallet (this will execute the transaction)
        const loadVaultKeypair = require('../lib/loadVaultKeypair');
        const vaultKeypair = loadVaultKeypair();

        console.log('🔑 Vault wallet:', vaultKeypair.publicKey.toString());

        // Create wallet object
        const vaultWallet = {
            publicKey: vaultKeypair.publicKey,
            signTransaction: async (tx) => {
                tx.partialSign(vaultKeypair);
                return tx;
            },
            signAllTransactions: async (txs) => txs.map((tx) => {
                tx.partialSign(vaultKeypair);
                return tx;
            }),
        };

        // Setup provider
        const provider = new anchor.AnchorProvider(connection, vaultWallet, {
            commitment: "confirmed"
        });
        anchor.setProvider(provider);

        // Load program
        const programId = new PublicKey(process.env.RANDOM_GUARD_PROGRAM_ID);
        const idlPath = path.join(__dirname, "../../target/idl/random_guard.json");

        if (!fs.existsSync(idlPath)) {
            throw new Error(`IDL not found at ${idlPath}. Run 'anchor build' first.`);
        }

        const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
        const program = new Program(idl, provider);

        // Parse addresses
        const boxMint = new PublicKey(boxMintAddress);
        const userPubkey = new PublicKey(userPublicKey);
        const devFateMint = new PublicKey(process.env.DEV_FATE_MINT);
        
        // Get the vault's token account (ATA)
        let vaultTokenAccount;
        if (process.env.VAULT_TOKEN_ACCOUNT) {
            // Use the one from .env if available
            vaultTokenAccount = new PublicKey(process.env.VAULT_TOKEN_ACCOUNT);
            console.log('🏦 Using vault token account from .env:', vaultTokenAccount.toString());
        } else {
            // Derive it from the vault wallet address
            const vaultWalletAddress = new PublicKey(process.env.VAULT_ADDRESS);
            vaultTokenAccount = await getAssociatedTokenAddress(devFateMint, vaultWalletAddress);
            console.log('🏦 Derived vault token account:', vaultTokenAccount.toString());
            console.log('   (Consider adding VAULT_TOKEN_ACCOUNT to .env)');
        }

        // Derive accounts
        const [boxStatePda] = await PublicKey.findProgramAddress(
            [Buffer.from("box_state"), boxMint.toBuffer()],
            programId
        );

        const userTokenAccount = await getAssociatedTokenAddress(devFateMint, userPubkey);
        const userNftTokenAccount = await getAssociatedTokenAddress(boxMint, userPubkey);

        console.log('📦 Box State PDA:', boxStatePda.toString());
        console.log('🏦 Vault Token Account:', vaultTokenAccount.toString());
        console.log('💰 User Token Account:', userTokenAccount.toString());
        console.log('🎨 User NFT Account:', userNftTokenAccount.toString());

        // Verify box state exists and is ready for settlement
        let boxState;
        try {
            boxState = await program.account.boxState.fetch(boxStatePda);
            console.log('📊 Box state loaded successfully');
        } catch (e) {
            throw new Error("Box not found or not opened yet. Open the box first!");
        }

        if (boxState.settled) {
            throw new Error("Box already settled!");
        }

        if (!boxState.revealed) {
            throw new Error("Box not revealed yet. Run reveal command first.");
        }

        const rewardAmount = boxState.rewardAmount.toNumber();
        console.log('🎁 Reward amount:', rewardAmount, 'DEV_FATE');
        console.log('🎰 Is jackpot:', boxState.isJackpot);

        // Check vault balance if there's a reward to transfer
        if (rewardAmount > 0) {
            try {
                const vaultBalance = await connection.getTokenAccountBalance(vaultTokenAccount);
                const vaultAmount = parseInt(vaultBalance.value.amount);
                console.log('🏦 Vault balance:', vaultAmount, 'DEV_FATE');

                if (vaultAmount < rewardAmount) {
                    throw new Error(`Insufficient vault balance. Need ${rewardAmount} but vault has ${vaultAmount}`);
                }
            } catch (error) {
                if (error.message.includes("could not find account")) {
                    throw new Error(`Vault token account not found at ${vaultTokenAccount.toString()}. Run 'node scripts/setup-vault-token-account.js' first!`);
                }
                throw error;
            }
        }

        // Check if user's token account exists, create if needed
        const userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
        if (!userTokenAccountInfo && rewardAmount > 0) {
            console.log('🛠  Creating user token account...');
            const createAtaIx = createAssociatedTokenAccountInstruction(
                vaultKeypair.publicKey, // payer (backend pays)
                userTokenAccount,
                userPubkey,
                devFateMint
            );

            const createAtaTx = new Transaction().add(createAtaIx);
            await provider.sendAndConfirm(createAtaTx);
            console.log('✅ User token account created');
        }

        // Execute the settlement transaction using backend-only instruction
        console.log('⏳ Executing backend settlement transaction...');
        
        // For regular settlements, always pass false for chooseHonorary
        const tx = await program.methods
            .settleBoxBackend(false)  // Regular settlements don't choose honorary
            .accounts({
                owner: userPubkey,  // Not a signer, just an account
                boxMint: boxMint,
                boxState: boxStatePda,
                nftTokenAccount: userNftTokenAccount,
                vaultTokenAccount: vaultTokenAccount,
                vaultAuthority: vaultKeypair.publicKey,  // This is the only signer
                ownerTokenAta: userTokenAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();

        console.log('✅ Settlement transaction sent');
        console.log('📝 Transaction signature:', tx);

        // Wait for confirmation
        await connection.confirmTransaction(tx, 'confirmed');
        console.log('✅ Transaction confirmed');

        // Verify the box is now settled
        const updatedBoxState = await program.account.boxState.fetch(boxStatePda);
        if (!updatedBoxState.settled) {
            throw new Error('Box state not updated to settled');
        }

        // Check the user's new balance
        let newBalance = 0;
        if (rewardAmount > 0) {
            try {
                const userBalanceInfo = await connection.getTokenAccountBalance(userTokenAccount);
                newBalance = parseInt(userBalanceInfo.value.amount);
                console.log('💰 User\'s new DEV_FATE balance:', newBalance);
            } catch (e) {
                console.log('⚠️  Could not check user balance');
            }
        }

        return res.json({
            success: true,
            transaction: tx,
            signature: tx,
            userWallet: userPubkey.toString(),
            userTokenAccount: userTokenAccount.toString(),
            rewardAmount: rewardAmount,
            isJackpot: boxState.isJackpot,
            newBalance: newBalance,
            message: `Settlement completed! ${rewardAmount} DEV_FATE transferred to user.`
        });

    } catch (error) {
        console.error('❌ Error executing settlement:', error);
        
        // Log more details for anchor errors
        if (error.logs) {
            console.log('📋 Program logs:');
            error.logs.forEach(log => console.log('   ', log));
        }
        
        return res.status(500).json({
            success: false,
            error: error.message,
            logs: error.logs || []
        });
    }
});

module.exports = router;