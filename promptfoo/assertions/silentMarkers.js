/**
 * silentMarkers.js — Validates silence markers.
 *
 * Rules:
 *   - Silence durations between 2s and 15s
 *   - At least 10 [SILENT Xs] markers
 *   - Total silence >= 20% of target duration
 *   - No speech block > 100 words without a marker
 */
module.exports = (output, context) => {
  const durationMin = parseInt(context.vars.duration, 10) || 10;
  const targetSeconds = durationMin * 60;
  const minTotalSilence = targetSeconds * 0.2;

  const silenceRegex = /\[SILENT\s+(\d+)\s*s?\]/gi;
  const durations = [];
  let match;
  while ((match = silenceRegex.exec(output)) !== null) {
    durations.push(parseInt(match[1], 10));
  }

  const totalSilence = durations.reduce((sum, d) => sum + d, 0);
  const outOfRange = durations.filter((d) => d < 2 || d > 15);

  const reasons = [];

  if (durations.length < 10) {
    reasons.push(
      `Expected at least 10 [SILENT] markers, found ${durations.length}`,
    );
  }

  if (outOfRange.length > 0) {
    reasons.push(
      `${outOfRange.length} silence(s) outside 2-15s range: ${outOfRange.join(', ')}s`,
    );
  }

  if (totalSilence < minTotalSilence) {
    reasons.push(
      `Total silence ${totalSilence}s is below 20% of ${targetSeconds}s target (need >= ${minTotalSilence}s)`,
    );
  }

  // No speech block > 100 words without a marker
  const cleanText = output
    .replace(/\[DONG\]/gi, '[MARKER]')
    .replace(/\[SILENT\s+\d+\s*s?\]/gi, '[MARKER]');
  const speechBlocks = cleanText.split('[MARKER]')
    .map(b => b.trim()).filter(b => b.length > 0);
  const longBlocks = speechBlocks.filter(
    b => b.split(/\s+/).filter(w => w.length > 0).length > 100
  );
  if (longBlocks.length > 0) {
    reasons.push(`${longBlocks.length} speech block(s) exceed 100 words without a silence marker`);
  }

  const pass = durations.length >= 10 && outOfRange.length === 0
    && totalSilence >= minTotalSilence && longBlocks.length === 0;

  // Partial scoring: proportion of silence requirement met, capped at 1
  const silenceRatio = Math.min(totalSilence / minTotalSilence, 1);
  const markerScore = durations.length >= 10 ? 1 : durations.length / 10;
  const rangeScore = durations.length > 0 ? (durations.length - outOfRange.length) / durations.length : 0;
  const score = pass ? 1 : (silenceRatio * 0.5 + markerScore * 0.25 + rangeScore * 0.25);

  return {
    pass,
    score: Math.round(score * 100) / 100,
    reason: pass
      ? `Silence OK: ${durations.length} markers, ${totalSilence}s total (${Math.round((totalSilence / targetSeconds) * 100)}% of target)`
      : reasons.join('; '),
  };
};
