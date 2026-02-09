/**
 * dongMarkers.js — Validates DONG marker placement.
 *
 * Rules (from CLI prompt):
 *   - Exactly 6 [DONG] markers total
 *   - First 3 non-empty lines must be [DONG]
 *   - Last 3 non-empty lines must be [DONG]
 */
module.exports = (output, context) => {
  const dongRegex = /\[DONG\]/gi;
  const matches = output.match(dongRegex) || [];
  const totalDongs = matches.length;

  const lines = output
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Check first 3 non-empty lines
  const first3 = lines.slice(0, 3);
  const first3AreDong = first3.every((l) => /^\[DONG\]$/i.test(l));

  // Check last 3 non-empty lines
  const last3 = lines.slice(-3);
  const last3AreDong = last3.every((l) => /^\[DONG\]$/i.test(l));

  const reasons = [];

  if (totalDongs !== 6) {
    reasons.push(`Expected exactly 6 [DONG] markers, found ${totalDongs}`);
  }
  if (!first3AreDong) {
    reasons.push(
      `First 3 non-empty lines must be [DONG], got: ${JSON.stringify(first3)}`,
    );
  }
  if (!last3AreDong) {
    reasons.push(
      `Last 3 non-empty lines must be [DONG], got: ${JSON.stringify(last3)}`,
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
