/**
 * wordCount.js — Validates total estimated duration against target.
 *
 * Estimates total meditation time as:
 *   speech_time (words / 130 WPM) + silence_time + dong_overhead (15s)
 *
 * Tolerance: +/- 45% of target duration
 */
module.exports = (output, context) => {
  const WPM = 130;
  const DONG_OVERHEAD_S = 15;
  const TOLERANCE = 0.50;
  const durationMin = parseInt(context.vars.duration, 10) || 10;
  const targetS = durationMin * 60;

  // Extract total silence from markers
  const silenceRegex = /\[SILENT\s+(\d+)\s*s?\]/gi;
  let totalSilenceS = 0;
  let match;
  while ((match = silenceRegex.exec(output)) !== null) {
    totalSilenceS += parseInt(match[1], 10);
  }

  // Count actual words (remove markers first)
  const cleanText = output
    .replace(/\[DONG\]/gi, '')
    .replace(/\[SILENT\s+\d+\s*s?\]/gi, '');
  const words = cleanText
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const actualWords = words.length;

  // Estimate total duration
  const speechS = Math.round((actualWords / WPM) * 60);
  const estimatedTotalS = speechS + totalSilenceS + DONG_OVERHEAD_S;

  const lowerBound = Math.round(targetS * (1 - TOLERANCE));
  const upperBound = Math.round(targetS * (1 + TOLERANCE));
  const pass = estimatedTotalS >= lowerBound && estimatedTotalS <= upperBound;

  // Proportional score: how close to target
  const deviation = Math.abs(1 - estimatedTotalS / targetS);
  const score = pass ? 1 : Math.max(0, 1 - deviation);

  return {
    pass,
    score: Math.round(score * 100) / 100,
    reason: pass
      ? `Duration OK: ~${estimatedTotalS}s (${actualWords} words/${speechS}s speech + ${totalSilenceS}s silence + ${DONG_OVERHEAD_S}s dongs, target ${targetS}s, range ${lowerBound}-${upperBound}s)`
      : `Duration ~${estimatedTotalS}s outside range ${lowerBound}-${upperBound}s (${actualWords} words/${speechS}s speech + ${totalSilenceS}s silence + ${DONG_OVERHEAD_S}s dongs, target ${targetS}s)`,
  };
};
