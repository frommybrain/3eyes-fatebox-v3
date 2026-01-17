use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use switchboard_on_demand::accounts::RandomnessAccountData;

// Program ID from keypair: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
declare_id!("GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat");

// Constants
const REVEAL_WINDOW_SECONDS: i64 = 3600; // 1 hour to reveal after commit

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
        config.payout_dud = 0;           // 0x
        config.payout_rebate = 8000;     // 0.8x
        config.payout_breakeven = 10000; // 1.0x
        config.payout_profit = 25000;    // 2.5x
        config.payout_jackpot = 100000;  // 10x

        // Tier 1: Luck 0-5 (new users, worst odds)
        // Probabilities in basis points (10000 = 100%)
        config.tier1_max_luck = 5;
        config.tier1_dud = 5500;         // 55%
        config.tier1_rebate = 3000;      // 30%
        config.tier1_breakeven = 1000;   // 10%
        config.tier1_profit = 450;       // 4.5%
        // Jackpot = 10000 - 5500 - 3000 - 1000 - 450 = 50 (0.5%)

        // Tier 2: Luck 6-13 (medium holders)
        config.tier2_max_luck = 13;
        config.tier2_dud = 4500;         // 45%
        config.tier2_rebate = 3000;      // 30%
        config.tier2_breakeven = 1500;   // 15%
        config.tier2_profit = 850;       // 8.5%
        // Jackpot = 10000 - 4500 - 3000 - 1500 - 850 = 150 (1.5%)

        // Tier 3: Luck 14-60 (diamond hands, best odds)
        config.tier3_dud = 3000;         // 30%
        config.tier3_rebate = 2500;      // 25%
        config.tier3_breakeven = 2000;   // 20%
        config.tier3_profit = 2000;      // 20%
        // Jackpot = 10000 - 3000 - 2500 - 2000 - 2000 = 500 (5%)

        // Platform commission (5% default)
        config.platform_commission_bps = 500;
        config.treasury_bump = ctx.bumps.treasury;

        config.updated_at = clock.unix_timestamp;

        msg!("Platform config initialized!");
        msg!("Admin: {}", config.admin);
        msg!("Luck time interval: {} seconds", luck_time_interval);

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
        require!(!ctx.accounts.platform_config.paused, LootboxError::PlatformPaused);

        let project_config = &mut ctx.accounts.project_config;
        let clock = Clock::get()?;

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

        msg!("Project initialized!");
        msg!("Project ID: {}", project_id);
        msg!("Owner: {}", ctx.accounts.owner.key());
        msg!("Payment token: {}", ctx.accounts.payment_token_mint.key());
        msg!("Box price: {}", box_price);
        msg!("Vault authority: {}", ctx.accounts.vault_authority.key());
        msg!("Luck time interval: {}", luck_time_interval);

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

        msg!("Box opened - randomness committed!");
        msg!("Box ID: {}", box_id);
        msg!("Owner: {}", ctx.accounts.owner.key());
        msg!("Hold time: {} seconds", hold_time);
        msg!("Luck interval: {} (project: {}, platform: {})", effective_interval, project_config.luck_time_interval, platform_config.luck_time_interval);
        msg!("Luck frozen at: {}/{}", current_luck, platform_config.max_luck);
        msg!("Randomness account: {}", randomness_account);
        msg!("Committed at: {}", clock.unix_timestamp);
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

        // Convert to percentage (0.0 to 0.9999) using full u64 range
        let random_percentage = (random_u64 as f64) / (u64::MAX as f64);

        msg!("Switchboard randomness: u64={}, percentage={:.4}", random_u64, random_percentage);

        // Calculate reward based on luck and randomness using config values
        let (reward_amount, is_jackpot, reward_tier) = calculate_reward_from_config(
            current_luck,
            random_percentage,
            project_config.box_price,
            platform_config,
        )?;

        // Update box state
        box_instance.luck = current_luck;
        box_instance.revealed = true;
        box_instance.reward_amount = reward_amount;
        box_instance.is_jackpot = is_jackpot;
        box_instance.random_percentage = random_percentage;
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
        msg!("Random roll: {:.2}%", random_percentage * 100.0);
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

            let cpi_accounts = Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.owner_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, box_instance.reward_amount)?;
        }

        // Mark as settled
        box_instance.settled = true;

        // Update project stats
        project_config.total_boxes_settled = project_config.total_boxes_settled
            .checked_add(1)
            .ok_or(LootboxError::ArithmeticOverflow)?;
        project_config.total_paid_out = project_config.total_paid_out
            .checked_add(box_instance.reward_amount)
            .ok_or(LootboxError::ArithmeticOverflow)?;

        msg!("Box settled!");
        msg!("Box ID: {}", box_id);
        msg!("Reward transferred: {}", box_instance.reward_amount);

        Ok(())
    }

    /// Project owner withdraws earnings from vault
    /// Available balance is calculated off-chain (vault balance minus reserved for unopened boxes)
    pub fn withdraw_earnings(
        ctx: Context<WithdrawEarnings>,
        project_id: u64,
        amount: u64,
    ) -> Result<()> {
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

        msg!("Vault balance: {}", vault_balance);
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
fn calculate_reward_from_config(
    luck: u8,
    random_percentage: f64,
    box_price: u64,
    config: &PlatformConfig,
) -> Result<(u64, bool, u8)> {
    // Determine which tier to use based on luck
    let (dud_bp, rebate_bp, breakeven_bp, profit_bp) = if luck <= config.tier1_max_luck {
        // Tier 1: Lowest luck
        (config.tier1_dud, config.tier1_rebate, config.tier1_breakeven, config.tier1_profit)
    } else if luck <= config.tier2_max_luck {
        // Tier 2: Medium luck
        (config.tier2_dud, config.tier2_rebate, config.tier2_breakeven, config.tier2_profit)
    } else {
        // Tier 3: Highest luck
        (config.tier3_dud, config.tier3_rebate, config.tier3_breakeven, config.tier3_profit)
    };

    // Convert random_percentage from 0.0-1.0 to 0-10000 basis points
    let roll = (random_percentage * 10000.0) as u16;

    // Determine tier based on cumulative probabilities
    let mut cumulative: u16 = 0;

    // Tier 0: Dud
    cumulative = cumulative.saturating_add(dud_bp);
    if roll <= cumulative {
        let reward = (box_price as u128)
            .checked_mul(config.payout_dud as u128)
            .ok_or(LootboxError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(LootboxError::ArithmeticOverflow)? as u64;
        return Ok((reward, false, 0));
    }

    // Tier 1: Rebate
    cumulative = cumulative.saturating_add(rebate_bp);
    if roll <= cumulative {
        let reward = (box_price as u128)
            .checked_mul(config.payout_rebate as u128)
            .ok_or(LootboxError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(LootboxError::ArithmeticOverflow)? as u64;
        return Ok((reward, false, 1));
    }

    // Tier 2: Break-even
    cumulative = cumulative.saturating_add(breakeven_bp);
    if roll <= cumulative {
        let reward = (box_price as u128)
            .checked_mul(config.payout_breakeven as u128)
            .ok_or(LootboxError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(LootboxError::ArithmeticOverflow)? as u64;
        return Ok((reward, false, 2));
    }

    // Tier 3: Profit
    cumulative = cumulative.saturating_add(profit_bp);
    if roll <= cumulative {
        let reward = (box_price as u128)
            .checked_mul(config.payout_profit as u128)
            .ok_or(LootboxError::ArithmeticOverflow)?
            .checked_div(10000)
            .ok_or(LootboxError::ArithmeticOverflow)? as u64;
        return Ok((reward, false, 3));
    }

    // Tier 4: Jackpot (remainder)
    let reward = (box_price as u128)
        .checked_mul(config.payout_jackpot as u128)
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
    /// Owner's t3EYES1 token account (pays launch fee)
    #[account(mut)]
    pub owner_fee_token_account: Account<'info, TokenAccount>,

    /// Platform fee collection account (receives launch fee)
    #[account(mut)]
    pub platform_fee_token_account: Account<'info, TokenAccount>,

    /// t3EYES1 mint (fee token)
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

    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Treasury token account for receiving platform commission
    /// This is the ATA of the treasury PDA for this project's token
    #[account(mut)]
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

    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Switchboard VRF randomness account - verified against box_instance.randomness_account
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

    pub payment_token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct WithdrawEarnings<'info> {
    pub owner: Signer<'info>,

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

    pub payment_token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
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
        constraint = treasury_token_account.owner == treasury.key() @ LootboxError::InvalidRandomnessAccount,
        constraint = treasury_token_account.mint == token_mint.key() @ LootboxError::InvalidRandomnessAccount
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    /// Admin's token account (destination)
    #[account(
        mut,
        constraint = admin_token_account.mint == token_mint.key() @ LootboxError::InvalidRandomnessAccount
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

    // Payout multipliers (basis points: 10000 = 1.0x)
    pub payout_dud: u32,            // 4 bytes (0 = 0x)
    pub payout_rebate: u32,         // 4 bytes (8000 = 0.8x)
    pub payout_breakeven: u32,      // 4 bytes (10000 = 1.0x)
    pub payout_profit: u32,         // 4 bytes (25000 = 2.5x)
    pub payout_jackpot: u32,        // 4 bytes (100000 = 10x)

    // Tier 1: Luck 0 to tier1_max_luck (worst odds)
    pub tier1_max_luck: u8,         // 1 byte
    pub tier1_dud: u16,             // 2 bytes (basis points)
    pub tier1_rebate: u16,          // 2 bytes
    pub tier1_breakeven: u16,       // 2 bytes
    pub tier1_profit: u16,          // 2 bytes

    // Tier 2: Luck tier1_max_luck+1 to tier2_max_luck
    pub tier2_max_luck: u8,         // 1 byte
    pub tier2_dud: u16,             // 2 bytes
    pub tier2_rebate: u16,          // 2 bytes
    pub tier2_breakeven: u16,       // 2 bytes
    pub tier2_profit: u16,          // 2 bytes

    // Tier 3: Luck tier2_max_luck+1 to max_luck (best odds)
    pub tier3_dud: u16,             // 2 bytes
    pub tier3_rebate: u16,          // 2 bytes
    pub tier3_breakeven: u16,       // 2 bytes
    pub tier3_profit: u16,          // 2 bytes

    // Platform commission (NEW)
    pub platform_commission_bps: u16, // 2 bytes - Commission on box purchases (500 = 5%)
    pub treasury_bump: u8,          // 1 byte - Bump for treasury PDA

    pub updated_at: i64,            // 8 bytes
}

impl PlatformConfig {
    // Original: 98 bytes + 2 (commission_bps) + 1 (treasury_bump) = 101 bytes
    pub const LEN: usize = 32 + 1 + 1 + 1 + 1 + 8 + 4 + 4 + 4 + 4 + 4 + 1 + 2 + 2 + 2 + 2 + 1 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 1 + 8;
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
}

impl ProjectConfig {
    // 8 + 32 + 32 + 8 + 1 + 8 + 8 + 8 + 8 + 1 + 1 + 8 + 8 = 131 bytes
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 8 + 8 + 8 + 8 + 1 + 1 + 8 + 8;
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
}

impl BoxInstance {
    pub const LEN: usize = 8 + 8 + 32 + 8 + 8 + 1 + 1 + 1 + 8 + 1 + 8 + 1 + 32 + 1; // 118 bytes
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
}
