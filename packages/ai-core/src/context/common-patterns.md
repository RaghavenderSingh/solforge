# Common Solana / Anchor Patterns

## Staking Vault

```rust
#[account]
#[derive(InitSpace)]
pub struct StakePool {
    pub authority: Pubkey,
    pub reward_mint: Pubkey,
    pub stake_mint: Pubkey,
    pub vault: Pubkey,
    pub reward_rate: u64,     // tokens per second per staked token
    pub total_staked: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct StakeEntry {
    pub owner: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub last_claim_ts: i64,
    pub bump: u8,
}

// Reward calculation
pub fn calculate_rewards(entry: &StakeEntry, pool: &StakePool) -> Result<u64> {
    let now = Clock::get()?.unix_timestamp;
    let elapsed = (now - entry.last_claim_ts) as u64;
    let rewards = entry.amount
        .checked_mul(pool.reward_rate).ok_or(MyError::MathOverflow)?
        .checked_mul(elapsed).ok_or(MyError::MathOverflow)?
        .checked_div(1_000_000_000).ok_or(MyError::MathOverflow)?;
    Ok(rewards)
}
```

## DAO / Governance

```rust
#[account]
#[derive(InitSpace)]
pub struct Proposal {
    pub creator: Pubkey,
    pub dao: Pubkey,
    #[max_len(200)]
    pub description: String,
    pub votes_for: u64,
    pub votes_against: u64,
    pub start_ts: i64,
    pub end_ts: i64,
    pub executed: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    pub voter: Pubkey,
    pub proposal: Pubkey,
    pub vote: bool,   // true = for, false = against
    pub weight: u64,
    pub bump: u8,
}

// Voting instruction accounts
#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(
        init,
        payer = voter,
        space = 8 + VoteRecord::INIT_SPACE,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump,
    )]
    pub vote_record: Account<'info, VoteRecord>,

    #[account(
        mut,
        constraint = proposal.end_ts > Clock::get().unwrap().unix_timestamp @ GovernanceError::ProposalExpired,
        constraint = !proposal.executed @ GovernanceError::AlreadyExecuted,
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

## NFT / Token Metadata

```rust
use mpl_token_metadata::instructions::{CreateV1CpiBuilder, MintV1CpiBuilder};
use mpl_token_metadata::types::{TokenStandard, Creator};

// Create NFT with Metaplex
pub fn create_nft(ctx: Context<CreateNft>, name: String, uri: String) -> Result<()> {
    CreateV1CpiBuilder::new(&ctx.accounts.metadata_program)
        .metadata(&ctx.accounts.metadata)
        .master_edition(Some(&ctx.accounts.master_edition))
        .mint(&ctx.accounts.mint.to_account_info(), true)
        .authority(&ctx.accounts.authority.to_account_info())
        .payer(&ctx.accounts.payer.to_account_info())
        .update_authority(&ctx.accounts.authority.to_account_info(), true)
        .system_program(&ctx.accounts.system_program.to_account_info())
        .sysvar_instructions(&ctx.accounts.sysvar_instructions.to_account_info())
        .spl_token_program(Some(&ctx.accounts.token_program.to_account_info()))
        .name(name)
        .uri(uri)
        .seller_fee_basis_points(500)  // 5%
        .token_standard(TokenStandard::NonFungible)
        .invoke()?;
    Ok(())
}
```

## SPL Token Program

```rust
// Account struct for a vault
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump = vault.bump,
        token::mint = pool.token_mint,
        token::authority = vault,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = pool.token_mint,
        token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, Pool>,

    pub token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
```

## Counter (Simplest Example)

```rust
#[account]
#[derive(InitSpace)]
pub struct Counter {
    pub authority: Pubkey,
    pub count: u64,
    pub bump: u8,
}

pub fn initialize(ctx: Context<InitializeCounter>) -> Result<()> {
    let counter = &mut ctx.accounts.counter;
    counter.authority = ctx.accounts.authority.key();
    counter.count = 0;
    counter.bump = ctx.bumps.counter;
    Ok(())
}

pub fn increment(ctx: Context<Increment>) -> Result<()> {
    let counter = &mut ctx.accounts.counter;
    counter.count = counter.count.checked_add(1).ok_or(CounterError::Overflow)?;
    Ok(())
}
```

## Escrow

```rust
#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub maker: Pubkey,
    pub taker: Option<Pubkey>,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
    pub bump: u64,
}

// To cancel: close the vault (token account) and escrow account
#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(
        mut,
        has_one = maker,
        seeds = [b"escrow", maker.key().as_ref()],
        bump = escrow.bump,
        close = maker,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump,
        token::mint = escrow.mint_a,
        token::authority = escrow,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub maker: Signer<'info>,
    pub token_program: Program<'info, Token>,
    // ...
}
```

## TypeScript Client Pattern

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MyProgram } from "../target/types/my_program";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.MyProgram as Program<MyProgram>;

// Derive PDA
const [myAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("my_account"), provider.wallet.publicKey.toBuffer()],
  program.programId
);

// Call instruction
await program.methods
  .initialize(new anchor.BN(100))
  .accounts({
    myAccount: myAccountPda,
    authority: provider.wallet.publicKey,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .rpc();
```

## Bankrun Test Pattern

```typescript
import { startAnchor } from "anchor-bankrun";
import { BankrunProvider } from "anchor-bankrun";
import { Program } from "@coral-xyz/anchor";

describe("my_program", () => {
  let context: ProgramTestContext;
  let provider: BankrunProvider;
  let program: Program<MyProgram>;

  before(async () => {
    context = await startAnchor(".", [{ name: "my_program", programId: PROGRAM_ID }], []);
    provider = new BankrunProvider(context);
    program = new Program(IDL, provider);
  });

  it("initializes correctly", async () => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("my_account"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initialize(new BN(100))
      .accounts({ myAccount: pda, authority: provider.wallet.publicKey })
      .rpc();

    const account = await program.account.myAccount.fetch(pda);
    assert.equal(account.data.toNumber(), 100);
  });
});
```
