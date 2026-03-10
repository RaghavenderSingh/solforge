// packages/ai-core/src/pipeline.ts
// Multi-agent pipeline orchestrator. Implements the routing logic from the spec:
//
//  fast:     Planner → Generator → [done]
//  balanced: Planner → Researcher → Generator → Tester → [Debugger →] done
//  deep:     Planner → Researcher → Generator → Tester → [Debugger → Generator × 3] → done
//
// Each step yields an AgentEvent consumed by the SSE stream.

import {
  type SolanaForgeState,
  type AgentEvent,
  type PipelineInput,
  createInitialState,
} from "./state";
import { plannerAgent }    from "./agents/planner";
import { researcherAgent } from "./agents/researcher";
import { generatorAgent }  from "./agents/generator";
import { testerAgent }     from "./agents/tester";
import { debuggerAgent }   from "./agents/debugger";

export type { AgentEvent, PipelineInput };
export { type SolanaForgeState };

export async function* runPipeline(
  input: PipelineInput
): AsyncGenerator<AgentEvent> {
  let state: SolanaForgeState = createInitialState(input);

  try {
    // ── Planner ──────────────────────────────────────────────────────────────
    yield { type: "agent:start", agent: "planner" };
    state = await plannerAgent(state, input.apiKey);
    yield { type: "agent:complete", agent: "planner" };

    // ── Researcher (balanced + deep only) ────────────────────────────────────
    if (state.mode !== "fast") {
      yield { type: "agent:start", agent: "researcher" };
      state = await researcherAgent(state);
      yield { type: "agent:complete", agent: "researcher" };
    }

    // ── Generator → Tester → Debugger loop ───────────────────────────────────
    const MAX_ITERATIONS = state.mode === "deep" ? 3 : 1;

    while (state.iteration < MAX_ITERATIONS) {
      // Generator
      yield { type: "agent:start", agent: "generator" };
      state = await generatorAgent(state, input.apiKey);

      // Emit files as they become ready
      for (const [name, content] of Object.entries(state.files)) {
        if (content) yield { type: "file:ready", name, content };
      }

      yield { type: "agent:complete", agent: "generator" };

      // Fast mode: skip testing and go straight to done
      if (state.mode === "fast") break;

      // Tester
      yield { type: "agent:start", agent: "tester" };
      state = await testerAgent(state, input.apiKey);

      for (const result of state.testResults) {
        yield { type: "test:result", result };
      }
      yield { type: "agent:complete", agent: "tester" };

      if (state.testsPassed) break;

      // Debugger (only in deep mode or when there are fixable failures)
      if (state.mode === "balanced") {
        // Balanced: one debug attempt, then surface to user
        yield { type: "agent:start", agent: "debugger" };
        state = await debuggerAgent(state, input.apiKey);
        yield { type: "agent:complete", agent: "debugger" };
        break; // Don't loop back in balanced mode
      }

      // Deep: loop up to MAX_ITERATIONS
      yield { type: "agent:start", agent: "debugger" };
      state = await debuggerAgent(state, input.apiKey);
      yield { type: "agent:complete", agent: "debugger" };

      if (!state.suggestedFix) break; // Unfixable — surface to user

      state = { ...state, iteration: state.iteration + 1 };
    }

    yield {
      type: "pipeline:done",
      programName: state.programMeta.name || state.parsedIntent.programName || "program",
      files: state.files,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    state = {
      ...state,
      errors: [...state.errors, { agent: state.currentAgent, message, timestamp: Date.now() }],
      status: "failed",
    };
    yield { type: "pipeline:failed", errors: state.errors };
  }
}
