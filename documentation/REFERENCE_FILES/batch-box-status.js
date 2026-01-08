// backend/routes/batch-box-status.js - Rate-limited version
const express = require('express');
const router = express.Router();
const anchor = require("@coral-xyz/anchor");
const { PublicKey, Connection } = require('@solana/web3.js');
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// Rate limiting
const CHUNK_SIZE = 5; // Reduced from 10
const CHUNK_DELAY = 200; // 200ms between chunks
const MAX_BOXES_PER_REQUEST = 50; // Limit total boxes per request

// Simple cache for mint times (to avoid repeated signature lookups)
const mintTimeCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

router.post('/', async (req, res) => {
    try {
        const { boxMintAddresses } = req.body;
        
        if (!boxMintAddresses || !Array.isArray(boxMintAddresses)) {
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid boxMintAddresses array'
            });
        }

        // Limit the number of boxes per request
        if (boxMintAddresses.length > MAX_BOXES_PER_REQUEST) {
            return res.status(400).json({
                success: false,
                error: `Too many boxes requested. Maximum ${MAX_BOXES_PER_REQUEST} per request.`
            });
        }
        
        console.log(`📦 Checking status for ${boxMintAddresses.length} boxes`);
        
        // Setup connection with lower commitment for better performance
        const connection = new Connection(
            process.env.RPC_URL || "https://api.devnet.solana.com",
            "processed" // Changed from "confirmed" for faster responses
        );
        
        // Load backend keypair
        const getDeployKeypair = require('../lib/loadKeypair');
        const backendKeypair = getDeployKeypair();
        
        const provider = new anchor.AnchorProvider(connection, {
            publicKey: backendKeypair.publicKey,
            signTransaction: async (tx) => { tx.partialSign(backendKeypair); return tx; },
            signAllTransactions: async (txs) => txs.map(tx => { tx.partialSign(backendKeypair); return tx; })
        }, { commitment: "processed" });
        
        // Load program
        const programId = new PublicKey(process.env.RANDOM_GUARD_PROGRAM_ID);
        const idlPath = path.join(__dirname, "../../target/idl/random_guard.json");
        const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
        const { Program } = anchor;
        const program = new Program(idl, provider);
        
        // Process all boxes with rate limiting
        const results = {};
        const errors = {};
        
        // Process in small chunks with delays
        for (let i = 0; i < boxMintAddresses.length; i += CHUNK_SIZE) {
            const chunk = boxMintAddresses.slice(i, i + CHUNK_SIZE);
            
            // Add delay between chunks (except for first chunk)
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
            }
            
            // Process chunk with limited concurrency
            await Promise.all(chunk.map(async (mintAddress) => {
                try {
                    const boxMint = new PublicKey(mintAddress);
                    const [boxStatePda] = await PublicKey.findProgramAddress(
                        [Buffer.from("box_state"), boxMint.toBuffer()],
                        programId
                    );
                    
                    let boxState = null;
                    let exists = false;
                    let mintedAtMs = 0;
                    
                    try {
                        boxState = await program.account.boxState.fetch(boxStatePda);
                        exists = true;
                        mintedAtMs = boxState.mintedAt?.toNumber?.() || 0;
                    } catch (e) {
                        // Box doesn't exist on-chain yet
                    }
                    
                    // Default luck and hold time
                    let currentLuckScore = 5;
                    let holdTimeSeconds = 0;
                    
                    const isUnopened = !exists || mintedAtMs === 0;
                    
                    if (isUnopened) {
                        try {
                            const mintTime = await getNFTMintTimeOptimized(connection, boxMint);
                            const currentTime = Date.now();
                            holdTimeSeconds = Math.floor((currentTime - mintTime) / 1000);
                            
                            // TESTING MODE: +1 every 3 seconds (was 3 hours)
                            const baseScore = 5;
                            const secondsHeld = holdTimeSeconds;
                            const bonus = Math.floor(secondsHeld / 3);
                            currentLuckScore = Math.min(baseScore + bonus, 60);
                        } catch (e) {
                            console.log("⚠️ Could not calculate mint time:", e.message);
                        }
                    }
                    
                    results[mintAddress] = {
                        exists,
                        boxState: boxState ? {
                            mintedAt: boxState.mintedAt?.toNumber?.() || 0,
                            rewardAmount: boxState.rewardAmount?.toNumber?.() || 0,
                            luck: boxState.luck,
                            isJackpot: boxState.isJackpot,
                            settled: boxState.settled,
                            revealed: boxState.revealed,
                            honoraryChoice: boxState.honoraryChoice,
                            honoraryTransformed: boxState.honoraryTransformed,
                            randomPercentage: boxState.randomPercentage || null,
                            randomnessAccount: boxState.randomnessAccount?.toString() || null,
                        } : null,
                        currentLuckScore,
                        holdTimeSeconds,
                        phase: getBoxPhase(boxState),
                    };
                } catch (error) {
                    console.error(`Error checking box ${mintAddress}:`, error.message);
                    errors[mintAddress] = error.message;
                    results[mintAddress] = {
                        exists: false,
                        boxState: null,
                        currentLuckScore: 5,
                        holdTimeSeconds: 0,
                        phase: 'unopened',
                        error: error.message
                    };
                }
            }));
        }
        
        console.log(`✅ Checked ${Object.keys(results).length} boxes, ${Object.keys(errors).length} errors`);
        
        return res.json({
            success: true,
            results,
            errors: Object.keys(errors).length > 0 ? errors : undefined
        });
        
    } catch (error) {
        console.error('Error in batch box status:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

function getBoxPhase(boxState) {
    if (!boxState) return 'unopened';
    
    const { mintedAt, revealed, settled } = {
        mintedAt: boxState.mintedAt?.toNumber?.() || 0,
        revealed: boxState.revealed,
        settled: boxState.settled
    };
    
    if (mintedAt === 0) return 'unopened';
    if (!revealed) return 'committed';
    if (!settled) return 'revealed';
    return 'settled';
}

// Optimized mint time function with caching and limits
async function getNFTMintTimeOptimized(connection, mintAddress) {
    const mintKey = mintAddress.toString();
    
    // Check cache first
    const cached = mintTimeCache.get(mintKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.mintTime;
    }
    
    try {
        // Reduced limit to minimize RPC calls
        const signatures = await connection.getSignaturesForAddress(mintAddress, { 
            limit: 10 // Reduced from 50
        });
        
        if (!signatures.length) {
            const fallbackTime = Date.now();
            mintTimeCache.set(mintKey, { mintTime: fallbackTime, timestamp: Date.now() });
            return fallbackTime;
        }
        
        const oldestSig = signatures[signatures.length - 1];
        
        // Add timeout to transaction fetch
        const txnPromise = connection.getTransaction(oldestSig.signature);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction fetch timeout')), 3000)
        );
        
        const txn = await Promise.race([txnPromise, timeoutPromise]);
        
        let mintTime;
        if (txn?.blockTime) {
            mintTime = txn.blockTime * 1000;
        } else {
            // Fallback with some randomness
            mintTime = Date.now() - Math.random() * 5 * 60 * 1000;
        }
        
        // Cache the result
        mintTimeCache.set(mintKey, { mintTime, timestamp: Date.now() });
        return mintTime;
        
    } catch (e) {
        const fallbackTime = Date.now() - Math.random() * 5 * 60 * 1000;
        mintTimeCache.set(mintKey, { mintTime: fallbackTime, timestamp: Date.now() });
        return fallbackTime;
    }
}

// Clean up old cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of mintTimeCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            mintTimeCache.delete(key);
        }
    }
}, CACHE_TTL);

module.exports = router;