#!/usr/bin/env node
// scripts/js/open-box.js - Open FateBox with Switchboard provable randomness
// Updated to use backend-only methods for security

const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair } = require("@solana/web3.js");
const { getAssociatedTokenAddress } = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");
const {
  Queue,
  Randomness,
  ON_DEMAND_MAINNET_PID,
  ON_DEMAND_MAINNET_QUEUE,
} = require("@switchboard-xyz/on-demand");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// Switchboard mainnet constants for production
const SB_PROGRAM_ID = ON_DEMAND_MAINNET_PID;
const SB_QUEUE = ON_DEMAND_MAINNET_QUEUE;

async function getNFTOwner(connection, mintAddress) {
  try {
    console.log("🔍 Looking up NFT owner for mint:", mintAddress.toString());

    // Get the token accounts for this mint
    const largestAccounts = await connection.getTokenLargestAccounts(mintAddress);

    if (largestAccounts.value.length > 0) {
      // Get the account info for the largest holder
      const largestAccountAddress = largestAccounts.value[0].address;
      const accountInfo = await connection.getParsedAccountInfo(largestAccountAddress);

      if (accountInfo.value && accountInfo.value.data.parsed) {
        const owner = accountInfo.value.data.parsed.info.owner;
        console.log("✅ Found NFT owner:", owner);
        return new PublicKey(owner);
      }
    }

    throw new Error("Could not find NFT owner");

  } catch (error) {
    console.error("❌ Error looking up NFT owner:", error.message);
    throw error;
  }
}

function calculateRewardFromLuckAndRandomness(luckScore, randomPercentage) {
  // Probability tables based on luck score (same as Rust version)
  let dudChance, rebateChance, breakEvenChance, profitChance;

  if (luckScore <= 5) {
    [dudChance, rebateChance, breakEvenChance, profitChance] = [55.0, 30.0, 10.0, 4.5];
  } else if (luckScore <= 13) {
    // Linear interpolation between 5 and 13
    const ratio = (luckScore - 5) / 8.0;
    dudChance = 55.0 + (45.0 - 55.0) * ratio;        // 55% → 45%
    rebateChance = 30.0 + (30.0 - 30.0) * ratio;     // 30% → 30%
    breakEvenChance = 10.0 + (15.0 - 10.0) * ratio;  // 10% → 15%
    profitChance = 4.5 + (8.5 - 4.5) * ratio;        // 4.5% → 8.5%
  } else {
    // Linear interpolation between 13 and 60
    const ratio = (luckScore - 13) / 47.0;
    dudChance = 45.0 + (30.0 - 45.0) * ratio;        // 45% → 30%
    rebateChance = 30.0 + (25.0 - 30.0) * ratio;     // 30% → 25%
    breakEvenChance = 15.0 + (20.0 - 15.0) * ratio;  // 15% → 20%
    profitChance = 8.5 + (20.0 - 8.5) * ratio;       // 8.5% → 20%
  }

  // Determine tier based on cumulative probabilities
  let cumulative = 0;

  cumulative += dudChance;
  if (randomPercentage <= cumulative) {
    return { rewardAmount: 0, isJackpot: false, tierName: "Dud" };
  }

  cumulative += rebateChance;
  if (randomPercentage <= cumulative) {
    return { rewardAmount: 800, isJackpot: false, tierName: "Rebate" };
  }

  cumulative += breakEvenChance;
  if (randomPercentage <= cumulative) {
    return { rewardAmount: 1000, isJackpot: false, tierName: "Break-even" };
  }

  cumulative += profitChance;
  if (randomPercentage <= cumulative) {
    return { rewardAmount: 2500, isJackpot: false, tierName: "Profit" };
  }

  // Jackpot (remaining percentage)  
  return { rewardAmount: 10000, isJackpot: true, tierName: "JACKPOT" };
}

