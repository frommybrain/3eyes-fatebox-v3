# Platform Terminology Standards

## Official Terms (Use These)

### VAULT ✅
**Definition:** The program-controlled wallet that holds project tokens for payouts.

**Components:**
- `vault_wallet` - The main wallet address (PDA)
- `vault_pda` - The PDA derived from project_id + payment_token
- `vault_authority_pda` - The PDA that signs for vault operations
- `vault_token_account` - The Associated Token Account holding tokens

**Usage:**
- Database columns: `vault_wallet`, `vault_pda`, `vault_authority_pda`, `vault_token_account`
- Code variables: `vault`, `vaultPda`, `vaultAuthority`
- Comments: "vault" (lowercase)
- Documentation: "Vault" (capitalized)

**Why Vault:**
- Standard Solana/Anchor terminology
- Implies program control and security
- Clear that it cannot be accessed directly
- Aligns with reference materials

---

## Deprecated Terms (Do Not Use)

### ❌ TREASURY
**Status:** DEPRECATED as of 2026-01-09

**Reason:** Created confusion with "vault". They referred to the same thing.

**Migration:**
- Database: `treasury_wallet` → `vault_wallet`
- Code: Update all references from "treasury" to "vault"
- Docs: Replace "treasury" with "vault"

---

## Other Standard Terms

### Project Owner
- The wallet that created the project
- Has permission to pause/resume
- Can withdraw earnings (with $3EYES fee)
- Column: `owner_wallet`

### Platform Admin
- The super admin wallet
- Configures platform settings
- Receives platform fees
- Column: `admin_wallet` (in super_admin_config)

### Box Instance
- An individual lootbox purchased by a user
- Stored as PDA on-chain
- References: BoxInstance PDA

### Payment Token
- The SPL token users pay with to buy boxes
- Project-specific (each project chooses their token)
- Column: `payment_token_mint`

---

## Consistency Checklist

When writing code or docs, verify:
- [ ] Using "vault" not "treasury"
- [ ] Database columns match schema.sql
- [ ] PDA variables end with "Pda" (camelCase)
- [ ] Comments use lowercase "vault"
- [ ] Documentation capitalizes "Vault"

---

**Last Updated:** 2026-01-09
**Status:** Enforced
