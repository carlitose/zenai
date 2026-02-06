import { Meditation } from '../../domain/entities/Meditation';
import { MeditationGeneratorPort } from '../ports/MeditationGeneratorPort';
import { AudioAssemblerPort } from '../ports/AudioAssemblerPort';
import { StoragePort } from '../ports/StoragePort';
import { GenerateMeditationInput } from '../dto/GenerateMeditationInput';
import { VoiceOption } from '../../domain/value-objects/VoiceOption';
import * as Crypto from 'expo-crypto';
import { File, Directory, Paths } from 'expo-file-system';

export type GenerationPhase =
  | { phase: 'generating_text' }
  | { phase: 'generating_audio'; current: number; total: number }
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

    const voice = (input.voice
      ?? (await this.storage.getPreference('defaultVoice'))
      ?? 'nova') as VoiceOption;

    // 1. Generate text
    onProgress?.({ phase: 'generating_text' });
    const generatedText = await this.generator.generateText(
      { prompt: input.prompt, type: input.type, durationMinutes: input.durationMinutes },
      apiKey,
    );

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
        const audioPath = await this.generator.generateSegmentAudio(segment.content, voice, apiKey);
        segment.audioFilePath = audioPath;
      }
    }

    // 4. Save segments to meditation directory
    onProgress?.({ phase: 'saving' });
    const meditationId = Crypto.randomUUID();
    const meditationDir = new Directory(Paths.document, 'meditations', meditationId);
    meditationDir.create({ intermediates: true });

    const manifest = await this.assembler.saveSegments(segments, meditationDir.uri);
    const actualDuration = this.assembler.estimateDuration(segments);

    // 5. Save manifest
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
}