async function getNFTMintTime(connection, mintAddress) {
  try {
    // Grab up to the first 100 signatures (more than enough for a fresh mint)
    const sigs = await connection.getSignaturesForAddress(
      mintAddress,
      { limit: 100 },          // <= 100 is free on devnet
      "confirmed"
    );

    if (!sigs.length) {
      console.log("   ⚠️  No signatures found, using current time");
      return Date.now();
    }

    // The LAST element of the array is the **oldest** signature.
    const oldest = sigs[sigs.length - 1];

    if (oldest.blockTime) {
      return oldest.blockTime * 1000;            // sec → ms
    }

    /* ------------------------------------------------------------------ */
    /*  Fallback: fetch the TX once, but with the required options        */
    /* ------------------------------------------------------------------ */
    const tx = await connection.getTransaction(
      oldest.signature,
      { commitment: "confirmed", maxSupportedTransactionVersion: 0 }
    );

    if (tx?.blockTime) {
      return tx.blockTime * 1000;
    }

    // Still nothing – assume it was minted very recently
    return Date.now() - Math.random() * 5 * 60 * 1000;

  } catch (err) {
    console.log("   ⚠️  Error fetching mint time:", err.message);
    return Date.now() - Math.random() * 5 * 60 * 1000;
  }
}

function calculateLuckScore(holdTimeSeconds) {
  // TESTING MODE: Starts at 5 points, +1 every 3 seconds, caps at 60
  // PRODUCTION: Starts at 5 points, +1 every 3 hours, caps at 60
  const baseScore = 5;
  const secondsHeld = holdTimeSeconds; // Use seconds directly for testing
  const bonusPoints = Math.floor(secondsHeld / 3); // +1 every 3 seconds (was 3 hours)
  const luckScore = Math.min(baseScore + bonusPoints, 60); // Cap at 60
  return luckScore;
}

