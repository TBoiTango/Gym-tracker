// Anthropic / Claude SDK wrapper
// All AI calls go through this file. To switch models or add logging, change it here.
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();

// Sonnet for plan generation — reliable JSON output, fast enough with the 60s timeout.
export const CLAUDE_MODEL = "claude-sonnet-4-6";

// Sends a single prompt and returns the text response.
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

// Extracts the first valid JSON object or array from a string.
// Handles cases where the model wraps the response in markdown fences or adds extra text.
export function extractJSON(raw: string): string {
  // Strip markdown fences first
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Find the first { or [ and the matching closing bracket
  const startObj = cleaned.indexOf("{");
  const startArr = cleaned.indexOf("[");
  const start =
    startObj === -1 ? startArr :
    startArr === -1 ? startObj :
    Math.min(startObj, startArr);

  if (start === -1) return cleaned; // no JSON found, let the caller handle the error

  // Walk forward to find the matching closing bracket
  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let end = -1;

  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === open) depth++;
    else if (cleaned[i] === close) {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  return end !== -1 ? cleaned.slice(start, end + 1) : cleaned.slice(start);
}
