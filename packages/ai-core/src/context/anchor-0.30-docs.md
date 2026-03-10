# Anchor 0.30 — Core Patterns

## Program Structure

```rust
use anchor_lang::prelude::*;

declare_id!("YOUR_PROGRAM_ID");

#[program]
pub mod my_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, data: u64) -> Result<()> {
        let account = &mut ctx.accounts.my_account;
        account.authority = ctx.accounts.authority.key();
        account.data = data;
        account.bump = ctx.bumps.my_account;
        Ok(())
    }

    pub fn update(ctx: Context<Update>, new_data: u64) -> Result<()> {
        let account = &mut ctx.accounts.my_account;
        account.data = new_data;
        Ok(())
    }
}
```

## Account Struct with #[account]

```rust
#[account]
#[derive(InitSpace)]
pub struct MyAccount {
    pub authority: Pubkey,   // 32
    pub data: u64,           // 8
    pub bump: u8,            // 1
    #[max_len(50)]
    pub name: String,        // 4 + 50 = 54
}
```

## Accounts Context with Constraints

```rust
#[derive(Accounts)]
#[instruction(name: String)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + MyAccount::INIT_SPACE,
        seeds = [b"my_account", authority.key().as_ref()],
        bump,
    )]
    pub my_account: Account<'info, MyAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(
        mut,
        seeds = [b"my_account", authority.key().as_ref()],
        bump = my_account.bump,
        has_one = authority @ MyError::Unauthorized,
    )]
    pub my_account: Account<'info, MyAccount>,

    pub authority: Signer<'info>,
}
```

## Constraint Reference

| Constraint | Purpose |
|---|---|
| `init` | Creates a new account, requires `payer` and `space` |
| `init_if_needed` | Creates only if account doesn't exist |
| `mut` | Marks account as mutable |
| `has_one = field` | Checks `account.field == field_account.key()` |
| `constraint = expr` | Custom boolean constraint |
| `seeds = [...]` | PDA seeds |
| `bump` | Auto-derives bump, stored as `ctx.bumps.account_name` |
| `bump = account.bump` | Uses stored bump (for existing PDAs) |
| `close = target` | Closes account and sends lamports to target |
| `realloc = new_size` | Reallocates account space |
| `address = pubkey` | Checks exact address |
| `owner = program_id` | Checks account owner |
| `executable` | Checks account is executable |

## PDA Derivation

```rust
// Seeds can be:
// - byte literals: b"prefix"
// - pubkeys: authority.key().as_ref()
// - numbers: &[discriminator]
// - strings: name.as_bytes()

seeds = [b"vault", authority.key().as_ref(), &pool_id.to_le_bytes()]
```

## Custom Errors

```rust
#[error_code]
pub enum MyError {
    #[msg("You are not authorized to perform this action")]
    Unauthorized,
    #[msg("Amount exceeds maximum allowed")]
    AmountTooLarge,
    #[msg("Math overflow")]
    MathOverflow,
}
```

## Safe Arithmetic (Anchor 0.30)

```rust
// ALWAYS use checked arithmetic — never use +, -, * directly on u64
let new_amount = amount
    .checked_add(deposit)
    .ok_or(MyError::MathOverflow)?;

let new_balance = balance
    .checked_sub(withdrawal)
    .ok_or(MyError::InsufficientFunds)?;
```

## Events

```rust
#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// Emit in instruction:
emit!(DepositEvent {
    user: ctx.accounts.user.key(),
    amount,
    timestamp: Clock::get()?.unix_timestamp,
});
```

## Token Operations (SPL)

```rust
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

// Transfer tokens
let cpi_accounts = Transfer {
    from: ctx.accounts.from_token.to_account_info(),
    to: ctx.accounts.to_token.to_account_info(),
    authority: ctx.accounts.authority.to_account_info(),
};
let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
token::transfer(cpi_ctx, amount)?;

// Transfer with PDA signer seeds
let seeds = &[b"vault", ctx.accounts.pool.key().as_ref(), &[ctx.accounts.vault.bump]];
let signer_seeds = &[&seeds[..]];
let cpi_ctx = CpiContext::new_with_signer(..., signer_seeds);
token::transfer(cpi_ctx, amount)?;
```

## Cargo.toml Template

```toml
[package]
name = "my_program"
version = "0.1.0"
description = "Created with Anchor"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "my_program"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []
idl-build = ["anchor-lang/idl-build", "anchor-spl/idl-build"]

[dependencies]
anchor-lang = { version = "0.30.1", features = ["init-if-needed"] }
anchor-spl = { version = "0.30.1" }

[dev-dependencies]
anchor-bankrun = "0.5.0"
solana-program-test = "1.18.26"
solana-sdk = "1.18.26"
tokio = { version = "1", features = ["full"] }
```

## Space Calculation

```
Account discriminator:  8 bytes (always)
Pubkey:                32 bytes
u8:                     1 byte
u16:                    2 bytes
u32:                    4 bytes
u64:                    8 bytes
i64:                    8 bytes
bool:                   1 byte
String:                 4 + max_len bytes
Vec<T>:                 4 + len * size_of::<T> bytes
Option<T>:              1 + size_of::<T> bytes

// Use InitSpace derive macro (0.30+):
#[account]
#[derive(InitSpace)]
pub struct Counter {
    pub authority: Pubkey,  // auto-calculated
    pub count: u64,
    #[max_len(32)]
    pub label: String,
}
space = 8 + Counter::INIT_SPACE
```
