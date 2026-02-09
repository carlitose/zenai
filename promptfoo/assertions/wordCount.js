/**
 * wordCount.js — Validates word count against duration target.
 *
 * Formula: (target_min - silence_min - 0.25) * 130
 * Tolerance: +/- 35%
 *
 * Reference targets:
 *   5 min  → ~400 words
 *   10 min → ~850 words
 *   15 min → ~1200 words
 *   20 min → ~1600 words
 */
module.exports = (output, context) => {
  const WPM = 130;
  const TOLERANCE = 0.35;
  const durationMin = parseInt(context.vars.duration, 10) || 10;

  // Extract total silence from markers
  const silenceRegex = /\[SILENT\s+(\d+)\s*s?\]/gi;
  let totalSilenceS = 0;
  let match;
  while ((match = silenceRegex.exec(output)) !== null) {
    totalSilenceS += parseInt(match[1], 10);
  }
  const silenceMin = totalSilenceS / 60;

  // Calculate expected word count
  const expectedWords = Math.max(0, (durationMin - silenceMin - 0.25) * WPM);

  // Count actual words (remove markers first)
  const cleanText = output
    .replace(/\[DONG\]/gi, '')
    .replace(/\[SILENT\s+\d+\s*s?\]/gi, '');
  const words = cleanText
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const actualWords = words.length;

  const lowerBound = Math.round(expectedWords * (1 - TOLERANCE));
  const upperBound = Math.round(expectedWords * (1 + TOLERANCE));
  const pass = actualWords >= lowerBound && actualWords <= upperBound;

  // Proportional score: how close to expected
  const ratio = expectedWords > 0 ? actualWords / expectedWords : 0;
  const deviation = Math.abs(1 - ratio);
  const score = pass ? 1 : Math.max(0, 1 - deviation);

  return {
    pass,
    score: Math.round(score * 100) / 100,
    reason: pass
      ? `Word count OK: ${actualWords} words (expected ~${Math.round(expectedWords)}, range ${lowerBound}-${upperBound})`
      : `Word count ${actualWords} outside range ${lowerBound}-${upperBound} (expected ~${Math.round(expectedWords)} for ${durationMin}min with ${totalSilenceS}s silence)`,
  };
};
