/**
 * dongMarkers.js — Validates DONG marker placement.
 *
 * Rules (from CLI prompt):
 *   - Exactly 6 [DONG] markers total
 *   - First 3 DONGs within first 6 non-empty lines (allows interleaved [SILENT])
 *   - Last 3 DONGs within last 6 non-empty lines (allows interleaved [SILENT])
 */
module.exports = (output, context) => {
  const dongRegex = /\[DONG\]/gi;
  const matches = output.match(dongRegex) || [];
  const totalDongs = matches.length;

  const lines = output
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Check first 3 DONGs are within the first 6 non-empty lines (allows interleaved silences)
  const first6 = lines.slice(0, 6);
  const openingDongs = first6.filter((l) => /^\[DONG\]$/i.test(l));
  const first3AreDong = openingDongs.length === 3;

  // Check last 3 DONGs are within the last 6 non-empty lines
  const last6 = lines.slice(-6);
  const closingDongs = last6.filter((l) => /^\[DONG\]$/i.test(l));
  const last3AreDong = closingDongs.length === 3;

  const reasons = [];

  if (totalDongs !== 6) {
    reasons.push(`Expected exactly 6 [DONG] markers, found ${totalDongs}`);
  }
  if (!first3AreDong) {
    reasons.push(
      `Expected 3 [DONG] within first 6 non-empty lines, found ${openingDongs.length} in: ${JSON.stringify(first6)}`,
    );
  }
  if (!last3AreDong) {
    reasons.push(
      `Expected 3 [DONG] within last 6 non-empty lines, found ${closingDongs.length} in: ${JSON.stringify(last6)}`,
    );
  }

  const pass = totalDongs === 6 && first3AreDong && last3AreDong;

  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? 'DONG markers: exactly 6, correctly placed (3 start + 3 end)'
      : reasons.join('; '),
  };
};
