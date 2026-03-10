import { NextResponse } from "next/server";
import { runPipeline } from "@repo/ai-core";
import type { ModelChoice, PipelineMode } from "@repo/ai-core";

export const maxDuration = 120; // seconds — allow long generations

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not set" }, { status: 500 });
  }

  let body: {
    prompt?: string;
    model?: ModelChoice;
    mode?: PipelineMode;
    existingFiles?: Record<string, string>;
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, model = "gemini-flash", mode = "fast", existingFiles } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const pipeline = runPipeline({
          userIntent: prompt,
          model,
          mode,
          existingFiles: existingFiles as Parameters<typeof runPipeline>[0]["existingFiles"],
          apiKey,
        });

        for await (const event of pipeline) {
          send(event);
        }
      } catch (err) {
        send({
          type: "pipeline:failed",
          errors: [{ agent: "generator", message: String(err), timestamp: Date.now() }],
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
    },
  });
}
