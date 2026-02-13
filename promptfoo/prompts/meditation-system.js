const { register } = require('tsx/cjs/api');

const unregister = register();
const { MEDITATION_SYSTEM_PROMPT, buildUserPrompt } = require('../../src/shared/prompts/meditation-system-prompt');
unregister();

module.exports = function ({ vars }) {
  return JSON.stringify([
    { role: 'system', content: MEDITATION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: buildUserPrompt({
        prompt: vars.prompt,
        type: vars.type,
        durationMinutes: parseInt(vars.duration, 10),
        language: vars.language,
      }),
    },
  ]);
};
