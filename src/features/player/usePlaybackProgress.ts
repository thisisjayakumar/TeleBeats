import { useProgress } from 'react-native-track-player';

/**
 * Re-exports RNTP's useProgress hook with friendly aliases.
 * Updates every second while a track is loaded.
 */
export function usePlaybackProgress() {
  const { position, duration, buffered } = useProgress(500);
  return {
    positionSec: position,
    durationSec: duration,
    bufferedSec: buffered,
    progressFraction: duration > 0 ? position / duration : 0,
  };
}
