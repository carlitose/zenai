import { OpenAIMeditationGenerator } from '../infrastructure/openai/OpenAIMeditationGenerator';
import { ElevenLabsTTSAdapter } from '../infrastructure/elevenlabs/ElevenLabsTTSAdapter';
import { HybridMeditationGenerator } from '../infrastructure/hybrid/HybridMeditationGenerator';
import { ExpoAudioAssembler } from '../infrastructure/audio-assembler/ExpoAudioAssembler';
import { SQLiteStorageAdapter } from '../infrastructure/storage/SQLiteStorageAdapter';
import { ExpoAudioPlayerAdapter } from '../infrastructure/audio/ExpoAudioPlayerAdapter';
import { GenerateMeditationUseCase } from '../application/use-cases/GenerateMeditationUseCase';
import { GetMeditationHistoryUseCase } from '../application/use-cases/GetMeditationHistoryUseCase';
import { DeleteMeditationUseCase } from '../application/use-cases/DeleteMeditationUseCase';
import { ManagePreferencesUseCase } from '../application/use-cases/ManagePreferencesUseCase';

const openaiGenerator = new OpenAIMeditationGenerator();
const elevenLabsTTS = new ElevenLabsTTSAdapter();
const assembler = new ExpoAudioAssembler();
const storage = new SQLiteStorageAdapter();
const audioPlayer = new ExpoAudioPlayerAdapter();
const generator = new HybridMeditationGenerator(openaiGenerator, elevenLabsTTS, storage);

export const container = {
  generateMeditation: new GenerateMeditationUseCase(generator, assembler, storage),
  getMeditationHistory: new GetMeditationHistoryUseCase(storage),
  deleteMeditation: new DeleteMeditationUseCase(storage),
  managePreferences: new ManagePreferencesUseCase(storage),
  audioPlayer,
};
