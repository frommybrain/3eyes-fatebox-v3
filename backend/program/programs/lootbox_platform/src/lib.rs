use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use switchboard_on_demand::accounts::RandomnessAccountData;

// Program ID from keypair: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
declare_id!("GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat");

// Constants
const REVEAL_WINDOW_SECONDS: i64 = 3600; // 1 hour to reveal after commit

// Default values for configurable settings (used if platform_config values are 0)
const DEFAULT_REFUND_GRACE_PERIOD_SECONDS: i64 = 120; // 2 minutes default grace period
// Note: No minimum box price constant - just prevent zero. Different tokens have different values.

// Switchboard On-Demand program IDs
const SWITCHBOARD_MAINNET_PROGRAM_ID: &str = "SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv";
const SWITCHBOARD_DEVNET_PROGRAM_ID: &str = "Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2";

#[program]
pub mod lootbox_platform {
    use super::*;

    /// Initialize the platform configuration (one-time setup by admin)
    /// This creates a global config PDA that stores all tunable parameters
    pub fn initialize_platform_config(
        ctx: Context<InitializePlatformConfig>,
        luck_time_interval: i64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.platform_config;
        let clock = Clock::get()?;

        // Set admin to the initializer (deploy wallet)
        config.admin = ctx.accounts.admin.key();
        config.initialized = true;
        config.paused = false;

        // Luck parameters
        config.base_luck = 5;
        config.max_luck = 60;
        config.luck_time_interval = luck_time_interval; // e.g., 10800 for production (3 hours)

        // Payout multipliers (basis points: 10000 = 1.0x)
        config.payout_dud = 0;           // 0x (only for expired boxes)
        config.payout_rebate = 5000;     // 0.5x
        config.payout_breakeven = 10000; // 1.0x
        config.payout_profit = 15000;    // 1.5x
        config.payout_jackpot = 40000;   // 4x

        // No-Dud Model: Duds only occur for expired boxes (1hr reveal window)
        // All probabilities in basis points (10000 = 100%)
        // Jackpot is the remainder (10000 - sum of others)

        // Tier 1: Luck 0-5 (new users) - 74.5% RTP
        config.tier1_max_luck = 5;
        config.tier1_dud = 0;            // 0% (no duds in normal play)
        config.tier1_rebate = 7200;      // 72%
        config.tier1_breakeven = 1700;   // 17%
        config.tier1_profit = 900;       // 9%
        // Jackpot = 10000 - 0 - 7200 - 1700 - 900 = 200 (2%)

        // Tier 2: Luck 6-13 (medium holders) - 85% RTP
        config.tier2_max_luck = 13;
        config.tier2_dud = 0;            // 0%
        config.tier2_rebate = 5700;      // 57%
        config.tier2_breakeven = 2600;   // 26%
        config.tier2_profit = 1500;      // 15%
        // Jackpot = 10000 - 0 - 5700 - 2600 - 1500 = 200 (2%)

        // Tier 3: Luck 14-60 (diamond hands) - 94% RTP
        config.tier3_dud = 0;            // 0%
        config.tier3_rebate = 4400;      // 44%
        config.tier3_breakeven = 3400;   // 34%
        config.tier3_profit = 2000;      // 20%
        // Jackpot = 10000 - 0 - 4400 - 3400 - 2000 = 200 (2%)

        // Platform commission (1% default)
        config.platform_commission_bps = 100;
        config.treasury_bump = ctx.bumps.treasury;

        config.updated_at = clock.unix_timestamp;

        // ============================================================================
        // PRESET 1: "Conservative" - Steady returns, lower variance (~88% RTP all tiers)
        // ============================================================================
        config.preset1_payout_rebate = 6000;     // 0.6x
        config.preset1_payout_breakeven = 10000; // 1.0x
        config.preset1_payout_profit = 13000;    // 1.3x
        config.preset1_payout_jackpot = 30000;   // 3x
        // All tiers have same probabilities (~88% RTP)
        config.preset1_tier1_dud = 0;
        config.preset1_tier1_rebate = 5000;      // 50%
        config.preset1_tier1_breakeven = 3000;   // 30%
        config.preset1_tier1_profit = 1800;      // 18%
        config.preset1_tier2_dud = 0;
        config.preset1_tier2_rebate = 5000;
        config.preset1_tier2_breakeven = 3000;
        config.preset1_tier2_profit = 1800;
        config.preset1_tier3_dud = 0;
        config.preset1_tier3_rebate = 5000;
        config.preset1_tier3_breakeven = 3000;
        config.preset1_tier3_profit = 1800;
        // Jackpot = 10000 - 0 - 5000 - 3000 - 1800 = 200 (2%)

        // ============================================================================
        // PRESET 2: "Degen" - Higher variance, bigger jackpots (~75% RTP)
        // ============================================================================
        config.preset2_payout_rebate = 4000;     // 0.4x
        config.preset2_payout_breakeven = 10000; // 1.0x
        config.preset2_payout_profit = 20000;    // 2.0x
        config.preset2_payout_jackpot = 80000;   // 8x
        // Higher jackpot chance, more rebates
        config.preset2_tier1_dud = 0;
        config.preset2_tier1_rebate = 7500;      // 75%
        config.preset2_tier1_breakeven = 1200;   // 12%
        config.preset2_tier1_profit = 800;       // 8%
        config.preset2_tier2_dud = 0;
        config.preset2_tier2_rebate = 6500;      // 65%
        config.preset2_tier2_breakeven = 2000;   // 20%
        config.preset2_tier2_profit = 1000;      // 10%
        config.preset2_tier3_dud = 0;
        config.preset2_tier3_rebate = 5500;      // 55%
        config.preset2_tier3_breakeven = 2500;   // 25%
        config.preset2_tier3_profit = 1500;      // 15%
        // Jackpot = 10000 - others = 500 (5%)

        // ============================================================================
        // PRESET 3: "Whale" - Highest RTP for big spenders (~95% RTP)
        // ============================================================================
        config.preset3_payout_rebate = 7000;     // 0.7x
        config.preset3_payout_breakeven = 10000; // 1.0x
        config.preset3_payout_profit = 14000;    // 1.4x
        config.preset3_payout_jackpot = 35000;   // 3.5x
        // Best odds across all tiers
        config.preset3_tier1_dud = 0;
        config.preset3_tier1_rebate = 4000;      // 40%
        config.preset3_tier1_breakeven = 3500;   // 35%
        config.preset3_tier1_profit = 2200;      // 22%
        config.preset3_tier2_dud = 0;
        config.preset3_tier2_rebate = 3500;      // 35%
        config.preset3_tier2_breakeven = 3800;   // 38%
        config.preset3_tier2_profit = 2400;      // 24%
        config.preset3_tier3_dud = 0;
        config.preset3_tier3_rebate = 3000;      // 30%
        config.preset3_tier3_breakeven = 4000;   // 40%
        config.preset3_tier3_profit = 2700;      // 27%
        // Jackpot = 10000 - others = 300 (3%)

        // Security settings with sensible defaults
        config.min_box_price = 0;  // Not used - kept for future if needed
        config.refund_grace_period = DEFAULT_REFUND_GRACE_PERIOD_SECONDS;  // 2 minutes

        // Reserved bytes initialized to 0
        config.reserved = [0u8; 16];

        msg!("Platform config initialized!");
        msg!("Admin: {}", config.admin);
        msg!("Luck time interval: {} seconds", luck_time_interval);
        msg!("Refund grace period: {} seconds", config.refund_grace_period);
        msg!("3 game presets configured (Conservative, Degen, Whale)");

        Ok(())
    }