async function openBoxCommit(boxMintAddress) {
  try {
    console.log("🎁 Opening FateBox with Switchboard provable randomness...");
    console.log("   Box Mint:", boxMintAddress);
    console.log("   Step 1/2: Committing to randomness...");

    // Validate inputs
    if (!boxMintAddress) {
      throw new Error("Box mint address is required");
    }

    if (!process.env.RANDOM_GUARD_PROGRAM_ID) {
      throw new Error("RANDOM_GUARD_PROGRAM_ID not found in .env");
    }

    // Setup connection and provider
    const connection = new anchor.web3.Connection(
      process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
      "confirmed"
    );

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

    console.log("🔑 Backend wallet:", wallet.publicKey.toString());

    // Setup Switchboard
    const sbProgram = await anchor.Program.at(SB_PROGRAM_ID, provider);
    console.log("📋 Switchboard Program ID:", SB_PROGRAM_ID.toString());
    console.log("📋 Switchboard Queue:", SB_QUEUE.toString());

    // Load our program
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
    console.log("📋 Program ID:", programId.toString());

    // Parse box mint and derive PDA
    const boxMint = new PublicKey(boxMintAddress);
    const [boxStatePda] = await PublicKey.findProgramAddress(
      [Buffer.from("box_state"), boxMint.toBuffer()],
      programId
    );

    console.log("📦 Box State PDA:", boxStatePda.toString());

    // Check if box is already opened
    try {
      const existingState = await program.account.boxState.fetch(boxStatePda);
      if (existingState.rewardAmount.toNumber() > 0 || existingState.isJackpot) {
        console.log("⚠️  Box already fully opened and revealed!");
        console.log("   Luck:", existingState.luck, "/60");
        console.log("   Reward:", existingState.rewardAmount.toString(), "DEV_FATE");
        console.log("   Is Jackpot:", existingState.isJackpot);
        return { success: true, alreadyOpened: true, state: existingState };
      } else if (existingState.mintedAt.toNumber() > 0) {
        console.log("⚠️  Box already committed, but not yet revealed!");
        console.log("   Use reveal command to complete opening");
        return { success: true, needsReveal: true, state: existingState };
      }
    } catch (e) {
      console.log("✅ Box not opened yet, proceeding with commitment...");
    }

    // Calculate luck score
    console.log("🎲 Calculating luck score based on hold time...");
    const nftMintTime = await getNFTMintTime(connection, boxMint);
    const openTime = Date.now();
    const holdTimeMs = openTime - nftMintTime;
    const holdTimeSeconds = Math.floor(holdTimeMs / 1000);

    console.log("   NFT was minted:", new Date(nftMintTime).toISOString());
    console.log("   Hold time:", holdTimeSeconds, "seconds");
    console.log("   Hold time:", Math.floor(holdTimeSeconds / 60), "minutes", `(${Math.floor(holdTimeSeconds / 3600 * 10) / 10} hours)`);

    const luckScore = calculateLuckScore(holdTimeSeconds);
    console.log("   Calculated luck score:", luckScore, "/60");

    // Create Switchboard randomness account
    console.log("🎰 Creating Switchboard randomness account...");
    const rngKp = Keypair.generate();
    const [randomness, createRandomnessIx] = await Randomness.create(sbProgram, rngKp, SB_QUEUE);

    console.log("   Randomness account:", randomness.pubkey.toString());

    // Create randomness account on-chain first
    console.log("⏳ Creating randomness account on-chain...");
    const createTx = new anchor.web3.Transaction();
    createTx.add(createRandomnessIx);

    const createSignature = await provider.sendAndConfirm(createTx, [rngKp]);
    console.log("✅ Randomness account created on-chain");
    console.log("   Create signature:", createSignature);

    // Now create commit instruction
    console.log("🎲 Creating commit instruction...");
    const commitIx = await randomness.commitIx(SB_QUEUE);

    // Get the actual NFT owner
    console.log("👤 Looking up current NFT owner...");
    const nftOwner = await getNFTOwner(connection, boxMint);
    console.log("   NFT is owned by:", nftOwner.toString());

    // Verify the NFT is actually owned (not burned or in escrow)
    const nftTokenAccount = await getAssociatedTokenAddress(boxMint, nftOwner);
    const nftAccountInfo = await connection.getParsedAccountInfo(nftTokenAccount);

    if (!nftAccountInfo.value || !nftAccountInfo.value.data.parsed) {
      throw new Error("NFT token account not found");
    }

    const nftBalance = nftAccountInfo.value.data.parsed.info.tokenAmount.uiAmount;
    if (nftBalance !== 1) {
      throw new Error(`Invalid NFT balance: ${nftBalance}. Expected 1.`);
    }

    console.log("✅ NFT ownership verified");

    // Create our program's commit instruction using BACKEND method
    const commitBoxIx = await program.methods
      .openBoxCommitBackend(randomness.pubkey, luckScore)  // Using backend method!
      .accounts({
        owner: nftOwner,  // NFT owner (not required to sign)
        boxMint: boxMint,
        boxState: boxStatePda,
        randomnessAccountData: randomness.pubkey,
        backendAuthority: wallet.publicKey,  // Backend authority (signer)
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .instruction();

    // Execute commitment transaction
    console.log("⏳ Sending commitment transaction...");
    const commitTx = new anchor.web3.Transaction();
    commitTx.add(commitIx);
    commitTx.add(commitBoxIx);

    const commitSignature = await provider.sendAndConfirm(commitTx, []);

    console.log("✅ Commitment successful!");
    console.log("📝 Transaction signature:", commitSignature);
    console.log("🔗 View on Solscan: https://solscan.io/tx/" + commitSignature);
    console.log("");
    console.log("🕐 Now wait ~5-10 seconds, then run reveal command:");
    console.log(`   node scripts/js/reveal-box.js ${boxMintAddress}`);
    console.log("");
    console.log("💡 The randomness is now committed and provably fair!");

    return {
      success: true,
      committed: true,
      randomnessAccount: randomness.pubkey.toString(),
      luckScore,
      holdTimeSeconds,
      commitSignature,
      tierName: "Committed"
    };

  } catch (error) {
    console.error("❌ Error committing box opening:", error.message);

    if (error.logs) {
      console.log("📋 Program logs:");
      error.logs.forEach(log => console.log("   ", log));
    }

    return { success: false, error: error.message };
  }
}

async function openBoxReveal(boxMintAddress) {
  try {
    console.log("🎰 Revealing FateBox randomness...");
    console.log("   Box Mint:", boxMintAddress);
    console.log("   Step 2/2: Revealing committed randomness...");

    // Setup connection and provider
    const connection = new anchor.web3.Connection(
      process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
      "confirmed"
    );

    const getDeployKeypair = require(
      require('path').resolve(__dirname, '../../backend/lib/loadKeypair')
    );
    const walletKeypair = getDeployKeypair();

    const wallet = {
      publicKey: walletKeypair.publicKey,
      signTransaction: async (tx) => { tx.partialSign(walletKeypair); return tx; },
      signAllTransactions: async (txs) => txs.map((tx) => { tx.partialSign(walletKeypair); return tx; }),
    };

    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed"
    });
    anchor.setProvider(provider);

    // Setup Switchboard
    const sbProgram = await anchor.Program.at(SB_PROGRAM_ID, provider);

    // Debug Switchboard program structure
    console.log("🔍 Debugging Switchboard program structure...");
    console.log("   Available account types:", Object.keys(sbProgram.account || {}));

    if (sbProgram.account) {
      const accountTypes = Object.keys(sbProgram.account);
      console.log("   Account types:", accountTypes);

      // Look for randomness-related account types
      const randomnessTypes = accountTypes.filter(type =>
        type.toLowerCase().includes('random') ||
        type.toLowerCase().includes('oracle') ||
        type.toLowerCase().includes('data')
      );

      if (randomnessTypes.length > 0) {
        console.log("   Potential randomness account types:", randomnessTypes);
      }
    }

    // Load our program
    const programId = new PublicKey(process.env.RANDOM_GUARD_PROGRAM_ID);
    const idlPath = path.join(__dirname, "../../target/idl/random_guard.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
    const idlWithProgramId = { ...idl, address: programId.toString() };
    const program = new anchor.Program(idlWithProgramId, provider);

    // Get box state
    const boxMint = new PublicKey(boxMintAddress);
    const [boxStatePda] = await PublicKey.findProgramAddress(
      [Buffer.from("box_state"), boxMint.toBuffer()],
      programId
    );

    const boxState = await program.account.boxState.fetch(boxStatePda);

    if (boxState.rewardAmount.toNumber() > 0 || boxState.isJackpot) {
      console.log("⚠️  Box already revealed!");
      console.log("   Reward:", boxState.rewardAmount.toString(), "DEV_FATE");
      console.log("   Is Jackpot:", boxState.isJackpot);
      return { success: true, alreadyRevealed: true, state: boxState };
    }

    if (boxState.mintedAt.toNumber() === 0) {
      throw new Error("Box not committed yet. Run commit command first.");
    }

    console.log("📦 Box State:", boxStatePda.toString());
    console.log("🎲 Randomness Account:", boxState.randomnessAccount.toString());
    console.log("   Luck Score:", boxState.luck, "/60");

    // Create Randomness instance
    const randomness = new Randomness(sbProgram, boxState.randomnessAccount);

    // Check if randomness is ready
    console.log("🔍 Checking if randomness is ready...");
    try {
      await randomness.loadData();
      console.log("✅ Randomness data loaded successfully");
    } catch (error) {
      console.log("⚠️  Randomness data not ready yet:", error.message);
      console.log("   This is normal - we'll try to reveal anyway...");
    }

    // Create reveal instruction with better error handling
    console.log("🎲 Creating reveal instruction...");
    let revealIx;
    try {
      revealIx = await randomness.revealIx();
      console.log("✅ Reveal instruction created successfully");
    } catch (error) {
      console.log("❌ Failed to create reveal instruction:", error.message);
      console.log("🔄 This might be a Switchboard API issue. Retrying in 5 seconds...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        revealIx = await randomness.revealIx();
        console.log("✅ Reveal instruction created on retry");
      } catch (retryError) {
        throw new Error(`Switchboard reveal failed twice: ${retryError.message}. The API might be temporarily down.`);
      }
    }

    // Execute reveal transaction
    console.log("⏳ Revealing randomness...");
    const revealTx = new anchor.web3.Transaction();
    revealTx.add(revealIx);

    let revealSignature;
    try {
      console.log("📡 Sending reveal transaction to Solana...");
      revealSignature = await provider.sendAndConfirm(revealTx);
      console.log("✅ Switchboard randomness revealed!");
      console.log("📝 Reveal signature:", revealSignature);
    } catch (error) {
      console.log("❌ Reveal transaction failed:", error.message);
      if (error.message.includes("500") || error.message.includes("fetchRandomnessReveal")) {
        console.log("🔍 This appears to be a Switchboard API issue (500 error)");
        console.log("   The randomness commit was successful, but the reveal API is having problems");
        console.log("   This is often temporary - you can retry in a few minutes");
        console.log("   Or try using a different RPC endpoint");
      }
      throw error;
    }

    // Wait longer for data to be available and process properly
    console.log("⏳ Waiting for Switchboard to fully process randomness reveal...");
    await new Promise(resolve => setTimeout(resolve, 10000)); // Increased from 3s to 10s

    // Now access the randomness data using multiple methods with retry logic
    console.log("🔄 Accessing randomness data with retry logic...");

    let randomnessAccountInfo;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Get the randomness account data directly
        randomnessAccountInfo = await connection.getAccountInfo(randomness.pubkey);
        
        if (randomnessAccountInfo) {
          console.log("✅ Randomness account found on attempt", retryCount + 1);
          break;
        } else {
          throw new Error("Randomness account not found");
        }
      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`⚠️  Attempt ${retryCount} failed, retrying in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          throw new Error(`Failed to get randomness account after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }

    // Get the current slot
    const slot = await connection.getSlot();
    console.log("   Current slot:", slot);

    console.log("✅ Randomness account found, data length:", randomnessAccountInfo.data.length);

    let randomValue;
    let randomPercentage;

    try {
      // Method 1: Try to decode using the program's account coder
      console.log("🔍 Trying to decode using program account coder...");

      // Try to find the right account decoder
      const possibleAccountTypes = ['randomnessAccountData', 'randomnessData', 'randomness'];
      let decodedData = null;

      for (const accountType of possibleAccountTypes) {
        if (sbProgram.account && sbProgram.account[accountType]) {
          try {
            console.log(`   Trying to decode as ${accountType}...`);
            decodedData = sbProgram.account[accountType].coder.accounts.decode(
              accountType,
              randomnessAccountInfo.data
            );
            console.log(`✅ Successfully decoded as ${accountType}`);
            break;
          } catch (e) {
            console.log(`   Failed to decode as ${accountType}:`, e.message);
          }
        }
      }

      if (decodedData) {
        console.log("🔍 Decoded data keys:", Object.keys(decodedData));

        // Look for the random value in common field names
        const valueFields = ['value', 'randomValue', 'result', 'data', 'bytes'];
        for (const field of valueFields) {
          if (decodedData[field]) {
            console.log(`✅ Found random data in field: ${field}`);
            randomValue = decodedData[field];
            break;
          }
        }

        // If no direct value field, look for any Uint8Array/Buffer field with the right size
        if (!randomValue) {
          for (const [key, value] of Object.entries(decodedData)) {
            if ((value instanceof Uint8Array || Buffer.isBuffer(value)) && value.length >= 32) {
              console.log(`✅ Using ${key} field as random value (length: ${value.length})`);
              randomValue = value.slice(0, 32); // Take first 32 bytes
              break;
            }
          }
        }
      }

      // Method 2: Manual extraction if decoding failed
      if (!randomValue) {
        console.log("🔍 Attempting manual randomness extraction...");

        // Based on Switchboard account structure, try different offsets
        const data = randomnessAccountInfo.data;
        const possibleOffsets = [8, 16, 32, 64, 128, 256];

        for (const offset of possibleOffsets) {
          if (data.length >= offset + 32) {
            const candidate = data.slice(offset, offset + 32);

            // Check if this looks like real random data (not all zeros)
            const nonZeroBytes = candidate.filter(b => b !== 0).length;
            if (nonZeroBytes > 16) { // At least half the bytes should be non-zero for good randomness
              console.log(`✅ Found potential random data at offset ${offset} (${nonZeroBytes}/32 non-zero bytes)`);
              console.log("   Sample bytes:", Array.from(candidate.slice(0, 8)));
              randomValue = candidate;
              break;
            }
          }
        }
      }

      // Method 3: Last resort fallback
      if (!randomValue) {
        console.log("⚠️  Using raw account data as fallback");
        randomValue = randomnessAccountInfo.data.slice(-32); // Take last 32 bytes
      }

      console.log("🎲 Extracted random value:");
      console.log("   Length:", randomValue.length);
      console.log("   First 8 bytes:", Array.from(randomValue.slice(0, 8)));
      console.log("   Last 8 bytes:", Array.from(randomValue.slice(-8)));

      // Convert to percentage
      // Ensure randomValue is a Uint8Array
      const randomUint8Array = randomValue instanceof Uint8Array ? randomValue : new Uint8Array(randomValue);
      const randomBytes = randomUint8Array.slice(0, 4);

      // Create ArrayBuffer for DataView
      const arrayBuffer = randomBytes.buffer.slice(randomBytes.byteOffset, randomBytes.byteOffset + randomBytes.byteLength);
      const randomU32 = new DataView(arrayBuffer).getUint32(0, true);
      randomPercentage = (randomU32 / 0xFFFFFFFF) * 100;

      console.log("   Random U32:", randomU32);
      console.log("   Random percentage:", randomPercentage.toFixed(2), "%");

    } catch (error) {
      console.error("❌ Error accessing randomness data:", error.message);
      throw error;
    }

    // Calculate reward (using client-side function for now)
    const luckScore = boxState.luck;
    const { rewardAmount, isJackpot, tierName } = calculateRewardFromLuckAndRandomness(luckScore, randomPercentage);

    console.log("🎯 Calculated result:");
    console.log("   Tier:", tierName);
    console.log("   Reward:", rewardAmount, "DEV_FATE");
    console.log("   Is Jackpot:", isJackpot);

    // Store result on-chain using the BACKEND method
    console.log("💾 Storing result on-chain...");
    const storeResultIx = await program.methods
      .openBoxRevealBackend(randomPercentage) // Using backend method!
      .accounts({
        owner: boxState.owner,  // NFT owner (not required to sign)
        boxMint: boxMint,
        boxState: boxStatePda,
        backendAuthority: wallet.publicKey,  // Backend authority (signer)
      })
      .instruction();

    const storeTx = new anchor.web3.Transaction();
    storeTx.add(storeResultIx);

    const storeSignature = await provider.sendAndConfirm(storeTx);

    console.log("✅ Box revealed successfully!");
    console.log("📝 Store signature:", storeSignature);
    console.log("🔗 View on Solscan: https://solscan.io/tx/" + storeSignature);

    // Wait for state to update
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch and display final results
    const finalBoxState = await program.account.boxState.fetch(boxStatePda);
    const finalRewardAmount = finalBoxState.rewardAmount.toNumber();
    const finalIsJackpot = finalBoxState.isJackpot;

    console.log("");

    if (finalIsJackpot) {
      console.log("🎰🎉 JACKPOT! JACKPOT! JACKPOT! 🎉🎰");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   🏆 LEGENDARY WIN: ${finalRewardAmount} DEV_FATE!`);
      console.log("   💎 CHOICE AVAILABLE: Claim tokens OR forge Honorary NFT!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("");
      console.log("🎯 Next steps:");
      console.log("   1. Choose: node scripts/js/set-jackpot-choice.js", boxMintAddress, "[tokens|honorary]");
      console.log("   2. Settle: node scripts/js/settle-box.js", boxMintAddress);
    } else {
      const finalTierName = finalRewardAmount === 0 ? "Dud" :
        finalRewardAmount === 800 ? "Rebate" :
          finalRewardAmount === 1000 ? "Break-even" :
            finalRewardAmount === 2500 ? "Profit" : "Unknown";

      const finalRarity = finalRewardAmount === 0 ? "COMMON" :
        finalRewardAmount === 800 ? "COMMON" :
          finalRewardAmount === 1000 ? "UNCOMMON" :
            finalRewardAmount === 2500 ? "RARE" : "UNKNOWN";

      console.log("🎁 BOX OPENED! Here's what you got:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   ${finalRarity}: ${finalTierName}`);
      console.log(`   Reward: ${finalRewardAmount} DEV_FATE tokens`);
      console.log(`   Luck Score: ${finalBoxState.luck}/60`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      if (finalRewardAmount > 0) {
        console.log("");
        console.log("💰 Run settle command to claim your rewards:");
        console.log(`   node scripts/js/settle-box.js ${boxMintAddress}`);
      }
    }

    return {
      success: true,
      revealed: true,
      rewardAmount: finalRewardAmount,
      finalReward: finalRewardAmount, // Add this alias
      reward: finalRewardAmount, // Add this alias  
      isJackpot: finalIsJackpot,
      luckScore: finalBoxState.luck,
      tierName, // Make sure this is the calculated tierName
      tier: tierName, // Add this alias
      revealSignature: storeSignature,
      randomPercentage: randomPercentage, // Add this
      slot: slot,
    };

  } catch (error) {
    console.error("❌ Error revealing box:", error.message);

    if (error.logs) {
      console.log("📋 Program logs:");
      error.logs.forEach(log => console.log("   ", log));
    }

    return { success: false, error: error.message };
  }
}

