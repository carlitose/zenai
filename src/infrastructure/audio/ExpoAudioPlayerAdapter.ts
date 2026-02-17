import { AudioPlayerPort, AudioStatus } from '../../application/ports/AudioPlayerPort';
import { Audio, AVPlaybackStatus } from 'expo-av';

export class ExpoAudioPlayerAdapter implements AudioPlayerPort {
  private sound: Audio.Sound | null = null;
  private statusCallback: ((status: AudioStatus) => void) | null = null;
  private totalDuration = 0;
  private hasDurationHint = false;
  private isPlayingState = false;

  async loadPlaylist(audioFilePath: string, durationHint?: number): Promise<void> {
    await this.unload();

    if (durationHint != null) {
      this.totalDuration = durationHint;
      this.hasDurationHint = true;
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const { sound, status } = await Audio.Sound.createAsync(
      { uri: audioFilePath },
      { shouldPlay: false },
      this.onPlaybackStatusUpdate.bind(this),
    );
    this.sound = sound;

    if (!this.hasDurationHint && status.isLoaded && status.durationMillis) {
      this.totalDuration = status.durationMillis / 1000;
    }
  }

  async play(): Promise<void> {
    if (!this.sound) return;
    this.isPlayingState = true;
    await this.sound.setPositionAsync(0);
    await this.sound.playAsync();
  }

  async pause(): Promise<void> {
    if (!this.sound) return;
    this.isPlayingState = false;
    await this.sound.pauseAsync();
  }

  async resume(): Promise<void> {
    if (!this.sound) return;
    this.isPlayingState = true;
    await this.sound.playAsync();
  }

  async seekTo(positionSeconds: number): Promise<void> {
    if (!this.sound) return;
    const clamped = Math.max(0, Math.min(positionSeconds, this.totalDuration));
    await this.sound.setPositionAsync(clamped * 1000);
  }

  async getStatus(): Promise<AudioStatus> {
    if (!this.sound) {
      return { isPlaying: false, positionSeconds: 0, durationSeconds: 0, isFinished: false };
    }

    const status = await this.sound.getStatusAsync();
    if (!status.isLoaded) {
      return { isPlaying: false, positionSeconds: 0, durationSeconds: this.totalDuration, isFinished: false };
    }

    return {
      isPlaying: status.isPlaying,
      positionSeconds: (status.positionMillis ?? 0) / 1000,
      durationSeconds: this.totalDuration,
      isFinished: status.didJustFinish === true,
    };
  }

  onStatusUpdate(callback: (status: AudioStatus) => void): void {
    this.statusCallback = callback;
  }

  async unload(): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
    this.totalDuration = 0;
    this.hasDurationHint = false;
    this.isPlayingState = false;
  }

  private onPlaybackStatusUpdate(status: AVPlaybackStatus): void {
    if (!status.isLoaded) return;

    if (!this.hasDurationHint && status.durationMillis) {
      this.totalDuration = status.durationMillis / 1000;
    }

    this.isPlayingState = status.isPlaying;

    const isFinished = status.didJustFinish === true;
    if (isFinished) {
      this.isPlayingState = false;
    }

    this.statusCallback?.({
      isPlaying: status.isPlaying,
      positionSeconds: (status.positionMillis ?? 0) / 1000,
      durationSeconds: this.totalDuration,
      isFinished,
    });
  }
}
