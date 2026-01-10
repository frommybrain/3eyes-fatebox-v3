# Testing Guide - 3Eyes Lootbox Platform

## Setup

### 1. Install Dependencies
```bash
cd backend/program
npm install
```

### 2. Install Anchor CLI
```bash
# If not already installed
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.31.0
avm use 0.31.0
```

### 3. Configure Solana CLI
```bash
# Set to localnet for testing
solana config set --url localhost

# Check your configuration
solana config get
```

## Running Tests

### Full Test Suite
```bash
# This will:
# 1. Build the program
# 2. Start a local validator
# 3. Deploy the program
# 4. Run all tests
# 5. Stop the validator
anchor test
```

### Build Only
```bash
anchor build
```

### Run Tests (requires validator already running)
```bash
# Terminal 1: Start validator
solana-test-validator

# Terminal 2: Run tests
anchor test --skip-local-validator
```

## Test Coverage

The test suite covers all 6 instructions:

### 1. Initialize Project Tests
- ✅ Should initialize a new project
- ✅ Should fail with box_price = 0
- Verifies: ProjectConfig PDA creation, vault authority derivation, initial state

### 2. Create Box Tests
- ✅ Should create a box
- ✅ Should fail on inactive project
- Verifies: Payment transfer, BoxInstance creation, project stats update

### 3. Reveal Box Tests
- ✅ Should reveal a box with luck accumulation
- ✅ Should fail to reveal already revealed box
- ✅ Should fail to reveal as non-owner
- Verifies: Luck calculation, reward calculation, ownership checks

### 4. Settle Box Tests
- ✅ Should settle a revealed box
- ✅ Should fail to settle already settled box
- Verifies: Reward transfer from vault (PDA signer), project stats update

### 5. Withdraw Earnings Tests
- ✅ Should allow project owner to withdraw
- ✅ Should fail withdrawal from non-owner
- Verifies: PDA signer transfer, ownership checks

### 6. Update Project Tests
- ✅ Should update box price
- ✅ Should pause and resume project
- ✅ Should fail update from non-owner
- Verifies: Ownership checks, state updates

## Test Flow

```
1. Setup
   ├─ Generate test accounts (owner, user1, user2)
   ├─ Airdrop SOL
   ├─ Create payment token mint
   └─ Derive PDAs

2. Initialize Project
   └─ Create ProjectConfig + vault authority

3. Create Box (user1)
   ├─ Mint tokens to user1
   ├─ User buys box
   └─ Payment goes to vault

4. Wait 5 seconds
   └─ Allow luck accumulation

5. Reveal Box
   ├─ Calculate luck (5 + bonus)
   ├─ Get randomness (placeholder: 0.5)
   └─ Calculate reward

6. Settle Box
   ├─ Transfer reward from vault to user1
   └─ Mark as settled

7. Withdraw Earnings (owner)
   └─ Owner withdraws profits

8. Update Project
   ├─ Change box price
   └─ Pause/resume
```

## Expected Test Output