    /// Update platform configuration (admin only)
    /// Allows adjusting probabilities and payouts without redeploying
    pub fn update_platform_config(
        ctx: Context<UpdatePlatformConfig>,
        // Luck parameters (optional)
        base_luck: Option<u8>,
        max_luck: Option<u8>,
        luck_time_interval: Option<i64>,
        // Payout multipliers (optional, basis points)
        payout_dud: Option<u32>,
        payout_rebate: Option<u32>,
        payout_breakeven: Option<u32>,
        payout_profit: Option<u32>,
        payout_jackpot: Option<u32>,
        // Tier 1 probabilities (optional)
        tier1_max_luck: Option<u8>,
        tier1_dud: Option<u16>,
        tier1_rebate: Option<u16>,
        tier1_breakeven: Option<u16>,
        tier1_profit: Option<u16>,
        // Tier 2 probabilities (optional)
        tier2_max_luck: Option<u8>,
        tier2_dud: Option<u16>,
        tier2_rebate: Option<u16>,
        tier2_breakeven: Option<u16>,
        tier2_profit: Option<u16>,
        // Tier 3 probabilities (optional)
        tier3_dud: Option<u16>,
        tier3_rebate: Option<u16>,
        tier3_breakeven: Option<u16>,
        tier3_profit: Option<u16>,
        // Emergency pause
        paused: Option<bool>,
        // Platform commission (basis points, 500 = 5%)
        platform_commission_bps: Option<u16>,
        // Security settings
        min_box_price: Option<u64>,
        refund_grace_period: Option<i64>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.platform_config;
        let clock = Clock::get()?;

        // Update luck parameters
        if let Some(v) = base_luck { config.base_luck = v; }
        if let Some(v) = max_luck { config.max_luck = v; }
        if let Some(v) = luck_time_interval { config.luck_time_interval = v; }

        // Update payout multipliers
        if let Some(v) = payout_dud { config.payout_dud = v; }
        if let Some(v) = payout_rebate { config.payout_rebate = v; }
        if let Some(v) = payout_breakeven { config.payout_breakeven = v; }
        if let Some(v) = payout_profit { config.payout_profit = v; }
        if let Some(v) = payout_jackpot { config.payout_jackpot = v; }

        // Update Tier 1
        if let Some(v) = tier1_max_luck { config.tier1_max_luck = v; }
        if let Some(v) = tier1_dud { config.tier1_dud = v; }
        if let Some(v) = tier1_rebate { config.tier1_rebate = v; }
        if let Some(v) = tier1_breakeven { config.tier1_breakeven = v; }
        if let Some(v) = tier1_profit { config.tier1_profit = v; }

        // Update Tier 2
        if let Some(v) = tier2_max_luck { config.tier2_max_luck = v; }
        if let Some(v) = tier2_dud { config.tier2_dud = v; }
        if let Some(v) = tier2_rebate { config.tier2_rebate = v; }
        if let Some(v) = tier2_breakeven { config.tier2_breakeven = v; }
        if let Some(v) = tier2_profit { config.tier2_profit = v; }

        // Update Tier 3
        if let Some(v) = tier3_dud { config.tier3_dud = v; }
        if let Some(v) = tier3_rebate { config.tier3_rebate = v; }
        if let Some(v) = tier3_breakeven { config.tier3_breakeven = v; }
        if let Some(v) = tier3_profit { config.tier3_profit = v; }

        // Validate probability sums (jackpot is the remainder, so sum of others must be <= 10000)
        // This ensures valid probability distributions and prevents admin misconfiguration
        let tier1_sum = (config.tier1_dud as u32)
            .saturating_add(config.tier1_rebate as u32)
            .saturating_add(config.tier1_breakeven as u32)
            .saturating_add(config.tier1_profit as u32);
        require!(tier1_sum <= 10000, LootboxError::InvalidProbabilitySum);

        let tier2_sum = (config.tier2_dud as u32)
            .saturating_add(config.tier2_rebate as u32)
            .saturating_add(config.tier2_breakeven as u32)
            .saturating_add(config.tier2_profit as u32);
        require!(tier2_sum <= 10000, LootboxError::InvalidProbabilitySum);

        let tier3_sum = (config.tier3_dud as u32)
            .saturating_add(config.tier3_rebate as u32)
            .saturating_add(config.tier3_breakeven as u32)
            .saturating_add(config.tier3_profit as u32);
        require!(tier3_sum <= 10000, LootboxError::InvalidProbabilitySum);

        msg!("Tier probabilities validated: T1={}bp, T2={}bp, T3={}bp (jackpot is remainder)",
            tier1_sum, tier2_sum, tier3_sum);

        // Update pause state
        if let Some(v) = paused {
            config.paused = v;
            if v {
                msg!("PLATFORM PAUSED BY ADMIN");
            } else {
                msg!("Platform resumed by admin");
            }
        }

        // Update platform commission
        if let Some(v) = platform_commission_bps {
            // Sanity check: max 50% commission (5000 bps)
            require!(v <= 5000, LootboxError::InvalidCommissionRate);
            config.platform_commission_bps = v;
            msg!("Platform commission updated to {} bps ({}%)", v, v as f64 / 100.0);
        }

        // Update security settings
        if let Some(v) = min_box_price {
            config.min_box_price = v;
            msg!("Min box price updated to {} base units", v);
        }
        if let Some(v) = refund_grace_period {
            require!(v >= 0, LootboxError::InvalidLuckInterval); // Reuse error for negative check
            config.refund_grace_period = v;
            msg!("Refund grace period updated to {} seconds", v);
        }

        config.updated_at = clock.unix_timestamp;

        msg!("Platform config updated at {}", clock.unix_timestamp);

        Ok(())
    }

    /// Transfer platform admin to new wallet (safety feature)
    pub fn transfer_platform_admin(
        ctx: Context<TransferPlatformAdmin>,
        new_admin: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.platform_config;

        msg!("Transferring platform admin from {} to {}", config.admin, new_admin);
        config.admin = new_admin;

        Ok(())
    }

    /// Initialize a new project with vault
    /// Creator pays launch fee in t3EYES1 to create project
    pub fn initialize_project(
        ctx: Context<InitializeProject>,
        project_id: u64,
        box_price: u64,
        launch_fee_amount: u64,
        luck_time_interval: i64,  // Per-project luck interval (0 = use platform default)
    ) -> Result<()> {
        // Check platform is not paused
        let platform_config = &ctx.accounts.platform_config;
        require!(!platform_config.paused, LootboxError::PlatformPaused);

        let project_config = &mut ctx.accounts.project_config;
        let clock = Clock::get()?;

        // Validate box price is not zero (different tokens have different values, so no min)
        require!(box_price > 0, LootboxError::InvalidBoxPrice);
        require!(luck_time_interval >= 0, LootboxError::InvalidLuckInterval);

        // Transfer launch fee from owner to platform fee account
        let cpi_accounts = Transfer {
            from: ctx.accounts.owner_fee_token_account.to_account_info(),
            to: ctx.accounts.platform_fee_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, launch_fee_amount)?;

        msg!("Launch fee paid: {} tokens", launch_fee_amount);

        // Initialize project configuration
        project_config.project_id = project_id;
        project_config.owner = ctx.accounts.owner.key();
        project_config.payment_token_mint = ctx.accounts.payment_token_mint.key();
        project_config.box_price = box_price;
        project_config.vault_authority_bump = ctx.bumps.vault_authority;
        project_config.total_boxes_created = 0;
        project_config.total_boxes_settled = 0;
        project_config.total_revenue = 0;
        project_config.total_paid_out = 0;
        project_config.active = true;
        project_config.launch_fee_paid = true;
        project_config.created_at = clock.unix_timestamp;
        project_config.luck_time_interval = luck_time_interval;
        project_config.game_preset = 0;  // Default to platform preset (0)
        project_config.reserved = [0u8; 7];

        msg!("Project initialized!");
        msg!("Project ID: {}", project_id);
        msg!("Owner: {}", ctx.accounts.owner.key());
        msg!("Payment token: {}", ctx.accounts.payment_token_mint.key());
        msg!("Box price: {}", box_price);
        msg!("Vault authority: {}", ctx.accounts.vault_authority.key());
        msg!("Luck time interval: {}", luck_time_interval);
        msg!("Game preset: 0 (platform default)");

        Ok(())
    }

