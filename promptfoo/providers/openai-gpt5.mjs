import OpenAI from "openai";
import { register } from "tsx/esm/api";

const unregister = register();
const { TEXT_GENERATION_MODEL, TEXT_GENERATION_REASONING, TEXT_GENERATION_MAX_OUTPUT_TOKENS } = await import("../../src/shared/prompts/meditation-system-prompt.ts");
unregister();

const TIMEOUT_MS = 3_600_000; // 1 hour

let client;

function getClient() {
  if (!client) {
    client = new OpenAI({
      timeout: TIMEOUT_MS,
      maxRetries: 3,
    });
  }
  return client;
}

/**
 * Custom promptfoo provider for GPT-5.2.
 *
 * Bypasses promptfoo's built-in OpenAI provider which has a hardcoded
 * 5-minute timeout (REQUEST_TIMEOUT_MS) that cannot be overridden via
 * config or env vars — a known bug in promptfoo ≤0.120.x.
 *
 * Exported as a class per promptfoo custom provider API:
 *   - id()       → provider identifier
 *   - callApi()  → sends prompt to GPT-5.2 and returns response
 */
export default class GPT5Provider {
  id() {
    return `openai:${TEXT_GENERATION_MODEL}`;
  }

  async callApi(prompt, context) {
    const messages = JSON.parse(prompt);

    const response = await getClient().chat.completions.create({
      model: TEXT_GENERATION_MODEL,
      messages,
      reasoning_effort: TEXT_GENERATION_REASONING.effort,
      max_completion_tokens: TEXT_GENERATION_MAX_OUTPUT_TOKENS,
    });

    const choice = response.choices[0];

    return {
      output: choice.message.content,
      tokenUsage: {
        total: response.usage?.total_tokens ?? 0,
        prompt: response.usage?.prompt_tokens ?? 0,
        completion: response.usage?.completion_tokens ?? 0,
      },
    };
  }
}
