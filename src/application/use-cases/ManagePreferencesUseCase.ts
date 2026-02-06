import { StoragePort } from '../ports/StoragePort';

export class ManagePreferencesUseCase {
  constructor(private storage: StoragePort) {}

  async getApiKey(): Promise<string | null> {
    return this.storage.getPreference('apiKey');
  }

  async setApiKey(key: string): Promise<void> {
    await this.storage.setPreference('apiKey', key);
  }

  async getDefaultVoice(): Promise<string> {
    return (await this.storage.getPreference('defaultVoice')) ?? 'nova';
  }

  async setDefaultVoice(voice: string): Promise<void> {
    await this.storage.setPreference('defaultVoice', voice);
  }

  async getDefaultDuration(): Promise<number> {
    const val = await this.storage.getPreference('defaultDuration');
    return val ? parseInt(val, 10) : 10;
  }

  async setDefaultDuration(minutes: number): Promise<void> {
    await this.storage.setPreference('defaultDuration', minutes.toString());
  }
}