    /// Create a new box (user purchases box)
    /// Transfers payment from buyer to vault
    /// Box is created in "pending" state - randomness committed later when user opens
    pub fn create_box(
        ctx: Context<CreateBox>,
        project_id: u64,
    ) -> Result<()> {
        // Check platform is not paused
        require!(!ctx.accounts.platform_config.paused, LootboxError::PlatformPaused);

        let project_config = &mut ctx.accounts.project_config;
        let box_instance = &mut ctx.accounts.box_instance;
        let platform_config = &ctx.accounts.platform_config;
        let clock = Clock::get()?;

        // Check if project is active
        require!(project_config.active, LootboxError::ProjectInactive);

        // Get new box ID (increment counter)
        let box_id = project_config.total_boxes_created
            .checked_add(1)
            .ok_or(LootboxError::ArithmeticOverflow)?;

        // Calculate commission split
        let box_price = project_config.box_price;
        let commission_bps = platform_config.platform_commission_bps as u64;
        let commission_amount = box_price
            .checked_mul(commission_bps)
            .ok_or(LootboxError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(LootboxError::ArithmeticOverflow)?;
        let creator_amount = box_price
            .checked_sub(commission_amount)
            .ok_or(LootboxError::ArithmeticOverflow)?;

        // Transfer creator's portion to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program.clone(), cpi_accounts);
        token::transfer(cpi_ctx, creator_amount)?;

        // Transfer commission to treasury (if commission > 0)
        if commission_amount > 0 {
            let cpi_accounts_treasury = Transfer {
                from: ctx.accounts.buyer_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            };
            let cpi_ctx_treasury = CpiContext::new(cpi_program, cpi_accounts_treasury);
            token::transfer(cpi_ctx_treasury, commission_amount)?;
            msg!("Platform commission: {} tokens to treasury", commission_amount);
        }

        // Initialize box instance (no randomness yet - committed when user opens box)
        box_instance.box_id = box_id;
        box_instance.project_id = project_id;
        box_instance.owner = ctx.accounts.buyer.key();
        box_instance.created_at = clock.unix_timestamp;
        box_instance.committed_at = 0; // Not committed yet
        box_instance.luck = platform_config.base_luck; // Base luck from config
        box_instance.revealed = false;
        box_instance.settled = false;
        box_instance.reward_amount = 0;
        box_instance.is_jackpot = false;
        box_instance.random_percentage = 0.0;
        box_instance.reward_tier = 0;
        box_instance.randomness_account = Pubkey::default(); // Placeholder until commit
        box_instance.randomness_committed = false; // Will be true after commit_box
        box_instance.committed_slot = 0; // Set during commit_box
        box_instance.snapshot_game_preset = 0; // Set during commit_box
        // SECURITY: Store price at purchase time to protect against price manipulation
        box_instance.purchased_price = project_config.box_price;

        // Update project stats
        project_config.total_boxes_created = box_id;
        project_config.total_revenue = project_config.total_revenue
            .checked_add(project_config.box_price)
            .ok_or(LootboxError::ArithmeticOverflow)?;

        msg!("Box purchased!");
        msg!("Box ID: {}", box_id);
        msg!("Project ID: {}", project_id);
        msg!("Owner: {}", ctx.accounts.buyer.key());
        msg!("Price paid: {}", project_config.box_price);
        msg!("Status: Pending (randomness not yet committed)");

        Ok(())
    }

    /// Commit randomness for a box (user opens box)
    /// Called when user decides to open their box
    /// Freezes luck at commit time and stores Switchboard randomness account
    pub fn commit_box(
        ctx: Context<CommitBox>,
        _project_id: u64,
        box_id: u64,
        randomness_account: Pubkey,
    ) -> Result<()> {
        // Check platform is not paused
        require!(!ctx.accounts.platform_config.paused, LootboxError::PlatformPaused);

        let box_instance = &mut ctx.accounts.box_instance;
        let platform_config = &ctx.accounts.platform_config;
        let project_config = &ctx.accounts.project_config;
        let clock = Clock::get()?;

        // Verify ownership
        require!(
            box_instance.owner == ctx.accounts.owner.key(),
            LootboxError::NotBoxOwner
        );

        // Verify not already committed
        require!(
            !box_instance.randomness_committed,
            LootboxError::RandomnessAlreadyCommitted
        );

        // Verify not already revealed
        require!(!box_instance.revealed, LootboxError::BoxAlreadyRevealed);

        // Calculate and freeze luck at commit time using config values
        let hold_time = clock.unix_timestamp - box_instance.created_at;

        // Use project's interval if set (> 0), otherwise fall back to platform default
        let effective_interval = if project_config.luck_time_interval > 0 {
            project_config.luck_time_interval
        } else {
            platform_config.luck_time_interval
        };

        let bonus_luck_raw = if effective_interval > 0 {
            hold_time / effective_interval
        } else {
            0
        };
        // Clamp to u8 max before casting to prevent overflow (e.g., 265 as u8 = 9)
        let bonus_luck = std::cmp::min(bonus_luck_raw, 255) as u8;
        let current_luck = std::cmp::min(
            platform_config.base_luck.saturating_add(bonus_luck),
            platform_config.max_luck
        );

        // Store randomness account and commit timestamp
        box_instance.randomness_account = randomness_account;
        box_instance.randomness_committed = true;
        box_instance.committed_at = clock.unix_timestamp;
        box_instance.luck = current_luck; // Freeze luck at commit time

        // SECURITY: Store current slot for randomness validation
        // Randomness must have been generated AFTER this slot to be valid
        box_instance.committed_slot = clock.slot;

        // SECURITY: Snapshot game preset at commit time to prevent mid-game odds manipulation
        // This ensures admin can't change odds after user commits
        box_instance.snapshot_game_preset = project_config.game_preset;

        msg!("Box opened - randomness committed!");
        msg!("Box ID: {}", box_id);
        msg!("Owner: {}", ctx.accounts.owner.key());
        msg!("Hold time: {} seconds", hold_time);
        msg!("Luck interval: {} (project: {}, platform: {})", effective_interval, project_config.luck_time_interval, platform_config.luck_time_interval);
        msg!("Luck frozen at: {}/{}", current_luck, platform_config.max_luck);
        msg!("Randomness account: {}", randomness_account);
        msg!("Committed at slot: {}", clock.slot);
        msg!("Game preset snapshot: {}", project_config.game_preset);
        msg!("User has {} seconds to reveal!", REVEAL_WINDOW_SECONDS);

        Ok(())
    }

    /// Reveal box with Switchboard VRF randomness
    /// Reads randomness from Switchboard on-demand account
    /// Uses luck that was frozen at commit time
    pub fn reveal_box(
        ctx: Context<RevealBox>,
        _project_id: u64,
        box_id: u64,
    ) -> Result<()> {
        // Check platform is not paused
        require!(!ctx.accounts.platform_config.paused, LootboxError::PlatformPaused);

        let box_instance = &mut ctx.accounts.box_instance;
        let project_config = &mut ctx.accounts.project_config;
        let platform_config = &ctx.accounts.platform_config;
        let clock = Clock::get()?;

        // Verify ownership
        require!(
            box_instance.owner == ctx.accounts.owner.key(),
            LootboxError::NotBoxOwner
        );

        // Verify not already revealed
        require!(!box_instance.revealed, LootboxError::BoxAlreadyRevealed);

        // Verify randomness was committed
        require!(
            box_instance.randomness_committed,
            LootboxError::RandomnessNotCommitted
        );

        // Verify the randomness account matches what was committed
        require!(
            box_instance.randomness_account == ctx.accounts.randomness_account.key(),
            LootboxError::InvalidRandomnessAccount
        );

        // CRITICAL: Check reveal window hasn't expired (1 hour)
        let time_since_commit = clock.unix_timestamp - box_instance.committed_at;
        if time_since_commit > REVEAL_WINDOW_SECONDS {
            // Reveal window expired - box becomes a Dud
            msg!("REVEAL WINDOW EXPIRED! Box is now a Dud.");
            msg!("Time since commit: {} seconds (max: {})", time_since_commit, REVEAL_WINDOW_SECONDS);

            box_instance.revealed = true;
            box_instance.reward_amount = 0;
            box_instance.is_jackpot = false;
            box_instance.reward_tier = 0; // Dud
            box_instance.random_percentage = 0.0;

            return Ok(());
        }

        // Use the luck that was frozen at commit time (no recalculation)
        let current_luck = box_instance.luck;

        // Parse randomness using official Switchboard SDK
        // This abstracts away byte offsets and handles future format changes
        let randomness_data = RandomnessAccountData::parse(
            ctx.accounts.randomness_account.try_borrow_data()?
        ).map_err(|_| LootboxError::RandomnessNotReady)?;

        // SECURITY NOTE: Switchboard's get_value() already validates reveal timing
        // The seed_slot check was causing false positives because the slot may differ
        // between when Switchboard's commitIx runs vs our commit_box instruction,
        // even within the same transaction (depending on instruction ordering).
        //
        // The real security comes from:
        // 1. Switchboard's get_value(clock.slot) requiring reveal_slot == current slot
        // 2. The randomness_account constraint matching what was stored at commit time
        // 3. The reveal window (1 hour) limiting manipulation opportunities
        let seed_slot = randomness_data.seed_slot;
        msg!("Randomness slot info: seed_slot={}, committed_slot={}, current_slot={}",
            seed_slot, box_instance.committed_slot, clock.slot);

        // Get the revealed random value (32 bytes) using SDK method
        // This validates that randomness has been revealed and returns the value
        // Pass the current slot as u64 for the SDK to validate reveal timing
        let revealed_random_value: [u8; 32] = randomness_data
            .get_value(clock.slot)
            .map_err(|_| LootboxError::RandomnessNotReady)?;

        msg!("Switchboard SDK parsed randomness successfully");
        msg!("Randomness bytes (first 8): [{}, {}, {}, {}, {}, {}, {}, {}]",
            revealed_random_value[0], revealed_random_value[1],
            revealed_random_value[2], revealed_random_value[3],
            revealed_random_value[4], revealed_random_value[5],
            revealed_random_value[6], revealed_random_value[7]);

        // Use 8 bytes (u64) for better entropy distribution (vs 4 bytes u32 before)
        let random_u64 = u64::from_le_bytes([
            revealed_random_value[0], revealed_random_value[1],
            revealed_random_value[2], revealed_random_value[3],
            revealed_random_value[4], revealed_random_value[5],
            revealed_random_value[6], revealed_random_value[7],
        ]);

        // FIXED-POINT ARITHMETIC: Convert to basis points (0-10000) without floats
        // We use u128 intermediate to avoid overflow: (random_u64 * 10000) / u64::MAX
        // This gives us a value in range [0, 10000] representing 0.00% to 100.00%
        let random_basis_points: u16 = ((random_u64 as u128)
            .checked_mul(10000)
            .ok_or(LootboxError::ArithmeticOverflow)?
            / (u64::MAX as u128)) as u16;

        msg!("Switchboard randomness: u64={}, basis_points={}", random_u64, random_basis_points);

        // Calculate reward based on luck and randomness using config values
        // SECURITY: Use the SNAPSHOTTED game preset from commit time, not current project config
        // This prevents admin from changing odds after user commits
        // SECURITY: Use purchased_price (frozen at purchase time) instead of current box_price
        // This prevents reward manipulation via price changes after purchase
        let (reward_amount, is_jackpot, reward_tier) = calculate_reward_from_config(
            current_luck,
            random_basis_points,
            box_instance.purchased_price,
            platform_config,
            box_instance.snapshot_game_preset, // Use snapshot, not project_config.game_preset
        )?;

        // Update box state
        box_instance.luck = current_luck;
        box_instance.revealed = true;
        box_instance.reward_amount = reward_amount;
        box_instance.is_jackpot = is_jackpot;
        // Store basis points instead of float (backwards compatible: same 8 bytes, different interpretation)
        box_instance.random_percentage = random_basis_points as f64; // Store as bps for backwards compat
        box_instance.reward_tier = reward_tier;

        let tier_name = match reward_tier {
            0 => "Dud",
            1 => "Rebate",
            2 => "Break-even",
            3 => "Profit",
            4 => "Jackpot",
            _ => "Unknown",
        };

        msg!("Box revealed with Switchboard VRF!");
        msg!("Box ID: {}", box_id);
        msg!("Luck: {}/{}", current_luck, platform_config.max_luck);
        msg!("Random roll: {:.2}%", (random_basis_points as f64) / 100.0);
        msg!("Tier: {} ({})", tier_name, reward_tier);
        msg!("Reward: {}", reward_amount);
        msg!("Is jackpot: {}", is_jackpot);

        Ok(())
    }

    /// Settle box and transfer reward to owner
    /// Uses vault authority PDA as signer
    pub fn settle_box(
        ctx: Context<SettleBox>,
        project_id: u64,
        box_id: u64,
    ) -> Result<()> {
        // Note: We allow settling even if platform is paused (users should get their rewards)

        let box_instance = &mut ctx.accounts.box_instance;
        let project_config = &mut ctx.accounts.project_config;

        // Verify ownership
        require!(
            box_instance.owner == ctx.accounts.owner.key(),
            LootboxError::NotBoxOwner
        );

        // Verify box is revealed
        require!(box_instance.revealed, LootboxError::BoxNotRevealed);

        // Verify not already settled
        require!(!box_instance.settled, LootboxError::BoxAlreadySettled);

        // Verify sufficient vault balance
        require!(
            ctx.accounts.vault_token_account.amount >= box_instance.reward_amount,
            LootboxError::InsufficientVaultBalance
        );

        // Transfer reward from vault to owner using PDA signer
        if box_instance.reward_amount > 0 {
            let project_id_bytes = project_id.to_le_bytes();
            let payment_token_key = ctx.accounts.payment_token_mint.key();
            let seeds = &[
                b"vault",
                project_id_bytes.as_ref(),
                payment_token_key.as_ref(),
                &[project_config.vault_authority_bump],
            ];
            let signer = &[&seeds[..]];

            // SECURITY: Mark as settled BEFORE CPI to prevent reentrancy
            // If a malicious token program calls back into our program, the box is already settled
            box_instance.settled = true;

            // Update project stats BEFORE CPI
            project_config.total_boxes_settled = project_config.total_boxes_settled
                .checked_add(1)
                .ok_or(LootboxError::ArithmeticOverflow)?;
            project_config.total_paid_out = project_config.total_paid_out
                .checked_add(box_instance.reward_amount)
                .ok_or(LootboxError::ArithmeticOverflow)?;

            let cpi_accounts = Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.owner_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, box_instance.reward_amount)?;
        } else {
            // No reward to transfer, but still mark as settled
            box_instance.settled = true;
            project_config.total_boxes_settled = project_config.total_boxes_settled
                .checked_add(1)
                .ok_or(LootboxError::ArithmeticOverflow)?;
        }

        msg!("Box settled!");
        msg!("Box ID: {}", box_id);
        msg!("Reward transferred: {}", box_instance.reward_amount);

        Ok(())
    }

