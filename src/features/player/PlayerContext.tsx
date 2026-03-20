import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import TrackPlayer, {
  RepeatMode,
  State,
  useActiveTrack,
  usePlaybackState,
} from 'react-native-track-player';

import type { SongRow } from '../../db/schema';
import {
  downloadTelegramAudio,
  evictAudioCache,
} from '../../services/audio/telegramAudioDownloader';
import { mapSongToTrack } from '../../services/audio/trackMapper';
import { fisherYatesShuffle } from '../../utils/fisherYatesShuffle';
import type { TelegramSession } from '../../services/telegram/telegramClient';
import type { PlayerContextValue } from './playerTypes';

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within <PlayerProvider>');
  return ctx;
}

type Props = { children: ReactNode; session: TelegramSession };

export function PlayerProvider({ children, session }: Props) {
  const [queue, setQueue] = useState<SongRow[]>([]);
  const [originalQueue, setOriginalQueue] = useState<SongRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(RepeatMode.Off);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;

  const lastPlayedSongIdRef = useRef<string | null>(null);

  const currentSong = useMemo(() => {
    if (!activeTrack) return null;
    return queue.find((s) => s.id === activeTrack.id) ?? null;
  }, [activeTrack, queue]);

  const loadAndPlay = useCallback(
    async (song: SongRow, songQueue: SongRow[], index: number) => {
      setIsLoading(true);
      try {
        // Evict the previous song's temp file
        if (lastPlayedSongIdRef.current && lastPlayedSongIdRef.current !== song.id) {
          void evictAudioCache(lastPlayedSongIdRef.current);
        }

        const uri = await downloadTelegramAudio(song, session, undefined);
        await TrackPlayer.reset();
        await TrackPlayer.add([mapSongToTrack(song, uri)]);
        await TrackPlayer.play();
        lastPlayedSongIdRef.current = song.id;

        setQueue(songQueue);
        setCurrentIndex(index);
        setIsPlayerVisible(true);

        // Pre-download next song silently
        const nextIdx = index + 1;
        if (nextIdx < songQueue.length) {
          void downloadTelegramAudio(songQueue[nextIdx], session, undefined).catch(() => {
            /* pre-download is best-effort */
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  const playSong = useCallback(
    async (song: SongRow, rawQueue: SongRow[]) => {
      setOriginalQueue(rawQueue);
      const activeQueue = shuffleEnabled
        ? [song, ...fisherYatesShuffle(rawQueue.filter((s) => s.id !== song.id))]
        : rawQueue;
      const idx = activeQueue.findIndex((s) => s.id === song.id);
      await loadAndPlay(song, activeQueue, idx >= 0 ? idx : 0);
    },
    [loadAndPlay, shuffleEnabled]
  );

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, [isPlaying]);

  const skipToNext = useCallback(async () => {
    let nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeatMode === RepeatMode.Queue) {
        nextIdx = 0;
      } else {
        return;
      }
    }
    await loadAndPlay(queue[nextIdx], queue, nextIdx);
  }, [currentIndex, loadAndPlay, queue, repeatMode]);

  const skipToPrevious = useCallback(async () => {
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) {
      prevIdx = repeatMode === RepeatMode.Queue ? queue.length - 1 : 0;
    }
    await loadAndPlay(queue[prevIdx], queue, prevIdx);
  }, [currentIndex, loadAndPlay, queue, repeatMode]);

  const seekTo = useCallback(async (positionSec: number) => {
    await TrackPlayer.seekTo(positionSec);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffleEnabled((prev) => {
      if (!prev) {
        // Enable shuffle: rebuild queue around current song
        const current = queue[currentIndex];
        if (current) {
          const shuffled = [current, ...fisherYatesShuffle(queue.filter((s) => s.id !== current.id))];
          setQueue(shuffled);
          setCurrentIndex(0);
        }
      } else {
        // Disable shuffle: restore original queue order
        const current = queue[currentIndex];
        const restoredIdx = current ? originalQueue.findIndex((s) => s.id === current.id) : 0;
        setQueue(originalQueue);
        setCurrentIndex(restoredIdx >= 0 ? restoredIdx : 0);
      }
      return !prev;
    });
  }, [currentIndex, originalQueue, queue]);

  const cycleRepeatMode = useCallback(async () => {
    const next =
      repeatMode === RepeatMode.Off
        ? RepeatMode.Queue
        : repeatMode === RepeatMode.Queue
          ? RepeatMode.Track
          : RepeatMode.Off;
    setRepeatMode(next);
    await TrackPlayer.setRepeatMode(next);
  }, [repeatMode]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentSong,
      queue,
      currentIndex,
      isLoading,
      isPlaying,
      shuffleEnabled,
      repeatMode,
      isPlayerVisible,
      session,
      playSong,
      togglePlayPause,
      skipToNext,
      skipToPrevious,
      seekTo,
      toggleShuffle,
      cycleRepeatMode,
      openPlayer: () => setIsPlayerVisible(true),
      closePlayer: () => setIsPlayerVisible(false),
    }),
    [
      currentSong,
      queue,
      currentIndex,
      isLoading,
      isPlaying,
      shuffleEnabled,
      repeatMode,
      isPlayerVisible,
      session,
      playSong,
      togglePlayPause,
      skipToNext,
      skipToPrevious,
      seekTo,
      toggleShuffle,
      cycleRepeatMode,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
