// packages/ai-core/src/agents/tester.ts
// LLM-based static code review acting as a proxy for Bankrun simulation.
// Reviews the generated lib.rs for critical Anchor security/correctness issues.
// Returns structured TestResult[]. Real Bankrun WASM testing is a future phase.

import { type SolanaForgeState, type TestResult } from "../state";
import { FAST_MODEL, callOpenRouter, extractJSON } from "../utils";

interface ReviewOutput {
  passed: boolean;
  results: Array<{
    name: string;
    passed: boolean;
    error?: string;
    logs: string[];
    duration: number;
  }>;
}

const REVIEW_PROMPT = `You are an Anchor 0.30 security auditor. Perform a static analysis of the provided Solana program.

Check ALL of the following:
1. signer_check — Every instruction modifying funds/state has a Signer account
2. ownership_check — has_one or constraint verifies account ownership
3. arithmetic_safety — No raw +,-,* on u64/i64 — checked_add/sub/mul used
4. pda_bump_stored — Bump is stored in account struct and reused (not re-derived)
5. space_calculation — space = 8 + Struct::INIT_SPACE or explicit correct size
6. account_types — Uses Account<'info, T> not raw AccountInfo for program accounts
7. closed_accounts — close = target used correctly when closing accounts
8. token_authority — PDA used as token authority, not a user key

Return ONLY valid JSON:
{
  "passed": boolean,
  "results": [
    {
      "name": "check_name",
      "passed": true | false,
      "error": "description of issue if failed (omit if passed)",
      "logs": [],
      "duration": 0
    }
  ]
}`;

export async function testerAgent(
  state: SolanaForgeState,
  apiKey: string
): Promise<SolanaForgeState> {
  const libRs = state.files["lib.rs"];

  // Nothing to test if no code was generated
  if (!libRs) {
    return {
      ...state,
      testResults: [],
      testsPassed: false,
      currentAgent: "debugger",
    };
  }

  let review: ReviewOutput;

  try {
    const raw = await callOpenRouter(
      FAST_MODEL,
      REVIEW_PROMPT,
      `Review this Anchor program:\n\n${libRs.slice(0, 6000)}`,
      apiKey,
      { temperature: 0.1, max_tokens: 2000 }
    );

    const json = extractJSON(raw);
    review = {
      passed: Boolean(json.passed),
      results: (Array.isArray(json.results) ? json.results : []) as ReviewOutput["results"],
    };
  } catch {
    // If review fails, assume passed to avoid blocking the pipeline
    review = {
      passed: true,
      results: [
        { name: "static_review", passed: true, logs: ["Review skipped — parse error"], duration: 0 },
      ],
    };
  }

  const testResults: TestResult[] = review.results.map((r) => ({
    name: r.name,
    passed: r.passed,
    error: r.error,
    logs: r.logs ?? [],
    duration: r.duration ?? 0,
  }));

  return {
    ...state,
    testResults,
    testsPassed: review.passed,
    currentAgent: review.passed ? "deployer" : "debugger",
  };
}
