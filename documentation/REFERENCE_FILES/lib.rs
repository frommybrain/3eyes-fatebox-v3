use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

declare_id!("3j7syt6p85F2JgQHTkNtLgGAfFGf1G2p4Vsd29NWi6Fh");

#[program]
pub mod random_guard {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    // BACKEND-ONLY: Commit to Switchboard randomness
    pub fn open_box_commit_backend(
        ctx: Context<OpenBoxCommitBackend>, 
        randomness_account: Pubkey, 
        luck_score: u8
    ) -> Result<()> {
        let box_state = &mut ctx.accounts.box_state;
        let now = Clock::get()?;
        
        require!(luck_score <= 60, ErrorCode::InvalidLuckScore);
        
        // Only commit on first open
        if box_state.minted_at == 0 {
            box_state.minted_at = now.unix_timestamp;
            box_state.owner = ctx.accounts.owner.key();
            box_state.box_mint = ctx.accounts.box_mint.key();
            box_state.luck = luck_score;
            box_state.randomness_account = randomness_account;
            box_state.reward_amount = 0;
            box_state.is_jackpot = false;
            box_state.revealed = false;
            box_state.settled = false;
            box_state.honorary_choice = false;
            box_state.honorary_transformed = false; // Changed from honorary_minted
            
            msg!("Box commitment recorded by backend!");
            msg!("Box owner: {}", ctx.accounts.owner.key());
            msg!("Box mint: {}", ctx.accounts.box_mint.key());
            msg!("Luck score: {}/60", luck_score);
            msg!("Randomness account: {}", randomness_account);
        } else {
            return Err(ErrorCode::BoxAlreadyOpened.into());
        }
        
        Ok(())
    }

    // BACKEND-ONLY: Reveal with verified randomness
    pub fn open_box_reveal_backend(
        ctx: Context<OpenBoxRevealBackend>, 
        random_percentage: f64
    ) -> Result<()> {
        let box_state = &mut ctx.accounts.box_state;
        
        require!(box_state.minted_at > 0, ErrorCode::BoxNotOpened);
        require!(!box_state.revealed, ErrorCode::BoxAlreadyRevealed);
        
        let (reward_amount, is_jackpot, tier_name) = 
            calculate_reward_from_luck_and_randomness(box_state.luck, random_percentage);
        
        box_state.reward_amount = reward_amount;
        box_state.is_jackpot = is_jackpot;
        box_state.revealed = true;
        box_state.random_percentage = random_percentage; 
        
        msg!("Box revealed by backend!");
        msg!("Tier: {}", tier_name);
        msg!("Reward: {} DEV_FATE (raw: {})", reward_amount / 1_000_000_000, reward_amount);
        msg!("Is jackpot: {}", is_jackpot);
        msg!("Random percentage used: {:.2}%", random_percentage);
        
        Ok(())
    }

