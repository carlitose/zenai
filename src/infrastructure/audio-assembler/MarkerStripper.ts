export interface MarkerPosition {
  type: 'silence' | 'dong';
  seconds?: number;
  /** Index in the clean text where the cut should happen (length of clean text accumulated before this marker) */
  charIndex: number;
}

export interface StripMarkersResult {
  cleanText: string;
  markers: MarkerPosition[];
}

/**
 * Strips [SILENT Xs] and [DONG] markers from meditation text,
 * preserving their positions relative to the cleaned text.
 * Used by the "full audio + split" approach to know where to cut.
 */
export function stripMarkersWithPositions(text: string): StripMarkersResult {
  const regex = /\[SILENT\s+(\d+)\s*s?\]|\[DONG\]/gi;
  const markers: MarkerPosition[] = [];
  let cleanText = '';
  let lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    // Accumulate text before this marker
    const before = text.slice(lastIndex, match.index);
    cleanText += before;

    // charIndex = current length of clean text (points to end of accumulated speech)
    // This maps directly to alignment.characterEndTimesSeconds[charIndex - 1]
    const charIndex = cleanText.trimEnd().length;

    if (match[0].toUpperCase().startsWith('[SILENT')) {
      markers.push({
        type: 'silence',
        seconds: parseInt(match[1], 10),
        charIndex,
      });
    } else {
      markers.push({
        type: 'dong',
        charIndex,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  cleanText += text.slice(lastIndex);

  // Adjust charIndices for leading whitespace removed by trim().
  // When text starts with markers (e.g. [DONG]\n[SILENT 3s]\n...), newlines
  // accumulate before the first speech. trim() removes them, but charIndices
  // were computed including that whitespace → all indices are shifted forward.
  const leadingWs = cleanText.length - cleanText.trimStart().length;
  cleanText = cleanText.trim();
  if (leadingWs > 0) {
    for (const m of markers) {
      m.charIndex = Math.max(0, m.charIndex - leadingWs);
    }
  }

  return { cleanText, markers };
}
