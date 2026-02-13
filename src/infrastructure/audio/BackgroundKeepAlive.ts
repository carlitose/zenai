import { Audio } from 'expo-av';

const silenceAsset = require('../../../assets/sounds/silence.mp3');

export class BackgroundKeepAlive {
  private sound: Audio.Sound | null = null;

  async start(): Promise<void> {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    const { sound } = await Audio.Sound.createAsync(silenceAsset, {
      isLooping: true,
      volume: 0,
    });
    this.sound = sound;
    await sound.playAsync();
  }

  async stop(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}
