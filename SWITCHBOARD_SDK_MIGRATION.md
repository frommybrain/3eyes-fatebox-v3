# Switchboard VRF: Migrate to Official SDK Parsing

## Overview

Migrate from manual byte-offset reading of Switchboard randomness to the official SDK parsing approach using `RandomnessAccountData::parse()` and `get_value()`. This ensures compatibility with future Switchboard updates and uses the recommended approach.

---

## ⚠️ CRITICAL: Git Safety Strategy

**YOUR LOCAL WORK WILL NOT BE LOST.** Here's the exact order of operations:

### Why this is safe:
1. **FIRST action**: We commit your local changes to a new branch - this saves everything locally BEFORE any remote operations
2. `git fetch origin` is READ-ONLY - it only downloads remote refs to `.git/`, it does NOT touch your working files
3. We only use `git push` (sends data TO remote) - never `git pull` (which could overwrite local)
4. We never run `git merge`, `git rebase`, or `git reset --hard`

---

## Phase 1: Git Branching Strategy (Safe Rollback)

### Step 1.1: FIRST - Save your local work (THIS HAPPENS BEFORE ANYTHING ELSE)
```bash
# Create a new branch from your current local state
git checkout -b switchboard-offsets

# Stage ALL your local changes
git add -A

# Commit everything - this saves your work in git history
git commit -m "Current implementation with manual byte-offset Switchboard parsing"

# Push YOUR local work to remote (this SENDS data, does not receive)
git push -u origin switchboard-offsets
```

✅ **After this step**: Your local work is safely saved in both:
- Local git history (the commit)
- Remote GitHub (the push)

### Step 1.2: Create `stable` branch from remote main (SAFE - remote operation only)
```bash
# This only downloads remote refs - does NOT modify your working directory
git fetch origin

# This creates a branch ON THE REMOTE from remote main - does not touch local files
git push origin origin/main:refs/heads/stable
```

✅ **After this step**: GitHub now has a `stable` branch preserving the original main.

### Step 1.3: Create feature branch for SDK implementation
```bash
# Create new branch from your current local state (switchboard-offsets)
git checkout -b feature/switchboard-sdk-parsing
```

---

## Phase 2: Rust Implementation Changes

### File: `backend/program/programs/lootbox_platform/Cargo.toml`

**Current (commented out):**
```toml
# Temporarily remove Switchboard to fix build - will add back when implementing VRF
# switchboard-solana = "0.30.0"
```

**Change to:**
```toml
switchboard-on-demand = "0.11"
```

### File: `backend/program/programs/lootbox_platform/src/lib.rs`

**Add import at top:**
```rust
use switchboard_on_demand::accounts::RandomnessAccountData;
```

**Current manual byte reading (lines ~445-458):**
```rust
let randomness_data = ctx.accounts.randomness_account.data.borrow();

// Verify account has enough data
if randomness_data.len() < 184 {
    return Err(LootboxError::RandomnessNotReady.into());
}

// Check reveal_slot at offset 144-152
let reveal_slot = u64::from_le_bytes([
    randomness_data[144], randomness_data[145],
    randomness_data[146], randomness_data[147],
    randomness_data[148], randomness_data[149],
    randomness_data[150], randomness_data[151],
]);

if reveal_slot == 0 {
    return Err(LootboxError::RandomnessNotReady.into());
}

// Read random bytes at offset 152-184 (first 4 bytes as u32)
let random_u32 = u32::from_le_bytes([
    randomness_data[152], randomness_data[153],
    randomness_data[154], randomness_data[155],
]);

let random_percentage = (random_u32 as f64) / (u32::MAX as f64);
```

**Replace with SDK approach:**
```rust
// Parse randomness account using official SDK
let randomness_data = RandomnessAccountData::parse(
    ctx.accounts.randomness_account.data.borrow()
).map_err(|_| LootboxError::RandomnessNotReady)?;

// Get the revealed random value (32 bytes)
let clock = Clock::get()?;
let revealed_random_value: [u8; 32] = randomness_data
    .get_value(&clock)
    .map_err(|_| LootboxError::RandomnessNotReady)?;

// Use 8 bytes (u64) for better entropy distribution
let random_u64 = u64::from_le_bytes([
    revealed_random_value[0], revealed_random_value[1],
    revealed_random_value[2], revealed_random_value[3],
    revealed_random_value[4], revealed_random_value[5],
    revealed_random_value[6], revealed_random_value[7],
]);

let random_percentage = (random_u64 as f64) / (u64::MAX as f64);
```

**Key improvements:**
1. Uses official SDK parsing (handles byte offset changes automatically)
2. Uses u64 (8 bytes) instead of u32 (4 bytes) for better entropy
3. SDK validates reveal timing with clock

---

## Phase 3: JavaScript Changes (Optional Verification)

### File: `backend/lib/switchboard.js`

The `readRandomnessValue` function can be updated to use 8 bytes for consistency:

**Current (lines 279-283):**
```javascript
const randomU32 = Buffer.from(randomBytes.slice(0, 4)).readUInt32LE(0);
const randomPercentage = randomU32 / 0xFFFFFFFF;
```

**Change to:**
```javascript
const randomU64 = randomBytes.readBigUInt64LE(0);
const randomPercentage = Number(randomU64) / Number(0xFFFFFFFFFFFFFFFFn);
```

Note: The JavaScript side is only for logging/verification. The actual randomness is consumed on-chain.

---

## Phase 4: Build and Deploy

```bash
cd backend/program
anchor build
anchor deploy --provider.cluster devnet
```

Update the program ID in:
- `backend/.env` (LOOTBOX_PROGRAM_ID)
- `super_admin_config` table (lootbox_program_id)

---

## Phase 5: Testing

1. **Create test project** with vault funded
2. **Buy a box** - verify commit transaction succeeds
3. **Open the box** - verify reveal transaction succeeds
4. **Check randomness distribution** - run 10-20 reveals and log percentages
5. **Verify tier assignment** matches expected probabilities

---

## Rollback Strategy

If issues occur, rollback is simple:

```bash
# Option 1: Revert to switchboard-offsets branch (YOUR CURRENT LOCAL CODE)
git checkout switchboard-offsets
cd backend/program && anchor build && anchor deploy

# Option 2: Revert to stable (original GitHub main before any changes)
git checkout stable
cd backend/program && anchor build && anchor deploy
```

---

## Branch Summary

| Branch | Purpose | Contains |
|--------|---------|----------|
| `stable` | Original GitHub main | Pre-any-changes backup |
| `switchboard-offsets` | **YOUR CURRENT LOCAL CODE** | Manual byte parsing (working) |
| `feature/switchboard-sdk-parsing` | New implementation | SDK-based parsing |
| `main` | Will update after testing | Final verified version |

---

## Risk Assessment

- **Low risk**: SDK is the official recommended approach
- **Mitigation**: Full rollback capability via git branches
- **Testing**: Devnet testing before any mainnet deployment
- **Your work is SAFE**: Saved in `switchboard-offsets` branch before any other operations