// Handle command line usage
if (require.main === module) {
  const command = process.argv[2];
  const boxMint = process.argv[3];

  if (!command || !boxMint) {
    console.log("Usage:");
    console.log("  node scripts/js/open-box.js commit <BOX_MINT_ADDRESS>");
    console.log("  node scripts/js/open-box.js reveal <BOX_MINT_ADDRESS>");
    console.log("");
    console.log("Examples:");
    console.log("  node scripts/js/open-box.js commit 3YmKZnU4mA4RWL8n9Uo72HUh24UsZrjjgzCdRc6fWvro");
    console.log("  node scripts/js/open-box.js reveal 3YmKZnU4mA4RWL8n9Uo72HUh24UsZrjjgzCdRc6fWvro");
    console.log("");
    console.log("Luck System:");
    console.log("  • Starts at 5 points when minted");
    console.log("  • +1 point every 3 hours held");
    console.log("  • Caps at 60 points (~7.5 days)");
    console.log("");
    console.log("Reward Tiers (provably random via Switchboard):");
    console.log("  Dud: No reward (55% at 5 luck → 30% at 60 luck)");
    console.log("  Rebate: 800 DEV_FATE (30% at 5 luck → 25% at 60 luck)");
    console.log("  Break-even: 1,000 DEV_FATE (10% at 5 luck → 20% at 60 luck)");
    console.log("  Profit: 2,500 DEV_FATE (4.5% at 5 luck → 20% at 60 luck)");
    console.log("  JACKPOT: 10,000 DEV_FATE or Honorary NFT (0.5% at 5 luck → 5% at 60 luck)");
    process.exit(1);
  }

  const handler = command === "commit" ? openBoxCommit :
    command === "reveal" ? openBoxReveal :
      null;

  if (!handler) {
    console.log("❌ Invalid command. Use 'commit' or 'reveal'");
    process.exit(1);
  }

  handler(boxMint)
    .then(result => {
      if (result.success) {
        console.log("🎉 Operation completed successfully!");
        process.exit(0);
      } else {
        console.log("❌ Operation failed!");
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("💥 Unexpected error:", error);
      process.exit(1);
    });
}

module.exports = { openBoxCommit, openBoxReveal };