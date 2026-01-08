#!/usr/bin/env node
// scripts/js/debug-switchboard.js - Debug Switchboard integration

const { Keypair } = require("@solana/web3.js");
const anchor = require("@coral-xyz/anchor");
const fs = require("fs");
const path = require("path");
const {
  Queue,
  Randomness,
  ON_DEMAND_DEVNET_PID,
  ON_DEMAND_DEVNET_QUEUE,
} = require("@switchboard-xyz/on-demand");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// Switchboard devnet constants (using devnet for testing)
const SB_PROGRAM_ID = ON_DEMAND_DEVNET_PID;
const SB_QUEUE = ON_DEMAND_DEVNET_QUEUE;

async function debugSwitchboard(boxMintAddress) {
  try {
    console.log("🔍 Debugging Switchboard integration...");
    console.log("   Box Mint:", boxMintAddress);
    
    // Setup connection
    const connection = new anchor.web3.Connection(
      process.env.RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    );
    
    console.log("✅ Connection established");
    
    // Load wallet
    const walletKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(process.env.DEPLOY_WALLET, "utf8")))
    );
    
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
    
    console.log("✅ Wallet loaded:", wallet.publicKey.toString());
    
    // Setup provider
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed"
    });
    anchor.setProvider(provider);
    
    console.log("✅ Provider set up");
    
    // Test Switchboard constants
    console.log("🔍 Switchboard constants:");
    console.log("   SB_PROGRAM_ID:", SB_PROGRAM_ID.toString());
    console.log("   SB_QUEUE:", SB_QUEUE.toString());
    
    // Try to create Switchboard program
    console.log("🔍 Creating Switchboard program...");
    try {
      const sbProgram = await anchor.Program.at(SB_PROGRAM_ID, provider);
      console.log("✅ Switchboard program created");
      console.log("   Program ID:", sbProgram.programId.toString());
    } catch (error) {
      console.log("❌ Error creating Switchboard program:", error.message);
      throw error;
    }
    
    // Try to create Queue
    console.log("🔍 Creating Queue...");
    try {
      const sbProgram = await anchor.Program.at(SB_PROGRAM_ID, provider);
      const queueAccount = new Queue(sbProgram, SB_QUEUE);
      console.log("✅ Queue created");
      console.log("   Queue pubkey:", queueAccount.pubkey.toString());
    } catch (error) {
      console.log("❌ Error creating Queue:", error.message);
      throw error;
    }
    
    // Try to create randomness account
    console.log("🔍 Creating randomness account...");
    try {
      const sbProgram = await anchor.Program.at(SB_PROGRAM_ID, provider);
      const queueAccount = new Queue(sbProgram, SB_QUEUE);
      const rngKp = Keypair.generate();
      console.log("   RNG Keypair:", rngKp.publicKey.toString());
      
      const [randomness, createRandomnessIx] = await Randomness.create(sbProgram, rngKp, SB_QUEUE);
      console.log("✅ Randomness account created");
      console.log("   Randomness pubkey:", randomness.pubkey.toString());
      console.log("   Create instruction keys:", createRandomnessIx.keys.length);
    } catch (error) {
      console.log("❌ Error creating randomness account:", error.message);
      console.log("   Stack:", error.stack);
      throw error;
    }
    
    // Test our program loading
    console.log("🔍 Loading our program...");
    try {
      const programId = new PublicKey(process.env.RANDOM_GUARD_PROGRAM_ID);
      const idlPath = path.join(__dirname, "../../target/idl/random_guard.json");
      
      if (!fs.existsSync(idlPath)) {
        throw new Error(`IDL not found at ${idlPath}`);
      }
      
      const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
      console.log("✅ IDL loaded");
      console.log("   Instructions:", idl.instructions.length);
      console.log("   Accounts:", idl.accounts.length);
      
      const idlWithProgramId = {
        ...idl,
        address: programId.toString()
      };
      
      const program = new anchor.Program(idlWithProgramId, provider);
      console.log("✅ Our program created");
      console.log("   Program ID:", program.programId.toString());
      console.log("   Available methods:", Object.keys(program.methods));
    } catch (error) {
      console.log("❌ Error loading our program:", error.message);
      throw error;
    }
    
    console.log("🎉 All components loaded successfully!");
    
  } catch (error) {
    console.error("❌ Debug failed:", error.message);
    if (error.stack) {
      console.error("   Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Run debug
const boxMint = process.argv[2] || "2j9S4yM8ykXy9SyhnrKs5DNfjxgpuRu2YHz8zhQSM8iq";
debugSwitchboard(boxMint);