# 3Eyes FateBox v3 - Security Audit Report

**Audit Date:** January 13, 2026
**Auditor:** Claude Code (Automated Analysis)
**Project Version:** Pre-production (Devnet)
**Next Audit Due:** Before mainnet launch

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 3 | Pending |
| High | 6 | Pending |
| Medium | 15 | Pending |
| Low | 10 | Pending |
| **Total** | **34** | **Pending** |

**Recommendation:** Address all Critical and High severity issues before mainnet deployment.

---

## Critical Severity Issues

### C1: Admin Keypair Exposure in Environment Variables
**File:** `backend/routes/admin.js` lines 64-76, 393-402
**Status:** Pending

**Issue:**
```javascript
const deployWalletJson = process.env.DEPLOY_WALLET_JSON;
const secretKey = Uint8Array.from(JSON.parse(deployWalletJson));
adminKeypair = Keypair.fromSecretKey(secretKey);
```
Admin private keys stored in environment variables and loaded directly into memory without encryption.

**Risk:** Complete platform compromise if environment is exposed.

**Recommendation:**
- Use a key management service (AWS KMS, HashiCorp Vault)
- Never store private keys in .env files
- Implement key rotation policies
- Add audit logging for all admin operations
- Consider multisig for critical operations

---

### C2: Missing Authentication on Admin Endpoints
**File:** `backend/routes/admin.js` line 26-71
**Status:** Pending

**Issue:**
```javascript
router.post('/update-platform-config', async (req, res) => {
    // NO authentication check before accessing DEPLOY_WALLET_JSON
    const deployWalletJson = process.env.DEPLOY_WALLET_JSON;
```
Admin endpoints are public-facing with no authentication. Anyone can attempt to call these endpoints.

**Risk:** Unauthorized access to admin functions.

**Recommendation:**
- Add middleware to verify caller is admin
- Require JWT tokens or wallet signatures
- Add allowlist of admin addresses in database
- Verify admin status before loading private keys

---

### C3: Exposed Sensitive Data in Error Messages
**File:** All route files
**Status:** Pending

**Issue:**
```javascript
return res.status(500).json({
    error: 'Failed to fetch withdrawal info',
    details: error.message, // Exposes internal error details
});
```
Error responses expose detailed internal information.

**Risk:** Information leakage aids attackers.

**Recommendation:**
- Sanitize error messages for production
- Log detailed errors server-side only
- Return generic errors to clients

---

## High Severity Issues

### H1: Missing Rate Limiting on Critical Endpoints
**File:** `backend/routes/program.js`, `backend/routes/vault.js`
**Status:** Pending

**Issue:** No rate limiting or DOS protection on endpoints that build transactions, fetch external APIs, or perform database queries.

**Recommendation:**
- Implement rate limiting (Redis or in-memory)
- Add per-wallet/IP rate limits
- Limit `/build-*-tx` endpoints: 10 requests/minute
- Limit external API calls: 1 request/second with caching

---

### H2: N+1 Query Problem in Dashboard
**File:** `frontend/components/dashboard/Dashboard.jsx` lines 1045-1072
**Status:** Pending

**Issue:**
```javascript
useEffect(() => {
    async function fetchVaultBalance() {
        const response = await fetch(`${backendUrl}/api/vault/balance/${project.project_numeric_id}`);
    }
    fetchVaultBalance();
}, [project.project_numeric_id]);
```
Separate API call for each project causes performance degradation.

**Recommendation:**
- Create batch endpoint: `POST /api/vault/balances`
- Accept array of project IDs
- Return all balances in one request

---

### H3: Missing Database Indexes
**File:** Database schema
**Status:** Pending

**Issue:** Queries on frequently accessed fields likely lack indexes:
- `boxes.owner_wallet`
- `boxes.box_result`
- `boxes.project_id`
- `projects.project_numeric_id`
- `projects.owner_wallet`

**Recommendation:**
```sql
CREATE INDEX idx_boxes_owner_wallet ON boxes(owner_wallet);
CREATE INDEX idx_boxes_box_result ON boxes(box_result);
CREATE INDEX idx_boxes_project_id_result ON boxes(project_id, box_result);
CREATE INDEX idx_projects_owner_wallet ON projects(owner_wallet);
CREATE INDEX idx_projects_numeric_id ON projects(project_numeric_id);
```

---

### H4: BigInt Precision Loss in Calculations
**File:** `backend/routes/vault.js` lines 383-386, 408-410
**Status:** Pending

**Issue:**
```javascript
const reservedForUnopened = BigInt(Math.ceil(
    Number(boxPrice) * unopenedBoxes * EXPECTED_PAYOUT_MULTIPLIER
));
```
Conversion to Number and back to BigInt can lose precision with large values.

**Recommendation:**
- Use BigInt arithmetic exclusively
- Add explicit overflow protection
- Test with maximum token amounts (u64 max)

---

### H5: No Transaction Signature Verification
**File:** `backend/routes/program.js` line 1638-1649
**Status:** Pending

**Issue:** Confirm endpoints trust client-provided transaction signatures without verification.

**Recommendation:**
- Query transaction by signature to verify it corresponds to expected operation
- Verify signer is the actual owner
- Add transaction timestamp validation

---

### H6: Race Conditions in Box State Transitions
**File:** `frontend/components/dashboard/Dashboard.jsx` line 576-578
**Status:** Pending

**Issue:**
```javascript
startBoxTransition(() => {
    setOptimisticBox({ randomness_committed: true, committed_at: new Date().toISOString() });
});
// Then send the actual transaction
```
Optimistic updates can show misleading state if transaction fails.

