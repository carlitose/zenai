import { useState, useEffect, useCallback, useRef } from 'react';
import { container } from '../../di/container';
import { AudioStatus } from '../../application/ports/AudioPlayerPort';

export function useAudioPlayer() {
  const [status, setStatus] = useState<AudioStatus>({
    isPlaying: false,
    positionSeconds: 0,
    durationSeconds: 0,
    isFinished: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const playerRef = useRef(container.audioPlayer);

  useEffect(() => {
    playerRef.current.onStatusUpdate(setStatus);
    return () => {
      playerRef.current.unload();
    };
  }, []);

  const load = useCallback(async (audioFilePath: string, durationHint?: number) => {
    await playerRef.current.loadPlaylist(audioFilePath, durationHint);
    setIsLoaded(true);
    setStatus({
      isPlaying: false,
      positionSeconds: 0,
      durationSeconds: 0,
      isFinished: false,
    });
  }, []);

  const play = useCallback(async () => {
    await playerRef.current.play();
  }, []);

  const pause = useCallback(async () => {
    await playerRef.current.pause();
  }, []);

  const resume = useCallback(async () => {
    await playerRef.current.resume();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (status.isPlaying) {
      await pause();
    } else if (status.isFinished) {
      await play();
    } else if (status.positionSeconds > 0) {
      await resume();
    } else {
      await play();
    }
  }, [status.isPlaying, status.isFinished, status.positionSeconds, play, pause, resume]);

  const seekTo = useCallback(async (positionSeconds: number) => {
    await playerRef.current.seekTo(positionSeconds);
  }, []);

  const unload = useCallback(async () => {
    await playerRef.current.unload();
    setIsLoaded(false);
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    status,
    isLoaded,
    load,
    play,
    pause,
    resume,
    togglePlayPause,
    seekTo,
    unload,
    formatTime,
  };
}