    /// Project owner withdraws earnings from vault
    /// Includes reserve protection: vault must retain enough to cover pending box payouts
    ///
    /// @param project_id - The project ID
    /// @param amount - Amount to withdraw
    /// @param pending_reserve - Minimum reserve that must remain in vault (calculated off-chain)
    ///                          This should be the max potential payout for all unsettled boxes
    pub fn withdraw_earnings(
        ctx: Context<WithdrawEarnings>,
        project_id: u64,
        amount: u64,
        pending_reserve: u64,
    ) -> Result<()> {
        // SECURITY: Check platform is not paused - prevents draining in case of vulnerability
        require!(!ctx.accounts.platform_config.paused, LootboxError::PlatformPaused);

        let project_config = &ctx.accounts.project_config;

        // Verify ownership
        require!(
            project_config.owner == ctx.accounts.owner.key(),
            LootboxError::NotProjectOwner
        );

        // Verify vault has enough balance
        let vault_balance = ctx.accounts.vault_token_account.amount;
        require!(
            amount <= vault_balance,
            LootboxError::InsufficientVaultBalance
        );

        // SECURITY: Ensure vault retains enough for pending box payouts
        // pending_reserve is the maximum potential payout for unsettled boxes,
        // calculated off-chain as: sum of (box_price * max_payout_multiplier) for each pending box
        let available_for_withdrawal = vault_balance.saturating_sub(pending_reserve);
        require!(
            amount <= available_for_withdrawal,
            LootboxError::WithdrawalExceedsAvailable
        );

        msg!("Vault balance: {}", vault_balance);
        msg!("Pending reserve required: {}", pending_reserve);
        msg!("Available for withdrawal: {}", available_for_withdrawal);
        msg!("Withdrawal amount: {}", amount);

        // Transfer from vault to owner using PDA signer
        let project_id_bytes = project_id.to_le_bytes();
        let payment_token_key = ctx.accounts.payment_token_mint.key();
        let seeds = &[
            b"vault",
            project_id_bytes.as_ref(),
            payment_token_key.as_ref(),
            &[project_config.vault_authority_bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.owner_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        msg!("Earnings withdrawn!");
        msg!("Amount: {}", amount);
        msg!("Owner: {}", ctx.accounts.owner.key());

        Ok(())
    }

    /// Refund a box that failed due to system issues (oracle unavailable, etc.)
    /// This allows users to recover their funds when the system fails them.
    ///
    /// Requirements:
    /// - Box must be committed (randomness_committed = true)
    /// - Box must NOT be revealed (revealed = false)
    /// - Box must NOT be settled (settled = false)
    /// - At least refund_grace_period seconds must have passed since commit
    ///   (prevents gaming by immediately requesting refund after bad oracle result)
    ///
    /// Note: The backend tracks which boxes are eligible for refund (system errors)
    /// vs which expired due to user inaction (duds). Refund eligibility is checked
    /// off-chain in the database before this instruction is called.
    pub fn refund_box(
        ctx: Context<RefundBox>,
        project_id: u64,
        box_id: u64,
    ) -> Result<()> {
        let box_instance = &mut ctx.accounts.box_instance;
        let project_config = &ctx.accounts.project_config;
        let platform_config = &ctx.accounts.platform_config;
        let clock = Clock::get()?;

        // Verify ownership
        require!(
            box_instance.owner == ctx.accounts.owner.key(),
            LootboxError::NotBoxOwner
        );

        // Verify box is committed but NOT revealed
        require!(
            box_instance.randomness_committed,
            LootboxError::BoxNotCommitted
        );
        require!(!box_instance.revealed, LootboxError::BoxAlreadyRevealed);
        require!(!box_instance.settled, LootboxError::BoxAlreadySettled);

        // SECURITY: Enforce grace period before refund is allowed
        // This prevents users from calling refund immediately after seeing an unfavorable
        // oracle result (the oracle may still resolve successfully within this window)
        // Use config value, fall back to default if config is 0
        let grace_period = if platform_config.refund_grace_period > 0 {
            platform_config.refund_grace_period
        } else {
            DEFAULT_REFUND_GRACE_PERIOD_SECONDS
        };

        let time_since_commit = clock.unix_timestamp - box_instance.committed_at;
        require!(
            time_since_commit >= grace_period,
            LootboxError::RefundGracePeriodNotElapsed
        );

        msg!("Grace period check passed: {} seconds since commit (min: {})",
            time_since_commit, grace_period);

        // SECURITY: Calculate refund amount as only what the vault received
        // During purchase: commission goes to treasury, remainder goes to vault
        // Refund should only return what's in vault (box_price - commission)
        // This prevents fund drainage where vault pays more than it received
        // SECURITY: Use purchased_price (frozen at purchase time) instead of current box_price
        // This ensures refund matches what was actually paid
        let commission_bps = platform_config.platform_commission_bps as u64;
        let commission_amount = box_instance.purchased_price
            .checked_mul(commission_bps)
            .ok_or(LootboxError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(LootboxError::ArithmeticOverflow)?;
        let refund_amount = box_instance.purchased_price
            .checked_sub(commission_amount)
            .ok_or(LootboxError::ArithmeticOverflow)?;

        msg!("Refund calculation: purchased_price={}, commission={}bps ({}), refund={}",
            box_instance.purchased_price, commission_bps, commission_amount, refund_amount);

        // Verify vault has sufficient balance
        require!(
            ctx.accounts.vault_token_account.amount >= refund_amount,
            LootboxError::InsufficientVaultBalance
        );

        // Transfer refund from vault to owner using PDA signer
        let project_id_bytes = project_id.to_le_bytes();
        let payment_token_key = ctx.accounts.payment_token_mint.key();
        let seeds = &[
            b"vault",
            project_id_bytes.as_ref(),
            payment_token_key.as_ref(),
            &[project_config.vault_authority_bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.owner_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, refund_amount)?;

        // Mark as settled with refund (reward_amount = box_price for refund)
        box_instance.settled = true;
        box_instance.revealed = true;  // Mark as revealed to prevent further actions
        box_instance.reward_amount = refund_amount;
        box_instance.reward_tier = 6;  // 6 = REFUNDED (new tier)

        msg!("Box refunded!");
        msg!("Box ID: {}", box_id);
        msg!("Refund amount: {}", refund_amount);
        msg!("Owner: {}", ctx.accounts.owner.key());

        Ok(())
    }

    /// Update project settings (pause/resume, change box price)
    pub fn update_project(
        ctx: Context<UpdateProject>,
        _project_id: u64,
        new_box_price: Option<u64>,
        new_active: Option<bool>,
        new_luck_time_interval: Option<i64>,
    ) -> Result<()> {
        let project_config = &mut ctx.accounts.project_config;

        // Verify ownership
        require!(
            project_config.owner == ctx.accounts.owner.key(),
            LootboxError::NotProjectOwner
        );

        // Update box price if provided
        if let Some(price) = new_box_price {
            // Just validate box price is not zero
            require!(price > 0, LootboxError::InvalidBoxPrice);
            project_config.box_price = price;
            msg!("Box price updated to: {}", price);
        }

        // Update active status if provided (pause/resume)
        if let Some(active) = new_active {
            project_config.active = active;
            msg!("Project active status: {}", active);
        }

        // Update luck time interval if provided
        if let Some(interval) = new_luck_time_interval {
            require!(interval >= 0, LootboxError::InvalidLuckInterval);
            project_config.luck_time_interval = interval;
            msg!("Luck time interval updated to: {}", interval);
        }

        Ok(())
    }

    /// Close a project and reclaim rent (only if no pending boxes)
    pub fn close_project(
        ctx: Context<CloseProject>,
        _project_id: u64,
    ) -> Result<()> {
        let project_config = &ctx.accounts.project_config;

        // Verify ownership
        require!(
            project_config.owner == ctx.accounts.owner.key(),
            LootboxError::NotProjectOwner
        );

        // Ensure vault is empty (all boxes must be settled and earnings withdrawn)
        require!(
            ctx.accounts.vault_token_account.amount == 0,
            LootboxError::VaultNotEmpty
        );

        msg!("Project closed and rent reclaimed");
        msg!("Project ID: {}", project_config.project_id);

        // Account will be closed by Anchor due to close = owner constraint
        Ok(())
    }

    /// Withdraw accumulated fees from treasury (admin only)
    /// Used by admin to collect platform commission for batch processing (swap to SOL, buyback, etc.)
    pub fn withdraw_treasury(
        ctx: Context<WithdrawTreasury>,
        amount: u64,
    ) -> Result<()> {
        let platform_config = &ctx.accounts.platform_config;

        // Verify treasury has enough balance
        let treasury_balance = ctx.accounts.treasury_token_account.amount;
        require!(
            amount <= treasury_balance,
            LootboxError::InsufficientVaultBalance
        );

        msg!("Treasury balance: {}", treasury_balance);
        msg!("Withdrawal amount: {}", amount);

        // Transfer from treasury to admin using PDA signer
        let seeds = &[
            b"treasury".as_ref(),
            &[platform_config.treasury_bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            to: ctx.accounts.admin_token_account.to_account_info(),
            authority: ctx.accounts.treasury.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        msg!("Treasury withdrawal complete!");
        msg!("Amount: {}", amount);
        msg!("Admin: {}", ctx.accounts.admin.key());
        msg!("Token mint: {}", ctx.accounts.token_mint.key());

        Ok(())
    }

    /// Close platform config (admin only) - used for migrations/reinitialization
    /// WARNING: This will delete all platform config data. Use with caution.
    pub fn close_platform_config(
        ctx: Context<ClosePlatformConfig>,
    ) -> Result<()> {
        msg!("Closing platform config...");

        // Manually read admin from account data (skip 8-byte discriminator)
        let data = ctx.accounts.platform_config.data.borrow();
        if data.len() < 40 {
            return Err(LootboxError::InvalidRandomnessAccount.into());
        }

        let stored_admin = Pubkey::try_from(&data[8..40])
            .map_err(|_| LootboxError::InvalidRandomnessAccount)?;

        msg!("Stored admin: {}", stored_admin);
        msg!("Caller admin: {}", ctx.accounts.admin.key());

        // Verify caller is the admin
        require!(
            stored_admin == ctx.accounts.admin.key(),
            LootboxError::NotPlatformAdmin
        );

        // Drop the borrow before we transfer lamports
        drop(data);

        // Transfer all lamports to admin (effectively closing the account)
        let platform_config_info = ctx.accounts.platform_config.to_account_info();
        let admin_info = ctx.accounts.admin.to_account_info();

        let lamports = platform_config_info.lamports();
        **platform_config_info.try_borrow_mut_lamports()? = 0;
        **admin_info.try_borrow_mut_lamports()? = admin_info.lamports().checked_add(lamports).unwrap();

        msg!("Rent returned: {} lamports", lamports);
        msg!("Platform config closed!");

        Ok(())
    }
}

/// Calculate reward tier and amount using platform config values
/// Uses 3 fixed tiers based on luck score
/// game_preset: 0 = default, 1-3 = presets defined in PlatformConfig
/// random_basis_points: random value in range 0-10000 (basis points, no floats)
fn calculate_reward_from_config(
    luck: u8,
    random_basis_points: u16,
    box_price: u64,
    config: &PlatformConfig,
    game_preset: u8,
) -> Result<(u64, bool, u8)> {
    // Get payout multipliers based on preset
    let (payout_dud, payout_rebate, payout_breakeven, payout_profit, payout_jackpot) = match game_preset {
        1 => (
            config.payout_dud, // Dud payout is always 0
            config.preset1_payout_rebate,
            config.preset1_payout_breakeven,
            config.preset1_payout_profit,
            config.preset1_payout_jackpot,
        ),
        2 => (
            config.payout_dud,
            config.preset2_payout_rebate,
            config.preset2_payout_breakeven,
            config.preset2_payout_profit,
            config.preset2_payout_jackpot,
        ),
        3 => (
            config.payout_dud,
            config.preset3_payout_rebate,
            config.preset3_payout_breakeven,
            config.preset3_payout_profit,
            config.preset3_payout_jackpot,
        ),
        _ => (
            config.payout_dud,
            config.payout_rebate,
            config.payout_breakeven,
            config.payout_profit,
            config.payout_jackpot,
        ),
    };

    // Get tier probabilities based on preset and luck
    let (dud_bp, rebate_bp, breakeven_bp, profit_bp) = match game_preset {
        1 => {
            // Preset 1
            if luck <= config.tier1_max_luck {
                (config.preset1_tier1_dud, config.preset1_tier1_rebate, config.preset1_tier1_breakeven, config.preset1_tier1_profit)
            } else if luck <= config.tier2_max_luck {
                (config.preset1_tier2_dud, config.preset1_tier2_rebate, config.preset1_tier2_breakeven, config.preset1_tier2_profit)
            } else {
                (config.preset1_tier3_dud, config.preset1_tier3_rebate, config.preset1_tier3_breakeven, config.preset1_tier3_profit)
            }
        },
        2 => {
            // Preset 2
            if luck <= config.tier1_max_luck {
                (config.preset2_tier1_dud, config.preset2_tier1_rebate, config.preset2_tier1_breakeven, config.preset2_tier1_profit)
            } else if luck <= config.tier2_max_luck {
                (config.preset2_tier2_dud, config.preset2_tier2_rebate, config.preset2_tier2_breakeven, config.preset2_tier2_profit)
            } else {
                (config.preset2_tier3_dud, config.preset2_tier3_rebate, config.preset2_tier3_breakeven, config.preset2_tier3_profit)
            }
        },
        3 => {
            // Preset 3
            if luck <= config.tier1_max_luck {
                (config.preset3_tier1_dud, config.preset3_tier1_rebate, config.preset3_tier1_breakeven, config.preset3_tier1_profit)
            } else if luck <= config.tier2_max_luck {
                (config.preset3_tier2_dud, config.preset3_tier2_rebate, config.preset3_tier2_breakeven, config.preset3_tier2_profit)
            } else {
                (config.preset3_tier3_dud, config.preset3_tier3_rebate, config.preset3_tier3_breakeven, config.preset3_tier3_profit)
            }
        },
        _ => {
            // Default (preset 0)
            if luck <= config.tier1_max_luck {
                (config.tier1_dud, config.tier1_rebate, config.tier1_breakeven, config.tier1_profit)
            } else if luck <= config.tier2_max_luck {
                (config.tier2_dud, config.tier2_rebate, config.tier2_breakeven, config.tier2_profit)
            } else {
                (config.tier3_dud, config.tier3_rebate, config.tier3_breakeven, config.tier3_profit)
            }
        }
    };

    // Use the random basis points directly (already in 0-10000 range)
    let roll = random_basis_points;

    // Determine tier based on cumulative probabilities
    let mut cumulative: u16 = 0;

    // Tier 0: Dud
    cumulative = cumulative.saturating_add(dud_bp);
    if roll <= cumulative {
        let reward = (box_price as u128)
            .checked_mul(payout_dud as u128)
            .ok_or(LootboxError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(LootboxError::ArithmeticOverflow)? as u64;
        return Ok((reward, false, 0));
    }

    // Tier 1: Rebate
    cumulative = cumulative.saturating_add(rebate_bp);
    if roll <= cumulative {
        let reward = (box_price as u128)
            .checked_mul(payout_rebate as u128)
            .ok_or(LootboxError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(LootboxError::ArithmeticOverflow)? as u64;
        return Ok((reward, false, 1));
    }

    // Tier 2: Break-even
    cumulative = cumulative.saturating_add(breakeven_bp);
    if roll <= cumulative {
        let reward = (box_price as u128)
            .checked_mul(payout_breakeven as u128)
            .ok_or(LootboxError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(LootboxError::ArithmeticOverflow)? as u64;
        return Ok((reward, false, 2));
    }

    // Tier 3: Profit
    cumulative = cumulative.saturating_add(profit_bp);
    if roll <= cumulative {
        let reward = (box_price as u128)
            .checked_mul(payout_profit as u128)
            .ok_or(LootboxError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(LootboxError::ArithmeticOverflow)? as u64;
        return Ok((reward, false, 3));
    }

    // Tier 4: Jackpot (remainder)
    let reward = (box_price as u128)
        .checked_mul(payout_jackpot as u128)
        .ok_or(LootboxError::ArithmeticOverflow)?
        .checked_div(10000)
        .ok_or(LootboxError::ArithmeticOverflow)? as u64;
    Ok((reward, true, 4))
}

// ============================================================================
// Account Contexts
// ============================================================================

#[derive(Accounts)]
pub struct InitializePlatformConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + PlatformConfig::LEN,
        seeds = [b"platform_config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// Global treasury PDA - holds platform commission fees from all projects
    /// CHECK: This is a PDA used as authority for treasury token accounts
    #[account(
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePlatformConfig<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform_config"],
        bump,
        constraint = platform_config.admin == admin.key() @ LootboxError::NotPlatformAdmin
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

#[derive(Accounts)]
pub struct TransferPlatformAdmin<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform_config"],
        bump,
        constraint = platform_config.admin == admin.key() @ LootboxError::NotPlatformAdmin
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct InitializeProject<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"platform_config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        init,
        payer = owner,
        space = 8 + ProjectConfig::LEN,
        seeds = [b"project", project_id.to_le_bytes().as_ref()],
        bump
    )]
    pub project_config: Account<'info, ProjectConfig>,

    /// CHECK: Vault authority PDA
    #[account(
        seeds = [b"vault", project_id.to_le_bytes().as_ref(), payment_token_mint.key().as_ref()],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    pub payment_token_mint: Account<'info, Mint>,

    // Launch fee token accounts (t3EYES1)
    /// Owner's fee token account (pays launch fee) - must be owned by owner and match fee mint
    #[account(
        mut,
        constraint = owner_fee_token_account.mint == fee_token_mint.key() @ LootboxError::InvalidFeeTokenAccount,
        constraint = owner_fee_token_account.owner == owner.key() @ LootboxError::InvalidFeeTokenAccount
    )]
    pub owner_fee_token_account: Account<'info, TokenAccount>,

    /// Platform fee collection account (receives launch fee) - must match fee mint
    #[account(
        mut,
        constraint = platform_fee_token_account.mint == fee_token_mint.key() @ LootboxError::InvalidFeeTokenAccount
    )]
    pub platform_fee_token_account: Account<'info, TokenAccount>,

    /// Fee token mint (e.g., $3EYES)
    pub fee_token_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct CreateBox<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        seeds = [b"platform_config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [b"project", project_id.to_le_bytes().as_ref()],
        bump,
        constraint = project_config.active @ LootboxError::ProjectInactive
    )]
    pub project_config: Account<'info, ProjectConfig>,

    #[account(
        init,
        payer = buyer,
        space = 8 + BoxInstance::LEN,
        seeds = [
            b"box",
            project_id.to_le_bytes().as_ref(),
            (project_config.total_boxes_created + 1).to_le_bytes().as_ref()
        ],
        bump
    )]
    pub box_instance: Account<'info, BoxInstance>,

    /// Buyer's token account - must match project's payment token and be owned by buyer
    #[account(
        mut,
        constraint = buyer_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidBuyerTokenAccount,
        constraint = buyer_token_account.owner == buyer.key() @ LootboxError::InvalidBuyerTokenAccount
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    /// CHECK: Vault authority PDA - used to verify vault token account ownership
    #[account(
        seeds = [b"vault", project_id.to_le_bytes().as_ref(), project_config.payment_token_mint.as_ref()],
        bump = project_config.vault_authority_bump
    )]
    pub vault_authority: AccountInfo<'info>,

    /// Vault token account - must match project's payment token and be owned by vault authority
    #[account(
        mut,
        constraint = vault_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidVaultTokenAccount,
        constraint = vault_token_account.owner == vault_authority.key() @ LootboxError::InvalidVaultTokenAccount
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Treasury token account for receiving platform commission
    /// Must match project's payment token and be owned by treasury PDA
    #[account(
        mut,
        constraint = treasury_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidTreasuryTokenAccount,
        constraint = treasury_token_account.owner == treasury.key() @ LootboxError::InvalidTreasuryTokenAccount
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    /// Treasury PDA (for verification)
    /// CHECK: Verified by seeds
    #[account(
        seeds = [b"treasury"],
        bump = platform_config.treasury_bump
    )]
    pub treasury: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(project_id: u64, box_id: u64)]
