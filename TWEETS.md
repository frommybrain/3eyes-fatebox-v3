# 3Eyes FateBox v3 - Development Tweet Thread

A collection of tweets documenting the development journey. Mix and match, edit as needed.

---

## The Vision / What We're Building

**1.**
Building a multi-tenant lootbox platform on Solana where anyone can launch their own token-based gambling experience. Provably fair with Switchboard VRF. No developer access to funds - everything PDA-controlled.

**2.**
The idea: creators pay a launch fee, set up their vault, and users buy "boxes" with outcomes determined by verifiable randomness. Simple concept, complex execution.

**3.**
Why Solana for gambling? Sub-second finality, cheap transactions, and mature VRF oracles. Users can open boxes and see results in real-time without waiting for block confirmations.

**4.**
Our revenue model: 5% commission on every box purchase. No withdrawal fees for creators - that would be double-charging. Commission gets swapped to SOL, then used to buyback $3EYES.

---

## Switchboard VRF Integration

**5.**
Spent hours debugging Switchboard VRF integration. The commit-reveal pattern is elegant but unforgiving. Miss a step and your randomness is either predictable or unusable.

**6.**
The moment when your VRF finally returns valid randomness after 47 failed attempts... pure dopamine.

**7.**
Switchboard tip: NEVER use Crossbar for VRF. It routes to different oracles which breaks the commit-reveal pattern. Cost me half a day debugging `InvalidSecpSignature` errors.

**8.**
Migrated from manual byte parsing to the official Switchboard SDK. Hardcoded offsets are a ticking time bomb - SDK handles validation automatically.

**9.**
```rust
let revealed_random_value: [u8; 32] = randomness_data
    .get_value(&clock)
    .map_err(|_| LootboxError::RandomnessNotReady)?;
```
This one line replaced 20 lines of manual byte slicing. SDK FTW.

**10.**
Devnet Switchboard oracles can be unreliable. Built retry logic with exponential backoff. Mainnet should be better but we'll see.