**Recommendation:**
- Don't show optimistic updates for complex state changes
- Wait for server confirmation
- Implement proper rollback on failure

---

## Medium Severity Issues

### M1: Insufficient Input Validation on Wallet Addresses
**File:** `backend/routes/vault.js` line 321, `backend/routes/projects.js` line 340
**Status:** Pending

**Issue:** Simple string comparison without cryptographic verification.

**Recommendation:**
- Validate wallet addresses rigorously
- Add optional allowlist/blocklist checks
- Verify wallet signatures for sensitive operations

---

### M2: Missing CORS Configuration
**File:** All route files
**Status:** Pending

**Issue:** No visible CORS configuration in the backend.

**Recommendation:**
- Add explicit CORS middleware with whitelist
- Only allow production domains and localhost in development

---

### M3: URL Parameter Injection Risk
**File:** `backend/routes/vault.js` line 712
**Status:** Pending

**Issue:**
```javascript
const withdrawalInfoResponse = await fetch(
    `http://localhost:${process.env.PORT || 3333}/api/vault/withdrawal-info/${projectId}?ownerWallet=${ownerWallet}`
);
```
URL parameters not URL-encoded.

**Recommendation:**
- Use URL constructor or `URLSearchParams` to safely encode parameters

---

### M4: Tight Coupling Between Frontend and Backend
**File:** Multiple files
**Status:** Pending

**Issue:** Frontend directly calls backend endpoints with hardcoded URLs. No API versioning.

**Recommendation:**
- Define API contracts (OpenAPI/Swagger)
- Use generated client from API spec
- Implement API versioning (v1, v2)

---

### M5: No Transaction Rollback on Partial Failures
**File:** `backend/routes/program.js` line 255-321
**Status:** Pending

**Issue:** If database update fails after on-chain transaction succeeds, function still returns success.

**Recommendation:**
- Return error if database update fails
- Implement transaction-like behavior with retry logic

---

### M6: Missing Idempotency Keys
**File:** All POST endpoints
**Status:** Pending

**Issue:** No idempotency mechanism means retried requests are processed multiple times.

**Recommendation:**
- Add idempotency key to request headers
- Store processed keys in cache with TTL
- Return cached response if key already processed

---

### M7: Inefficient Box Filtering Logic
**File:** `backend/routes/vault.js` lines 351-355, 366-371
**Status:** Pending

**Issue:** Three separate database calls for box counts and sums.

**Recommendation:**
- Use single query with GROUP BY and aggregate functions
- Or use Supabase RPC function for complex aggregations

---

### M8: Missing Caching for Price Oracle Calls
**File:** `backend/lib/priceOracle.js` line 56-62
**Status:** Pending

**Issue:** Cache is in-memory and lost on server restart.

**Recommendation:**
- Use Redis for distributed cache
- Increase TTL to 5 minutes
- Pre-warm cache on server startup

---

### M9: No Input Validation on Numeric Fields
**File:** `backend/routes/program.js` line 54-62
**Status:** Pending

**Issue:** Checks for existence but not type, range, or format validation.

**Recommendation:**
- Use validation library (Joi, Zod, or Yup)
- Define strict schemas for all endpoints

---

### M10: Missing Type Definitions
**File:** All JavaScript files
**Status:** Pending

**Issue:** No TypeScript or JSDoc type definitions.

**Recommendation:**
- Convert to TypeScript
- Or add comprehensive JSDoc type annotations

---

### M11-M15: Additional Medium Issues
- Unnecessary re-renders in frontend components
- Inefficient Supabase queries with SELECT *
- Hardcoded values should be constants
- No verification of on-chain state before confirm
- Missing error boundaries in React components

---

## Low Severity Issues

### L1: Unused Function Parameters
**File:** `backend/lib/switchboard.js` line 127-131
**Status:** Pending

**Issue:** `network` parameter logged but never used.

---

### L2: Commented Code Blocks
**File:** `backend/routes/admin.js` line 408-410
**Status:** Pending

**Issue:** Incomplete implementation with long comments.

---

### L3: Duplicate Logging
**File:** `backend/routes/program.js` lines 64-67 vs 208-213
**Status:** Pending

---

### L4: Unused Imports
**File:** `frontend/components/dashboard/Dashboard.jsx` line 6
**Status:** Pending

---

### L5: Magic Numbers Throughout Codebase
**File:** Multiple files
**Status:** Pending

---

### L6-L10: Additional Low Issues
- Missing function documentation
- Redundant error handling
- Unreachable code paths
- Inconsistent error response formats
- Missing JSDoc comments

---

## Production Readiness Checklist

- [ ] Remove all hardcoded private keys from code
- [ ] Implement proper key management service
- [ ] Add authentication/authorization to all admin endpoints
- [ ] Implement rate limiting on all endpoints
- [ ] Add comprehensive input validation
- [ ] Create database indexes for frequently queried fields
- [ ] Implement idempotency keys for POST requests
- [ ] Add audit logging for critical operations
- [ ] Implement error monitoring (Sentry)
- [ ] Add integration tests for critical paths
- [ ] Set up CORS properly
- [ ] Test with maximum token amounts (overflow scenarios)
- [ ] Load test with expected concurrent users
- [ ] Security audit by third party
- [ ] Deploy on testnet first

---

## Audit History

| Date | Auditor | Findings | Fixed | Notes |
|------|---------|----------|-------|-------|
| 2026-01-13 | Claude Code | 34 | 0 | Initial audit |

---

*This document should be updated after each audit cycle and when issues are resolved.*
