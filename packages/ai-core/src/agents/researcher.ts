// packages/ai-core/src/agents/researcher.ts
// RAG over Anchor docs + security rules + common patterns.
// Returns ranked AnchorPattern[] injected into the Generator's system prompt.

import { type SolanaForgeState, type AnchorPattern } from "../state";
import { ANCHOR_DOCS, COMMON_PATTERNS, SECURITY_RULES, SOLANA_CONSTRAINTS } from "../context/index";

/** Keyword → pattern name mappings for relevance scoring */
const KEYWORD_PATTERNS: Array<{ keywords: string[]; pattern: string; boost: number }> = [
  { keywords: ["token", "mint", "spl", "fungible"],              pattern: "token",      boost: 0.3 },
  { keywords: ["nft", "metadata", "collection", "metaplex"],     pattern: "nft",        boost: 0.3 },
  { keywords: ["stake", "staking", "reward", "yield", "lock"],   pattern: "staking",    boost: 0.3 },
  { keywords: ["swap", "amm", "liquidity", "pool", "defi"],      pattern: "defi",       boost: 0.3 },
  { keywords: ["dao", "governance", "vote", "proposal"],         pattern: "governance", boost: 0.3 },
  { keywords: ["escrow", "trade", "atomic"],                     pattern: "escrow",     boost: 0.2 },
  { keywords: ["counter", "simple", "basic", "example"],        pattern: "counter",    boost: 0.1 },
];

function scoreRelevance(intent: string, keywords: string[]): number {
  const lower = intent.toLowerCase();
  return keywords.filter((k) => lower.includes(k)).length / keywords.length;
}

export async function researcherAgent(
  state: SolanaForgeState
): Promise<SolanaForgeState> {
  const intent = state.userIntent.toLowerCase();

  // Score each keyword group against the intent
  const matchedPatterns = KEYWORD_PATTERNS.map((kp) => ({
    name: kp.pattern,
    boost: kp.boost,
    score: scoreRelevance(intent, kp.keywords),
  })).filter((p) => p.score > 0);

  // Build ranked pattern list
  const patterns: AnchorPattern[] = [
    {
      name: "anchor-core",
      description: "Anchor 0.30 core patterns, constraints, and Cargo.toml template",
      code: ANCHOR_DOCS,
      relevance: 1.0,
    },
    {
      name: "security-rules",
      description: "Critical security checks: signer validation, checked arithmetic, PDA bumps",
      code: SECURITY_RULES,
      relevance: 0.9,
    },
    {
      name: "common-patterns",
      description: "Staking, DAO, NFT, escrow, counter, and token patterns",
      code: COMMON_PATTERNS,
      relevance: 0.7 + matchedPatterns.reduce((acc, p) => acc + p.boost * p.score, 0),
    },
    {
      name: "solana-constraints",
      description: "Account size limits, compute budget, rent, clock, PDAs",
      code: SOLANA_CONSTRAINTS,
      relevance: 0.6,
    },
  ].sort((a, b) => b.relevance - a.relevance);

  const relevantDocs = patterns.map((p) => p.code).filter(Boolean);

  return {
    ...state,
    researchCtx: patterns,
    relevantDocs,
    currentAgent: "generator",
  };
}
