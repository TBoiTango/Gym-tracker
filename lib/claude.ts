// Anthropic / Claude SDK wrapper
// All AI calls go through this file. To switch models or add logging, change it here.
import Anthropic from "@anthropic-ai/sdk";

// The client is instantiated once (module singleton).
// ANTHROPIC_API_KEY is read from environment automatically by the SDK.
export const anthropic = new Anthropic();

// Haiku is used for structured JSON generation (plans, sessions) — fast and cost-effective.
// Switch to claude-sonnet-4-6 here if you want higher quality at the cost of speed.
export const CLAUDE_MODEL = "claude-haiku-4-5";

// Sends a single prompt and returns the text response.
// Used for plan generation and variation suggestions.
export async function askClaude(prompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  return block.text;
}
