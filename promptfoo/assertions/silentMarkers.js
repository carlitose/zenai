/**
 * silentMarkers.js — Validates silence markers.
 *
 * Rules:
 *   - Silence durations between 5s and 60s
 *   - At least 2 [SILENT Xs] markers
 *   - Total silence >= 30% of target duration
 */
module.exports = (output, context) => {
  const durationMin = parseInt(context.vars.duration, 10) || 10;
  const targetSeconds = durationMin * 60;
  const minTotalSilence = targetSeconds * 0.3;

  const silenceRegex = /\[SILENT\s+(\d+)\s*s?\]/gi;
  const durations = [];
  let match;
  while ((match = silenceRegex.exec(output)) !== null) {
    durations.push(parseInt(match[1], 10));
  }

  const totalSilence = durations.reduce((sum, d) => sum + d, 0);
  const outOfRange = durations.filter((d) => d < 5 || d > 60);

  const reasons = [];

  if (durations.length < 2) {
    reasons.push(
      `Expected at least 2 [SILENT] markers, found ${durations.length}`,
    );
  }

  if (outOfRange.length > 0) {
    reasons.push(
      `${outOfRange.length} silence(s) outside 5-60s range: ${outOfRange.join(', ')}s`,
    );
  }

  if (totalSilence < minTotalSilence) {
    reasons.push(
      `Total silence ${totalSilence}s is below 30% of ${targetSeconds}s target (need >= ${minTotalSilence}s)`,
    );
  }

  const pass =
    durations.length >= 2 && outOfRange.length === 0 && totalSilence >= minTotalSilence;

  // Partial scoring: proportion of silence requirement met, capped at 1
  const silenceRatio = Math.min(totalSilence / minTotalSilence, 1);
  const markerScore = durations.length >= 2 ? 1 : durations.length / 2;
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
