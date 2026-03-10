// packages/ai-core/src/utils.ts
// Shared utilities for all agents.

export const MODEL_MAP: Record<string, string> = {
  "gemini-flash": "google/gemini-2.0-flash-001",
  "gemini-pro":   "google/gemini-2.0-pro-exp",
  "claude-sonnet": "anthropic/claude-sonnet-4-5",
  "claude-opus":   "anthropic/claude-opus-4-5",
  "gpt-4o":        "openai/gpt-4o",
};

// Always use the cheapest/fastest model for planning/testing/debugging
export const FAST_MODEL = "google/gemini-2.0-flash-001";

interface CallOptions {
  temperature?: number;
  max_tokens?: number;
}

export async function callOpenRouter(
  model: string,
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  opts: CallOptions = {}
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://solanaforge.dev",
      "X-Title": "SolanaForge",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage },
      ],
      temperature: opts.temperature ?? 0.2,
      max_tokens:  opts.max_tokens  ?? 4000,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

/** Extract the first JSON object from a string (handles markdown fences). */
export function extractJSON(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");
  return JSON.parse(match[0]) as Record<string, unknown>;
}

/** Safely get a string array from parsed JSON. */
export function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string");
}
