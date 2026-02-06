import { Meditation } from '../../domain/entities/Meditation';
import { StoragePort } from '../ports/StoragePort';

export class GetMeditationHistoryUseCase {
  constructor(private storage: StoragePort) {}

  async execute(): Promise<Meditation[]> {
    return this.storage.getMeditations();
  }
}
