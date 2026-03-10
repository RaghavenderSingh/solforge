// packages/ai-core/src/rag.ts
import { readFileSync } from "fs";
import path from "path";

export function getRelevantContext(prompt: string): string {
  // Simple keyword matching for now
  // Replace with vector embeddings later
  const contexts = [];
  
  if (prompt.includes("token") || prompt.includes("mint")) {
    contexts.push(readFileSync("context/spl-token-patterns.md", "utf-8"));
  }
  if (prompt.includes("nft")) {
    contexts.push(readFileSync("context/nft-patterns.md", "utf-8"));
  }
  if (prompt.includes("swap") || prompt.includes("amm")) {
    contexts.push(readFileSync("context/defi-patterns.md", "utf-8"));
  }
  // Default: always include core Anchor patterns
  contexts.push(readFileSync("context/anchor-core.md", "utf-8"));
  
  return contexts.join("\n\n");
}