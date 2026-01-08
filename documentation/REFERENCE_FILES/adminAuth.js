// backend/middleware/adminAuth.js
// Middleware to verify admin wallet signature for authentication

const nacl = require('tweetnacl')
const bs58 = require('bs58')

// Admin wallet public key - deploy wallet has authority over candy guard
// Deploy wallet: C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF
// Treasury wallet: HSTAySYGfw5rmsxaBeaSznWHCpakEdkvSJNQgq5UZUWJ (receives payments)
// Vault wallet: 7ca56xjKTN3B9767hhUgBDABTFx4kX1fv5fMhNBG7iks (holds rewards)
const ADMIN_WALLET = process.env.ADMIN_WALLET || 'C9t218MuHcsKPFMZQLvVdnPMRP5AYGRAYc8oLhshH3aF'

/**
 * Middleware to verify admin authentication via wallet signature
 *
 * Client must send:
 * - wallet: The wallet public key (base58)
 * - message: The message that was signed (timestamp for replay protection)
 * - signature: The signature of the message (base58)
 */
function requireAdmin(req, res, next) {
    try {
        const { wallet, message, signature } = req.headers

        if (!wallet || !message || !signature) {
            return res.status(401).json({
                error: 'Missing authentication headers',
                required: ['wallet', 'message', 'signature']
            })
        }

        // Verify wallet is admin
        if (wallet !== ADMIN_WALLET) {
            return res.status(403).json({
                error: 'Unauthorized wallet',
                message: 'Only admin wallet can access this endpoint'
            })
        }

        // Verify signature
        try {
            const messageBytes = new TextEncoder().encode(message)
            const signatureBytes = bs58.decode(signature)
            const publicKeyBytes = bs58.decode(wallet)

            const verified = nacl.sign.detached.verify(
                messageBytes,
                signatureBytes,
                publicKeyBytes
            )

            if (!verified) {
                return res.status(401).json({
                    error: 'Invalid signature'
                })
            }
        } catch (err) {
            return res.status(401).json({
                error: 'Signature verification failed',
                details: err.message
            })
        }

        // Check message timestamp to prevent replay attacks (5 minute window)
        try {
            const timestamp = parseInt(message.match(/\d+/)[0])
            const now = Date.now()
            const fiveMinutes = 5 * 60 * 1000

            if (Math.abs(now - timestamp) > fiveMinutes) {
                return res.status(401).json({
                    error: 'Authentication expired',
                    message: 'Please sign a new message'
                })
            }
        } catch (err) {
            return res.status(401).json({
                error: 'Invalid message format',
                message: 'Message must contain timestamp'
            })
        }

        // Authentication successful
        req.adminWallet = wallet
        next()
    } catch (error) {
        console.error('Admin auth error:', error)
        res.status(500).json({
            error: 'Authentication error',
            details: error.message
        })
    }
}

module.exports = { requireAdmin, ADMIN_WALLET }
