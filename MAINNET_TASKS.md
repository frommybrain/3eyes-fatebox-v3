# Mainnet Launch Tasks

**Created:** January 17, 2026
**Target:** Beta testing launch

---

## Pre-Launch Checklist

### 1. Program Deployment

- [ ] Ensure sufficient SOL in deploy wallet for mainnet (estimate ~3-5 SOL for deploy + verification + IDL)
- [ ] Deploy program using same keypair to maintain program ID:
  ```bash
  solana program deploy \
    target/deploy/lootbox_platform.so \
    --program-id target/deploy/lootbox_platform-keypair.json \
    --keypair /path/to/deploy-wallet.json \
    --url mainnet-beta
  ```

### 2. Program Verification (Solscan)

- [ ] Run verification (will use same Docker build, same hash):
  ```bash
  solana-verify verify-from-repo \
    --program-id GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat \
    --library-name lootbox_platform \
    --mount-path backend/program \
    --url mainnet-beta \
    --keypair /path/to/deploy-wallet.json \
    -y \
    https://github.com/frommybrain/3eyes-fatebox-v3
  ```

### 3. Publish IDL to Mainnet

- [ ] Publish IDL for block explorer decoding:
  ```bash
  anchor idl init GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat \
    --filepath target/idl/lootbox_platform.json \
    --provider.cluster mainnet-beta \
    --provider.wallet /path/to/deploy-wallet.json
  ```

### 4. Initialize Platform Config

- [ ] Run platform config initialization script with mainnet settings:
  ```bash
  cd backend
  SOLANA_NETWORK=mainnet-beta node scripts/init-platform-config.js
  ```

### 5. Environment Configuration

#### Backend (.env)
- [ ] Update `SOLANA_NETWORK=mainnet-beta`
- [ ] Update `RPC_URL` to mainnet RPC (Helius, QuickNode, or other provider)
- [ ] Verify `ALLOWED_ORIGINS` includes production domains
- [ ] Set `NODE_ENV=production`

#### Frontend
- [ ] Update Solana network config to mainnet
- [ ] Update RPC endpoint
- [ ] Verify wallet adapter is configured for mainnet

### 6. Database (Supabase)

- [ ] Decision: Use same Supabase instance or create new for mainnet?
- [ ] If new instance: migrate schema
- [ ] Clear any devnet test data if using same instance
- [ ] Verify RLS policies are production-ready

### 7. Token Setup

- [ ] Deploy or identify $3EYES token on mainnet
- [ ] Update `super_admin_config` with mainnet token address
- [ ] Fund platform treasury if needed

### 8. Switchboard VRF

- [ ] Verify Switchboard oracle queue addresses for mainnet
- [ ] Update any hardcoded devnet Switchboard addresses
- [ ] Test VRF functionality on mainnet

---

## Security Checklist

- [ ] Audit all admin endpoints
- [ ] Verify rate limiting is appropriate for production traffic
- [ ] Ensure no devnet keypairs/addresses in production code
- [ ] Review CORS settings (`ALLOWED_ORIGINS`)
- [ ] Confirm error messages don't leak sensitive info in production
- [ ] Test all transaction signing flows with real wallets

---

## Monitoring & Observability

- [ ] Set up error tracking (Sentry or similar)
- [ ] Configure logging for production
- [ ] Set up alerts for failed transactions
- [ ] Monitor RPC rate limits

---

## DNS & Hosting

- [ ] Backend deployed to Render.com (or production host)
- [ ] Frontend deployed (Vercel?)
- [ ] DNS configured for:
  - [ ] `degenbox.fun` (frontend)
  - [ ] `api.degenbox.fun` (backend)
- [ ] SSL certificates active

---

## Post-Launch

- [ ] Monitor first transactions closely
- [ ] Have rollback plan ready
- [ ] Document any mainnet-specific issues
- [ ] Update CLAUDE.md with mainnet deployment info

---

## Cost Estimates

| Item | Estimated SOL |
|------|---------------|
| Program Deploy | ~2-3 SOL |
| Verification Upload | ~0.01 SOL |
| IDL Publish | ~0.05 SOL |
| Platform Config Init | ~0.01 SOL |
| **Total** | **~3-4 SOL** |

---

## Known Differences: Devnet vs Mainnet

| Aspect | Devnet | Mainnet |
|--------|--------|---------|
| RPC URL | Helius devnet | Helius mainnet (or other) |
| Program verification display | Not shown on Solscan | Should display |
| Transaction costs | Free (airdrop) | Real SOL |
| Switchboard queues | Devnet queues | Mainnet queues |

---

## Emergency Contacts / Resources

- Solana Status: https://status.solana.com
- Helius Status: https://status.helius.dev
- Switchboard Discord: (for VRF issues)

---

## Notes from Devnet Testing

_Add findings from tonight's testing here_

```
-
-
-
```
