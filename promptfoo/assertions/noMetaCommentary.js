/**
 * noMetaCommentary.js — Ensures no meta-text or commentary in the output.
 *
 * Checks for patterns like:
 *   - "here is your meditation"
 *   - "sure", "certainly", "of course"
 *   - Markdown headers (# or ##)
 *   - "Title:", "Note:", etc.
 *   - AI self-references
 */
module.exports = (output) => {
  const patterns = [
    { regex: /\bhere\s+is\b/i, label: '"here is"' },
    { regex: /\bhere['']?s\b/i, label: '"here\'s"' },
    { regex: /^\s*(sure|certainly|of course|absolutely)[,!.\s]/im, label: 'filler opener' },
    { regex: /^#{1,3}\s+/m, label: 'markdown header' },
    { regex: /^\s*\*\*[^*]+\*\*\s*$/m, label: 'markdown bold line' },
    { regex: /^(Title|Note|Duration|Script|Instructions)\s*:/im, label: 'meta label' },
    { regex: /\bas an AI\b/i, label: '"as an AI"' },
    { regex: /\bI hope (this|you)\b/i, label: '"I hope..."' },
    { regex: /\bfeel free to\b/i, label: '"feel free to"' },
    { regex: /\blet me know\b/i, label: '"let me know"' },
    { regex: /```/m, label: 'code block' },
  ];

  const found = [];
  for (const { regex, label } of patterns) {
    if (regex.test(output)) {
      found.push(label);
    }
  }

  const pass = found.length === 0;

  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? 'No meta-commentary detected'
      : `Meta-commentary found: ${found.join(', ')}`,
  };
};