**11.**
The VRF commit-reveal flow:
1. Create randomness account
2. Commit (request randomness)
3. Wait ~10 seconds
4. Reveal (read oracle's signed value)
5. Calculate reward

Simple, right? Took 3 days to get working.

**12.**
Pro tip: When VRF reveal fails, check if the oracle has actually populated the randomness. Devnet oracles sometimes just... don't.

---

## Treasury & Commission System

**13.**
Just implemented platform-wide treasury. Every box purchase sends 5% to a global treasury PDA. Creators keep 95%. Clean separation of concerns.

**14.**
The treasury flow:
- Box purchased: 5% to treasury
- Admin withdraws tokens to wallet
- Swap to SOL via Jupiter
- 90% buys back $3EYES
- 10% to dev wallet

**15.**
Built a treasury processing script that handles the entire flow automatically. Flags for dry-run, withdraw-only, test multipliers. Mainnet-ready (theoretically).

**16.**
```bash
node scripts/process-treasury-fees.js --withdraw-only --test-multiplier 0.2
```
Testing with 20% of treasury balance. Don't want to move all tokens until we're confident.

**17.**
First successful treasury withdrawal on devnet! 4.011 CATS tokens moved from treasury PDA to admin wallet. Small step but it validates the entire flow.

**18.**
Added database logging for all treasury operations. Every withdraw, swap, and buyback gets recorded with Solscan links. Full audit trail.

**19.**
The admin dashboard now shows "Recent Activity" for treasury operations. Click to view any transaction on Solscan. Transparency is key for a gambling platform.

**20.**
Jupiter API doesn't work on devnet (no liquidity). So we use `--withdraw-only` for testing. Full swap flow needs mainnet testing.

**21.**
Treasury commission is configurable: 0-50% in basis points. Default is 500 (5%). Can adjust without redeploying the program.

**22.**
Why collect commission in project tokens instead of SOL? Because users are already holding those tokens. No extra swap friction at purchase time.

---

## The Luck System

**23.**
Our luck mechanic: hold a box longer before opening = better odds. Gamifies patience. Diamond hands get rewarded.

**24.**
Luck tiers:
- Tier 1 (0-5 luck): 55% dud, 0.5% jackpot
- Tier 2 (6-13): 45% dud, 1.5% jackpot
- Tier 3 (14-60): 30% dud, 5% jackpot

Hold longer, win more.

**25.**
Base luck starts at 5. Every `luck_time_interval` seconds adds +1. Max luck is 60. On devnet interval is 3 seconds for testing. Mainnet will be hours.

**26.**
When you open a box, luck gets "frozen" at the commit step. Can't game the system by waiting for the perfect moment to reveal.

**27.**
Expected value at max luck tier: 1.4x. Users have a 40% expected profit if they hold long enough. House edge is negative for patient players.

---

## PDA Architecture

**28.**
PDAs (Program Derived Addresses) are beautiful. The program literally cannot access vault funds without proper authorization. Trustless by design.

**29.**
Our PDA seeds:
- Platform config: `["platform_config"]`
- Treasury: `["treasury"]`
- Project: `["project", project_id]`
- Box: `["box", project_id, box_id]`

Deterministic, verifiable, secure.

**30.**
Every project gets its own vault controlled by a PDA. Creator can withdraw, but only through the program's withdrawal instruction. No backdoors.

**31.**
The treasury PDA owns token accounts for every project token type. One treasury, many currencies. Elegant multi-token handling.

**32.**
Debugging PDA derivation mismatches is a special kind of pain. Off by one byte in the seed and nothing works. Ask me how I know.

---

## Transaction Building

**33.**
Our backend builds transactions, frontend signs them. Clean separation. User never sends their private key anywhere.

**34.**
Fresh blockhash for every transaction. Prevents replay attacks and ensures the transaction is timely.

**35.**
The transaction building pattern:
1. Frontend: "build me a create-box tx"
2. Backend: derives PDAs, builds instruction, returns serialized tx
3. Frontend: deserializes, user signs, submits to Solana
4. Frontend: "confirm the tx"
5. Backend: updates database

**36.**
Using Anchor 0.30.1 for transaction building. The discriminator handling is much cleaner than raw Solana instructions.

**37.**
Every Solana transaction needs: recent blockhash, fee payer, and signatures. Miss any of these and you get cryptic errors.

---

## Error Handling & Debugging

**38.**
`AccountNotInitialized` - the error that means "you're passing an account that doesn't exist yet." Usually means you forgot to create an ATA.

**39.**
ATA (Associated Token Account) gotcha: if the admin wallet doesn't have an ATA for a token, withdrawal fails. Added auto-creation logic.

**40.**
`src.toArrayLike is not a function` - Native BigInt vs BN.js mismatch. Anchor expects BN, JavaScript gives BigInt. Quick fix:
```javascript
const amountBN = new BN(amount.toString());
```

**41.**
When your transaction fails with no error message, check the simulation logs. They usually tell you exactly what went wrong.

**42.**
Spent 2 hours debugging a withdrawal failure. The issue? Admin wallet had no token account for CATS. One `createAssociatedTokenAccountInstruction` later, fixed.

**43.**
Solana error codes are... not great. `0x1` means basically nothing. But when you decode the full error, it's usually obvious in hindsight.

**44.**
The worst bugs are the ones that work locally but fail on devnet. Network latency, RPC differences, oracle availability... so many variables.

---

## Database & Migrations

**45.**
Using Supabase for our database. PostgreSQL with a nice API. Real-time subscriptions coming soon for live updates.

**46.**
Migration hygiene matters. We had two files both named `006_*.sql`. Different content, same number. Recipe for disaster. Fixed by renaming to `006b`.

**47.**
Consolidated three incremental migrations into one. 008, 009, 010 became just 010. Cleaner history, same result.

**48.**
Our `treasury_processing_log` table tracks every treasury operation:
- action_type (withdraw, swap, buyback)
- amounts and signatures
- status and error messages
Full audit trail.

**49.**
Box result values: database uses 0-5, on-chain uses 0-4. Off by one because we reserve 0 for "pending" state. Document your mappings!

---

## Admin Dashboard

**50.**
Built an admin dashboard for platform management. Config sync, treasury balances, recent activity. All the knobs you need.

**51.**
Treasury tab now shows all collected tokens with balances. $3EYES always appears first (even if empty) for visibility.

**52.**
Recent Activity section shows every treasury operation with:
- Action type badges (WITHDRAW, SWAP, BUYBACK)
- Status badges (COMPLETED, FAILED)
- Clickable Solscan links

**53.**
Admin can update on-chain config directly from the dashboard. Luck intervals, payout multipliers, commission rates. No redeployment needed.

**54.**
The satisfying moment when your admin dashboard actually loads data from your deployed program. Proof the whole stack works.

---

## Frontend Considerations

**55.**
Using Next.js 16 with React 19. Server components where sensible, client components for wallet interactions.

**56.**
`useOptimistic` from React 19 is perfect for Solana apps. Show the expected state immediately, confirm after blockchain finalizes.

**57.**
Zustand for state management. Simple, effective, and doesn't require wrapping your entire app in providers.

**58.**
Wallet adapter integration is straightforward until it isn't. Handling disconnects, network switches, and transaction rejections takes care.

**59.**
Our UI components follow the "Degen" design system. DegenButton, DegenCard, DegenBadge. Consistent styling across the app.

---

## Testing & Safety

**60.**
Added `--test-multiplier` flag to treasury script. Process only X% of balance. Safety net for testing without risking full amounts.

**61.**
`--dry-run` mode simulates the entire flow without executing transactions. See exactly what would happen before it does.

**62.**
Devnet is not mainnet. Oracles behave differently, tokens have no real value, liquidity doesn't exist. Test what you can, plan for the rest.

**63.**
Our testing checklist:
- [ ] Treasury withdrawal (devnet) ✓
- [ ] Jupiter swap (mainnet only)
- [ ] $3EYES buyback (mainnet only)
- [ ] Full end-to-end flow

**64.**
Every time I test a transaction: check the signature on Solscan, verify the state changed, confirm database updated. Trust but verify.

---

## Architecture Decisions

**65.**
Decision: No Jupiter CPI on-chain. Too complex, too many dependencies. Keep swaps off-chain where we have more control.

**66.**
Decision: Commission in project token, not SOL. Users already have the token. No extra friction at purchase time.

**67.**
Decision: No withdrawal fee for creators. Commission already taken on purchase. Double-charging would be unfair.

**68.**
Decision: Treasury PDA instead of admin wallet for commission. On-chain accountability. Transparent and verifiable.

**69.**
Decision: SDK parsing for VRF instead of manual byte offsets. Maintainability over micro-optimization.

**70.**
Decision: Off-chain locked balance calculation. On-chain would be 10x worst case. Statistical approach (1.4x) is more practical.

---

## Code Quality

**71.**
Found 206 console.log statements in the backend. Production cleanup task: replace with proper logging utility or remove.

**72.**
Cleaned up duplicate migration files. Two 006s, superseded 008/009. Migration hygiene prevents database chaos.

**73.**
Code review finding: `loadDeployWallet.js` exists but seemed unused. Actually used by `verify-setup.js`. Always grep before deleting.

**74.**
Large components are technical debt. AdminDashboard.jsx is 1,400 lines. Works but could use breaking into smaller pieces.

**75.**
Comments are good. Comments explaining WHY are better. Self-documenting code is best.

---

## Mainnet Preparation

**76.**
Mainnet gaps identified:
- Jupiter swaps (needs real liquidity)
- $3EYES buyback (need real token)
- Dev wallet config
- Production RPC

**77.**
The treasury script will fail swaps on devnet. Jupiter needs real liquidity pools. `--withdraw-only` is our devnet workaround.

**78.**
Mainnet config needed:
```
network: 'mainnet-beta'
rpc_url: <production RPC>
three_eyes_mint: <real mint address>
```

**79.**
Rate limiting not implemented yet. Express-rate-limit is on the TODO list. Don't want to get DoS'd on mainnet.

**80.**
RLS policies need tightening. Current Supabase policies are too permissive. owner_wallet checks needed before launch.

---

## Development Philosophy

**81.**
Ship fast, but not sloppy. Technical debt is fine if you know you're taking it on. Just document it.

**82.**
Every bug fixed is a lesson learned. Document the solution so future-you doesn't waste time rediscovering it.

**83.**
When stuck, explain the problem out loud. Even to yourself. Rubber duck debugging works.

**84.**
Test the happy path first. Then test edge cases. Then test failure modes. In that order.

**85.**
Blockchain development is 30% coding, 70% debugging transaction failures.

---

## The Journey

**86.**
48 hours of intense development. Treasury system, logging, admin UI, script automation. Feeling productive.

**87.**
The codebase has grown organically. Time to step back and clean up before adding more features.

**88.**
Documentation written during development > documentation written after. Context is fresh, details are accurate.

**89.**
CLAUDE.md and ARCHITECTURE.md are our source of truth. Keep them updated and AI assistants can help effectively.

**90.**
Every feature starts with a question: "What's the simplest thing that could work?" Then iterate.

---

## Technical Tidbits

**91.**
Solana timestamps are Unix seconds, not milliseconds. JavaScript Date uses milliseconds. Multiply by 1000 when displaying.

**92.**
Anchor IDL is your friend. It describes every instruction, account, and type. Auto-generates TypeScript types.

**93.**
BN.js is not BigInt. Anchor uses BN.js. Convert with `new BN(bigintValue.toString())`.

**94.**
Token amounts are in lamports (10^9). Always divide by 1e9 for display. Always multiply by 1e9 for transactions.

**95.**
PDAs can own token accounts. Set `allowOwnerOffCurve: true` in `getAssociatedTokenAddress`.

---

## Looking Forward

**96.**
Next up: mainnet testing. Real tokens, real swaps, real stakes. Devnet only gets you so far.

**97.**
Feature on deck: "Withdraw All & Close" for projects. Let creators exit gracefully.

**98.**
Subdomain routing would be nice. `/cats` instead of `/project/cats`. Better UX for sharing.

**99.**
Real-time updates with Supabase subscriptions. See boxes update as they're purchased/revealed. Coming soon.

**100.**
The roadmap is clear. The foundation is solid. Time to build on top of it.

---

## Bonus / Misc

**101.**
Every gambling platform needs transparent odds. Ours are on-chain, verifiable, and configurable. No hidden house edge manipulation.

**102.**
The name "FateBox" because your fate is sealed when you commit, revealed when you reveal. Poetic and accurate.

**103.**
Building in public means showing the messy parts too. Not every commit is a success. That's how development works.

**104.**
Solana DevX has improved massively. Anchor, wallet adapters, explorer tools. 2024/2025 is a good time to build.

**105.**
If you're building on Solana and hitting walls, reach out. The community is helpful and we've probably hit the same walls.

---

*Use, edit, combine as needed. These capture the technical journey and can be adapted for different audiences.*
