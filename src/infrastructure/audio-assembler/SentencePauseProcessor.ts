import { MeditationSegment } from '../../domain/value-objects/MeditationSegment';

export interface SentencePauseConfig {
  periodPause: number;
  ellipsisPause: number;
  questionPause: number;
  exclamationPause: number;
  sentencesPerBatch: number;
  minWordsForPause: number;
}

const DEFAULT_CONFIG: SentencePauseConfig = {
  periodPause: 2.0,
  ellipsisPause: 2.5,
  questionPause: 2.0,
  exclamationPause: 1.5,
  sentencesPerBatch: 2,
  minWordsForPause: 3,
};

/**
 * Split text into sentences, handling common abbreviations in IT/EN.
 */
function splitSentences(text: string): string[] {
  // Protect common abbreviations from being split
  const abbreviations = [
    'Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Sr', 'Jr',
    'Sig', 'Dott', 'Ing', 'Avv', 'Arch',
    'etc', 'es', 'eg', 'i\\.e', 'e\\.g',
    'vs', 'vol', 'pag', 'cap', 'fig',
  ];
  const abbrPattern = new RegExp(
    `(?:${abbreviations.join('|')})\\.`,
    'gi',
  );

  // Replace abbreviation dots with placeholder
  const placeholder = '\u0000';
  const protected_ = text.replace(abbrPattern, (match) =>
    match.slice(0, -1) + placeholder,
  );

  // Split on sentence-ending punctuation followed by space or end of string
  const raw = protected_.split(/(?<=[.!?…]+)\s+/);

  // Restore placeholders and trim
  return raw
    .map(s => s.replace(new RegExp(placeholder, 'g'), '.').trim())
    .filter(s => s.length > 0);
}

/**
 * Determine pause duration based on how a sentence ends.
 */
function getPauseDuration(sentence: string, config: SentencePauseConfig): number {
  const trimmed = sentence.trimEnd();
  if (trimmed.endsWith('...') || trimmed.endsWith('…')) return config.ellipsisPause;
  if (trimmed.endsWith('?')) return config.questionPause;
  if (trimmed.endsWith('!')) return config.exclamationPause;
  return config.periodPause;
}

/**
 * Count words in a text string.
 */
function wordCount(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Takes an array of MeditationSegments and expands speech segments
 * by splitting them into batches of sentences with micro-silence pauses in between.
 *
 * - silence and dong segments pass through unchanged
 * - speech segments are split into sentence batches (default 3 sentences per batch)
 * - micro-silence segments of 1.2-2.0s are inserted between batches
 * - very short sentences (<minWordsForPause words) are merged into the current batch
 */
export function expandWithSentencePauses(
  segments: MeditationSegment[],
  config: Partial<SentencePauseConfig> = {},
): MeditationSegment[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const result: MeditationSegment[] = [];

  for (const segment of segments) {
    if (segment.type !== 'speech') {
      result.push(segment);
      continue;
    }

    const sentences = splitSentences(segment.content);

    if (sentences.length <= 1) {
      result.push(segment);
      continue;
    }

    // Group sentences into batches, merging short ones into the current batch
    const batches: string[][] = [];
    let currentBatch: string[] = [];

    for (const sentence of sentences) {
      currentBatch.push(sentence);

      const isShort = wordCount(sentence) < cfg.minWordsForPause;
      if (!isShort && currentBatch.length >= cfg.sentencesPerBatch) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    }

    // Push remaining sentences
    if (currentBatch.length > 0) {
      // If only one short sentence remains, merge with previous batch
      if (
        batches.length > 0 &&
        currentBatch.length === 1 &&
        wordCount(currentBatch[0]) < cfg.minWordsForPause
      ) {
        batches[batches.length - 1].push(...currentBatch);
      } else {
        batches.push(currentBatch);
      }
    }

    // If we ended up with a single batch, no pauses needed
    if (batches.length <= 1) {
      result.push(segment);
      continue;
    }

    // Emit speech + silence segments for each batch
    for (let i = 0; i < batches.length; i++) {
      const batchText = batches[i].join(' ');
      const words = wordCount(batchText);

      result.push({
        type: 'speech',
        content: batchText,
        durationSeconds: (words / 120) * 60, // use 120 WPM for expanded segments
      });

      // Insert micro-silence between batches (not after the last one)
      if (i < batches.length - 1) {
        const lastSentence = batches[i][batches[i].length - 1];
        const pauseDuration = getPauseDuration(lastSentence, cfg);
        result.push({
          type: 'silence',
          content: String(pauseDuration),
          durationSeconds: pauseDuration,
        });
      }
    }
  }

  return result;
}
