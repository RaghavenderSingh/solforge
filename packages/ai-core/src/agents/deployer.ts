// packages/ai-core/src/agents/deployer.ts
// Stub deployer — real deployment requires a server-side build service (Phase 2).
// Returns a placeholder DeployResult so the frontend can show the deploy step.

import { type SolanaForgeState } from "../state";

export async function deployerAgent(
  state: SolanaForgeState
): Promise<SolanaForgeState> {
  // Phase 2: compile with Anchor CLI in a Docker container, then deploy via BPF loader.
  // For now, return a stub result indicating the program is ready to deploy.
  return {
    ...state,
    deployResult: {
      programId:  "DEPLOY_PENDING",
      txHash:     "",
      network:    state.deployTarget,
      timestamp:  Date.now(),
    },
    currentAgent: "deployer",
  };
}
