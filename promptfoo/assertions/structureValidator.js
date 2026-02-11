/**
 * structureValidator.js — Validates overall meditation structure.
 *
 * Checks:
 *   1. 3 DONGs at start → guided breathing → silences → content → 3 DONGs at end
 *   2. At least 10 lines of spoken content
 *   3. Silences are distributed (not all grouped together)
 *   4. Markers are on their own lines
 */
module.exports = (output) => {
  const lines = output.split('\n');
  const nonEmptyLines = lines
    .map((l, i) => ({ text: l.trim(), index: i }))
    .filter((l) => l.text.length > 0);

  const issues = [];
  let score = 1;

  // 1. Check markers are on their own lines
  const markerRegex = /\[DONG\]|\[SILENT\s+\d+\s*s?\]/i;
  const mixedLines = nonEmptyLines.filter((l) => {
    if (!markerRegex.test(l.text)) return false;
    const cleaned = l.text
      .replace(/\[DONG\]/gi, '')
      .replace(/\[SILENT\s+\d+\s*s?\]/gi, '')
      .trim();
    return cleaned.length > 0;
  });

  if (mixedLines.length > 0) {
    issues.push(
      `${mixedLines.length} marker(s) not on own line (lines: ${mixedLines.map((l) => l.index + 1).join(', ')})`,
    );
    score -= 0.15;
  }

  // 2. Check spoken content lines (excluding markers and empty lines)
  const spokenLines = nonEmptyLines.filter(
    (l) => !/^\[DONG\]$/i.test(l.text) && !/^\[SILENT\s+\d+\s*s?\]$/i.test(l.text),
  );

  if (spokenLines.length < 10) {
    issues.push(
      `Only ${spokenLines.length} spoken content lines (need >= 10)`,
    );
    score -= 0.25;
  }

  // 3. Check structure order: opening DONGs → content → closing DONGs
  const dongIndices = nonEmptyLines
    .map((l, i) => (/^\[DONG\]$/i.test(l.text) ? i : -1))
    .filter((i) => i >= 0);

  if (dongIndices.length >= 6) {
    const openingDongs = dongIndices.slice(0, 3);
    const closingDongs = dongIndices.slice(-3);

    // Opening DONGs should all be within first 6 non-empty lines (allows interleaved [SILENT])
    const openingCorrect = openingDongs.every((d) => d < 6);

    // Closing DONGs should all be within last 6 non-empty lines
    const totalNonEmpty = nonEmptyLines.length;
    const closingCorrect = closingDongs.every((d) => d >= totalNonEmpty - 6);

    if (!openingCorrect) {
      issues.push('Opening 3 DONGs are not within the first 6 non-empty lines');
      score -= 0.2;
    }
    if (!closingCorrect) {
      issues.push('Closing 3 DONGs are not within the last 6 non-empty lines');
      score -= 0.2;
    }

    // Check no DONGs in the middle
    const middleDongs = dongIndices.slice(3, -3);
    if (middleDongs.length > 0) {
      issues.push(`${middleDongs.length} unexpected DONG(s) in the middle of the meditation`);
      score -= 0.2;
    }
  }

  // 4. Check silence distribution: not all grouped together
  const silenceIndices = nonEmptyLines
    .map((l, i) => (/^\[SILENT\s+\d+\s*s?\]$/i.test(l.text) ? i : -1))
    .filter((i) => i >= 0);

  if (silenceIndices.length >= 3 && dongIndices.length >= 6) {
    // Check if silences are spread across at least 3 different "zones" (thirds of the content)
    const contentStart = dongIndices[2] + 1; // after 3rd opening DONG
    const contentEnd = dongIndices[dongIndices.length - 3]; // before 1st closing DONG
    const contentLength = contentEnd - contentStart;

    if (contentLength > 0) {
      const thirdSize = contentLength / 3;
      const zones = new Set(
        silenceIndices
          .filter((i) => i >= contentStart && i < contentEnd)
          .map((i) => Math.floor((i - contentStart) / thirdSize)),
      );

      if (zones.size < 2) {
        issues.push(
          'Silences are clustered in one section instead of being distributed',
        );
        score -= 0.15;
      }
    }
  }

  const pass = issues.length === 0;
  score = Math.max(0, Math.round(score * 100) / 100);

  return {
    pass,
    score: pass ? 1 : score,
    reason: pass
      ? 'Structure OK: correct DONG placement, sufficient content, distributed silences'
      : issues.join('; '),
  };
};
