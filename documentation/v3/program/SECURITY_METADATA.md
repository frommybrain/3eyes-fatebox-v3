# Security Metadata Guide

## What is security.txt?

Security.txt is an on-chain metadata standard for Solana programs that provides:
- Contact information for security researchers
- Bug bounty program details
- Responsible disclosure policy
- Auditor information

This appears on Solana Explorer and helps security researchers contact you if they find vulnerabilities.

## Current Status

❌ **Not yet added to devnet program**
❌ **Required before mainnet deployment**

## Adding Security Metadata

### Step 1: Update security.json

Edit `backend/program/security.json` with your real information:

```json
{
  "name": "3Eyes Lootbox Platform",
  "project_url": "https://github.com/YOUR-ORG/3eyes-fatebox-v3",
  "contacts": "email:security@your-domain.com,discord:yourhandle#1234",
  "policy": "Please report security vulnerabilities to security@your-domain.com. We aim to respond within 24 hours.",
  "preferred_languages": "en",
  "source_code": "https://github.com/YOUR-ORG/3eyes-fatebox-v3/tree/main/backend/program",
  "auditors": "None (awaiting audit)",
  "acknowledgements": "Bug bounty program: https://your-domain.com/bounty"
}
```

### Step 2: Write to Devnet (Testing)

```bash
cd backend/program

# Install the tool (if not already installed)
npm install -g @solana-program/program-metadata

# Write security metadata
npx @solana-program/program-metadata@latest write security \
  GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat \
  ./security.json \
  --keypair <path-to-deploy-wallet> \
  --cluster devnet
```

### Step 3: Verify It Was Added

```bash
npx @solana-program/program-metadata@latest show security \
  GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat \
  --cluster devnet
```

You should see your security information displayed.

### Step 4: Check on Explorer

Visit the program on Solana Explorer:
https://explorer.solana.com/address/GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat?cluster=devnet

The security.txt warning should be gone, and your contact info should appear.

## For Mainnet Deployment

### BEFORE deploying to mainnet, complete these steps:

1. **Get a Security Audit**
   - Hire a reputable Solana security firm
   - OtterSec, Neodyme, Zellic are good options
   - Budget: $10k-$50k depending on program complexity

2. **Update security.json with Production Info**
   ```json
   {
     "name": "3Eyes Lootbox Platform",
     "project_url": "https://github.com/YOUR-ORG/3eyes-fatebox-v3",
     "contacts": "email:security@3eyes.io,discord:3eyes#1234",
     "policy": "Report vulnerabilities to security@3eyes.io. Response within 24h. Public disclosure after 90 days or fix, whichever comes first.",
     "preferred_languages": "en",
     "source_code": "https://github.com/YOUR-ORG/3eyes-fatebox-v3/tree/main/backend/program",
     "auditors": "Audited by [FIRM_NAME] on [DATE]. Report: [URL]",
     "acknowledgements": "Bug bounty program: https://3eyes.io/security/bounty"
   }
   ```

3. **Set Up Bug Bounty** (Optional but Recommended)
   - Use platforms like Immunefi or HackerOne
   - Typical rewards: $500-$50k depending on severity
   - Shows you take security seriously

4. **Write Metadata to Mainnet Program**
   ```bash
   cd backend/program

   npx @solana-program/program-metadata@latest write security \
     <MAINNET_PROGRAM_ID> \
     ./security.json \
     --keypair <secure-mainnet-deploy-wallet> \
     --cluster mainnet-beta
   ```

5. **Verify on Mainnet Explorer**
   ```
   https://explorer.solana.com/address/<MAINNET_PROGRAM_ID>
   ```

## Security Best Practices

### Before Mainnet Launch:
- ✅ Complete security audit
- ✅ Add security.txt metadata
- ✅ Set up bug bounty program
- ✅ Test extensively on devnet
- ✅ Have incident response plan
- ✅ Monitor program transactions
- ✅ Set up alerts for unusual activity

### Deploy Wallet Security:
- ✅ Use hardware wallet for mainnet deploy key
- ✅ Consider multisig for upgrade authority
- ✅ Never share private keys
- ✅ Store backups securely offline
- ✅ Test recovery procedures

### Program Security Features Already Implemented:
- ✅ Checked arithmetic (no overflow)
- ✅ PDA-based vault (program-controlled)
- ✅ Owner-only operations properly gated
- ✅ Double-operation prevention
- ✅ Account validation in all instructions

### Still TODO (Security Enhancements):
- ⏳ Add Switchboard VRF for provable randomness
- ⏳ Add rate limiting on box purchases
- ⏳ Add emergency pause mechanism
- ⏳ Add admin fee withdrawal limits
- ⏳ Consider timelock on upgrades

## Useful Links

- [Solana Program Metadata Standard](https://github.com/solana-program/program-metadata)
- [Security Best Practices](https://www.soldev.app/course/security-intro)
- [Anchor Security Checklist](https://www.anchor-lang.com/docs/security)
- [Common Solana Vulnerabilities](https://github.com/coral-xyz/sealevel-attacks)

## Questions to Answer Before Mainnet

1. **Who should receive security reports?**
   - Email: _________________
   - Discord: _________________
   - Telegram: _________________

2. **What's your response time commitment?**
   - Response within: _____ hours
   - Fix timeline: _____ days (depending on severity)

3. **Do you want a bug bounty program?**
   - Yes/No: _________________
   - Budget: $_________________
   - Platform: _________________

4. **Who will be the mainnet upgrade authority?**
   - Individual wallet: _________________
   - Multisig: _________________
   - DAO: _________________

5. **When will you get an audit?**
   - Auditor: _________________
   - Scheduled date: _________________
   - Budget: $_________________

---

**Action Item**: Before going to mainnet, revisit this document and complete ALL steps above.