    // BACKEND-ONLY: Settlement with vault authority
    pub fn settle_box_backend(
        ctx: Context<SettleBoxBackend>, 
        choose_honorary: bool  // Only matters for jackpots
    ) -> Result<()> {
        let box_state = &mut ctx.accounts.box_state;
        let now = Clock::get()?.unix_timestamp;
        
        require!(box_state.minted_at > 0, ErrorCode::BoxNotOpened);
        require!(box_state.revealed, ErrorCode::BoxNotRevealed);
        require!(!box_state.settled, ErrorCode::BoxAlreadySettled);
        
        // Log who's settling
        msg!("Box originally opened by: {}", box_state.owner);
        msg!("NFT currently owned by: {}", ctx.accounts.owner.key());
        msg!("Settlement authorized by vault: {}", ctx.accounts.vault_authority.key());
        
        let reward_amount = box_state.reward_amount;
        let is_jackpot = box_state.is_jackpot;
        
        // Handle rewards based on jackpot status and choice
        if is_jackpot && choose_honorary {
            // Jackpot winner choosing honorary NFT - no token transfer
            msg!("Jackpot settled: Honorary NFT chosen, forgoing {} DEV_FATE", reward_amount);
            msg!("FateBox NFT will be transformed to Honorary");
            
            // Store the choice in box state
            box_state.honorary_choice = true;
            
            // Emit an event or log that can be used to authorize the transformation
            msg!("HONORARY_TRANSFORMATION_AUTHORIZED: owner={}, box_mint={}", 
                ctx.accounts.owner.key(), 
                ctx.accounts.box_mint.key()
            );
        } else if reward_amount > 0 {
            // Transfer tokens (either non-jackpot or jackpot choosing tokens)
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault_token_account.to_account_info(),
                        to: ctx.accounts.owner_token_ata.to_account_info(),
                        authority: ctx.accounts.vault_authority.to_account_info(),
                    },
                ),
                reward_amount,
            )?;
            
            msg!("Settlement: {} DEV_FATE tokens transferred to NFT owner (raw: {})", 
    reward_amount / 1_000_000_000, reward_amount);
        } else {
            msg!("No reward to transfer (box contained nothing)");
        }
        
        // Mark box as settled
        box_state.settled = true;
        
        let hold_time = now - box_state.minted_at;
        msg!("Box settled! Luck: {}/60, Final payout: {} DEV_FATE", 
            box_state.luck, 
            if is_jackpot && choose_honorary { 0 } else { reward_amount }
        );
        msg!("Total hold time: {} seconds", hold_time);
        msg!("Settlement completed for NFT owner: {}", ctx.accounts.owner.key());
        
        Ok(())
    }

    // BACKEND-ONLY: Mark that the metadata has been transformed to honorary
    pub fn mark_honorary_transformed(ctx: Context<MarkHonoraryTransformed>) -> Result<()> {
        let box_state = &mut ctx.accounts.box_state;
        
        require!(box_state.is_jackpot, ErrorCode::NotAJackpot);
        require!(box_state.honorary_choice, ErrorCode::HonoraryNotChosen);
        require!(!box_state.honorary_transformed, ErrorCode::HonoraryAlreadyTransformed);
        
        // Mark as transformed
        box_state.honorary_transformed = true;
        
        msg!("FateBox NFT transformed to Honorary for box: {}", box_state.box_mint);
        
        Ok(())
    }
}

// Calculate reward based on luck score and randomness
fn calculate_reward_from_luck_and_randomness(luck_score: u8, random_percentage: f64) -> (u64, bool, &'static str) {
    // Token has 9 decimals, so 1 token = 1_000_000_000
    const TOKEN_DECIMALS: u64 = 1_000_000_000;
    
    // Probability tables based on luck score
    let (dud_chance, rebate_chance, break_even_chance, profit_chance, _jackpot_chance) = 
        if luck_score <= 5 {
            (55.0, 30.0, 10.0, 4.5, 0.5)
        } else if luck_score <= 13 {
            // Linear interpolation between 5 and 13
            let ratio = (luck_score - 5) as f64 / 8.0;
            (
                55.0 + (45.0 - 55.0) * ratio,    // 55% → 45%
                30.0 + (30.0 - 30.0) * ratio,    // 30% → 30%
                10.0 + (15.0 - 10.0) * ratio,    // 10% → 15%
                4.5 + (8.5 - 4.5) * ratio,       // 4.5% → 8.5%
                0.5 + (1.0 - 0.5) * ratio,       // 0.5% → 1.0%
            )
        } else {
            // Linear interpolation between 13 and 60
            let ratio = (luck_score - 13) as f64 / 47.0;
            (
                45.0 + (30.0 - 45.0) * ratio,    // 45% → 30%
                30.0 + (25.0 - 30.0) * ratio,    // 30% → 25%
                15.0 + (20.0 - 15.0) * ratio,    // 15% → 20%
                8.5 + (20.0 - 8.5) * ratio,      // 8.5% → 20%
                1.0 + (5.0 - 1.0) * ratio,       // 1.0% → 5.0%
            )
        };

    // Determine tier based on cumulative probabilities
    let mut cumulative = 0.0;
    
    cumulative += dud_chance;
    if random_percentage <= cumulative {
        return (0, false, "Dud");
    }
    
    cumulative += rebate_chance;
    if random_percentage <= cumulative {
        return (800 * TOKEN_DECIMALS, false, "Rebate");  // 800 tokens
    }
    
    cumulative += break_even_chance;
    if random_percentage <= cumulative {
        return (1000 * TOKEN_DECIMALS, false, "Break-even");  // 1000 tokens
    }
    
    cumulative += profit_chance;
    if random_percentage <= cumulative {
        return (2500 * TOKEN_DECIMALS, false, "Profit");  // 2500 tokens
    }
    
    // Jackpot (remaining percentage)
    (10000 * TOKEN_DECIMALS, true, "JACKPOT")  // 10000 tokens
}

