import { OpenAIMeditationGenerator } from '../infrastructure/openai/OpenAIMeditationGenerator';
import { ExpoAudioAssembler } from '../infrastructure/audio-assembler/ExpoAudioAssembler';
import { SQLiteStorageAdapter } from '../infrastructure/storage/SQLiteStorageAdapter';
import { ExpoAudioPlayerAdapter } from '../infrastructure/audio/ExpoAudioPlayerAdapter';
import { GenerateMeditationUseCase } from '../application/use-cases/GenerateMeditationUseCase';
import { GetMeditationHistoryUseCase } from '../application/use-cases/GetMeditationHistoryUseCase';
import { DeleteMeditationUseCase } from '../application/use-cases/DeleteMeditationUseCase';
import { ManagePreferencesUseCase } from '../application/use-cases/ManagePreferencesUseCase';

const generator = new OpenAIMeditationGenerator();
const assembler = new ExpoAudioAssembler();
const storage = new SQLiteStorageAdapter();
const audioPlayer = new ExpoAudioPlayerAdapter();

export const container = {
  generateMeditation: new GenerateMeditationUseCase(generator, assembler, storage),
  getMeditationHistory: new GetMeditationHistoryUseCase(storage),
  deleteMeditation: new DeleteMeditationUseCase(storage),
  managePreferences: new ManagePreferencesUseCase(storage),
  audioPlayer,
};
