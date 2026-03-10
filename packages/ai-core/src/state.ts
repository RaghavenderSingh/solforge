// packages/ai-core/src/state.ts
// Shared state schema for the SolanaForge multi-agent pipeline.
// All agents read/write this state object — no agent calls another directly.

export type ModelChoice = "gemini-flash" | "gemini-pro" | "claude-sonnet" | "claude-opus" | "gpt-4o";
export type PipelineMode = "fast" | "balanced" | "deep";
export type DeployTarget = "devnet" | "mainnet";
export type AgentName = "planner" | "researcher" | "generator" | "tester" | "debugger" | "deployer";
export type PipelineStatus = "running" | "done" | "failed";

export interface Task {
  id: string;
  description: string;
  agent: AgentName;
  status: "pending" | "running" | "done" | "failed";
}

export interface AnchorPattern {
  name: string;
  description: string;
  code: string;
  relevance: number;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  logs: string[];
  duration: number;
}

export interface DebugResult {
  errorCode?: number;
  errorName?: string;
  instruction?: string;
  account?: string;
  constraint?: string;
  plainEnglish: string;
  suggestedFix: string | null;
}

export interface DeployResult {
  programId: string;
  txHash: string;
  network: string;
  timestamp: number;
  idl?: object;
}

export interface AgentError {
  agent: AgentName;
  message: string;
  timestamp: number;
}

export interface ParsedIntent {
  programName: string;
  instructions: string[];
  accounts: string[];
  constraints: string[];
}

export interface ForgeFiles {
  "lib.rs": string;
  "Cargo.toml": string;
  "client.ts": string;
  "tests.ts": string;
}

export interface SolanaForgeState {
  // ── Input ──────────────────────────────────────────────────
  userIntent: string;
  deployTarget: DeployTarget;
  model: ModelChoice;
  mode: PipelineMode;

  // ── Planner output ─────────────────────────────────────────
  plan: Task[];
  currentTask: Task | null;
  parsedIntent: ParsedIntent;

  // ── Researcher output ──────────────────────────────────────
  researchCtx: AnchorPattern[];
  relevantDocs: string[];

  // ── Generator output ───────────────────────────────────────
  files: ForgeFiles;
  programMeta: {
    name: string;
    instructions: string[];
    accounts: string[];
  };

  // ── Tester output ──────────────────────────────────────────
  testResults: TestResult[];
  testsPassed: boolean;

  // ── Debugger output ────────────────────────────────────────
  debugOutput: DebugResult | null;
  suggestedFix: string | null;

  // ── Deployer output ────────────────────────────────────────
  deployResult: DeployResult | null;

  // ── Control flow ───────────────────────────────────────────
  iteration: number;        // max 3 before surfacing failure
  errors: AgentError[];
  currentAgent: AgentName;
  status: PipelineStatus;
}

// ── Agent event stream (consumed by frontend via SSE) ─────────────────────────
export type AgentEvent =
  | { type: "agent:start"; agent: AgentName }
  | { type: "agent:complete"; agent: AgentName }
  | { type: "agent:error"; agent: AgentName; error: string }
  | { type: "file:ready"; name: string; content: string }
  | { type: "test:result"; result: TestResult }
  | { type: "deploy:success"; result: DeployResult }
  | { type: "pipeline:done"; programName: string; files: ForgeFiles }
  | { type: "pipeline:failed"; errors: AgentError[] };

// ── Pipeline input (what the API route receives) ──────────────────────────────
export interface PipelineInput {
  userIntent: string;
  model: ModelChoice;
  mode: PipelineMode;
  deployTarget?: DeployTarget;
  existingFiles?: Partial<ForgeFiles>;
  apiKey: string;
}

// ── Initial state factory ─────────────────────────────────────────────────────
export function createInitialState(input: PipelineInput): SolanaForgeState {
  return {
    userIntent: input.userIntent,
    model: input.model,
    mode: input.mode,
    deployTarget: input.deployTarget ?? "devnet",
    plan: [],
    currentTask: null,
    parsedIntent: { programName: "", instructions: [], accounts: [], constraints: [] },
    researchCtx: [],
    relevantDocs: [],
    files: {
      "lib.rs": input.existingFiles?.["lib.rs"] ?? "",
      "Cargo.toml": input.existingFiles?.["Cargo.toml"] ?? "",
      "client.ts": input.existingFiles?.["client.ts"] ?? "",
      "tests.ts": input.existingFiles?.["tests.ts"] ?? "",
    },
    programMeta: { name: "", instructions: [], accounts: [] },
    testResults: [],
    testsPassed: false,
    debugOutput: null,
    suggestedFix: null,
    deployResult: null,
    iteration: 0,
    errors: [],
    currentAgent: "planner",
    status: "running",
  };
}
