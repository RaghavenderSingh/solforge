# Anchor Security Rules

## Critical: Always Check Signers

```rust
// WRONG — anyone can call this
pub fn drain_vault(ctx: Context<DrainVault>) -> Result<()> { ... }

// CORRECT — only authority can call
#[derive(Accounts)]
pub struct DrainVault<'info> {
    #[account(has_one = authority @ MyError::Unauthorized)]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,  // <-- must be Signer, not AccountInfo
}
```

## Critical: Use has_one for Ownership

```rust
// WRONG — doesn't verify the authority owns this account
#[account(mut)]
pub my_account: Account<'info, MyAccount>,

// CORRECT
#[account(
    mut,
    has_one = authority @ MyError::Unauthorized,
)]
pub my_account: Account<'info, MyAccount>,
pub authority: Signer<'info>,
```

## Critical: Checked Arithmetic

```rust
// WRONG — can overflow silently in release builds
account.balance = account.balance + amount;

// CORRECT — always use checked arithmetic
account.balance = account.balance
    .checked_add(amount)
    .ok_or(error!(MyError::MathOverflow))?;

account.balance = account.balance
    .checked_sub(amount)
    .ok_or(error!(MyError::InsufficientFunds))?;
```

## Critical: PDA Bump Storage

```rust
// WRONG — re-derives bump each time (expensive + inconsistent)
seeds = [b"vault"], bump

// CORRECT — store bump on init, reuse it
// On init:
account.bump = ctx.bumps.my_account;

// On subsequent calls:
#[account(seeds = [b"vault"], bump = account.bump)]
```

## Critical: Verify PDA Seeds Match Intent

```rust
// If a vault belongs to a pool, the pool's key must be in the seeds
seeds = [b"vault", pool.key().as_ref()]
// AND the pool account must be passed in the context
```

## Reentrancy: Solana is Safe By Default

Solana programs cannot be reentered because each transaction is atomic and CPI calls use the same transaction. However, always update state BEFORE making CPI calls:

```rust
// CORRECT ordering
account.balance = account.balance.checked_sub(amount)?;  // update first
token::transfer(cpi_ctx, amount)?;                        // then CPI
```

## Integer Types: Use u64 for Token Amounts

```rust
// Token amounts are always u64 (lamports, SPL tokens)
// Do NOT use f64 for financial calculations
pub amount: u64,        // correct
pub amount: f64,        // WRONG — never use float for money
```

## Account Validation: Prefer Typed Accounts

```rust
// WRONG — no type checking
pub vault: AccountInfo<'info>,

// CORRECT — Anchor validates discriminator + owner
pub vault: Account<'info, TokenAccount>,
pub pool: Account<'info, Pool>,
```

## Closing Accounts: Prevent Account Revival

```rust
// CORRECT — use close constraint, Anchor handles lamport refund
#[account(
    mut,
    close = authority,  // sends lamports to authority
    has_one = authority,
)]
pub my_account: Account<'info, MyAccount>,
```

## Token Authority: Use PDA as Authority

```rust
// Token accounts owned by the program should use a PDA as authority
// Never use the program's upgrade authority or a user key
#[account(
    init,
    payer = payer,
    seeds = [b"vault", pool.key().as_ref()],
    bump,
    token::mint = mint,
    token::authority = vault,  // vault PDA is authority over itself
)]
pub vault: Account<'info, TokenAccount>,
```

## Time Validation

```rust
let now = Clock::get()?.unix_timestamp;

// Check deadline
require!(now < deadline, MyError::Expired);

// Check minimum lock time
require!(
    now >= entry.locked_until,
    MyError::StillLocked
);
```

## Access Control Pattern

```rust
// For multi-role programs, use an explicit role field
#[account]
pub struct Config {
    pub admin: Pubkey,
    pub fee_receiver: Pubkey,
    pub emergency_pause: bool,
    pub bump: u8,
}

// Check pause state in instructions that modify funds
require!(!config.emergency_pause, MyError::ProgramPaused);
```