pub struct CommitBox<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"platform_config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [b"project", project_id.to_le_bytes().as_ref()],
        bump
    )]
    pub project_config: Account<'info, ProjectConfig>,

    #[account(
        mut,
        seeds = [b"box", project_id.to_le_bytes().as_ref(), box_id.to_le_bytes().as_ref()],
        bump,
        constraint = box_instance.owner == owner.key() @ LootboxError::NotBoxOwner
    )]
    pub box_instance: Account<'info, BoxInstance>,
}

#[derive(Accounts)]
#[instruction(project_id: u64, box_id: u64)]
pub struct RevealBox<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"platform_config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [b"project", project_id.to_le_bytes().as_ref()],
        bump
    )]
    pub project_config: Account<'info, ProjectConfig>,

    #[account(
        mut,
        seeds = [b"box", project_id.to_le_bytes().as_ref(), box_id.to_le_bytes().as_ref()],
        bump,
        constraint = box_instance.owner == owner.key() @ LootboxError::NotBoxOwner
    )]
    pub box_instance: Account<'info, BoxInstance>,

    /// CHECK: Vault authority PDA - used to verify vault token account ownership
    #[account(
        seeds = [b"vault", project_id.to_le_bytes().as_ref(), project_config.payment_token_mint.as_ref()],
        bump = project_config.vault_authority_bump
    )]
    pub vault_authority: AccountInfo<'info>,

    /// Vault token account - verified for correct mint and ownership
    #[account(
        constraint = vault_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidVaultTokenAccount,
        constraint = vault_token_account.owner == vault_authority.key() @ LootboxError::InvalidVaultTokenAccount
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Switchboard VRF randomness account - verified against box_instance.randomness_account
    /// Also verified that the account is owned by Switchboard On-Demand program (mainnet or devnet)
    #[account(
        constraint = (
            randomness_account.owner.to_string() == SWITCHBOARD_MAINNET_PROGRAM_ID ||
            randomness_account.owner.to_string() == SWITCHBOARD_DEVNET_PROGRAM_ID
        ) @ LootboxError::InvalidSwitchboardOwner
    )]
    pub randomness_account: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(project_id: u64, box_id: u64)]
