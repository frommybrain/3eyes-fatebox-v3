use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

// Program ID from keypair: GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat
declare_id!("GTpP39xwT47iTUwbC5HZ7TjCiNon2owkLWg84uUyboat");

#[program]
pub mod lootbox_platform {
    use super::*;

    /// Initialize a new project with vault
    /// Creator pays launch fee in t3EYES1 to create project
    pub fn initialize_project(
        ctx: Context<InitializeProject>,
        project_id: u64,
        box_price: u64,
        launch_fee_amount: u64,
    ) -> Result<()> {
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
    pub fn create_box(
        ctx: Context<CreateBox>,
        project_id: u64,
    ) -> Result<()> {
        let project_config = &mut ctx.accounts.project_config;
        let box_instance = &mut ctx.accounts.box_instance;
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

        // Initialize box instance
        box_instance.box_id = box_id;
        box_instance.project_id = project_id;
        box_instance.owner = ctx.accounts.buyer.key();
        box_instance.created_at = clock.unix_timestamp;
        box_instance.luck = 5; // Base luck
        box_instance.revealed = false;
        box_instance.settled = false;
        box_instance.reward_amount = 0;
        box_instance.is_jackpot = false;
        box_instance.random_percentage = 0.0;
        box_instance.reward_tier = 0;

        // Update project stats
        project_config.total_boxes_created = box_id;
        project_config.total_revenue = project_config.total_revenue
            .checked_add(project_config.box_price)
            .ok_or(LootboxError::ArithmeticOverflow)?;

        msg!("Box created!");
        msg!("Box ID: {}", box_id);
        msg!("Project ID: {}", project_id);
        msg!("Owner: {}", ctx.accounts.buyer.key());
        msg!("Price paid: {}", project_config.box_price);

        Ok(())
    }

    /// Reveal box with Switchboard VRF randomness
    /// Calculates luck based on hold time and determines reward
    pub fn reveal_box(
        ctx: Context<RevealBox>,
        project_id: u64,
        box_id: u64,
    ) -> Result<()> {
        let box_instance = &mut ctx.accounts.box_instance;
        let project_config = &ctx.accounts.project_config;
        let clock = Clock::get()?;

        // Verify ownership
        require!(
            box_instance.owner == ctx.accounts.owner.key(),
            LootboxError::NotBoxOwner
        );

        // Verify not already revealed
        require!(!box_instance.revealed, LootboxError::BoxAlreadyRevealed);

        // Calculate current luck based on hold time
        let hold_time = clock.unix_timestamp - box_instance.created_at;
        // For testing: +1 luck every 3 seconds, for production: +1 every 3 hours (10800 seconds)
        let time_interval = 3; // Change to 10800 for production
        let bonus_luck = (hold_time / time_interval) as u8;
        let current_luck = std::cmp::min(5 + bonus_luck, 60);

        // Get randomness from Switchboard VRF
        // TODO: Integrate Switchboard VRF account reading
        // For now, using a pseudo-random value based on slot hash for testing
        // This is NOT secure for production - use Switchboard VRF
        let clock = Clock::get()?;
        let slot = clock.slot;
        // Create a pseudo-random value from slot and box data (temporary for testing)
        let seed = slot
            .wrapping_add(box_id)
            .wrapping_mul(project_id)
            .wrapping_add(clock.unix_timestamp as u64);
        let random_percentage = ((seed % 10000) as f64) / 10000.0; // 0.0 to 0.9999

        // Calculate reward based on luck and randomness using tier system
        let (reward_amount, is_jackpot, reward_tier) = calculate_reward(
            current_luck,
            random_percentage,
            project_config.box_price,
            ctx.accounts.vault_token_account.amount,
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

        msg!("Box revealed!");
        msg!("Box ID: {}", box_id);
        msg!("Luck: {}/60", current_luck);
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
    /// Pays withdrawal fee in $DEGENBOX to platform
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

        // Calculate available balance
        // TODO: Implement locked amount calculation for pending boxes
        let vault_balance = ctx.accounts.vault_token_account.amount;
        let available = vault_balance; // Simplified for MVP

        // Verify amount doesn't exceed available
        require!(
            amount <= available,
            LootboxError::WithdrawalExceedsAvailable
        );

        // TODO: Implement $DEGENBOX withdrawal fee transfer
        // For now, just transfer the requested amount

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
}

/// Calculate reward tier and amount based on luck and randomness
/// Uses probability tables that improve with higher luck scores
///
/// Reward Tiers:
/// - Dud (0): 0x box price
/// - Rebate (1): 0.8x box price
/// - Break-even (2): 1.0x box price
/// - Profit (3): 2.5x box price
/// - Jackpot (4): 10x box price
fn calculate_reward(
    luck: u8,
    random_percentage: f64,
    box_price: u64,
    _vault_balance: u64, // Reserved for future jackpot calculations
) -> Result<(u64, bool, u8)> {
    // Probability tables based on luck score
    // Returns (dud_chance, rebate_chance, break_even_chance, profit_chance)
    // Jackpot chance is the remainder to 100%
    let (dud_chance, rebate_chance, break_even_chance, profit_chance) = if luck <= 5 {
        (55.0, 30.0, 10.0, 4.5) // Jackpot: 0.5%
    } else if luck <= 13 {
        // Linear interpolation between luck 5 and 13
        let ratio = (luck as f64 - 5.0) / 8.0;
        (
            55.0 + (45.0 - 55.0) * ratio,  // 55% → 45%
            30.0,                           // 30% → 30%
            10.0 + (15.0 - 10.0) * ratio,  // 10% → 15%
            4.5 + (8.5 - 4.5) * ratio,     // 4.5% → 8.5%
        ) // Jackpot: 0.5% → 1.5%
    } else {
        // Linear interpolation between luck 13 and 60
        let ratio = (luck as f64 - 13.0) / 47.0;
        (
            45.0 + (30.0 - 45.0) * ratio,  // 45% → 30%
            30.0 + (25.0 - 30.0) * ratio,  // 30% → 25%
            15.0 + (20.0 - 15.0) * ratio,  // 15% → 20%
            8.5 + (20.0 - 8.5) * ratio,    // 8.5% → 20%
        ) // Jackpot: 1.5% → 5%
    };

    // Convert random_percentage from 0.0-1.0 to 0-100
    let roll = random_percentage * 100.0;

    // Determine tier based on cumulative probabilities
    let mut cumulative = 0.0;

    // Tier 0: Dud (0x)
    cumulative += dud_chance;
    if roll <= cumulative {
        return Ok((0, false, 0));
    }

    // Tier 1: Rebate (0.8x)
    cumulative += rebate_chance;
    if roll <= cumulative {
        let reward = (box_price as f64 * 0.8) as u64;
        return Ok((reward, false, 1));
    }

    // Tier 2: Break-even (1.0x)
    cumulative += break_even_chance;
    if roll <= cumulative {
        return Ok((box_price, false, 2));
    }

    // Tier 3: Profit (2.5x)
    cumulative += profit_chance;
    if roll <= cumulative {
        let reward = (box_price as f64 * 2.5) as u64;
        return Ok((reward, false, 3));
    }

    // Tier 4: Jackpot (10x)
    let reward = (box_price as f64 * 10.0) as u64;
    Ok((reward, true, 4))
}

// Account validation contexts
#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct InitializeProject<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

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
pub struct RevealBox<'info> {
    pub owner: Signer<'info>,

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

    pub vault_token_account: Account<'info, TokenAccount>,

    // TODO: Add Switchboard VRF accounts
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

    // TODO: Add $DEGENBOX withdrawal fee transfer accounts

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

// State accounts
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
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 8 + 8 + 8 + 8 + 1 + 1 + 8; // 123 bytes
}

#[account]
pub struct BoxInstance {
    pub box_id: u64,                  // 8 bytes
    pub project_id: u64,              // 8 bytes
    pub owner: Pubkey,                // 32 bytes
    pub created_at: i64,              // 8 bytes
    pub luck: u8,                     // 1 byte
    pub revealed: bool,               // 1 byte
    pub settled: bool,                // 1 byte
    pub reward_amount: u64,           // 8 bytes
    pub is_jackpot: bool,             // 1 byte
    pub random_percentage: f64,       // 8 bytes
    pub reward_tier: u8,              // 1 byte (0=Dud, 1=Rebate, 2=Break-even, 3=Profit, 4=Jackpot)
}

impl BoxInstance {
    pub const LEN: usize = 8 + 8 + 32 + 8 + 1 + 1 + 1 + 8 + 1 + 8 + 1; // 77 bytes
}

// Error codes
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

    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,

    #[msg("Withdrawal amount exceeds available balance")]
    WithdrawalExceedsAvailable,

    #[msg("Insufficient $DEGENBOX for withdrawal fee")]
    InsufficientFeeBalance,

    #[msg("Invalid box price (must be > 0)")]
    InvalidBoxPrice,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Randomness not ready")]
    RandomnessNotReady,
}
