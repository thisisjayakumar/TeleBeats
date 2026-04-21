import { getTelegramEnvConfig } from "../../config/env";
import { Song } from "../../types/song";
import { retryWithBackoff } from "../../utils/retryWithBackoff";
import { TelemetryClient, getTelemetryClient } from "../telemetry/telemetry";
import type { TelegramChannelGateway, TelegramSession } from "./telegramClient";

export type MetadataSyncRetryState = {
  channel: string;
  attempt: number;
  maxAttempts: number;
  nextDelayMs: number;
};

interface ChannelSnapshot {
  channelId: string;
  snapshotId: string;
  lastSyncTime: number;
}

const SNAPSHOT_CACHE_KEY = 'channel_snapshots';
const snapshotCache = new Map<string, ChannelSnapshot>();

type SyncTelegramChannelMetadataOptions = {
  session: TelegramSession;
  channels: string[];
  limitPerChannel?: number;
  gateway?: TelegramChannelGateway;
  telemetry?: TelemetryClient;
  maxAttempts?: number;
  baseDelayMs?: number;
  onRetryState?: (state: MetadataSyncRetryState | null) => void;
};

export async function syncTelegramChannelMetadata({
  session,
  channels,
  limitPerChannel = 200,
  gateway,
  telemetry = getTelemetryClient(),
  maxAttempts = 3,
  baseDelayMs = 500,
  onRetryState = () => undefined,
}: SyncTelegramChannelMetadataOptions): Promise<Song[]> {
  onRetryState(null);
  if (channels.length === 0) {
    return [];
  }

  const effectiveGateway =
    gateway ?? createDefaultChannelGateway();
  const authorized = await effectiveGateway.restoreSession(session);
  if (!authorized) {
    throw new Error("Telegram session is no longer authorized.");
  }

  const songs: Song[] = [];
  const now = Date.now();

  for (const channel of channels) {
    const previousSnapshot = snapshotCache.get(channel);
    const lastSyncTime = previousSnapshot?.lastSyncTime ?? 0;

    const channelSongs = await retryWithBackoff({
      task: () =>
        effectiveGateway.fetchChannelAudioMetadata({
          channel,
          limit: limitPerChannel,
        }),
      maxAttempts,
      baseDelayMs,
      shouldRetry: (error) => isRetryableChannelMetadataError(error),
      onRetry: ({ attempt, maxAttempts: retryMax, nextDelayMs, error }) => {
        telemetry.track({
          name: "telegram_channel_metadata_retry",
          attributes: {
            channel,
            attempt,
            max_attempts: retryMax,
            delay_ms: nextDelayMs,
            error: getChannelMetadataErrorMessage(error),
          },
        });
        onRetryState({
          channel,
          attempt,
          maxAttempts: retryMax,
          nextDelayMs,
        });
      },
    });

    const filteredSongs = lastSyncTime > 0
      ? channelSongs.filter(s => (s.addedAt ?? 0) > lastSyncTime)
      : channelSongs;

    const snapshotId = generateSnapshotId(channelSongs);
    snapshotCache.set(channel, {
      channelId: channel,
      snapshotId,
      lastSyncTime: now,
    });

    songs.push(...filteredSongs);
  }

  telemetry.track({
    name: "telegram_channel_metadata_sync_completed",
    attributes: {
      channels_count: channels.length,
      songs_count: songs.length,
    },
  });
  onRetryState(null);
  return songs;
}

function generateSnapshotId(songs: Song[]): string {
  if (songs.length === 0) return '';
  const firstId = songs[0].messageId;
  const lastId = songs[songs.length - 1].messageId;
  return `${firstId}-${lastId}-${songs.length}`;
}

export function getChannelSnapshot(channelId: string): ChannelSnapshot | undefined {
  return snapshotCache.get(channelId);
}

export function clearSnapshots(): void {
  snapshotCache.clear();
}

function getChannelMetadataErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown metadata sync error.";
}

function isRetryableChannelMetadataError(error: unknown): boolean {
  const message = getChannelMetadataErrorMessage(error).toUpperCase();
  if (
    message.includes("CHANNEL_PRIVATE") ||
    message.includes("CHANNEL_INVALID") ||
    message.includes("CHAT_ADMIN_REQUIRED") ||
    message.includes("FLOOD_WAIT")
  ) {
    return false;
  }

  return true;
}

function createDefaultChannelGateway(): TelegramChannelGateway {
  const { createTelegramChannelGateway } = require("./telegramClient") as typeof import("./telegramClient");
  return createTelegramChannelGateway(getTelegramEnvConfig());
}
