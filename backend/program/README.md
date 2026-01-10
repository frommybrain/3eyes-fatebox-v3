# 3Eyes Lootbox Platform - Anchor Program

This is the Solana Rust program (smart contract) for the 3Eyes multi-tenant lootbox platform.

## Program Structure

```
program/
├── Anchor.toml              # Anchor configuration
├── Cargo.toml               # Workspace manifest
├── programs/
│   └── lootbox_platform/
│       ├── Cargo.toml       # Program dependencies
│       └── src/
│           └── lib.rs       # Main program code
└── tests/                   # Integration tests (to be added)
```

## Instructions Implemented

### 1. `initialize_project`
**Purpose**: Create a new project with vault configuration

**Parameters**:
- `project_id`: u64 - Unique project identifier
- `box_price`: u64 - Cost per box in project's token

**What it does**:
- Creates ProjectConfig PDA
- Derives vault_authority PDA
- Records project owner, payment token, settings
- Sets project to active

**TODO**: Add $DEGENBOX launch fee transfer

---

### 2. `create_box`
**Purpose**: User purchases a box

**Parameters**:
- `project_id`: u64 - Which project

**What it does**:
- Verifies project is active
- Transfers box_price tokens from buyer to vault
- Creates BoxInstance PDA with base luck = 5
- Increments project stats

---

### 3. `reveal_box`
**Purpose**: Reveal box reward using randomness

**Parameters**:
- `project_id`: u64 - Which project
- `box_id`: u64 - Which box

**What it does**:
- Calculates luck based on hold time (+1 every 3 seconds for testing)
- Gets randomness from Switchboard VRF
- Calculates reward based on luck + randomness
- Checks for jackpot (1% chance at max luck = 50% of vault)
- Stores reward_amount in box state

**TODO**: Complete Switchboard VRF integration (currently uses placeholder)

---

### 4. `settle_box`
**Purpose**: Transfer reward to box owner

**Parameters**:
- `project_id`: u64 - Which project
- `box_id`: u64 - Which box

**What it does**:
- Verifies box is revealed but not settled
- Transfers reward_amount from vault to owner
- Uses vault_authority PDA as signer (program-controlled)
- Marks box as settled
- Updates project stats

---

### 5. `withdraw_earnings`
**Purpose**: Project owner withdraws profits

**Parameters**:
- `project_id`: u64 - Which project
- `amount`: u64 - How much to withdraw

**What it does**:
- Verifies caller is project owner
- Calculates available balance
- Transfers from vault to owner using PDA signer
- TODO: Charge withdrawal fee in $DEGENBOX

---

### 6. `update_project`
**Purpose**: Update project settings

**Parameters**:
- `project_id`: u64 - Which project
- `new_box_price`: Option<u64> - New box price (optional)
- `new_active`: Option<bool> - Pause/resume (optional)

**What it does**:
- Verifies caller is project owner
- Updates box_price if provided
- Updates active status if provided (pause/resume functionality)

---

## PDA Seeds

### ProjectConfig PDA
```rust
["project", project_id]
```

### BoxInstance PDA
```rust
["box", project_id, box_id]
```

### Vault Authority PDA
```rust
["vault", project_id, payment_token_mint]
```

---

## State Accounts

### ProjectConfig (123 bytes)
```rust
{
    project_id: u64,
    owner: Pubkey,
    payment_token_mint: Pubkey,
    box_price: u64,
    vault_authority_bump: u8,
    total_boxes_created: u64,
    total_boxes_settled: u64,
    total_revenue: u64,
    total_paid_out: u64,
    active: bool,
    launch_fee_paid: bool,
    created_at: i64,
}
```

### BoxInstance (76 bytes)
```rust
{
    box_id: u64,
    project_id: u64,
    owner: Pubkey,
    created_at: i64,
    luck: u8,
    revealed: bool,
    settled: bool,
    reward_amount: u64,
    is_jackpot: bool,
    random_percentage: f64,
}
```

---

## Reward Calculation Logic

### Luck System
- **Base luck**: 5
- **Time bonus**: +1 every 3 seconds (testing) or 3 hours (production)
- **Max luck**: 60

### Reward Formula
```rust
luck_multiplier = luck / 10.0        // 0.5x to 6.0x
random_bonus = random_percentage * 2.0  // 0.0x to 2.0x
total_multiplier = luck_multiplier + random_bonus
reward = box_price * total_multiplier

// Jackpot check
if luck >= 60 && random_percentage > 0.99:
    reward = vault_balance * 0.5  // 50% of vault
    is_jackpot = true
```

---

## Error Codes

```rust
InsufficientLaunchFee
ProjectInactive
BoxAlreadyRevealed
BoxNotRevealed
BoxAlreadySettled
NotBoxOwner
NotProjectOwner
InsufficientVaultBalance
WithdrawalExceedsAvailable
InsufficientFeeBalance
InvalidBoxPrice
ArithmeticOverflow
RandomnessNotReady
```

---

## TODOs / Future Work

### High Priority
1. **Switchboard VRF Integration** - Complete reveal_box randomness
2. **$DEGENBOX Launch Fee** - Add to initialize_project
3. **$DEGENBOX Withdrawal Fee** - Add to withdraw_earnings
4. **Locked Balance Calculation** - Prevent withdrawing funds for pending boxes

### Medium Priority
5. **Integration Tests** - Create comprehensive test suite
6. **Deploy to Devnet** - Test with real transactions
7. **Security Audit** - Review for vulnerabilities

### Low Priority
8. **Events** - Add Anchor events for off-chain indexing
9. **Admin Instructions** - Super admin emergency controls
10. **Upgrade Authority** - Proper program upgrade management

---

## Building and Testing

### Build
```bash
cd backend/program
anchor build
```

### Test
```bash
anchor test
```

### Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

### Get Program ID
```bash
solana address -k target/deploy/lootbox_platform-keypair.json
```

---

## Dependencies

```toml
anchor-lang = "0.31.0"
anchor-spl = "0.31.0"
switchboard-solana = "0.30.0"
```

---

## Network Agnostic Design

This program is designed to work on BOTH devnet and mainnet with the same deployment:
- No hardcoded network-specific values
- All configuration comes from database (via backend API)
- Same program ID on both networks
- Vault PDAs derived deterministically

---

## Security Features

1. **PDA-Controlled Vaults** - Program controls vault authority, not project owner
2. **Ownership Checks** - All mutations verify signer is authorized
3. **Checked Arithmetic** - No overflow/underflow vulnerabilities
4. **Constraint Validation** - Anchor's account validation macros
5. **Pause Functionality** - Project owners can pause new box purchases

---

**Last Updated**: 2026-01-09
**Version**: 0.1.0
**Status**: Initial implementation complete, needs Switchboard VRF integration and testing
