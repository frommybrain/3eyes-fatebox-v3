# Reference Files for New Platform Development

This folder contains working code from the FateBox v2 project that can be referenced when building the new 3Eyes platform. While the new platform has significant architectural changes (no NFTs, multi-tenant, etc.), these files contain proven patterns for Solana/Anchor development.

---

## File Index

### Core Rust Program
- **`lib.rs`** - Complete random_guard program
  - **Use for**: Anchor program structure, PDA derivations, Switchboard VRF integration
  - **Key sections**:
    - BoxState account structure (lines 321-337)
    - commit_box instruction (opens box, starts luck accumulation)
    - reveal_box instruction (requests Switchboard randomness)
    - settle_box instruction (distributes rewards from vault)
    - PDA seed patterns and bump validation
    - Checked arithmetic operations
    - Error handling patterns

### Backend Routes (Express.js)
- **`admin.js`** - Admin dashboard API
  - **Use for**:
    - Wallet signature authentication
    - Program account fetching and parsing
    - Manual buffer deserialization (lines 115-273)
    - Stats calculation patterns
    - Candy guard updates via UMI (will be replaced but shows pattern)

- **`batch-box-status.js`** - Batch box lookup with rate limiting
  - **Use for**:
    - Rate limiting patterns (chunk processing)
    - Caching mechanisms
    - Efficient RPC calls
    - Error handling for missing accounts

- **`commit.js`** - Box opening/commitment endpoint
  - **Use for**:
    - Anchor instruction building from backend
    - Transaction serialization
    - Error handling
    - Response formatting

- **`reveal.js`** - Box reveal with Switchboard
  - **Use for**:
    - Switchboard VRF integration
    - Account validation
    - Multi-step transaction logic

- **`settle-instruction.js`** - Reward distribution
  - **Use for**:
    - Vault withdrawal patterns
    - PDA signer usage (vault authority)
    - Token transfer logic

### Scripts (Node.js)
- **`open-box.js`** - CLI script to open boxes
  - **Use for**:
    - Complete box creation flow
    - Keypair loading
    - Anchor program interaction
    - Transaction confirmation

- **`settle-box.js`** - CLI script to settle boxes
  - **Use for**:
    - Vault withdrawal implementation
    - Error handling for settled boxes
    - Account fetching patterns

- **`debug-switchboard.js`** - Switchboard debugging
  - **Use for**:
    - Switchboard VRF account inspection
    - Randomness result parsing
    - Troubleshooting VRF issues

### Utilities
- **`loadKeypair.js`** - Keypair loading utility
  - **Use for**:
    - Loading keypairs from JSON files
    - Environment variable handling
    - Keypair to Anchor Wallet conversion

- **`adminAuth.js`** - Wallet signature authentication middleware
  - **Use for**:
    - Signature verification with tweetnacl
    - Replay attack prevention (timestamp validation)
    - Admin authorization patterns

