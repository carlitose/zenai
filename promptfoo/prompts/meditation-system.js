const { register } = require('tsx/cjs/api');

const unregister = register();
const { MEDITATION_SYSTEM_PROMPT } = require('../../src/shared/prompts/meditation-system-prompt');
unregister();

module.exports = function ({ vars }) {
  return JSON.stringify([
    { role: 'system', content: MEDITATION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Meditation type: ${vars.type}\nTarget duration: ${vars.duration} minutes\n\n${vars.prompt}`,
    },
  ]);
};
