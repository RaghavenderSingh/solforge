// packages/ai-core/src/agents/generator.ts
// Produces lib.rs, Cargo.toml, client.ts, and tests.ts via OpenRouter.
// Receives research context from the Researcher and fix context from the Debugger.

import { type SolanaForgeState, type ForgeFiles } from "../state";
import { MODEL_MAP, callOpenRouter, extractJSON, toStringArray } from "../utils";

const SYSTEM_PROMPT = `You are a Solana smart contract expert specializing in Anchor 0.30.
Generate production-ready, compilable Solana programs.

Rules:
- Use #[derive(InitSpace)] on all account structs, never calculate space manually
- Store bumps in account structs and reuse them (never re-derive without storing)
- ALWAYS use checked_add/checked_sub/checked_mul for arithmetic — never raw + - *
- Use has_one constraints for ownership verification
- Use typed accounts (Account<'info, T>) — never raw AccountInfo except for system/token programs
- PDAs must have their seeds match the account's purpose
- Every instruction that modifies funds MUST verify the caller is a Signer

Return ONLY valid JSON with no markdown fences, no backticks, no explanation:
{
  "files": {
    "lib.rs": "full anchor program rust code",
    "Cargo.toml": "full cargo.toml content",
    "client.ts": "full typescript client using @coral-xyz/anchor",
    "tests.ts": "full bankrun test code"
  },
  "programName": "snake_case_program_name",
  "instructions": ["instruction_name_1"],
  "accounts": ["AccountStructName1"]
}`;

export async function generatorAgent(
  state: SolanaForgeState,
  apiKey: string
): Promise<SolanaForgeState> {
  const model = MODEL_MAP[state.model] ?? MODEL_MAP["gemini-flash"]!;

  // Inject research context (top 3 by relevance, trimmed to fit)
  const contextSection = state.researchCtx.length > 0
    ? "\n\n## Reference Patterns\n" +
      state.researchCtx
        .slice(0, 3)
        .map((p) => `### ${p.name}\n${p.code.slice(0, 2500)}`)
        .join("\n\n")
    : "";

  const systemPrompt = SYSTEM_PROMPT + contextSection;

  // Build user message
  const parsedSection = state.parsedIntent.instructions.length > 0
    ? `\n\nStructured requirements:\n` +
      `- Program name: ${state.parsedIntent.programName}\n` +
      `- Instructions: ${state.parsedIntent.instructions.join(", ")}\n` +
      `- Accounts: ${state.parsedIntent.accounts.join(", ")}\n` +
      (state.parsedIntent.constraints.length > 0
        ? `- Constraints: ${state.parsedIntent.constraints.join(", ")}\n`
        : "")
    : "";

  const existingSection = hasExistingCode(state.files)
    ? `\n\nExisting code to refine:\n` +
      Object.entries(state.files)
        .filter(([, v]) => v)
        .map(([k, v]) => `// ${k}\n${v.slice(0, 1000)}`)
        .join("\n\n") +
      "\n\nRefinement:"
    : "";

  const fixSection = state.suggestedFix
    ? `\n\n⚠️ PREVIOUS GENERATION HAD ISSUES. Apply this fix EXACTLY:\n${state.suggestedFix}\nDo not change unrelated code.`
    : "";

  const userMessage =
    `${existingSection || "Request:"} ${state.userIntent}${parsedSection}${fixSection}`;

  const raw = await callOpenRouter(model, systemPrompt, userMessage, apiKey, {
    temperature: 0.2,
    max_tokens: 8000,
  });

  try {
    const json = extractJSON(raw);
    const files = (json.files ?? {}) as Partial<ForgeFiles>;

    return {
      ...state,
      files: {
        "lib.rs":     files["lib.rs"]     ?? state.files["lib.rs"],
        "Cargo.toml": files["Cargo.toml"] ?? state.files["Cargo.toml"],
        "client.ts":  files["client.ts"]  ?? state.files["client.ts"],
        "tests.ts":   files["tests.ts"]   ?? state.files["tests.ts"],
      },
      programMeta: {
        name:         (json.programName as string) || "program",
        instructions: toStringArray(json.instructions),
        accounts:     toStringArray(json.accounts),
      },
      suggestedFix: null, // clear fix after applying
      currentAgent: "tester",
    };
  } catch {
    // If JSON parsing fails, return current state with an error noted
    return {
      ...state,
      errors: [
        ...state.errors,
        { agent: "generator", message: "Failed to parse generator output", timestamp: Date.now() },
      ],
      currentAgent: "tester",
    };
  }
}

function hasExistingCode(files: ForgeFiles): boolean {
  return Object.values(files).some((v) => v.length > 0);
}
