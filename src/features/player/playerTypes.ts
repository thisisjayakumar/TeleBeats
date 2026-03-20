import type { RepeatMode } from 'react-native-track-player';

import type { SongRow } from '../../db/schema';
import type { TelegramSession } from '../../services/telegram/telegramClient';

export type { RepeatMode };

export type PlayerContextValue = {
  // State
  currentSong: SongRow | null;
  queue: SongRow[];
  currentIndex: number;
  isLoading: boolean;
  isPlaying: boolean;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  isPlayerVisible: boolean;

  // Session needed for downloads
  session: TelegramSession;

  // Actions
  playSong: (song: SongRow, queue: SongRow[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  seekTo: (positionSec: number) => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeatMode: () => Promise<void>;
  openPlayer: () => void;
  closePlayer: () => void;
};
