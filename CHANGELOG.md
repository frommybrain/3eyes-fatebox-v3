# Changelog

All notable changes to the 3Eyes FateBox v3 project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- **Security middleware** - helmet for security headers, express-rate-limit for rate limiting
- **CORS wildcard subdomain support** - `*.degenbox.fun` pattern matching for project subdomains
- **Input validation with Zod** - Schemas for all API endpoints (`backend/lib/validation.js`)
- **Admin authentication middleware** - Wallet signature verification (`backend/middleware/auth.js`)
- **Utility functions** - Token formatting, API URL helpers (`backend/lib/utils.js`)
- **Development logger** - Conditional logging that's silent in production (`backend/lib/devLogger.js`)
- **Frontend API utilities** - Centralized backend URL, Solscan URLs (`frontend/lib/api.js`)
- **Environment template** - `.env.example` for deployment reference
- **This changelog file**

### Changed
- **server.js** - Complete security overhaul with helmet, rate limiting, CORS, error sanitization
- **package.json** - Added `NODE_ENV=production` to start script, new dependencies (helmet, express-rate-limit, zod)
- **vault.js** - Fixed hardcoded localhost URL to use `API_BASE_URL` environment variable
- **projects.js** - Fixed hardcoded localhost URL to use `API_BASE_URL` environment variable
- **CLAUDE.md** - Added deployment info, security features documentation

### Removed
- Nothing removed in this release

---

## [2026-01-17] - Oracle Health & Compensation System (Reverted)

### Added (then reverted)
- Oracle health tracking database table
- Automatic compensation system for oracle failures
- REFUNDED tier (tier 6) for compensated boxes

### Reverted
- **All compensation system changes** - The polling-based approach didn't scale for systems with hundreds of thousands of boxes
- Removed `backend/lib/compensation.js`
- Removed `logOracleHealth()` from switchboard.js
- Removed compensation scheduler from server.js
- Removed tier 6 from Anchor program and frontend
- Created rollback migration `017_rollback_oracle_health_tracking.sql`

### Kept
- Oracle health check endpoint (`GET /api/oracle-health`) - useful for pre-commit warnings
- Error classification for reveal failures (ORACLE_UNAVAILABLE, ORACLE_TIMEOUT, etc.)

---

## [2026-01-16] - Per-Project Luck Interval

### Added
- **Per-project luck interval** - Creators can set custom luck accumulation rates
- `luck_time_interval` field in ProjectConfig on-chain struct
- `update_project_config` instruction for updating luck interval
- Database migration `013_add_project_luck_interval.sql`
- UI for setting luck interval during project creation
- Presets: Platform Default, 3 sec (Dev), 1 hour, 3 hours, 1 day

### Changed
- `commit_box` instruction now checks project's interval first, falls back to platform default
- ManageProject page includes luck interval editing
- ProjectPage displays time-to-max-luck based on project's interval

---

## [2026-01-15] - Enterprise Activity Logging

### Added
- **Activity logging system** - Comprehensive event tracking
- `activity_logs` table with RLS policies
- `log_aggregates` for dashboard performance
- `system_health_logs` for monitoring
- Real-time log viewer in admin dashboard
- Withdrawal logging for creator payouts

### Changed
- All major operations now log to activity_logs
- Admin dashboard includes Logs tab

---

## [2026-01-14] - Treasury & Commission System

### Added
- **Platform treasury PDA** - Global treasury for commission collection
- **Configurable commission** - 0-50% (default 5%) on box purchases
- Treasury admin UI in dashboard
- `withdraw_treasury` instruction
- Treasury processing script (`scripts/process-treasury-fees.js`)
- Jupiter integration for token swaps (mainnet only)

### Changed
- `create_box` now splits payment: net to vault, commission to treasury
- Removed withdrawal fee (commission is the only platform fee)

---

## [2026-01-13] - On-Chain Config Source of Truth

### Added
- `/api/config` endpoint reads PlatformConfig PDA
- Frontend fetches config from backend (not directly from Supabase)
- Admin can update on-chain config via dashboard

### Changed
- Luck settings, payouts, commission now come from on-chain
- Database only stores RPC URL, mints, fee account

---

## [2026-01-12] - Switchboard VRF Integration

### Added
- **Switchboard On-Demand VRF** - Provably fair randomness
- Commit-reveal pattern for box opening
- 1-hour reveal window (expired boxes become duds)
- Oracle health checking

### Changed
- Migrated from manual byte parsing to SDK (`RandomnessAccountData::parse()`)
- Box opening is now two-step: commit (freeze luck) → reveal (get randomness)

---

## [Earlier] - Initial Development

### Added
- Multi-tenant lootbox platform architecture
- Anchor program with PlatformConfig, ProjectConfig, BoxInstance PDAs
- Project creation with launch fee
- Box purchase, reveal, settle flow
- Luck system (hold longer = better odds)
- No-dud model (duds only for expired boxes)
- Subdomain routing (`*.degenbox.fun`)
- Admin dashboard
- Supabase database integration

---

## Migration Notes

### Database Migrations Applied
1. `001_treasury_to_vault.sql`
2. `002_reserved_subdomains.sql`
3. `003_add_payment_token_fields.sql`
4. `004_add_numeric_id_sequence.sql`
5. `005_add_box_verification_columns.sql`
6. `006_add_switchboard_vrf_columns.sql`
7. `006b_add_withdrawal_tracking.sql`
8. `007_add_commit_tracking_columns.sql`
9. `010_add_treasury_processing_log.sql`
10. `011_remove_vault_fund_amount.sql`
11. `012_advance_project_sequence.sql`
12. `013_add_project_luck_interval.sql`
13. `014_activity_logs.sql`
14. `014b_fix_activity_logs_rls.sql`
15. `015_remove_withdrawal_fee_percentage.sql`
16. `016_oracle_health_tracking.sql` (may need rollback)
17. `017_rollback_oracle_health_tracking.sql` (rollback for 016)

### Anchor Program Deployments
- Program ID: `GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat`
- Network: Devnet
- Last deployed: January 2026

---

*Changelog maintained for 3Eyes FateBox v3*