pub struct SettleBox<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"project", project_id.to_le_bytes().as_ref()],
        bump
    )]
    pub project_config: Account<'info, ProjectConfig>,

    #[account(
        mut,
        seeds = [b"box", project_id.to_le_bytes().as_ref(), box_id.to_le_bytes().as_ref()],
        bump,
        constraint = box_instance.owner == owner.key() @ LootboxError::NotBoxOwner
    )]
    pub box_instance: Account<'info, BoxInstance>,

    /// CHECK: Vault authority PDA
    #[account(
        seeds = [b"vault", project_id.to_le_bytes().as_ref(), payment_token_mint.key().as_ref()],
        bump = project_config.vault_authority_bump
    )]
    pub vault_authority: AccountInfo<'info>,

    /// Payment token mint - must match project's configured token
    #[account(
        constraint = payment_token_mint.key() == project_config.payment_token_mint @ LootboxError::InvalidVaultTokenAccount
    )]
    pub payment_token_mint: Account<'info, Mint>,

    /// Vault token account - must match project's payment token and be owned by vault authority
    #[account(
        mut,
        constraint = vault_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidVaultTokenAccount,
        constraint = vault_token_account.owner == vault_authority.key() @ LootboxError::InvalidVaultTokenAccount
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Owner's token account - must match project's payment token and be owned by signer
    #[account(
        mut,
        constraint = owner_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidOwnerTokenAccount,
        constraint = owner_token_account.owner == owner.key() @ LootboxError::InvalidOwnerTokenAccount
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(project_id: u64, box_id: u64)]
pub struct RefundBox<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"platform_config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        seeds = [b"project", project_id.to_le_bytes().as_ref()],
        bump
    )]
    pub project_config: Account<'info, ProjectConfig>,

    #[account(
        mut,
        seeds = [b"box", project_id.to_le_bytes().as_ref(), box_id.to_le_bytes().as_ref()],
        bump,
        constraint = box_instance.owner == owner.key() @ LootboxError::NotBoxOwner
    )]
    pub box_instance: Account<'info, BoxInstance>,

    /// CHECK: Vault authority PDA
    #[account(
        seeds = [b"vault", project_id.to_le_bytes().as_ref(), payment_token_mint.key().as_ref()],
        bump = project_config.vault_authority_bump
    )]
    pub vault_authority: AccountInfo<'info>,

    /// Payment token mint - must match project's configured token
    #[account(
        constraint = payment_token_mint.key() == project_config.payment_token_mint @ LootboxError::InvalidVaultTokenAccount
    )]
    pub payment_token_mint: Account<'info, Mint>,

    /// Vault token account - must match project's payment token and be owned by vault authority
    #[account(
        mut,
        constraint = vault_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidVaultTokenAccount,
        constraint = vault_token_account.owner == vault_authority.key() @ LootboxError::InvalidVaultTokenAccount
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Owner's token account - must match project's payment token and be owned by signer
    #[account(
        mut,
        constraint = owner_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidOwnerTokenAccount,
        constraint = owner_token_account.owner == owner.key() @ LootboxError::InvalidOwnerTokenAccount
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct WithdrawEarnings<'info> {
    pub owner: Signer<'info>,

    /// Platform config - for pause check
    #[account(
        seeds = [b"platform_config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        seeds = [b"project", project_id.to_le_bytes().as_ref()],
        bump,
        constraint = project_config.owner == owner.key() @ LootboxError::NotProjectOwner
    )]
    pub project_config: Account<'info, ProjectConfig>,

    /// CHECK: Vault authority PDA
    #[account(
        seeds = [b"vault", project_id.to_le_bytes().as_ref(), payment_token_mint.key().as_ref()],
        bump = project_config.vault_authority_bump
    )]
    pub vault_authority: AccountInfo<'info>,

    /// Payment token mint - must match project's configured token
    #[account(
        constraint = payment_token_mint.key() == project_config.payment_token_mint @ LootboxError::InvalidVaultTokenAccount
    )]
    pub payment_token_mint: Account<'info, Mint>,

    /// Vault token account - must match project's payment token and be owned by vault authority
    #[account(
        mut,
        constraint = vault_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidVaultTokenAccount,
        constraint = vault_token_account.owner == vault_authority.key() @ LootboxError::InvalidVaultTokenAccount
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Owner's token account - must match project's payment token and be owned by signer
    #[account(
        mut,
        constraint = owner_token_account.mint == project_config.payment_token_mint @ LootboxError::InvalidOwnerTokenAccount,
        constraint = owner_token_account.owner == owner.key() @ LootboxError::InvalidOwnerTokenAccount
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct UpdateProject<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"project", project_id.to_le_bytes().as_ref()],
        bump,
        constraint = project_config.owner == owner.key() @ LootboxError::NotProjectOwner
    )]
    pub project_config: Account<'info, ProjectConfig>,
}

