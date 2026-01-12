use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

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
    ) -> Result<()> {
        // Check platform is not paused
        require!(!ctx.accounts.platform_config.paused, LootboxError::PlatformPaused);

        let project_config = &mut ctx.accounts.project_config;
        let clock = Clock::get()?;

        require!(box_price > 0, LootboxError::InvalidBoxPrice);

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

        msg!("Project initialized!");
        msg!("Project ID: {}", project_id);
        msg!("Owner: {}", ctx.accounts.owner.key());
        msg!("Payment token: {}", ctx.accounts.payment_token_mint.key());
        msg!("Box price: {}", box_price);
        msg!("Vault authority: {}", ctx.accounts.vault_authority.key());

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

        // Transfer payment from buyer to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, project_config.box_price)?;

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
        let bonus_luck = if platform_config.luck_time_interval > 0 {
            (hold_time / platform_config.luck_time_interval) as u8
        } else {
            0
        };
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

        // Read randomness from Switchboard VRF account
        let randomness_data = ctx.accounts.randomness_account.try_borrow_data()?;

        // Log the account data length for debugging
        msg!("Switchboard account data length: {}", randomness_data.len());

        // Ensure we have enough data
        // Switchboard RandomnessAccountData structure:
        // - 0-8: discriminator (8 bytes)
        // - 8-40: authority (32 bytes)
        // - 40-72: queue (32 bytes)
        // - 72-104: oracle (32 bytes)
        // - 104-112: seed_slot (8 bytes)
        // - 112-144: seed_slothash (32 bytes)
        // - 144-152: reveal_slot (8 bytes)
        // - 152-184: randomness_value (32 bytes) <- THIS IS THE ACTUAL RANDOMNESS
        require!(
            randomness_data.len() >= 184,
            LootboxError::RandomnessNotReady
        );

        // Check that randomness has been revealed (reveal_slot should be non-zero)
        let reveal_slot = u64::from_le_bytes([
            randomness_data[144],
            randomness_data[145],
            randomness_data[146],
            randomness_data[147],
            randomness_data[148],
            randomness_data[149],
            randomness_data[150],
            randomness_data[151],
        ]);

        require!(
            reveal_slot > 0,
            LootboxError::RandomnessNotReady
        );

        // Read the revealed randomness value at offset 152
        let random_u32 = u32::from_le_bytes([
            randomness_data[152],
            randomness_data[153],
            randomness_data[154],
            randomness_data[155],
        ]);

        msg!("Switchboard randomness revealed at slot {}", reveal_slot);
        msg!("Randomness bytes: [{}, {}, {}, {}] -> u32: {}",
            randomness_data[152], randomness_data[153],
            randomness_data[154], randomness_data[155], random_u32);

        // Convert to percentage (0.0 to 0.9999)
        let random_percentage = (random_u32 as f64) / (u32::MAX as f64);

        msg!("Switchboard randomness: u32={}, percentage={:.4}", random_u32, random_percentage);

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

    pub updated_at: i64,            // 8 bytes
}

impl PlatformConfig {
    // 32 + 1 + 1 + 1 + 1 + 8 + 4 + 4 + 4 + 4 + 4 + 1 + 2 + 2 + 2 + 2 + 1 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 8 = 98 bytes
    pub const LEN: usize = 32 + 1 + 1 + 1 + 1 + 8 + 4 + 4 + 4 + 4 + 4 + 1 + 2 + 2 + 2 + 2 + 1 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 8;
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
}

impl ProjectConfig {
    // 8 + 32 + 32 + 8 + 1 + 8 + 8 + 8 + 8 + 1 + 1 + 8 = 123 bytes
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 8 + 8 + 8 + 8 + 1 + 1 + 8;
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
}
