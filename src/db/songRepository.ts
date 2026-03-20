import { Song } from "../types/song";
import { SongRow } from "./schema";

export interface SongRepository {
  seedFromTelegramSongs(songs: Song[]): Promise<void>;
  getAllSongs(): Promise<SongRow[]>;
  getSongsByChannel(channelId: string): Promise<SongRow[]>;
}

export type SongRepositoryBackend = "watermelon" | "in_memory" | "resolving";

type SongRepositoryRuntimeStatus = {
  backend: SongRepositoryBackend;
  detail: string | null;
};

class InMemorySongRepository implements SongRepository {
  private readonly rows = new Map<string, SongRow>();

  async seedFromTelegramSongs(songs: Song[]): Promise<void> {
    songs.forEach((song) => {
      this.rows.set(song.id, toSongRow(song));
    });
  }

  async getAllSongs(): Promise<SongRow[]> {
    return Array.from(this.rows.values());
  }

  async getSongsByChannel(channelId: string): Promise<SongRow[]> {
    return Array.from(this.rows.values()).filter((song) => song.channelId === channelId);
  }
}

function toSongRow(song: Song): SongRow {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album ?? null,
    durationSec: song.durationSec ?? null,
    source: song.source,
    channelId: song.channelId,
    channelTitle: song.channelTitle,
    messageId: song.messageId,
    fileName: song.fileName ?? null,
    mimeType: song.mimeType ?? null,
    fileSizeBytes: song.fileSizeBytes ?? null,
  };
}

const defaultSongRepository = new InMemorySongRepository();
let resolvedSongRepository: SongRepository | null = null;
let resolvingRepository: Promise<SongRepository> | null = null;
let repositoryRuntimeStatus: SongRepositoryRuntimeStatus = {
  backend: "resolving",
  detail: null,
};

export function getSongRepository(): SongRepository {
  return {
    seedFromTelegramSongs: async (songs) => {
      const repository = await getResolvedSongRepository();
      await repository.seedFromTelegramSongs(songs);
    },
    getAllSongs: async () => {
      const repository = await getResolvedSongRepository();
      return repository.getAllSongs();
    },
    getSongsByChannel: async (channelId) => {
      const repository = await getResolvedSongRepository();
      return repository.getSongsByChannel(channelId);
    },
  };
}

export async function getSongRepositoryRuntimeStatus(): Promise<SongRepositoryRuntimeStatus> {
  await getResolvedSongRepository();
  return repositoryRuntimeStatus;
}

async function getResolvedSongRepository(): Promise<SongRepository> {
  if (resolvedSongRepository) {
    return resolvedSongRepository;
  }
  if (resolvingRepository) {
    return resolvingRepository;
  }

  resolvingRepository = resolveSongRepository();
  const repository = await resolvingRepository;
  resolvedSongRepository = repository;
  resolvingRepository = null;
  return repository;
}

async function resolveSongRepository(): Promise<SongRepository> {
  try {
    const module = require("./watermelonSongRepository") as {
      createWatermelonSongRepository: () => Promise<SongRepository>;
    };
    const repository = await module.createWatermelonSongRepository();
    repositoryRuntimeStatus = {
      backend: "watermelon",
      detail: "WatermelonDB native bridge is active.",
    };
    return repository;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown WatermelonDB initialization error.";
    repositoryRuntimeStatus = {
      backend: "in_memory",
      detail: message,
    };
    if (__DEV__) {
      console.warn(
        `[telebeats][db] Falling back to in-memory song repository. ${message}`
      );
    }
    return defaultSongRepository;
  }
}
