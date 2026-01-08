// backend/routes/admin.js
// Comprehensive admin API for managing the FateBox dApp

const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/adminAuth')
const { Connection, PublicKey } = require('@solana/web3.js')
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults')
const { createSignerFromKeypair, signerIdentity, publicKey: umiPublicKey, some } = require('@metaplex-foundation/umi')
const { safeFetchCandyGuard, updateCandyGuard, mplCandyMachine, safeFetchCandyMachine } = require('@metaplex-foundation/mpl-candy-machine')
const fs = require('fs')
const path = require('path')

// All admin routes require authentication
router.use(requireAdmin)

// =============================================================================
// STATS ENDPOINTS
// =============================================================================

/**
 * GET /api/admin/stats/overview
 * Get comprehensive dApp statistics
 */
router.get('/stats/overview', async (req, res) => {
    try {
        const connection = new Connection(process.env.RPC_URL, 'confirmed')
        const umi = createUmi(process.env.RPC_URL).use(mplCandyMachine())

        const stats = {
            timestamp: new Date().toISOString(),
            candyMachine: {},
            boxes: {},
            treasury: {},
            vault: {}
        }

        // Fetch candy machine stats
        try {
            const cm = await safeFetchCandyMachine(
                umi,
                umiPublicKey(process.env.CANDY_MACHINE_ID)
            )

            stats.candyMachine = {
                address: process.env.CANDY_MACHINE_ID,
                itemsRedeemed: Number(cm.itemsRedeemed),
                itemsAvailable: Number(cm.data.itemsAvailable),
                remaining: Number(cm.data.itemsAvailable) - Number(cm.itemsRedeemed),
                authority: cm.authority.toString(),
                mintAuthority: cm.mintAuthority.toString()
            }
        } catch (error) {
            stats.candyMachine.error = error.message
        }

        // Fetch treasury balance
        try {
            const treasuryPubkey = new PublicKey(process.env.TREASURY_ADDRESS)
            const balance = await connection.getBalance(treasuryPubkey)
            stats.treasury = {
                address: process.env.TREASURY_ADDRESS,
                solBalance: balance / 1e9,
                solBalanceLamports: balance
            }

            // Fetch token balance
            const tokenAccount = new PublicKey(process.env.TREASURY_TOKEN_ACCOUNT)
            const tokenBalance = await connection.getTokenAccountBalance(tokenAccount)
            stats.treasury.tokenBalance = {
                amount: tokenBalance.value.amount,
                decimals: tokenBalance.value.decimals,
                uiAmount: tokenBalance.value.uiAmount
            }
        } catch (error) {
            stats.treasury.error = error.message
        }

        // Fetch vault balance
        try {
            const vaultPubkey = new PublicKey(process.env.VAULT_ADDRESS)
            const balance = await connection.getBalance(vaultPubkey)
            stats.vault = {
                address: process.env.VAULT_ADDRESS,
                solBalance: balance / 1e9,
                solBalanceLamports: balance
            }

            // Fetch vault token balance
            const tokenAccount = new PublicKey(process.env.VAULT_TOKEN_ACCOUNT)
            const tokenBalance = await connection.getTokenAccountBalance(tokenAccount)
            stats.vault.tokenBalance = {
                amount: tokenBalance.value.amount,
                decimals: tokenBalance.value.decimals,
                uiAmount: tokenBalance.value.uiAmount
            }
        } catch (error) {
            stats.vault.error = error.message
        }

        res.json({ success: true, stats })
    } catch (error) {
        console.error('Stats overview error:', error)
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

/**
 * GET /api/admin/stats/boxes
 * Get detailed box statistics from on-chain data with financial analysis
 */
router.get('/stats/boxes', async (req, res) => {
    try {
        const anchor = require('@coral-xyz/anchor')
        const connection = new Connection(process.env.RPC_URL, 'confirmed')
        const programId = new PublicKey(process.env.RANDOM_GUARD_PROGRAM_ID)

        // Setup anchor program
        const getDeployKeypair = require('../lib/loadKeypair')
        const backendKeypair = getDeployKeypair()

        const provider = new anchor.AnchorProvider(connection, {
            publicKey: backendKeypair.publicKey,
            signTransaction: async (tx) => { tx.partialSign(backendKeypair); return tx },
            signAllTransactions: async (txs) => txs.map(tx => { tx.partialSign(backendKeypair); return tx })
        }, { commitment: 'confirmed' })

        const idlPath = require('path').join(__dirname, '../../target/idl/random_guard.json')
        const idl = JSON.parse(require('fs').readFileSync(idlPath, 'utf8'))
        const program = new anchor.Program(idl, provider)

        // Get all box state accounts
        // BoxState size: 126 bytes + 8 byte Anchor discriminator = 134 bytes
        const accounts = await connection.getProgramAccounts(programId, {
            filters: [
                { dataSize: 134 } // BoxState: 8 (minted_at) + 1 (luck) + 32*3 (pubkeys) + 8 (reward) + 5 (bools) + 8 (random_pct) + 8 (discriminator) = 134
            ]
        })

        console.log(`📊 Analyzing ${accounts.length} box accounts...`)

        const boxStats = {
            total: accounts.length,
            byState: {
                unopened: 0,
                committed: 0,
                revealed: 0,
                settled: 0
            },
            jackpots: {
                total: 0,
                settled: 0,
                pending: 0
            },
            rewards: {
                totalAllocated: 0,
                totalPaidOut: 0,
                pending: 0,
                rebates: 0,
                breakEven: 0,
                profits: 0
            },
            luckDistribution: {
                '0-10': 0,
                '11-20': 0,
                '21-30': 0,
                '31-40': 0,
                '41-50': 0,
                '51-60': 0
            },
            honorary: {
                total: 0,
                minted: 0,
                pending: 0
            }
        }

        // Parse each box state
        for (const account of accounts) {
            try {
                // Manually deserialize BoxState from buffer
                const data = account.account.data
                let offset = 8 // Skip discriminator

                // Read fields according to BoxState struct:
                // pub minted_at: i64,              // 8 bytes
                // pub luck: u8,                    // 1 byte
                // pub owner: Pubkey,               // 32 bytes
                // pub box_mint: Pubkey,            // 32 bytes
                // pub randomness_account: Pubkey,  // 32 bytes
                // pub reward_amount: u64,          // 8 bytes
                // pub is_jackpot: bool,            // 1 byte
                // pub revealed: bool,              // 1 byte
                // pub settled: bool,               // 1 byte
                // pub honorary_choice: bool,       // 1 byte
                // pub honorary_transformed: bool,  // 1 byte
                // pub random_percentage: f64,      // 8 bytes

                const mintedAt = data.readBigInt64LE(offset); offset += 8
                const luck = data.readUInt8(offset); offset += 1
                offset += 32 // skip owner
                offset += 32 // skip box_mint
                offset += 32 // skip randomness_account
                const rewardAmountBN = data.readBigUInt64LE(offset); offset += 8
                const isJackpot = data.readUInt8(offset) !== 0; offset += 1
                const revealed = data.readUInt8(offset) !== 0; offset += 1
                const settled = data.readUInt8(offset) !== 0; offset += 1
                const honoraryChoice = data.readUInt8(offset) !== 0; offset += 1
                const honoraryMinted = data.readUInt8(offset) !== 0; offset += 1

                // Convert to numbers
                const mintedAtNum = Number(mintedAt)
                const rewardAmount = Number(rewardAmountBN)

                // State classification
                if (mintedAtNum === 0) {
                    boxStats.byState.unopened++
                } else if (!revealed) {
                    boxStats.byState.committed++
                } else if (!settled) {
                    boxStats.byState.revealed++
                } else {
                    boxStats.byState.settled++
                }

                // Jackpot tracking
                if (isJackpot) {
                    boxStats.jackpots.total++
                    if (settled) {
                        boxStats.jackpots.settled++
                    } else {
                        boxStats.jackpots.pending++
                    }
                }

                // Reward tracking (in lamports)
                if (revealed) {
                    boxStats.rewards.totalAllocated += rewardAmount

                    if (settled) {
                        boxStats.rewards.totalPaidOut += rewardAmount
                    } else {
                        boxStats.rewards.pending += rewardAmount
                    }
                }

                // Luck distribution
                const luckRange = Math.floor(luck / 10) * 10
                const bucketKey = `${luckRange}-${luckRange + 10}`
                if (boxStats.luckDistribution[bucketKey] !== undefined) {
                    boxStats.luckDistribution[bucketKey]++
                }

                // Honorary tracking
                if (honoraryChoice !== null && honoraryChoice !== 0) {
                    boxStats.honorary.total++
                    if (honoraryMinted) {
                        boxStats.honorary.minted++
                    } else {
                        boxStats.honorary.pending++
                    }
                }

            } catch (parseError) {
                // Skip accounts that can't be parsed as BoxState
                console.log('Skipping non-BoxState account')
            }
        }

        // Calculate financial metrics
        const MINT_PRICE = parseInt(process.env.MINT_PRICE_LAMPORTS || '1000000000000')
        const totalRevenue = boxStats.byState.settled * MINT_PRICE

        boxStats.rewards.rebates = boxStats.rewards.totalPaidOut
        boxStats.rewards.breakEven = totalRevenue === boxStats.rewards.rebates
        boxStats.rewards.profits = totalRevenue - boxStats.rewards.rebates

        // Convert lamports to token amounts for readability
        const decimals = parseInt(process.env.TOKEN_DECIMALS || '9')
        boxStats.rewards.totalAllocatedTokens = boxStats.rewards.totalAllocated / (10 ** decimals)
        boxStats.rewards.totalPaidOutTokens = boxStats.rewards.totalPaidOut / (10 ** decimals)
        boxStats.rewards.pendingTokens = boxStats.rewards.pending / (10 ** decimals)
        boxStats.rewards.profitsTokens = boxStats.rewards.profits / (10 ** decimals)

        res.json({ success: true, boxStats })
    } catch (error) {
        console.error('Box stats error:', error)
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
    }
})

// =============================================================================
// CANDY MACHINE CONFIGURATION
// =============================================================================

/**
 * POST /api/admin/candy-machine/update-supply
 * Update the candy machine itemsAvailable (total supply)
 *
 * Body:
 * - itemsAvailable: New total supply (must be >= current itemsRedeemed)
 */
router.post('/candy-machine/update-supply', async (req, res) => {
    try {
        const { itemsAvailable } = req.body

        if (!itemsAvailable || itemsAvailable < 1) {
            return res.status(400).json({
                success: false,
                error: 'Invalid itemsAvailable. Must be a positive number.'
            })
        }

        const umi = createUmi(process.env.RPC_URL).use(mplCandyMachine())

        // Load deploy wallet - check env var first, then file
        let walletData
        if (process.env.DEPLOY_WALLET_JSON) {
            // Use JSON array from environment variable (for Render deployment)
            walletData = JSON.parse(process.env.DEPLOY_WALLET_JSON)
        } else {
            // Use file path (for local development)
            const deployWalletEnv = process.env.DEPLOY_WALLET || 'deploy-wallet.json'
            const walletPath = deployWalletEnv.startsWith('/')
                ? deployWalletEnv
                : require('path').join(__dirname, '../..', deployWalletEnv)

            if (!require('fs').existsSync(walletPath)) {
                return res.status(500).json({
                    success: false,
                    error: `Deploy wallet not found at: ${walletPath}`,
                    note: 'Set DEPLOY_WALLET_JSON or DEPLOY_WALLET environment variable'
                })
            }

            walletData = JSON.parse(require('fs').readFileSync(walletPath, 'utf-8'))
        }
        const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletData))
        const signer = createSignerFromKeypair(umi, keypair)
        umi.use(signerIdentity(signer))

        // Fetch current candy machine
        const candyMachineId = umiPublicKey(process.env.CANDY_MACHINE_ID)
        const currentCM = await safeFetchCandyMachine(umi, candyMachineId)

        if (!currentCM) {
            return res.status(404).json({
                success: false,
                error: 'Candy machine not found'
            })
        }

        const currentRedeemed = Number(currentCM.itemsRedeemed)
        const currentAvailable = Number(currentCM.data.itemsAvailable)

        // Validate new supply
        if (itemsAvailable < currentRedeemed) {
            return res.status(400).json({
                success: false,
                error: `Cannot set itemsAvailable (${itemsAvailable}) below current itemsRedeemed (${currentRedeemed})`
            })
        }

        // Update candy machine with new itemsAvailable
        const { updateCandyMachine } = require('@metaplex-foundation/mpl-candy-machine')

        await updateCandyMachine(umi, {
            candyMachine: candyMachineId,
            data: {
                ...currentCM.data,
                itemsAvailable: BigInt(itemsAvailable)
            }
        }).sendAndConfirm(umi)

        res.json({
            success: true,
            message: 'Candy machine supply updated successfully',
            update: {
                previousSupply: currentAvailable,
                newSupply: itemsAvailable,
                currentMinted: currentRedeemed,
                newRemaining: itemsAvailable - currentRedeemed
            },
            note: 'Supply updated on-chain. Refresh the admin dashboard to see changes.'
        })

    } catch (error) {
        console.error('Update supply error:', error)
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
    }
})

// =============================================================================
// CANDY GUARD CONFIGURATION
// =============================================================================

/**
 * GET /api/admin/candy-guard/current
 * Get current candy guard configuration
 */
router.get('/candy-guard/current', async (req, res) => {
    try {
        const umi = createUmi(process.env.RPC_URL).use(mplCandyMachine())
        const guard = await safeFetchCandyGuard(
            umi,
            umiPublicKey(process.env.CANDY_GUARD_ID)
        )

        const tokenPaymentOption = guard?.guards?.tokenPayment
        const tokenPayment = tokenPaymentOption?.__option === 'Some' ? tokenPaymentOption.value : null

        res.json({
            success: true,
            guard: {
                address: process.env.CANDY_GUARD_ID,
                base: guard.base.toString(),
                tokenPayment: tokenPayment ? {
                    mint: tokenPayment.mint.toString(),
                    destinationAta: tokenPayment.destinationAta.toString(),
                    amount: tokenPayment.amount.toString()
                } : null
            }
        })
    } catch (error) {
        console.error('Fetch candy guard error:', error)
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

/**
 * POST /api/admin/candy-guard/update-token
 * Update the payment token for candy guard
 *
 * Body:
 * - tokenMint: The SPL token mint address
 * - treasuryTokenAccount: The ATA to receive payments
 * - priceInTokens: Price in token units (will be converted to lamports based on decimals)
 * - decimals: Token decimals (default: 9)
 */
router.post('/candy-guard/update-token', async (req, res) => {
    try {
        const { tokenMint, treasuryTokenAccount, priceInTokens, decimals = 9 } = req.body

        if (!tokenMint || !treasuryTokenAccount || !priceInTokens) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['tokenMint', 'treasuryTokenAccount', 'priceInTokens']
            })
        }

        // Calculate lamports
        const priceInLamports = BigInt(priceInTokens) * BigInt(10 ** decimals)

        // Initialize UMI with admin wallet
        const umi = createUmi(process.env.RPC_URL).use(mplCandyMachine())

        // Load deploy wallet - check env var first, then file
        let walletData
        if (process.env.DEPLOY_WALLET_JSON) {
            // Use JSON array from environment variable (for Render deployment)
            walletData = JSON.parse(process.env.DEPLOY_WALLET_JSON)
        } else {
            // Use file path (for local development)
            const deployWalletEnv = process.env.DEPLOY_WALLET || 'deploy-wallet.json'
            const walletPath = deployWalletEnv.startsWith('/')
                ? deployWalletEnv
                : path.join(__dirname, '../..', deployWalletEnv)

            if (!fs.existsSync(walletPath)) {
                return res.status(500).json({
                    success: false,
                    error: `Deploy wallet not found at: ${walletPath}`,
                    note: 'Set DEPLOY_WALLET_JSON or DEPLOY_WALLET environment variable'
                })
            }

            walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
        }
        const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletData))
        const signer = createSignerFromKeypair(umi, keypair)
        umi.use(signerIdentity(signer))

        // Fetch current guard
        const currentGuard = await safeFetchCandyGuard(
            umi,
            umiPublicKey(process.env.CANDY_GUARD_ID)
        )

        // Update guard with new tokenPayment
        await updateCandyGuard(umi, {
            candyGuard: umiPublicKey(process.env.CANDY_GUARD_ID),
            guards: {
                ...currentGuard.guards,
                tokenPayment: some({
                    amount: priceInLamports,
                    mint: umiPublicKey(tokenMint),
                    destinationAta: umiPublicKey(treasuryTokenAccount),
                }),
            },
            groups: currentGuard.groups,
        }).sendAndConfirm(umi)

        // Generate environment variable updates
        const envUpdates = {
            backend: {
                CURRENT_TOKEN_MINT: tokenMint,
                DEV_FATE_MINT: tokenMint,
                TREASURY_TOKEN_ACCOUNT: treasuryTokenAccount,
                MINT_PRICE_TOKENS: priceInTokens.toString(),
                MINT_PRICE_LAMPORTS: priceInLamports.toString(),
                LAST_TOKEN_UPDATE: new Date().toISOString()
            },
            frontend_vercel: {
                NEXT_PUBLIC_TOKEN_MINT: tokenMint,
                NEXT_PUBLIC_DEV_FATE_MINT: tokenMint,
                NEXT_PUBLIC_TREASURY_TOKEN_ACCOUNT: treasuryTokenAccount,
                NEXT_PUBLIC_MINT_PRICE_TOKENS: priceInTokens.toString()
            }
        }

        res.json({
            success: true,
            message: 'Candy guard updated successfully',
            transaction: 'Confirmed on-chain',
            config: {
                tokenMint,
                treasuryTokenAccount,
                priceInTokens,
                priceInLamports: priceInLamports.toString(),
                decimals
            },
            envUpdates,
            instructions: {
                backend: 'Update these variables in Render.com environment settings',
                frontend: 'Update these variables in Vercel environment settings',
                note: 'Redeploy both services after updating environment variables'
            }
        })
    } catch (error) {
        console.error('Update candy guard error:', error)
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
})

// =============================================================================
// SYSTEM CONFIGURATION
// =============================================================================

/**
 * GET /api/admin/config
 * Get current system configuration
 */
router.get('/config', (req, res) => {
    res.json({
        success: true,
        config: {
            network: process.env.SOLANA_NETWORK,
            rpcUrl: process.env.RPC_URL?.replace(/api-key=[^&]+/, 'api-key=***'),
            candyMachine: process.env.CANDY_MACHINE_ID,
            candyGuard: process.env.CANDY_GUARD_ID,
            randomGuardProgram: process.env.RANDOM_GUARD_PROGRAM_ID,
            treasury: process.env.TREASURY_ADDRESS,
            vault: process.env.VAULT_ADDRESS,
            currentToken: process.env.CURRENT_TOKEN_MINT,
            treasuryTokenAccount: process.env.TREASURY_TOKEN_ACCOUNT,
            vaultTokenAccount: process.env.VAULT_TOKEN_ACCOUNT,
            mintPrice: {
                tokens: process.env.MINT_PRICE_TOKENS,
                lamports: process.env.MINT_PRICE_LAMPORTS
            }
        }
    })
})

module.exports = router
