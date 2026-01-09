# 3Eyes Backend API Documentation

Base URL: `http://localhost:3333` (development)

## Authentication

Currently, all endpoints are public. Wallet signature verification will be added in future versions.

---

## Health Check

### GET /health

Check server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-09T10:30:00.000Z",
  "environment": "development"
}
```

---

## Projects

### POST /api/projects/create

Create a new project with vault PDAs.

**Request Body:**
```json
{
  "owner_wallet": "EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh",
  "project_name": "Lucky Cat Boxes",
  "subdomain": "luckycat",
  "description": "Try your luck with cat-themed boxes!",
  "payment_token_mint": "So11111111111111111111111111111111111111112",
  "box_price": 1000000000
}
```

**Parameters:**
- `owner_wallet` (string, required) - Creator's wallet address
- `project_name` (string, required) - Display name for the project
- `subdomain` (string, required) - Subdomain (e.g., "luckycat" → "luckycat.degenbox.fun")
- `description` (string, optional) - Project description
- `payment_token_mint` (string, required) - SPL token mint address
- `box_price` (number, required) - Price per box in lamports

**Success Response (201):**
```json
{
  "success": true,
  "project": {
    "id": "uuid-here",
    "project_name": "Lucky Cat Boxes",
    "subdomain": "devnet-luckycat",
    "vault_addresses": {
      "vault_pda": "VaultPdaAddress...",
      "vault_authority_pda": "AuthorityPdaAddress...",
      "vault_token_account": "TokenAccountAddress..."
    },
    "network": "devnet",
    "url": "https://devnet-luckycat.degenbox.fun"
  },
  "message": "Project created successfully! Vault PDAs derived and stored."
}
```

**Error Responses:**
- `400` - Missing required fields or invalid wallet address
- `409` - Subdomain already taken
- `500` - Internal server error

---

### GET /api/projects

List all active projects (filtered by current network).

**Response (200):**
```json
{
  "success": true,
  "network": "devnet",
  "count": 5,
  "projects": [
    {
      "id": "uuid-here",
      "project_name": "Lucky Cat Boxes",
      "subdomain": "devnet-luckycat",
      "owner_wallet": "EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh",
      "vault_pda": "VaultPdaAddress...",
      "box_price": 1000000000,
      "is_active": true,
      "is_paused": false,
      "created_at": "2026-01-09T10:00:00.000Z"
    }
  ]
}
```

---

### GET /api/projects/:projectId

Get project details by ID.

**Response (200):**
```json
{
  "success": true,
  "project": {
    "id": "uuid-here",
    "project_name": "Lucky Cat Boxes",
    "subdomain": "devnet-luckycat",
    "owner_wallet": "EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh",
    "vault_pda": "VaultPdaAddress...",
    "vault_authority_pda": "AuthorityPdaAddress...",
    "vault_token_account": "TokenAccountAddress...",
    "box_price": 1000000000,
    "max_boxes": 1000,
    "boxes_created": 0,
    "is_active": true,
    "is_paused": false,
    "created_at": "2026-01-09T10:00:00.000Z"
  }
}
```

**Error Response:**
- `404` - Project not found

---

## Vault Operations

### GET /api/vault/:projectId/balance

Get vault token balance for a project.

**Response (200) - Funded Vault:**
```json
{
  "success": true,
  "project": {
    "id": "uuid-here",
    "name": "Lucky Cat Boxes",
    "subdomain": "devnet-luckycat"
  },
  "vault": {
    "address": "TokenAccountAddress...",
    "balance": "1000000000000",
    "decimals": 9,
    "uiAmount": 1000.0,
    "uiAmountString": "1000"
  },
  "network": "devnet"
}
```

**Response (200) - Unfunded Vault:**
```json
{
  "success": true,
  "project": {
    "id": "uuid-here",
    "name": "Lucky Cat Boxes",
    "subdomain": "devnet-luckycat"
  },
  "vault": {
    "address": "TokenAccountAddress...",
    "balance": "0",
    "decimals": 9,
    "uiAmount": 0,
    "uiAmountString": "0",
    "status": "not_initialized"
  },
  "network": "devnet",
  "message": "Vault token account not yet initialized. Fund it to create the account."
}
```

**Error Response:**
- `404` - Project not found
- `400` - Vault not initialized

---

### GET /api/vault/:projectId/info

Get detailed vault information for a project.

**Response (200):**
```json
{
  "success": true,
  "project": {
    "id": "uuid-here",
    "name": "Lucky Cat Boxes",
    "subdomain": "devnet-luckycat"
  },
  "vault": {
    "vault_pda": "VaultPdaAddress...",
    "vault_authority_pda": "AuthorityPdaAddress...",
    "vault_token_account": "TokenAccountAddress...",
    "vault_wallet": "VaultPdaAddress..."
  },
  "network": "devnet"
}
```

**Error Response:**
- `404` - Project not found

---

### POST /api/vault/fund

Fund a vault (placeholder - not yet implemented).

**Request Body:**
```json
{
  "projectId": "uuid-here",
  "amount": 1000000000000
}
```

**Response (501):**
```json
{
  "success": false,
  "error": "Vault funding not yet implemented",
  "message": "This endpoint will be implemented with Rust program integration"
}
```

---

## How Vault PDAs Work

When a project is created, the backend automatically derives three addresses:

1. **vault_pda** - The main vault PDA
   - Derived from: `["vault", project_id, payment_token_mint]`
   - This is the program-controlled account

2. **vault_authority_pda** - The signing authority
   - Derived from: `["vault_authority", project_id]`
   - Used to sign vault operations in the Rust program

3. **vault_token_account** - The Associated Token Account
   - Derived from vault_pda + token mint
   - Where project tokens are actually held

These addresses are deterministic and will always be the same for a given project.

---

## Network Behavior

The API automatically uses the correct network (devnet/mainnet) based on database configuration.

**Devnet:**
- Subdomain gets `devnet-` prefix automatically
- Example: `luckycat` → `devnet-luckycat.degenbox.fun`

**Mainnet:**
- No prefix
- Example: `luckycat` → `luckycat.degenbox.fun`

---

## Error Codes

- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (e.g., subdomain already exists)
- `500` - Internal Server Error
- `501` - Not Implemented

---

## Testing

### Run Tests
```bash
npm test
```

### Manual Testing with cURL

**Create Project:**
```bash
curl -X POST http://localhost:3333/api/projects/create \
  -H "Content-Type: application/json" \
  -d '{
    "owner_wallet": "EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh",
    "project_name": "Test Project",
    "subdomain": "test",
    "payment_token_mint": "So11111111111111111111111111111111111111112",
    "box_price": 1000000000
  }'
```

**List Projects:**
```bash
curl http://localhost:3333/api/projects
```

**Get Vault Balance:**
```bash
curl http://localhost:3333/api/vault/{projectId}/balance
```

---

## Next Steps

🔜 Wallet signature verification
🔜 Vault funding implementation (requires Rust program)
🔜 Box creation endpoints
🔜 Rate limiting
🔜 Admin-only endpoints protection

---

**Last Updated:** 2026-01-09
