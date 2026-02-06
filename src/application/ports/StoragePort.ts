import { Meditation } from '../../domain/entities/Meditation';

export interface StoragePort {
  saveMeditation(meditation: Meditation): Promise<void>;
  getMeditations(): Promise<Meditation[]>;
  getMeditationById(id: string): Promise<Meditation | null>;
  deleteMeditation(id: string): Promise<void>;
  getPreference(key: string): Promise<string | null>;
  setPreference(key: string, value: string): Promise<void>;
}
