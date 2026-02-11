import OpenAI from "openai";

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
    return "openai:gpt-5.2";
  }

  async callApi(prompt, context) {
    const messages = JSON.parse(prompt);

    const response = await getClient().chat.completions.create({
      model: "gpt-5.2",
      messages,
      reasoning_effort: "medium",
      max_completion_tokens: 16384,
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
