import { AudioPlayerPort, AudioStatus } from '../../application/ports/AudioPlayerPort';
import { SegmentManifestEntry } from '../../application/ports/AudioAssemblerPort';
import { Audio } from 'expo-av';
import { File } from 'expo-file-system';

export class ExpoAudioPlayerAdapter implements AudioPlayerPort {
  private segments: SegmentManifestEntry[] = [];
  private baseDirUri = '';
  private currentSegmentIndex = -1;
  private sound: Audio.Sound | null = null;
  private statusCallback: ((status: AudioStatus) => void) | null = null;
  private isPlaying = false;
  private totalDuration = 0;
  private cumulativeOffsets: number[] = [];
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private silenceInterval: ReturnType<typeof setInterval> | null = null;
  private silenceStartTime = 0;
  private silenceElapsed = 0;
  private isPaused = false;

  async loadPlaylist(segmentsJsonPath: string): Promise<void> {
    await this.unload();

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const file = new File(segmentsJsonPath);
    const content = await file.text();
    this.segments = JSON.parse(content) as SegmentManifestEntry[];
    this.baseDirUri = segmentsJsonPath.replace('segments.json', '');

    // Compute cumulative offsets for seeking
    this.cumulativeOffsets = [];
    let cumulative = 0;
    for (const seg of this.segments) {
      this.cumulativeOffsets.push(cumulative);
      cumulative += seg.durationSeconds;
    }
    this.totalDuration = cumulative;
    this.currentSegmentIndex = -1;
    this.isPlaying = false;
    this.isPaused = false;
  }

  async play(): Promise<void> {
    this.isPlaying = true;
    this.isPaused = false;
    this.currentSegmentIndex = -1;
    await this.playNextSegment();
  }

  async pause(): Promise<void> {
    this.isPaused = true;
    this.isPlaying = false;

    this.clearSilenceTimers();
    if (this.silenceStartTime > 0) {
      this.silenceElapsed += (Date.now() - this.silenceStartTime) / 1000;
    }

    if (this.sound) {
      await this.sound.pauseAsync();
    }

    this.emitStatus();
  }

  async resume(): Promise<void> {
    this.isPaused = false;
    this.isPlaying = true;

    const currentSeg = this.segments[this.currentSegmentIndex];
    if (!currentSeg) return;

    if (currentSeg.type === 'silence') {
      const remaining = currentSeg.durationSeconds - this.silenceElapsed;
      this.silenceStartTime = Date.now();
      this.startSilenceTimer(remaining);
    } else if (this.sound) {
      await this.sound.playAsync();
    }

    this.emitStatus();
  }

  async seekTo(positionSeconds: number): Promise<void> {
    const clamped = Math.max(0, Math.min(positionSeconds, this.totalDuration));

    // Find which segment this position falls in
    let targetSegIndex = 0;
    for (let i = 0; i < this.segments.length; i++) {
      if (i + 1 < this.segments.length && clamped >= this.cumulativeOffsets[i + 1]) {
        targetSegIndex = i + 1;
      } else {
        break;
      }
    }

    const offsetInSegment = clamped - this.cumulativeOffsets[targetSegIndex];
    const wasPlaying = this.isPlaying;

    await this.stopCurrentSegment();
    this.currentSegmentIndex = targetSegIndex;
    const seg = this.segments[targetSegIndex];

    if (seg.type === 'silence') {
      this.silenceElapsed = offsetInSegment;
      if (wasPlaying) {
        this.isPlaying = true;
        this.isPaused = false;
        const remaining = seg.durationSeconds - offsetInSegment;
        this.silenceStartTime = Date.now();
        this.startSilenceTimer(remaining);
      }
    } else if (seg.file) {
      await this.loadAndPlayFile(seg.file);
      if (this.sound) {
        await this.sound.setPositionAsync(offsetInSegment * 1000);
        if (!wasPlaying) {
          await this.sound.pauseAsync();
          this.isPaused = true;
          this.isPlaying = false;
        } else {
          this.isPlaying = true;
          this.isPaused = false;
        }
      }
    }

    this.emitStatus();
  }

