import { NextResponse } from "next/server";

const MODEL_MAP: Record<string, string> = {
  "gemini-flash": "google/gemini-2.0-flash-001",
  "claude-sonnet": "anthropic/claude-sonnet-4-5",
  "claude-opus": "anthropic/claude-opus-4-5",
  "gpt-4o": "openai/gpt-4o",
};

const SYSTEM_PROMPT = `You are a Solana smart contract expert using Anchor 0.30.
Generate production-ready, compilable code.
Return ONLY valid JSON (no markdown fences, no backticks, no explanation) with this exact structure:
{
  "files": {
    "lib.rs": "full anchor program rust code",
    "Cargo.toml": "full cargo.toml content",
    "client.ts": "full typescript client code using @coral-xyz/anchor",
    "tests.ts": "full bankrun test code"
  },
  "programName": "snake_case_program_name",
  "instructions": ["instruction1", "instruction2"],
  "accounts": ["AccountName1", "AccountName2"]
}`;

const EMPTY = { files: {}, programName: "", instructions: [], accounts: [] };

export async function POST(req: Request) {
  const { prompt, existingFiles, model = "gemini-flash" } = await req.json();

  const orModel = MODEL_MAP[model as string] ?? MODEL_MAP["gemini-flash"];

  const refineContext = existingFiles
    ? `Existing code:\n${Object.entries(existingFiles as Record<string, string>)
        .map(([k, v]) => `// ${k}\n${(v as string).slice(0, 800)}`)
        .join("\n\n")}\n\nRefinement request:`
    : "Request:";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://solanaforge.dev",
      "X-Title": "SolanaForge",
    },
    body: JSON.stringify({
      model: orModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${refineContext} ${prompt}` },
      ],
      temperature: 0.2,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`[OpenRouter] ${res.status} ${res.statusText}:`, errBody);
    return NextResponse.json({ ...EMPTY, error: `OpenRouter ${res.status}: ${errBody}` }, { status: 502 });
  }

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json(EMPTY);

  try {
    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch {
    return NextResponse.json(EMPTY);
  }
}
