export interface AudioStatus {
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
  isFinished: boolean;
}

export interface AudioPlayerPort {
  loadPlaylist(segmentsJsonPath: string): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seekTo(positionSeconds: number): Promise<void>;
  getStatus(): Promise<AudioStatus>;
  onStatusUpdate(callback: (status: AudioStatus) => void): void;
  unload(): Promise<void>;
}
