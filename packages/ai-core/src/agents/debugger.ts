// packages/ai-core/src/agents/debugger.ts
// Analyzes test failures and produces a concrete fix instruction for the Generator.
// Sets suggestedFix = null when the issue requires human judgment.

import { type SolanaForgeState, type DebugResult } from "../state";
import { FAST_MODEL, callOpenRouter, extractJSON } from "../utils";

const DEBUG_PROMPT = `You are an Anchor 0.30 error decoder and code fixer.

Given the failed security checks and the program code, produce a specific, actionable fix.

Rules:
- Be concrete and specific — not "add a check" but "add has_one = authority @ MyError::Unauthorized to the FooAccounts struct"
- If there are multiple failures, address the most critical one first
- Set suggestedFix to null ONLY if the issue is a fundamental design problem requiring user clarification

Return ONLY valid JSON:
{
  "errorName": "short error category name",
  "instruction": "which instruction is affected",
  "constraint": "which constraint is missing or wrong",
  "plainEnglish": "2-3 sentence explanation a developer can understand",
  "suggestedFix": "exact fix instruction for the Generator, or null"
}`;

export async function debuggerAgent(
  state: SolanaForgeState,
  apiKey: string
): Promise<SolanaForgeState> {
  const failedTests = state.testResults.filter((t) => !t.passed);

  if (failedTests.length === 0) {
    return { ...state, currentAgent: "deployer" };
  }

  const failureSummary = failedTests
    .map((t) => `[${t.name}]: ${t.error ?? "failed"}`)
    .join("\n");

  let debugResult: DebugResult;

  try {
    const raw = await callOpenRouter(
      FAST_MODEL,
      DEBUG_PROMPT,
      `Failed checks:\n${failureSummary}\n\nProgram code:\n${state.files["lib.rs"].slice(0, 5000)}`,
      apiKey,
      { temperature: 0.1, max_tokens: 1000 }
    );

    const json = extractJSON(raw);
    debugResult = {
      errorName:     (json.errorName as string)    || "unknown",
      instruction:   (json.instruction as string)  || undefined,
      constraint:    (json.constraint as string)   || undefined,
      plainEnglish:  (json.plainEnglish as string) || "An issue was detected.",
      suggestedFix:  json.suggestedFix != null ? (json.suggestedFix as string) : null,
    };
  } catch {
    debugResult = {
      plainEnglish: `${failedTests.length} check(s) failed. Unable to automatically diagnose — please refine your prompt.`,
      suggestedFix: null,
    };
  }

  return {
    ...state,
    debugOutput: debugResult,
    suggestedFix: debugResult.suggestedFix,
    currentAgent: debugResult.suggestedFix ? "generator" : "deployer",
  };
}
