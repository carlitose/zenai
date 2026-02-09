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
 * @param {string} prompt - JSON-encoded messages array from the prompt file
 * @param {object} context - { vars, provider, config }
 * @returns {{ output: string, tokenUsage: object }}
 */
export default async function callApi(prompt, context) {
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
