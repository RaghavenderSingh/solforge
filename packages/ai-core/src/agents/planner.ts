// packages/ai-core/src/agents/planner.ts
// Parses user intent into structured requirements.
// Fast mode: keyword extraction only (no LLM call).
// Balanced/Deep: LLM-assisted intent parsing.

import { type SolanaForgeState } from "../state";
import { FAST_MODEL, callOpenRouter, extractJSON, toStringArray } from "../utils";

export async function plannerAgent(
  state: SolanaForgeState,
  apiKey: string
): Promise<SolanaForgeState> {
  // Fast mode: just extract a rough name from the prompt, no LLM call
  if (state.mode === "fast") {
    const words = state.userIntent
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    const programName = words.slice(0, 2).join("_") || "solana_program";

    return {
      ...state,
      parsedIntent: { programName, instructions: [], accounts: [], constraints: [] },
      currentAgent: "generator",
    };
  }

  // Balanced/Deep: use fast LLM to parse intent into structured requirements
  const systemPrompt = `You are a Solana program architect. Parse the user's program description into structured requirements.
Return ONLY valid JSON with no markdown fences:
{
  "programName": "snake_case_name",
  "instructions": ["verb_noun", "verb_noun"],
  "accounts": ["PascalCaseName", "PascalCaseName"],
  "constraints": ["plain english constraint"]
}`;

  try {
    const raw = await callOpenRouter(
      FAST_MODEL,
      systemPrompt,
      `Parse this Solana program description: ${state.userIntent}`,
      apiKey,
      { temperature: 0.1, max_tokens: 600 }
    );

    const json = extractJSON(raw);
    return {
      ...state,
      parsedIntent: {
        programName: (json.programName as string) || "solana_program",
        instructions: toStringArray(json.instructions),
        accounts: toStringArray(json.accounts),
        constraints: toStringArray(json.constraints),
      },
      currentAgent: "researcher",
    };
  } catch {
    // Fall back to keyword extraction on error
    const words = state.userIntent
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    return {
      ...state,
      parsedIntent: {
        programName: words.slice(0, 2).join("_") || "solana_program",
        instructions: [],
        accounts: [],
        constraints: [],
      },
      currentAgent: "researcher",
    };
  }
}

const STOP_WORDS = new Set([
  "that", "this", "with", "from", "have", "will", "want", "need",
  "make", "build", "create", "write", "generate", "solana", "anchor",
  "program", "smart", "contract", "blockchain", "token", "using",
]);
