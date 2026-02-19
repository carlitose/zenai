import { Meditation } from '../../domain/entities/Meditation';
import { MeditationGeneratorPort } from '../ports/MeditationGeneratorPort';
import { AudioAssemblerPort, SegmentManifestEntry } from '../ports/AudioAssemblerPort';
import { StoragePort } from '../ports/StoragePort';
import { GenerateMeditationInput } from '../dto/GenerateMeditationInput';
import { DEFAULT_ELEVENLABS_VOICE } from '../../domain/value-objects/ElevenLabsVoice';
import { stripMarkersWithPositions } from '../../infrastructure/audio-assembler/MarkerStripper';
import { Mp3FrameSplitter } from '../../infrastructure/audio/Mp3FrameSplitter';
import { Mp3Concatenator } from '../../infrastructure/audio/Mp3Concatenator';
import { HybridMeditationGenerator } from '../../infrastructure/hybrid/HybridMeditationGenerator';
import { Asset } from 'expo-asset';
import * as Crypto from 'expo-crypto';
import { File, Directory, Paths } from 'expo-file-system';

const DONG_DURATION_SECONDS = 2.5;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dongAsset44k = require('../../../assets/sounds/dong-44k.mp3');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const silenceAsset44k = require('../../../assets/sounds/silence-44k.mp3');

export type GenerationPhase =
  | { phase: 'generating_text' }
  | { phase: 'generating_audio'; current: number; total: number }
  | { phase: 'generating_full_audio' }
  | { phase: 'splitting_audio' }
  | { phase: 'saving' }
  | { phase: 'done' };

export class GenerateMeditationUseCase {
  constructor(
    private generator: MeditationGeneratorPort,
    private assembler: AudioAssemblerPort,
    private storage: StoragePort,
  ) {}

  async execute(
    input: GenerateMeditationInput,
    onProgress?: (phase: GenerationPhase) => void,
  ): Promise<Meditation> {
    const apiKey = await this.storage.getPreference('apiKey');
    if (!apiKey) throw new Error('API_KEY_MISSING');

    const ttsProvider = (await this.storage.getPreference('ttsProvider')) || 'openai';

    let voice: string;
    if (ttsProvider === 'elevenlabs') {
      voice = input.voice
        ?? (await this.storage.getPreference('defaultElevenLabsVoice'))
        ?? DEFAULT_ELEVENLABS_VOICE;
    } else {
      voice = input.voice
        ?? (await this.storage.getPreference('defaultVoice'))
        ?? 'nova';
    }

    const speedPref = await this.storage.getPreference('defaultSpeed');
    const speed = input.speed ?? (speedPref ? parseFloat(speedPref) : 0.9);

    const language = input.language && input.language !== 'auto' ? input.language : undefined;

    // 1. Generate text
    onProgress?.({ phase: 'generating_text' });
    const generatedText = await this.generator.generateText(
      { prompt: input.prompt, type: input.type, durationMinutes: input.durationMinutes, language },
      apiKey,
    );

    // Branch: ElevenLabs full-audio flow vs legacy per-segment flow
    if (
      ttsProvider === 'elevenlabs' &&
      this.generator instanceof HybridMeditationGenerator
    ) {
      return this.executeElevenLabsFullAudioFlow(
        input, generatedText, voice, language, onProgress,
      );
    }

    // Legacy per-segment flow (OpenAI or fallback)
    return this.executeLegacyFlow(
      input, generatedText, voice, apiKey, speed, language, ttsProvider, onProgress,
    );
  }

