#!/usr/bin/env node
// scripts/js/settle-box.js - Settle FateBox and claim rewards

const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair } = require("@solana/web3.js");
const {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID
} = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// DEBUG: Add these lines
console.log("🔍 DEBUG - Script location:", __dirname);
console.log("🔍 DEBUG - Env file path:", path.join(__dirname, "../../.env"));
console.log("🔍 DEBUG - VAULT_ADDRESS from env:", process.env.VAULT_ADDRESS);
console.log("🔍 DEBUG - All env vars containing VAULT:", 
  Object.entries(process.env).filter(([key]) => key.includes('VAULT')));
  
async function settleBox(boxMintAddress) {
  try {
    console.log("💰 Settling FateBox for rewards...");
    console.log("   Box Mint:", boxMintAddress);
    
    // Validate inputs
    if (!boxMintAddress) {
      throw new Error("Box mint address is required");
    }
    
    if (!process.env.RANDOM_GUARD_PROGRAM_ID) {
      throw new Error("RANDOM_GUARD_PROGRAM_ID not found in .env");
    }
    
    if (!process.env.DEV_FATE_MINT) {
      throw new Error("DEV_FATE_MINT not found in .env");
    }
    
    if (!process.env.VAULT_ADDRESS) {
      throw new Error("VAULT_ADDRESS not found in .env - run reset-devnet.sh first");
    }
    
    // Setup connection
    const connection = new anchor.web3.Connection(
      process.env.RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    );
    
    // Load wallet (this is both the user and vault authority)
    //const walletKeypair = Keypair.fromSecretKey(
    //  new Uint8Array(JSON.parse(fs.readFileSync(process.env.DEPLOY_WALLET, "utf8")))
    //);
    const getDeployKeypair = require(
      path.resolve(__dirname, '../../backend/lib/loadKeypair')
    );
    const walletKeypair = getDeployKeypair();
    
    const wallet = {
      publicKey: walletKeypair.publicKey,
      signTransaction: async (tx) => { 
        tx.partialSign(walletKeypair); 
        return tx; 
      },
      signAllTransactions: async (txs) => txs.map((tx) => { 
        tx.partialSign(walletKeypair); 
        return tx; 
      }),
    };
    
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed"
    });
    anchor.setProvider(provider);
    
    console.log("🔑 Wallet:", wallet.publicKey.toString());
    
    // Load program
    const programId = new PublicKey(process.env.RANDOM_GUARD_PROGRAM_ID);
    const idlPath = path.join(__dirname, "../../target/idl/random_guard.json");
    
    if (!fs.existsSync(idlPath)) {
      throw new Error(`IDL not found at ${idlPath}. Run 'anchor build' first.`);
    }
    
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
    const idlWithProgramId = {
      ...idl,
      address: programId.toString()
    };
    const program = new anchor.Program(idlWithProgramId, provider);
    
    // Parse addresses
    const boxMint = new PublicKey(boxMintAddress);
    const devFateMint = new PublicKey(process.env.DEV_FATE_MINT);
    const vaultTokenAccount = new PublicKey(process.env.VAULT_ADDRESS);
    
    // Derive box state PDA
    const [boxStatePda] = await PublicKey.findProgramAddress(
      [Buffer.from("box_state"), boxMint.toBuffer()],
      programId
    );
    
    // Get user's associated token account
    const ownerTokenAta = await getAssociatedTokenAddress(
      devFateMint,
      wallet.publicKey
    );
    
    console.log("📦 Box State PDA:", boxStatePda.toString());
    console.log("🏦 Vault Token Account:", vaultTokenAccount.toString());
    console.log("💰 User ATA:", ownerTokenAta.toString());
    
    // Check current box state
    let boxState;
    try {
      boxState = await program.account.boxState.fetch(boxStatePda);
      console.log("📊 Box State loaded successfully");
    } catch (e) {
      throw new Error("Box not found or not opened yet. Open the box first!");
    }
    
    if (boxState.settled) {
      console.log("⚠️  Box already settled!");
      console.log("   Reward:", boxState.rewardAmount.toString(), "DEV_FATE");
      console.log("   Is Jackpot:", boxState.isJackpot);
      console.log("   Luck Score:", boxState.luck);
      return { success: true, alreadySettled: true, state: boxState };
    }
    
    if (boxState.rewardAmount.toNumber() === 0 && !boxState.isJackpot) {
      // Check if this is a revealed dud (minted_at > 0) or truly unrevealed
      if (boxState.mintedAt.toNumber() === 0) {
        console.log("⚠️  Box not revealed yet!");
        console.log("   Run reveal command first");
        return { success: false, error: "Box not revealed" };
      } else {
        // This is a legitimate dud - proceed with settlement
        console.log("📦 This box is a DUD (0 reward) - will settle to mark as complete");
      }
    }
    
    const rewardAmount = boxState.rewardAmount.toNumber();
    
    console.log("🎁 Pending reward:", rewardAmount, "DEV_FATE");
    console.log("🎰 Is Jackpot:", boxState.isJackpot);
    console.log("🍀 Luck Score:", boxState.luck, "/60");
    
    // Special handling for jackpots
    if (boxState.isJackpot) {
      console.log("🎰 This is a JACKPOT box!");
      console.log("   Honorary choice:", boxState.honoraryChoice ? "Honorary NFT" : "Tokens");
      
      if (!boxState.honoraryChoice) {
        console.log("   Will receive:", rewardAmount, "DEV_FATE tokens");
      } else {
        console.log("   Will burn tokens for Honorary NFT prestige");
      }
    }
    
    // Check vault balance (only if there's a reward to transfer)
    if (rewardAmount > 0) {
      try {
        const vaultBalance = await connection.getTokenAccountBalance(vaultTokenAccount);
        const vaultAmount = parseInt(vaultBalance.value.amount);
        console.log("🏦 Vault balance:", vaultAmount, "DEV_FATE");
        
        if (vaultAmount < rewardAmount) {
          throw new Error(`Insufficient vault balance. Need ${rewardAmount} but vault has ${vaultAmount}`);
        }
      } catch (e) {
        if (e.message.includes("Insufficient vault balance")) {
          throw e;
        }
        console.log("⚠️  Could not check vault balance");
      }
    } else {
      console.log("🏦 No vault balance check needed (dud box)");
    }
    
    // Ensure the recipient ATA exists (create if missing)
    let beforeBalance = 0;
    const ataInfo = await connection.getAccountInfo(ownerTokenAta);
    if (!ataInfo) {
      console.log("🛠  Creating associated token account for user…");
      const ix = createAssociatedTokenAccountInstruction(
        wallet.publicKey,        // payer & owner
        ownerTokenAta,
        wallet.publicKey,
        devFateMint
      );
      const txAta = new anchor.web3.Transaction().add(ix);
      await provider.sendAndConfirm(txAta);
      console.log("✅ ATA created:", ownerTokenAta.toString());
    } else {
      // Fetch current balance so we can show how much arrived afterwards
      try {
        const bal = await connection.getTokenAccountBalance(ownerTokenAta);
        beforeBalance = parseInt(bal.value.amount);
        console.log("💰 Current DEV_FATE balance:", beforeBalance);
      } catch { /* ignore */ }
    }
    
    // Call settle_box instruction
    console.log("⏳ Sending settle_box transaction...");
    
    const tx = await program.methods
      .settleBox()
      .accounts({
        owner: wallet.publicKey,
        boxMint: boxMint,
        boxState: boxStatePda,
        vaultTokenAccount: vaultTokenAccount,
        vaultAuthority: wallet.publicKey, // Your wallet is the vault authority
        ownerTokenAta: ownerTokenAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    console.log("✅ Box settled successfully!");
    console.log("📝 Transaction signature:", tx);
    console.log("🔗 View on Solscan: https://solscan.io/tx/" + tx + "?cluster=devnet");
    
    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Fetch updated box state
    const updatedBoxState = await program.account.boxState.fetch(boxStatePda);
    console.log("✅ Box is now settled:", updatedBoxState.settled);
    
    // Check new balance
    let finalReward = 0;
    try {
      const tokenAccount = await connection.getTokenAccountBalance(ownerTokenAta);
      const afterBalance = parseInt(tokenAccount.value.amount);
      finalReward = afterBalance - beforeBalance;
      
      console.log("💰 New DEV_FATE balance:", afterBalance);
      console.log("🎁 Reward received:", finalReward, "DEV_FATE");
    } catch (e) {
      console.log("⚠️  Could not check final balance, but settlement should be complete");
    }
    
    // Summary
    console.log("");
    if (rewardAmount === 0) {
      console.log("📦 DUD BOX SETTLED!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   Box Mint: ${boxMintAddress}`);
      console.log(`   Luck Score: ${boxState.luck}/60`);
      console.log(`   Result: DUD (No reward)`);
      console.log(`   Status: Box marked as settled`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("   🎲 Better luck next time!");
    } else {
      console.log("🎉 SETTLEMENT COMPLETE!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   Box Mint: ${boxMintAddress}`);
      console.log(`   Luck Score: ${boxState.luck}/60`);
      console.log(`   Expected Reward: ${rewardAmount} DEV_FATE`);
      console.log(`   Actual Received: ${finalReward} DEV_FATE`);
      console.log(`   Jackpot: ${boxState.isJackpot ? "YES" : "NO"}`);
      
      if (vaultTokenAccount.toString() === ownerTokenAta.toString()) {
        console.log("   ⚠️  NOTE: Vault and user account are the same - consider using separate vault");
      }
      
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
    
    return { 
      success: true, 
      transaction: tx, 
      state: updatedBoxState,
      rewardAmount: finalReward
    };
    
  } catch (error) {
    console.error("❌ Error settling box:", error.message);
    
    if (error.logs) {
      console.log("📋 Program logs:");
      error.logs.forEach(log => console.log("   ", log));
    }
    
    return { success: false, error: error.message };
  }
}

// Handle command line usage
if (require.main === module) {
  const boxMint = process.argv[2];
  
  if (!boxMint) {
    console.log("Usage: node scripts/js/settle-box.js <BOX_MINT_ADDRESS>");
    console.log("Example: node scripts/js/settle-box.js 9aFD2B5H142ipnzdYfpXthRxY48BpoWtPPoHVi5mhDxY");
    console.log("");
    console.log("What settle does:");
    console.log("  • Transfers DEV_FATE tokens from vault to your wallet");
    console.log("  • Marks the box as settled (prevents double-claiming)");
    console.log("  • Handles both regular rewards and jackpot choices");
    console.log("");
    console.log("Note: Box must be opened and revealed first!");
    process.exit(1);
  }
  
  settleBox(boxMint)
    .then(result => {
      if (result.success) {
        console.log("🎉 Settle box completed!");
        process.exit(0);
      } else {
        console.log("❌ Settle box failed!");
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("💥 Unexpected error:", error);
      process.exit(1);
    });
}

module.exports = { settleBox };