// Account contexts
#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct OpenBoxCommitBackend<'info> {
    /// CHECK: The NFT owner (not required to sign)
    pub owner: AccountInfo<'info>,
    
    pub box_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = backend_authority,  // Backend pays
        space = 8 + BoxState::LEN,
        seeds = [b"box_state", box_mint.key().as_ref()],
        bump
    )]
    pub box_state: Account<'info, BoxState>,
    
    /// CHECK: Switchboard randomness account
    pub randomness_account_data: AccountInfo<'info>,
    
    // Backend authority must sign
    #[account(mut)]
    pub backend_authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OpenBoxRevealBackend<'info> {
    /// CHECK: The NFT owner (not required to sign)
    pub owner: AccountInfo<'info>,
    
    pub box_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"box_state", box_mint.key().as_ref()],
        bump,
        has_one = box_mint
    )]
    pub box_state: Account<'info, BoxState>,
    
    // Backend authority must sign
    pub backend_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SettleBoxBackend<'info> {
    /// CHECK: The owner of the box (not required to sign)
    pub owner: AccountInfo<'info>,
    
    pub box_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"box_state", box_mint.key().as_ref()],
        bump,
        has_one = box_mint
    )]
    pub box_state: Account<'info, BoxState>,
    
    // NFT token account to verify ownership
    #[account(
        constraint = nft_token_account.mint == box_mint.key(),
        constraint = nft_token_account.owner == owner.key(),
        constraint = nft_token_account.amount == 1,
    )]
    pub nft_token_account: Account<'info, TokenAccount>,
    
    // Simple vault token account (not PDA)
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    // The authority of the vault (backend wallet) - THIS IS THE SIGNER
    pub vault_authority: Signer<'info>,
    
    #[account(mut)]
    pub owner_token_ata: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MarkHonoraryTransformed<'info> {
    #[account(
        mut,
        seeds = [b"box_state", box_state.box_mint.as_ref()],
        bump
    )]
    pub box_state: Account<'info, BoxState>,
    
    /// CHECK: Authority that can mark honorary as transformed (backend wallet)
    pub authority: Signer<'info>,
}

// Data structures
#[account]
pub struct BoxState {
    pub minted_at: i64,              // 8 bytes - UNIX timestamp of first open()
    pub luck: u8,                    // 1 byte - calculated luck score (0-60)
    pub owner: Pubkey,               // 32 bytes - box owner
    pub box_mint: Pubkey,            // 32 bytes - NFT mint address
    pub randomness_account: Pubkey,  // 32 bytes - Switchboard randomness account
    pub reward_amount: u64,          // 8 bytes - DEV_FATE reward amount (set after reveal)
    pub is_jackpot: bool,            // 1 byte - whether this is a jackpot (set after reveal)
    pub revealed: bool,              // 1 byte - whether the box has been revealed
    pub settled: bool,               // 1 byte - whether rewards have been claimed
    pub honorary_choice: bool,       // 1 byte - if jackpot: true = honorary, false = tokens
    pub honorary_transformed: bool,  // 1 byte - whether NFT metadata has been transformed
    pub random_percentage: f64,      // 8 bytes - random percentage used for reveal
}

impl BoxState {
    pub const LEN: usize = 8 + 1 + 32 + 32 + 32 + 8 + 1 + 1 + 1 + 1 + 1 + 8; // 126 bytes
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Box must be opened before settling")]
    BoxNotOpened,
    #[msg("Box has already been settled")]
    BoxAlreadySettled,
    #[msg("Invalid luck score (must be 0-60)")]
    InvalidLuckScore,
    #[msg("Not a jackpot - no choice available")]
    NotAJackpot,
    #[msg("Box has already been opened")]
    BoxAlreadyOpened,
    #[msg("Box randomness has not been revealed yet")]
    BoxNotRevealed,
    #[msg("Box has already been revealed")]
    BoxAlreadyRevealed,
    #[msg("Honorary NFT not chosen for this jackpot")]
    HonoraryNotChosen,
    #[msg("FateBox already transformed to Honorary")]
    HonoraryAlreadyTransformed,
    #[msg("Caller does not own the FateBox NFT")]
    NotNftOwner,
    #[msg("Invalid NFT balance")]
    InvalidNftBalance,
}