  private async executeLegacyFlow(
    input: GenerateMeditationInput,
    generatedText: string,
    voice: string,
    apiKey: string,
    speed: number,
    language: string | undefined,
    ttsProvider: string,
    onProgress?: (phase: GenerationPhase) => void,
  ): Promise<Meditation> {
    // 2. Parse segments and expand with micro-pauses between sentence batches
    const rawSegments = this.assembler.parseSegments(generatedText);
    const segments = this.assembler.expandWithPauses(rawSegments);
    const speechSegments = segments.filter(s => s.type === 'speech');
    const totalSpeech = speechSegments.length;

    // 3. Generate audio for speech segments
    let speechIndex = 0;
    for (const segment of segments) {
      if (segment.type === 'speech') {
        speechIndex++;
        onProgress?.({ phase: 'generating_audio', current: speechIndex, total: totalSpeech });
        const audioPath = await this.generator.generateSegmentAudio(segment.content, voice, apiKey, speed, language);
        segment.audioFilePath = audioPath;
      }
    }

    // 4. Save segments to meditation directory
    onProgress?.({ phase: 'saving' });
    const meditationId = Crypto.randomUUID();
    const meditationDir = new Directory(Paths.document, 'meditations', meditationId);
    meditationDir.create({ intermediates: true });

    const { manifest } = await this.assembler.saveSegments(segments, meditationDir.uri, ttsProvider);
    const actualDuration = this.assembler.estimateDuration(segments);

    // 5. Save manifest (kept for backward compatibility)
    const manifestFile = new File(meditationDir, 'segments.json');
    manifestFile.write(JSON.stringify(manifest, null, 2));

    // 6. Create and persist entity
    const meditation = Meditation.create({
      id: meditationId,
      prompt: input.prompt,
      type: input.type ?? 'guided',
      targetDuration: (input.durationMinutes ?? 10) * 60,
      actualDuration,
      generatedText,
      audioDirectoryPath: meditationDir.uri,
      voiceId: voice,
      segmentCount: segments.length,
    });

    await this.storage.saveMeditation(meditation);
    onProgress?.({ phase: 'done' });
    return meditation;
  }