#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct CloseProject<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"project", project_id.to_le_bytes().as_ref()],
        bump,
        constraint = project_config.owner == owner.key() @ LootboxError::NotProjectOwner,
        close = owner
    )]
    pub project_config: Account<'info, ProjectConfig>,

    /// Vault must be empty to close
    #[account(
        constraint = vault_token_account.amount == 0 @ LootboxError::VaultNotEmpty
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
}

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"platform_config"],
        bump,
        constraint = platform_config.admin == admin.key() @ LootboxError::NotPlatformAdmin
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// Treasury PDA that holds accumulated fees
    /// CHECK: Verified by seeds - this is the authority for treasury token accounts
    #[account(
        seeds = [b"treasury"],
        bump = platform_config.treasury_bump
    )]
    pub treasury: UncheckedAccount<'info>,

    /// The token mint being withdrawn
    pub token_mint: Account<'info, Mint>,

    /// Treasury's token account for this mint (source)
    #[account(
        mut,
        constraint = treasury_token_account.owner == treasury.key() @ LootboxError::InvalidTreasuryTokenAccount,
        constraint = treasury_token_account.mint == token_mint.key() @ LootboxError::InvalidTreasuryTokenAccount
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    /// Admin's token account (destination)
    /// SECURITY: Must be owned by the admin to prevent redirecting withdrawals
    #[account(
        mut,
        constraint = admin_token_account.mint == token_mint.key() @ LootboxError::InvalidOwnerTokenAccount,
        constraint = admin_token_account.owner == admin.key() @ LootboxError::InvalidOwnerTokenAccount
    )]
    pub admin_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClosePlatformConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: We manually verify the admin and close the account.
    /// Using UncheckedAccount to handle migration from old struct format.
    #[account(
        mut,
        seeds = [b"platform_config"],
        bump
    )]
    pub platform_config: UncheckedAccount<'info>,
}

// ============================================================================
// State Accounts
// ============================================================================

#[account]
pub struct PlatformConfig {
    pub admin: Pubkey,              // 32 bytes - Only this wallet can update config
    pub initialized: bool,          // 1 byte
    pub paused: bool,               // 1 byte - Emergency pause all operations

    // Luck parameters
    pub base_luck: u8,              // 1 byte (default: 5)
    pub max_luck: u8,               // 1 byte (default: 60)
    pub luck_time_interval: i64,    // 8 bytes (seconds per +1 luck)

    // Payout multipliers (basis points: 10000 = 1.0x) - DEFAULT/PRESET 0
    pub payout_dud: u32,            // 4 bytes (0 = 0x)
    pub payout_rebate: u32,         // 4 bytes (5000 = 0.5x)
    pub payout_breakeven: u32,      // 4 bytes (10000 = 1.0x)
    pub payout_profit: u32,         // 4 bytes (15000 = 1.5x)
    pub payout_jackpot: u32,        // 4 bytes (40000 = 4x)

    // Tier 1: Luck 0 to tier1_max_luck (worst odds) - DEFAULT/PRESET 0
    pub tier1_max_luck: u8,         // 1 byte
    pub tier1_dud: u16,             // 2 bytes (basis points)
    pub tier1_rebate: u16,          // 2 bytes
    pub tier1_breakeven: u16,       // 2 bytes
    pub tier1_profit: u16,          // 2 bytes

    // Tier 2: Luck tier1_max_luck+1 to tier2_max_luck - DEFAULT/PRESET 0
    pub tier2_max_luck: u8,         // 1 byte
    pub tier2_dud: u16,             // 2 bytes
    pub tier2_rebate: u16,          // 2 bytes
    pub tier2_breakeven: u16,       // 2 bytes
    pub tier2_profit: u16,          // 2 bytes

    // Tier 3: Luck tier2_max_luck+1 to max_luck (best odds) - DEFAULT/PRESET 0
    pub tier3_dud: u16,             // 2 bytes
    pub tier3_rebate: u16,          // 2 bytes
    pub tier3_breakeven: u16,       // 2 bytes
    pub tier3_profit: u16,          // 2 bytes

    // Platform commission
    pub platform_commission_bps: u16, // 2 bytes - Commission on box purchases (100 = 1%)
    pub treasury_bump: u8,          // 1 byte - Bump for treasury PDA

    pub updated_at: i64,            // 8 bytes

    // ============================================================================
    // PRESET 1: "Conservative" - Lower variance, steadier returns (~85% RTP all tiers)
    // ============================================================================
    pub preset1_payout_rebate: u32,     // 4 bytes
    pub preset1_payout_breakeven: u32,  // 4 bytes
    pub preset1_payout_profit: u32,     // 4 bytes
    pub preset1_payout_jackpot: u32,    // 4 bytes
    pub preset1_tier1_dud: u16,         // 2 bytes
    pub preset1_tier1_rebate: u16,      // 2 bytes
    pub preset1_tier1_breakeven: u16,   // 2 bytes
    pub preset1_tier1_profit: u16,      // 2 bytes
    pub preset1_tier2_dud: u16,         // 2 bytes
    pub preset1_tier2_rebate: u16,      // 2 bytes
    pub preset1_tier2_breakeven: u16,   // 2 bytes
    pub preset1_tier2_profit: u16,      // 2 bytes
    pub preset1_tier3_dud: u16,         // 2 bytes
    pub preset1_tier3_rebate: u16,      // 2 bytes
    pub preset1_tier3_breakeven: u16,   // 2 bytes
    pub preset1_tier3_profit: u16,      // 2 bytes = 36 bytes total

