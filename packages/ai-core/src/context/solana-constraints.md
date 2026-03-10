# Solana Runtime Constraints

## Account Size Limits
- Max account size: 10 MB. Typical program account: keep under 1 KB.
- Rent-exempt minimum: ~0.00203928 SOL per KB.
- String fields: always declare `#[max_len(N)]` with InitSpace.

## Transaction Limits
- Max transaction size: 1232 bytes (including signatures, accounts, instructions)
- Max accounts per transaction: 64. Max CPI call depth: 4.

## Compute Budget
- Default: 200,000 CU. Max: 1,400,000 CU (with SetComputeUnitLimit).
- Token transfer CPI: ~10,000-20,000 CU. PDA derivation: ~1,500 CU per seed.

## Stack Frame: 4 KB max. Use Box<Account<'info, Large>> for large accounts.

## Rent
- Accounts must be rent-exempt. Use `space = 8 + MyStruct::INIT_SPACE`.
- `close = target` constraint returns rent lamports to target.

## Clock
```rust
let clock = Clock::get()?;
let timestamp: i64 = clock.unix_timestamp;
```

## PDAs
- Max 16 seeds, each max 32 bytes. Store bump on-chain.

## Gotchas
1. No floating point — use u64 with basis points (10000 = 100%)
2. No randomness — use VRF or commit-reveal
3. CPI with PDA signer: use CpiContext::new_with_signer
4. Always store bump on init, reuse with bump = account.bump