  private async executeElevenLabsFullAudioFlow(
    input: GenerateMeditationInput,
    generatedText: string,
    voice: string,
    language: string | undefined,
    onProgress?: (phase: GenerationPhase) => void,
  ): Promise<Meditation> {
    const hybridGenerator = this.generator as HybridMeditationGenerator;

    // 1. Strip markers and preserve positions
    const { cleanText, markers } = stripMarkersWithPositions(generatedText);

    // 2. Generate full audio with timestamps
    onProgress?.({ phase: 'generating_full_audio' });
    const result = await hybridGenerator.generateFullAudioWithTimestamps(cleanText, voice, language);
    if (!result) {
      throw new Error('ELEVENLABS_FULL_AUDIO_FAILED');
    }

    const { audioData, alignment } = result;

    if (alignment.characterEndTimesSeconds.length === 0) {
      throw new Error('ELEVENLABS_NO_ALIGNMENT_DATA');
    }

    const totalDuration = alignment.characterEndTimesSeconds[alignment.characterEndTimesSeconds.length - 1];

    // 3. Compute cut times from marker positions
    const cutTimes: number[] = [];
    for (const marker of markers) {
      let cutTime: number;
      if (marker.charIndex <= 0) {
        cutTime = 0;
      } else if (marker.charIndex >= cleanText.length) {
        cutTime = totalDuration;
      } else {
        const alignIdx = Math.min(marker.charIndex - 1, alignment.characterEndTimesSeconds.length - 1);
        cutTime = alignment.characterEndTimesSeconds[alignIdx];
      }
      cutTimes.push(cutTime);
    }

    // 4. Split MP3 at frame boundaries
    onProgress?.({ phase: 'splitting_audio' });
    const { partPaths, actualCutTimes } = await Mp3FrameSplitter.splitAndSave(audioData, cutTimes);

    // 5. Build ordered file list interleaving speech + silence/dong
    const meditationId = Crypto.randomUUID();
    const meditationDir = new Directory(Paths.document, 'meditations', meditationId);
    meditationDir.create({ intermediates: true });

    // Load silence asset bytes once
    const [silenceAssetLoaded] = await Asset.loadAsync(silenceAsset44k);
    if (!silenceAssetLoaded.localUri) throw new Error('Failed to load silence asset');
    const silenceBytes = await new File(silenceAssetLoaded.localUri).bytes();

    // Copy dong asset once
    let dongPath = '';
    const [dongAssetLoaded] = await Asset.loadAsync(dongAsset44k);
    if (dongAssetLoaded.localUri) {
      const dongSource = new File(dongAssetLoaded.localUri);
      const dongDest = new File(meditationDir, 'dong.mp3');
      dongSource.copy(dongDest);
      dongPath = dongDest.uri;
    }

    const orderedPaths: string[] = [];
    const manifest: SegmentManifestEntry[] = [];
    let actualDuration = 0;

    // For each part/marker pair: speech part, then marker (silence/dong)
    for (let i = 0; i < partPaths.length; i++) {
      // Speech part
      if (partPaths[i] !== '') {
        orderedPaths.push(partPaths[i]);

        // Estimate speech part duration from actual cut times
        const partStart = i === 0 ? 0 : actualCutTimes[i - 1];
        const partEnd = i < actualCutTimes.length ? actualCutTimes[i] : totalDuration;
        const partDuration = partEnd - partStart;
        actualDuration += partDuration;

        manifest.push({
          type: 'speech',
          file: `part-${i}.mp3`,
          durationSeconds: partDuration,
        });
      }

      // Marker after this part (if any)
      if (i < markers.length) {
        const marker = markers[i];
        if (marker.type === 'silence' && marker.seconds) {
          const silenceFileName = `silence-${i}.mp3`;
          this.generateSilenceFile(meditationDir, silenceFileName, marker.seconds, silenceBytes);
          orderedPaths.push(new File(meditationDir, silenceFileName).uri);
          actualDuration += marker.seconds;
          manifest.push({
            type: 'silence',
            file: silenceFileName,
            durationSeconds: marker.seconds,
          });
        } else if (marker.type === 'dong' && dongPath) {
          orderedPaths.push(dongPath);
          actualDuration += DONG_DURATION_SECONDS;
          manifest.push({
            type: 'dong',
            file: 'dong.mp3',
            durationSeconds: DONG_DURATION_SECONDS,
          });
        }
      }
    }

    // 6. Concatenate all into meditation.mp3
    onProgress?.({ phase: 'saving' });
    const outputFile = new File(meditationDir, 'meditation.mp3');
    await Mp3Concatenator.concatenate(orderedPaths, outputFile.uri);

    // Save manifest
    const manifestFile = new File(meditationDir, 'segments.json');
    manifestFile.write(JSON.stringify(manifest, null, 2));

    // Cleanup temp split files
    for (const p of partPaths) {
      if (p) {
        try { const f = new File(p); if (f.exists) f.delete(); } catch {}
      }
    }

    // 7. Create and persist entity
    const segmentCount = manifest.length;
    const meditation = Meditation.create({
      id: meditationId,
      prompt: input.prompt,
      type: input.type ?? 'guided',
      targetDuration: (input.durationMinutes ?? 10) * 60,
      actualDuration,
      generatedText,
      audioDirectoryPath: meditationDir.uri,
      voiceId: voice,
      segmentCount,
    });

    await this.storage.saveMeditation(meditation);
    onProgress?.({ phase: 'done' });
    return meditation;
  }

  private generateSilenceFile(
    medDir: Directory,
    fileName: string,
    durationSeconds: number,
    silenceBytes: Uint8Array,
  ): void {
    const repeatCount = Math.max(1, Math.round(durationSeconds));
    const totalLength = silenceBytes.length * repeatCount;
    const combined = new Uint8Array(totalLength);

    let offset = 0;
    for (let i = 0; i < repeatCount; i++) {
      combined.set(silenceBytes, offset);
      offset += silenceBytes.length;
    }

    const destFile = new File(medDir, fileName);
    destFile.write(combined);
  }
}