  async getStatus(): Promise<AudioStatus> {
    const position = await this.getCurrentPosition();
    return {
      isPlaying: this.isPlaying,
      positionSeconds: position,
      durationSeconds: this.totalDuration,
      isFinished: !this.isPlaying && this.currentSegmentIndex >= this.segments.length - 1 && this.currentSegmentIndex >= 0,
    };
  }

  onStatusUpdate(callback: (status: AudioStatus) => void): void {
    this.statusCallback = callback;
  }

  async unload(): Promise<void> {
    await this.stopCurrentSegment();
    this.segments = [];
    this.cumulativeOffsets = [];
    this.totalDuration = 0;
    this.currentSegmentIndex = -1;
    this.isPlaying = false;
    this.isPaused = false;
  }

  private async playNextSegment(): Promise<void> {
    if (!this.isPlaying) return;

    this.currentSegmentIndex++;
    if (this.currentSegmentIndex >= this.segments.length) {
      this.isPlaying = false;
      this.emitStatus();
      return;
    }

    const seg = this.segments[this.currentSegmentIndex];

    if (seg.type === 'silence') {
      this.silenceElapsed = 0;
      this.silenceStartTime = Date.now();
      this.startSilenceTimer(seg.durationSeconds);
      this.emitStatus();
    } else if (seg.file) {
      await this.loadAndPlayFile(seg.file);
      this.emitStatus();
    }
  }

  private async loadAndPlayFile(fileName: string): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }

    const uri = `${this.baseDirUri}${fileName}`;
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
      this.onPlaybackStatusUpdate.bind(this),
    );
    this.sound = sound;
  }

  private startSilenceTimer(durationSeconds: number): void {
    this.clearSilenceTimers();

    this.silenceInterval = setInterval(() => {
      if (this.isPlaying) this.emitStatus();
    }, 500);

    this.silenceTimer = setTimeout(async () => {
      this.clearSilenceTimers();
      this.silenceElapsed = 0;
      await this.playNextSegment();
    }, durationSeconds * 1000);
  }

  private clearSilenceTimers(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.silenceInterval) {
      clearInterval(this.silenceInterval);
      this.silenceInterval = null;
    }
  }

  private async stopCurrentSegment(): Promise<void> {
    this.clearSilenceTimers();
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }

  private async getCurrentPosition(): Promise<number> {
    if (this.currentSegmentIndex < 0 || this.currentSegmentIndex >= this.segments.length) {
      return 0;
    }

    const baseOffset = this.cumulativeOffsets[this.currentSegmentIndex];
    const seg = this.segments[this.currentSegmentIndex];

    if (seg.type === 'silence') {
      let elapsed = this.silenceElapsed;
      if (this.isPlaying && this.silenceStartTime > 0) {
        elapsed += (Date.now() - this.silenceStartTime) / 1000;
      }
      return baseOffset + Math.min(elapsed, seg.durationSeconds);
    }

    if (this.sound) {
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        return baseOffset + (status.positionMillis ?? 0) / 1000;
      }
    }

    return baseOffset;
  }

  private onPlaybackStatusUpdate(status: any): void {
    if (!status.isLoaded) return;

    if (status.didJustFinish && this.isPlaying) {
      this.sound?.unloadAsync().then(() => {
        this.sound = null;
        this.playNextSegment();
      });
      return;
    }

    this.emitStatus();
  }

  private async emitStatus(): Promise<void> {
    if (!this.statusCallback) return;
    const position = await this.getCurrentPosition();
    this.statusCallback({
      isPlaying: this.isPlaying,
      positionSeconds: position,
      durationSeconds: this.totalDuration,
      isFinished: !this.isPlaying && this.currentSegmentIndex >= this.segments.length - 1 && this.currentSegmentIndex >= 0,
    });
  }
}