### Configuration Files
- **`config.json`** - Candy Machine configuration
  - **Use for**: Understanding old NFT config (NOT used in new platform)
  - Shows hiddenSettings structure (we're moving away from this)

- **`Anchor.toml`** - Anchor workspace configuration
  - **Use for**:
    - Cluster configuration
    - Program ID management
    - Build settings

---

## What to Use from Each File

### From `lib.rs` (Rust Program)

#### ✅ KEEP THESE PATTERNS:
```rust
// 1. PDA Derivation Pattern
let (box_state_pda, bump) = Pubkey::find_program_address(
    &[b"box_state", box_mint.as_ref()],
    ctx.program_id
);

// 2. Checked Arithmetic
let new_total = project.total_revenue
    .checked_add(box_price)
    .ok_or(ErrorCode::ArithmeticOverflow)?;

// 3. Constraint Validation
#[account(
    mut,
    constraint = box_state.owner == user.key() @ ErrorCode::NotOwner
)]

// 4. Switchboard VRF Integration
let randomness_account_data = randomness_account_info.try_borrow_data()?;
let randomness = RandomnessAccountData::parse(randomness_account_data)?;

// 5. Vault Transfer with PDA Signer
let cpi_accounts = Transfer {
    from: ctx.accounts.vault_token_account.to_account_info(),
    to: ctx.accounts.user_token_account.to_account_info(),
    authority: ctx.accounts.vault_authority.to_account_info(),
};
let seeds = &[
    b"vault",
    &project_id.to_le_bytes(),
    &[vault_bump]
];
let signer = &[&seeds[..]];
token::transfer(
    CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer
    ),
    amount
)?;
```

#### ❌ DON'T KEEP:
- Candy machine mint verification logic (we're not using NFTs)
- Box mint public key references (we use box_id instead)
- Honorary NFT minting logic (out of scope for MVP)

---

### From `admin.js` (Backend)

#### ✅ KEEP THESE PATTERNS:
```javascript
// 1. Manual Buffer Deserialization (when Anchor decoder fails)
const data = account.account.data;
let offset = 8; // Skip discriminator
const mintedAt = data.readBigInt64LE(offset); offset += 8;
const luck = data.readUInt8(offset); offset += 1;
// ... etc

// 2. getProgramAccounts with Filters
const accounts = await connection.getProgramAccounts(programId, {
    filters: [
        { dataSize: 134 } // Exact size filter
    ]
});

// 3. Wallet Keypair Loading (Environment Variable + File Fallback)
let walletData;
if (process.env.DEPLOY_WALLET_JSON) {
    walletData = JSON.parse(process.env.DEPLOY_WALLET_JSON);
} else {
    const walletPath = path.join(__dirname, process.env.DEPLOY_WALLET);
    walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
}

// 4. Stats Calculation
const totalRevenue = boxes.reduce((sum, box) => sum + box.boxPrice, 0);
const totalPaidOut = boxes
    .filter(b => b.settled)
    .reduce((sum, box) => sum + box.rewardAmount, 0);
const netProfitLoss = totalRevenue - totalPaidOut;
```

#### ❌ DON'T KEEP:
- Candy guard update endpoints (no candy machine in new platform)
- NFT-specific metadata handling

---

### From `batch-box-status.js`

#### ✅ KEEP THESE PATTERNS:
```javascript
// 1. Rate Limiting with Chunks
const CHUNK_SIZE = 5;
const CHUNK_DELAY = 200; // ms

for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
    }

    await Promise.all(chunk.map(async (item) => {
        // Process item
    }));
}

// 2. Simple Caching
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.value;
    }
    return null;
}

// 3. Cache Cleanup
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            cache.delete(key);
        }
    }
}, CACHE_TTL);
```

---

### From `adminAuth.js`

#### ✅ KEEP THESE PATTERNS:
```javascript
// Wallet Signature Verification
const nacl = require('tweetnacl');
const bs58 = require('bs58');

function verifyWalletSignature(wallet, message, signature) {
    try {
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);
        const publicKeyBytes = bs58.decode(wallet);

        return nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKeyBytes
        );
    } catch (error) {
        return false;
    }
}

// Timestamp Validation (Replay Attack Prevention)
function validateTimestamp(message, windowMs = 5 * 60 * 1000) {
    const timestamp = parseInt(message.match(/\d+/)[0]);
    const now = Date.now();
    return Math.abs(now - timestamp) < windowMs;
}
```

---

## Key Concepts to Understand

### 1. Anchor Program Structure
- Programs have instructions (functions) that modify accounts
- Accounts are validated using `#[account(...)]` macros
- PDAs are derived deterministically from seeds
- Cross-Program Invocations (CPI) allow calling other programs

### 2. PDA (Program Derived Address)
- Derived from seeds + program ID
- Has no private key (program controls it)
- Used for escrow accounts (vaults)
- Bump seed ensures address is off the Ed25519 curve

### 3. Token Accounts
- SPL tokens require Associated Token Accounts (ATAs)
- ATA address is derived from: owner + mint + token program
- Transfers require token program CPI

### 4. Switchboard VRF (Verifiable Random Function)
- Provides cryptographically secure randomness
- Request → Wait for callback → Read result
- Randomness account stores the random value
- Must wait for oracle to fulfill request

### 5. Anchor Client (JavaScript/TypeScript)
- Anchor generates TypeScript client from IDL
- Methods match Rust instruction names
- Accounts object maps to Rust context
- Automatically handles serialization

---

## What NOT to Copy

### ❌ Candy Machine Logic
The new platform does NOT use Metaplex Candy Machines. Ignore all:
- Candy machine creation/updates
- Guard configuration
- NFT minting via candy machine
- Metadata uploads

### ❌ NFT-Specific Code
We're not minting NFTs anymore. Ignore:
- `box_mint` public keys
- NFT metadata verification
- Collection verification
- Metaplex MPL imports

### ❌ Honorary NFT System
Out of scope for MVP. Ignore:
- Honorary choice/transformation
- Honorary minting
- Honorary candy machine

---

## Migration Notes

### Old Architecture → New Architecture

**Old (FateBox v2)**:
```
User buys NFT from Candy Machine
  ↓
NFT stored in wallet
  ↓
Backend commits box (creates BoxState PDA linked to NFT mint)
  ↓
User reveals box
  ↓
User settles box (gets reward from vault)
```

**New (3Eyes Platform)**:
```
User calls create_box instruction
  ↓
BoxInstance PDA created (no NFT)
  ↓
User reveals box (same Switchboard VRF logic)
  ↓
User settles box (same vault withdrawal logic)
```

**Key Difference**: Box is a PDA, not an NFT. Box identity is `(project_id, box_id)` instead of `nft_mint_address`.

---

## Dependencies to Keep

### Rust (Cargo.toml)
```toml
[dependencies]
anchor-lang = "0.31.0"
anchor-spl = "0.31.0"
switchboard-solana = "0.30.0"  # For VRF
```

### JavaScript (package.json)
```json
{
  "@coral-xyz/anchor": "^0.31.1",
  "@solana/web3.js": "^1.98.2",
  "bs58": "^4.0.1",
  "tweetnacl": "^1.0.3"
}
```

### Remove These (NFT-related)
```json
{
  "@metaplex-foundation/mpl-candy-machine": "REMOVE",
  "@metaplex-foundation/umi": "REMOVE",
  "@metaplex-foundation/umi-bundle-defaults": "REMOVE"
}
```

---

## Common Pitfalls (Lessons Learned)

### 1. Buffer Deserialization
**Problem**: Anchor's `program.coder.accounts.decode()` sometimes fails
**Solution**: Manually read bytes using `data.readBigInt64LE()`, `data.readUInt8()`, etc.
**Reference**: `admin.js` lines 115-273

### 2. DataSize Filters
**Problem**: Wrong dataSize filter returns no accounts
**Solution**: Calculate exact size: discriminator (8) + account struct size
**Example**: BoxState = 8 + 126 = 134 bytes

### 3. Keypair Loading in Production
**Problem**: File paths break on deployed servers
**Solution**: Support both file paths (local) and JSON env vars (production)
**Reference**: `admin.js` wallet loading logic

### 4. Switchboard Timing
**Problem**: Calling reveal then settle immediately fails (randomness not ready)
**Solution**: Add 2-5 second delay OR check if randomness account has result
**Reference**: `debug-switchboard.js`

### 5. PDA Signer Seeds
**Problem**: Vault transfers fail with "signature verification failed"
**Solution**: Use `CpiContext::new_with_signer()` with correct seeds and bump
**Reference**: `lib.rs` settle_box instruction

---

## Testing Patterns

### Unit Tests (Rust)
See `tests/random_guard.ts` (not in reference files but in main project)

### Integration Tests (JavaScript)
```javascript
// Pattern: Setup → Execute → Verify

// Setup
const projectId = 1;
const [projectPda] = PublicKey.findProgramAddressSync([...], programId);

// Execute
const tx = await program.methods
    .createBox(new BN(projectId))
    .accounts({ ... })
    .rpc();

// Verify
const boxAccount = await program.account.boxInstance.fetch(boxPda);
assert.equal(boxAccount.luck, 5);
```

---

## Quick Reference: Account Sizes

```
BoxState (old):       126 bytes + 8 discriminator = 134 bytes
BoxInstance (new):    111 bytes + 8 discriminator = 119 bytes
ProjectConfig (new):  155 bytes + 8 discriminator = 163 bytes
```

Always add 8 bytes for Anchor's account discriminator when using dataSize filters.

---

## Questions for New Developers

If you're unsure about something, check these files:

1. **"How do I integrate Switchboard VRF?"**
   → See `lib.rs` reveal_box instruction and `debug-switchboard.js`

2. **"How do I verify wallet signatures?"**
   → See `adminAuth.js`

3. **"How do I withdraw from a PDA-controlled vault?"**
   → See `lib.rs` settle_box instruction and `settle-instruction.js`

4. **"How do I parse Solana account data?"**
   → See `admin.js` manual deserialization (lines 115-273)

5. **"How do I handle rate limiting for RPC calls?"**
   → See `batch-box-status.js` chunking pattern

6. **"How do I load keypairs in production?"**
   → See `loadKeypair.js` and `admin.js` wallet loading

---

## Additional Resources

- **Anchor Documentation**: https://www.anchor-lang.com/
- **Solana Cookbook**: https://solanacookbook.com/
- **Switchboard Docs**: https://docs.switchboard.xyz/
- **SPL Token Program**: https://spl.solana.com/token

---

## Notes

- All code in this folder is from the working FateBox v2 project
- Use as reference, but adapt to new architecture (no NFTs, multi-tenant)
- Focus on Solana/Anchor patterns, not specific business logic
- When in doubt, test on devnet first

---

**Last Updated**: 2026-01-07
**Project**: FateBox v2 → 3Eyes Platform Migration
