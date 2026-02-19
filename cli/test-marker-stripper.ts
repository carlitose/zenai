/**
 * Unit tests for MarkerStripper.stripMarkersWithPositions()
 * Run with: npx tsx cli/test-marker-stripper.ts
 */
import { stripMarkersWithPositions } from "../src/infrastructure/audio-assembler/MarkerStripper";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual === expected) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    console.log(`     expected: ${JSON.stringify(expected)}`);
    console.log(`     actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// =========================================================================
// Test 1: Simple text with markers in the middle
// =========================================================================
console.log("\n=== Test 1: Simple markers in the middle ===");
{
  const text = `Chiudi gli occhi e rilassati. [SILENT 3s] Respira profondamente. [DONG] Sei in pace.`;
  const { cleanText, markers } = stripMarkersWithPositions(text);

  // Double spaces are expected: "rilassati. [SILENT 3s] Respira" → "rilassati.  Respira"
  // (the spaces before/after the marker are preserved)
  assertEqual(cleanText, "Chiudi gli occhi e rilassati.  Respira profondamente.  Sei in pace.", "cleanText strips markers (keeps surrounding spaces)");
  assertEqual(markers.length, 2, "2 markers found");

  // First marker: [SILENT 3s] after "Chiudi gli occhi e rilassati."
  assertEqual(markers[0].type, "silence", "marker 0 is silence");
  assertEqual(markers[0].seconds, 3, "marker 0 is 3s");

  // charIndex should point to end of "Chiudi gli occhi e rilassati." in cleanText
  const expectedCut0 = "Chiudi gli occhi e rilassati.".length;
  assertEqual(markers[0].charIndex, expectedCut0, `marker 0 charIndex = ${expectedCut0} (end of "rilassati.")`);
  assertEqual(cleanText[markers[0].charIndex - 1], ".", `char before cut is "." (last of "rilassati.")`);

  // Second marker: [DONG] after "Respira profondamente." (with double space in cleanText)
  assertEqual(markers[1].type, "dong", "marker 1 is dong");
  const expectedCut1 = "Chiudi gli occhi e rilassati.  Respira profondamente.".length;
  assertEqual(markers[1].charIndex, expectedCut1, `marker 1 charIndex = ${expectedCut1} (end of "profondamente.")`);
  assertEqual(cleanText[markers[1].charIndex - 1], ".", `char before cut is "." (last of "profondamente.")`);
}

// =========================================================================
// Test 2: Leading markers (the real meditation pattern!)
// =========================================================================
console.log("\n=== Test 2: Leading markers before speech ===");
{
  const text = `[DONG]
[SILENT 3s]
[DONG]
[SILENT 3s]
[DONG]
[SILENT 5s]
Fai un respiro profondo, inspira dal naso, sentendo l'aria che entra lenta e piena
[SILENT 8s]
Ora espira lentamente, come se lasciassi uscire anche un po' di peso
[SILENT 8s]
Un ultimo respiro, semplice e presente`;

  const { cleanText, markers } = stripMarkersWithPositions(text);

  console.log(`  cleanText starts with: "${cleanText.substring(0, 40)}..."`);
  console.log(`  cleanText length: ${cleanText.length}`);
  console.log(`  markers: ${markers.length}`);

  // The clean text should NOT have leading newlines
  assert(!cleanText.startsWith("\n"), "cleanText does not start with newline");
  assert(cleanText.startsWith("Fai"), 'cleanText starts with "Fai"');

  // Leading markers should all have charIndex = 0
  assertEqual(markers[0].type, "dong", "marker 0 is dong");
  assertEqual(markers[0].charIndex, 0, "leading dong: charIndex = 0");

  assertEqual(markers[1].type, "silence", "marker 1 is silence 3s");
  assertEqual(markers[1].charIndex, 0, "leading silence 3s: charIndex = 0");

  assertEqual(markers[2].type, "dong", "marker 2 is dong");
  assertEqual(markers[2].charIndex, 0, "leading dong: charIndex = 0");

  assertEqual(markers[3].type, "silence", "marker 3 is silence 3s");
  assertEqual(markers[3].charIndex, 0, "leading silence 3s: charIndex = 0");

  assertEqual(markers[4].type, "dong", "marker 4 is dong");
  assertEqual(markers[4].charIndex, 0, "leading dong: charIndex = 0");

  assertEqual(markers[5].type, "silence", "marker 5 is silence 5s");
  assertEqual(markers[5].charIndex, 0, "leading silence 5s: charIndex = 0");

  // First middle marker: [SILENT 8s] after "...lenta e piena"
  const firstSentence = "Fai un respiro profondo, inspira dal naso, sentendo l'aria che entra lenta e piena";
  assertEqual(markers[6].type, "silence", "marker 6 is silence 8s");
  assertEqual(markers[6].charIndex, firstSentence.length,
    `marker 6 charIndex = ${firstSentence.length} (end of "piena")`);

  // Verify the character BEFORE the cut is 'a' (last char of "piena")
  assertEqual(cleanText[markers[6].charIndex - 1], "a",
    `char before cut is "a" (last char of "piena")`);

  // Second middle marker: [SILENT 8s] after "...anche un po' di peso"
  const upToSecond = cleanText.indexOf("Ora espira lentamente, come se lasciassi uscire anche un po' di peso") +
    "Ora espira lentamente, come se lasciassi uscire anche un po' di peso".length;
  assertEqual(markers[7].type, "silence", "marker 7 is silence 8s");
  assertEqual(markers[7].charIndex, upToSecond,
    `marker 7 charIndex = ${upToSecond} (end of "peso")`);
  assertEqual(cleanText[markers[7].charIndex - 1], "o",
    `char before cut is "o" (last char of "peso")`);
}

// =========================================================================
// Test 3: Trailing markers after speech
// =========================================================================
console.log("\n=== Test 3: Trailing markers after speech ===");
{
  const text = `Sei in pace.
[DONG]
[SILENT 3s]
[DONG]`;

  const { cleanText, markers } = stripMarkersWithPositions(text);

  assertEqual(cleanText, "Sei in pace.", "cleanText is just the speech");
  assertEqual(markers.length, 3, "3 trailing markers");

  // All trailing markers should have charIndex = cleanText.length (end of speech)
  assertEqual(markers[0].type, "dong", "marker 0 is dong");
  assertEqual(markers[0].charIndex, "Sei in pace.".length, "trailing dong: charIndex = end of text");

  assertEqual(markers[1].type, "silence", "marker 1 is silence 3s");
  assertEqual(markers[1].charIndex, "Sei in pace.".length, "trailing silence: charIndex = end of text");

  assertEqual(markers[2].type, "dong", "marker 2 is dong");
  assertEqual(markers[2].charIndex, "Sei in pace.".length, "trailing dong: charIndex = end of text");
}

// =========================================================================
// Test 4: Full meditation pattern (leading + middle + trailing)
// =========================================================================
console.log("\n=== Test 4: Full meditation pattern ===");
{
  const text = `[DONG]
[SILENT 3s]
[DONG]
[SILENT 5s]
Prima frase qui.
[SILENT 8s]
Seconda frase qui.
[SILENT 3s]
[DONG]
[SILENT 3s]
[DONG]`;

  const { cleanText, markers } = stripMarkersWithPositions(text);

  console.log(`  cleanText: "${cleanText}"`);

  assert(cleanText.startsWith("Prima"), 'starts with "Prima"');
  assert(cleanText.includes("Seconda"), 'contains "Seconda"');
  assert(!cleanText.includes("["), "no markers in cleanText");

  // Leading markers: charIndex = 0
  assertEqual(markers[0].charIndex, 0, "leading dong: 0");
  assertEqual(markers[1].charIndex, 0, "leading silence: 0");
  assertEqual(markers[2].charIndex, 0, "leading dong: 0");
  assertEqual(markers[3].charIndex, 0, "leading silence: 0");

  // Middle marker: after "Prima frase qui."
  const primaLen = "Prima frase qui.".length;
  assertEqual(markers[4].charIndex, primaLen, `middle silence: ${primaLen} (after "Prima frase qui.")`);
  assertEqual(cleanText[markers[4].charIndex - 1], ".", 'char before middle cut is "."');

  // Trailing markers: after "Seconda frase qui."
  const fullLen = cleanText.length;
  assertEqual(markers[5].charIndex, fullLen, `trailing silence: ${fullLen}`);
  assertEqual(markers[6].charIndex, fullLen, `trailing dong: ${fullLen}`);
  assertEqual(markers[7].charIndex, fullLen, `trailing silence: ${fullLen}`);
  assertEqual(markers[8].charIndex, fullLen, `trailing dong: ${fullLen}`);
}

// =========================================================================
// Summary
// =========================================================================
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log("\n⚠️  FAILURES detected — charIndex computation is broken!");
  process.exit(1);
} else {
  console.log("\n✅ All tests pass!");
}
