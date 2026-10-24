import { env } from "@/lib/env";
import { ClaudeProvider } from "./claude";
import type { AIProvider } from "./provider";

let provider: AIProvider | undefined;

/** The configured AI provider (AI_PROVIDER, default claude). Tests can override with setAIProvider. */
export function ai(): AIProvider {
  if (provider) return provider;
  switch (env().AI_PROVIDER) {
    case "claude":
      provider = new ClaudeProvider();
  }
  return provider!;
}

export function setAIProvider(p: AIProvider | undefined) {
  provider = p;
}

export type { AIProvider } from "./provider";