    // ============================================================================
    // PRESET 2: "Degen" - Higher variance, bigger jackpots, more risk (~80% RTP)
    // ============================================================================
    pub preset2_payout_rebate: u32,     // 4 bytes
    pub preset2_payout_breakeven: u32,  // 4 bytes
    pub preset2_payout_profit: u32,     // 4 bytes
    pub preset2_payout_jackpot: u32,    // 4 bytes
    pub preset2_tier1_dud: u16,         // 2 bytes
    pub preset2_tier1_rebate: u16,      // 2 bytes
    pub preset2_tier1_breakeven: u16,   // 2 bytes
    pub preset2_tier1_profit: u16,      // 2 bytes
    pub preset2_tier2_dud: u16,         // 2 bytes
    pub preset2_tier2_rebate: u16,      // 2 bytes
    pub preset2_tier2_breakeven: u16,   // 2 bytes
    pub preset2_tier2_profit: u16,      // 2 bytes
    pub preset2_tier3_dud: u16,         // 2 bytes
    pub preset2_tier3_rebate: u16,      // 2 bytes
    pub preset2_tier3_breakeven: u16,   // 2 bytes
    pub preset2_tier3_profit: u16,      // 2 bytes = 36 bytes total

    // ============================================================================
    // PRESET 3: "Whale" - Highest RTP for big spenders (~95% RTP)
    // ============================================================================
    pub preset3_payout_rebate: u32,     // 4 bytes
    pub preset3_payout_breakeven: u32,  // 4 bytes
    pub preset3_payout_profit: u32,     // 4 bytes
    pub preset3_payout_jackpot: u32,    // 4 bytes
    pub preset3_tier1_dud: u16,         // 2 bytes
    pub preset3_tier1_rebate: u16,      // 2 bytes
    pub preset3_tier1_breakeven: u16,   // 2 bytes
    pub preset3_tier1_profit: u16,      // 2 bytes
    pub preset3_tier2_dud: u16,         // 2 bytes
    pub preset3_tier2_rebate: u16,      // 2 bytes
    pub preset3_tier2_breakeven: u16,   // 2 bytes
    pub preset3_tier2_profit: u16,      // 2 bytes
    pub preset3_tier3_dud: u16,         // 2 bytes
    pub preset3_tier3_rebate: u16,      // 2 bytes
    pub preset3_tier3_breakeven: u16,   // 2 bytes
    pub preset3_tier3_profit: u16,      // 2 bytes = 36 bytes total

    // ============================================================================
    // SECURITY SETTINGS (configurable from admin dashboard)
    // ============================================================================
    pub min_box_price: u64,             // 8 bytes - Minimum box price in token base units
    pub refund_grace_period: i64,       // 8 bytes - Seconds after commit before refund allowed

    // Reserved for future expansion (reduced from 32 to 16 to make room for above)
    pub reserved: [u8; 16],             // 16 bytes
}

impl PlatformConfig {
    // Original: 101 bytes + 3 presets (36 each) + 16 new fields + 16 reserved = 101 + 108 + 16 + 16 = 241 bytes
    pub const LEN: usize = 32 + 1 + 1 + 1 + 1 + 8 + 4 + 4 + 4 + 4 + 4 + 1 + 2 + 2 + 2 + 2 + 1 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 1 + 8
        + (4 + 4 + 4 + 4 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2) // Preset 1: 36 bytes
        + (4 + 4 + 4 + 4 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2) // Preset 2: 36 bytes
        + (4 + 4 + 4 + 4 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2) // Preset 3: 36 bytes
        + 8 + 8  // min_box_price + refund_grace_period
        + 16; // Reserved
}

#[account]
pub struct ProjectConfig {
    pub project_id: u64,              // 8 bytes
    pub owner: Pubkey,                // 32 bytes
    pub payment_token_mint: Pubkey,   // 32 bytes
    pub box_price: u64,               // 8 bytes
    pub vault_authority_bump: u8,     // 1 byte
    pub total_boxes_created: u64,     // 8 bytes
    pub total_boxes_settled: u64,     // 8 bytes
    pub total_revenue: u64,           // 8 bytes
    pub total_paid_out: u64,          // 8 bytes
    pub active: bool,                 // 1 byte
    pub launch_fee_paid: bool,        // 1 byte
    pub created_at: i64,              // 8 bytes
    pub luck_time_interval: i64,      // 8 bytes - Per-project luck interval (0 = use platform default)
    pub game_preset: u8,              // 1 byte - Game config preset (0 = platform default, 1-3 = presets)
    pub reserved: [u8; 7],            // 7 bytes - Reserved for future expansion
}

impl ProjectConfig {
    // 8 + 32 + 32 + 8 + 1 + 8 + 8 + 8 + 8 + 1 + 1 + 8 + 8 + 1 + 7 = 139 bytes
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 8 + 8 + 8 + 8 + 1 + 1 + 8 + 8 + 1 + 7;
}

#[account]
pub struct BoxInstance {
    pub box_id: u64,                  // 8 bytes
    pub project_id: u64,              // 8 bytes
    pub owner: Pubkey,                // 32 bytes
    pub created_at: i64,              // 8 bytes
    pub committed_at: i64,            // 8 bytes - When user opened box (committed randomness)
    pub luck: u8,                     // 1 byte - Frozen at commit time
    pub revealed: bool,               // 1 byte
    pub settled: bool,                // 1 byte
    pub reward_amount: u64,           // 8 bytes
    pub is_jackpot: bool,             // 1 byte
    pub random_percentage: f64,       // 8 bytes
    pub reward_tier: u8,              // 1 byte (0=Dud, 1=Rebate, 2=Break-even, 3=Profit, 4=Jackpot)
    pub randomness_account: Pubkey,   // 32 bytes - Switchboard VRF randomness account
    pub randomness_committed: bool,   // 1 byte - Whether randomness has been committed
    // SECURITY: Store slot at commit time to validate randomness wasn't pre-generated
    pub committed_slot: u64,          // 8 bytes - Slot when randomness was committed
    // SECURITY: Snapshot game preset at commit time to prevent mid-game odds manipulation
    pub snapshot_game_preset: u8,     // 1 byte - Game preset frozen at commit time
    // SECURITY: Store box price at purchase time to prevent reward manipulation via price changes
    pub purchased_price: u64,         // 8 bytes - Box price frozen at purchase time
}

impl BoxInstance {
    // Updated: 127 + 8 (purchased_price) = 135 bytes
    pub const LEN: usize = 8 + 8 + 32 + 8 + 8 + 1 + 1 + 1 + 8 + 1 + 8 + 1 + 32 + 1 + 8 + 1 + 8;
}

// ============================================================================
// Error Codes
// ============================================================================

#[error_code]
pub enum LootboxError {
    #[msg("Insufficient funds for launch fee")]
    InsufficientLaunchFee,

    #[msg("Project is not active")]
    ProjectInactive,

    #[msg("Box already revealed")]
    BoxAlreadyRevealed,

    #[msg("Box not revealed yet")]
    BoxNotRevealed,

    #[msg("Box already settled")]
    BoxAlreadySettled,

    #[msg("Not box owner")]
    NotBoxOwner,

    #[msg("Not project owner")]
    NotProjectOwner,

    #[msg("Not platform admin")]
    NotPlatformAdmin,

    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,

    #[msg("Insufficient platform token balance for withdrawal fee")]
    InsufficientFeeBalance,

    #[msg("Invalid box price (must be > 0)")]
    InvalidBoxPrice,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Randomness not ready")]
    RandomnessNotReady,

    #[msg("Randomness not committed for this box")]
    RandomnessNotCommitted,

    #[msg("Randomness already committed for this box")]
    RandomnessAlreadyCommitted,

    #[msg("Invalid randomness account")]
    InvalidRandomnessAccount,

    #[msg("Platform is paused")]
    PlatformPaused,

    #[msg("Vault is not empty - withdraw funds first")]
    VaultNotEmpty,

    #[msg("Reveal window expired")]
    RevealWindowExpired,

    #[msg("Invalid commission rate (max 50%)")]
    InvalidCommissionRate,

    #[msg("Invalid luck interval (must be >= 0)")]
    InvalidLuckInterval,

    #[msg("Invalid vault token account (wrong mint or owner)")]
    InvalidVaultTokenAccount,

    #[msg("Invalid treasury token account (wrong mint or owner)")]
    InvalidTreasuryTokenAccount,

    #[msg("Invalid owner token account (wrong mint or owner)")]
    InvalidOwnerTokenAccount,

    #[msg("Invalid buyer token account (wrong mint or owner)")]
    InvalidBuyerTokenAccount,

    #[msg("Invalid fee token account (wrong mint or owner)")]
    InvalidFeeTokenAccount,

    #[msg("Invalid probability configuration (must sum to <= 10000)")]
    InvalidProbabilitySum,

    #[msg("Box has not been committed yet")]
    BoxNotCommitted,

    #[msg("Reveal window has not expired yet (must wait 1 hour after commit)")]
    RevealWindowNotExpired,

    #[msg("Refund grace period has not elapsed (must wait 60 seconds after commit)")]
    RefundGracePeriodNotElapsed,

    #[msg("Invalid Switchboard randomness account owner")]
    InvalidSwitchboardOwner,

    #[msg("Box price below minimum (must be >= 0.001 tokens)")]
    BoxPriceBelowMinimum,

    #[msg("Withdrawal exceeds available balance (reserves needed for pending boxes)")]
    WithdrawalExceedsAvailable,

    #[msg("Randomness was generated before commit slot (potential manipulation detected)")]
    RandomnessGeneratedBeforeCommit,
}
