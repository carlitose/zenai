import { StoragePort } from '../ports/StoragePort';
import { Directory } from 'expo-file-system';

export class DeleteMeditationUseCase {
  constructor(private storage: StoragePort) {}

  async execute(id: string): Promise<void> {
    const meditation = await this.storage.getMeditationById(id);
    if (meditation) {
      const dir = new Directory(meditation.audioDirectoryPath);
      if (dir.exists) {
        dir.delete();
      }
      await this.storage.deleteMeditation(id);
    }
  }
}
