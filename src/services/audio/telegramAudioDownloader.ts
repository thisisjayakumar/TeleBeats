/**
 * Downloads a Telegram audio file to the local cache directory via GramJS.
 * Uses the expo-file-system legacy API (writeAsStringAsync with base64 encoding)
 * which is the stable, well-supported path for Expo SDK 54.
 */
import {
  cacheDirectory,
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';

import { getTelegramEnvConfig } from '../../config/env';
import type { SongRow } from '../../db/schema';
import { createTelegramChannelGateway } from '../telegram/telegramClient';
import type { TelegramSession } from '../telegram/telegramClient';

const AUDIO_CACHE_DIR = `${cacheDirectory}telebeats/audio/`;

/** In-session download cache: songId → file URI. Cleared on app restart. */
const downloadCache = new Map<string, string>();

export async function downloadTelegramAudio(
  song: SongRow,
  session: TelegramSession,
  onProgress?: (fraction: number) => void
): Promise<string> {
  // Return cached file if still on disk
  const cached = downloadCache.get(song.id);
  if (cached) {
    const info = await getInfoAsync(cached);
    if (info.exists) return cached;
    downloadCache.delete(song.id);
  }

  const ext = mimeToExt(song.mimeType);
  const filePath = `${AUDIO_CACHE_DIR}${song.id}${ext}`;

  // Ensure directory exists
  await makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true });

  // Build gateway & restore session
  const config = getTelegramEnvConfig();
  const gateway = createTelegramChannelGateway(config);
  await gateway.restoreSession(session);

  // Download the audio bytes from Telegram via GramJS MTProto
  const bytes = await gateway.downloadAudioFromMessage(
    song.channelId,
    song.messageId,
    (downloaded, total) => {
      if (total > 0) onProgress?.(downloaded / total);
    }
  );

  if (!bytes || bytes.length === 0) {
    throw new Error(`Failed to download audio for song "${song.title}"`);
  }

  // Write to local file as base64
  const base64 = uint8ArrayToBase64(bytes);
  await writeAsStringAsync(filePath, base64, { encoding: 'base64' });

  downloadCache.set(song.id, filePath);
  return filePath;
}

/** Remove the cached audio file for a song after playback. */
export async function evictAudioCache(songId: string): Promise<void> {
  const path = downloadCache.get(songId);
  if (!path) return;
  downloadCache.delete(songId);
  try {
    await deleteAsync(path, { idempotent: true });
  } catch {
    // Ignore eviction errors
  }
}

/** Clear the entire session audio cache directory. */
export async function clearAudioCache(): Promise<void> {
  downloadCache.clear();
  try {
    await deleteAsync(AUDIO_CACHE_DIR, { idempotent: true });
  } catch {
    // Ignore
  }
}

function mimeToExt(mimeType?: string | null): string {
  if (!mimeType) return '.mp3';
  if (mimeType.includes('ogg')) return '.ogg';
  if (mimeType.includes('flac')) return '.flac';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return '.m4a';
  if (mimeType.includes('wav')) return '.wav';
  return '.mp3';
}

function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = '';
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}