```
  lootbox-platform
    Initialize Project
Payment token mint: ABC...
Project Config PDA: DEF...
Vault Authority PDA: GHI...
Vault token account: JKL...
Initialize project tx: 5X...
✓ Project initialized successfully
      ✓ Should initialize a new project (1234ms)
✓ Correctly rejected price = 0
      ✓ Should fail to initialize project with price = 0 (456ms)

    Create Box
User1 token account: MNO...
Minted 100 tokens to user1
Create box tx: 2Y...
✓ Box created successfully
      ✓ Should create a box (789ms)
✓ Correctly rejected box creation on inactive project
      ✓ Should fail to create box on inactive project (234ms)

    Reveal Box
Waiting 5 seconds for luck accumulation...
Reveal box tx: 3Z...
Box revealed!
  Luck: 6
  Reward: 1500000000
  Is jackpot: false
  Random %: 0.5
      ✓ Should reveal a box (5678ms)
✓ Correctly rejected double reveal
      ✓ Should fail to reveal already revealed box (123ms)
✓ Correctly rejected non-owner reveal
      ✓ Should fail to reveal box as non-owner (456ms)

    Settle Box
Settle box tx: 4A...
✓ Box settled successfully
  Reward transferred: 1500000000
      ✓ Should settle a revealed box (567ms)
✓ Correctly rejected double settle
      ✓ Should fail to settle already settled box (234ms)

    Withdraw Earnings
Withdraw earnings tx: 5B...
✓ Withdrawal successful
  Amount: 500000000
      ✓ Should allow project owner to withdraw earnings (456ms)
✓ Correctly rejected non-owner withdrawal
      ✓ Should fail withdrawal from non-owner (123ms)

    Update Project
Update price tx: 6C...
✓ Box price updated to: 2000000000
      ✓ Should update box price (345ms)
✓ Project paused
✓ Project resumed
      ✓ Should pause and resume project (567ms)
✓ Correctly rejected non-owner update
      ✓ Should fail update from non-owner (123ms)


  14 passing (12s)
```

## Debugging Failed Tests

### Check Logs
```bash
# Detailed logs
anchor test -- --nocapture

# Or use .logs() in tests
const tx = await program.methods
  .createBox(projectId)
  .accounts({...})
  .signers([user])
  .rpc();

console.log("Logs:", tx.logs);
```

### Inspect Accounts
```bash
# Get account data
solana account <ADDRESS>

# Decode with Anchor
anchor account <ACCOUNT_TYPE> <ADDRESS>
```

### Common Issues

#### 1. "Account does not exist"
- Make sure you're deriving PDAs correctly
- Check that accounts are initialized before using them

#### 2. "Insufficient funds"
- Increase airdrop amount
- Check token balances

#### 3. "Transaction simulation failed"
- Enable detailed logs
- Check constraint violations
- Verify all required signers

#### 4. "Invalid seeds"
- Verify PDA seeds match between derivation and program
- Check byte order (little-endian for numbers)

## Manual Testing

### Deploy to Devnet
```bash
# Switch to devnet
solana config set --url devnet

# Request airdrop
solana airdrop 2

# Build and deploy
anchor build
anchor deploy --provider.cluster devnet

# Get program ID
solana address -k target/deploy/lootbox_platform-keypair.json
```

### Interact via CLI
```bash
# Initialize project
anchor run initialize-project

# Create box
anchor run create-box

# Reveal box
anchor run reveal-box

# Settle box
anchor run settle-box
```

## Performance Benchmarks

Expected transaction costs (devnet):
- Initialize Project: ~0.001 SOL
- Create Box: ~0.0005 SOL
- Reveal Box: ~0.0001 SOL
- Settle Box: ~0.0001 SOL
- Withdraw Earnings: ~0.0001 SOL
- Update Project: ~0.0001 SOL

## Next Steps After Testing

Once all tests pass:

1. **Add Switchboard VRF Integration**
   - Replace placeholder randomness (0.5)
   - Add real Switchboard accounts to RevealBox
   - Test with actual VRF callbacks

2. **Add $DEGENBOX Fee Transfers**
   - Launch fee in initialize_project
   - Withdrawal fee in withdraw_earnings
   - Create $DEGENBOX token mint for testing

3. **Add Locked Balance Calculation**
   - Prevent withdrawing funds needed for pending boxes
   - Calculate: vault_balance - (unrevealed_boxes * max_payout)

4. **Deploy to Devnet**
   - Test with real transactions
   - Verify all flows end-to-end
   - Monitor for edge cases

5. **Security Audit**
   - Review for vulnerabilities
   - Test edge cases
   - Verify all constraint checks

---

**Last Updated**: 2026-01-09
**Test Framework**: Anchor 0.31.0 + Mocha + Chai
**Status**: Core logic tests complete, VRF integration pending
