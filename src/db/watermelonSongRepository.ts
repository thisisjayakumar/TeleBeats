import { Song } from "../types/song";
import {
  SongRow,
  TABLES,
  WATERMELON_DB_NAME,
  WATERMELON_SCHEMA_VERSION,
  WATERMELON_TABLE_COLUMNS,
} from "./schema";
import type { SongRepository } from "./songRepository";

type AnyRecord = {
  _raw: Record<string, unknown>;
  update: (updater: (record: AnyRecord) => void) => Promise<void>;
};

type AnyCollection = {
  query: (...conditions: unknown[]) => { fetch: () => Promise<AnyRecord[]> };
  create: (creator: (record: AnyRecord) => void) => Promise<void>;
};

type AnyDatabase = {
  get: (table: string) => AnyCollection;
  write: (writer: () => Promise<void>) => Promise<void>;
};

export async function createWatermelonSongRepository(): Promise<SongRepository> {
  const database = await createWatermelonDatabase();
  return new WatermelonSongRepository(database);
}

class WatermelonSongRepository implements SongRepository {
  constructor(private readonly database: AnyDatabase) {}

  async seedFromTelegramSongs(songs: Song[]): Promise<void> {
    const songsCollection = this.database.get(TABLES.song);
    const now = Date.now();

    await this.database.write(async () => {
      for (const song of songs) {
        const existing = await songsCollection
          .query(getWatermelonQ().where("song_id", song.id))
          .fetch();
        if (existing.length > 0) {
          await existing[0].update((record) => {
            assignSongRaw(record._raw, song, now, false);
          });
          continue;
        }

        await songsCollection.create((record) => {
          assignSongRaw(record._raw, song, now, true);
        });
      }
    });
  }

  async getAllSongs(): Promise<SongRow[]> {
    const rows = await this.database.get(TABLES.song).query().fetch();
    return rows.map(mapRawToSongRow);
  }

  async getSongsByChannel(channelId: string): Promise<SongRow[]> {
    const rows = await this.database
      .get(TABLES.song)
      .query(getWatermelonQ().where("channel_id", channelId))
      .fetch();
    return rows.map(mapRawToSongRow);
  }
}

function assignSongRaw(
  raw: Record<string, unknown>,
  song: Song,
  timestampMs: number,
  isCreate: boolean
): void {
  raw.song_id = song.id;
  raw.title = song.title;
  raw.artist = song.artist;
  raw.album = song.album ?? null;
  raw.duration_sec = song.durationSec ?? null;
  raw.source = song.source;
  raw.channel_id = song.channelId;
  raw.channel_title = song.channelTitle;
  raw.message_id = song.messageId;
  raw.file_name = song.fileName ?? null;
  raw.mime_type = song.mimeType ?? null;
  raw.file_size_bytes = song.fileSizeBytes ?? null;
  raw.updated_at_epoch_ms = timestampMs;
  if (isCreate) {
    raw.created_at_epoch_ms = timestampMs;
  }
}

function mapRawToSongRow(record: AnyRecord): SongRow {
  const raw = record._raw;
  return {
    id: String(raw.song_id ?? ""),
    title: String(raw.title ?? ""),
    artist: String(raw.artist ?? ""),
    album: toNullableString(raw.album),
    durationSec: toNullableNumber(raw.duration_sec),
    source: "telegram",
    channelId: String(raw.channel_id ?? ""),
    channelTitle: String(raw.channel_title ?? ""),
    messageId: Number(raw.message_id ?? 0),
    fileName: toNullableString(raw.file_name),
    mimeType: toNullableString(raw.mime_type),
    fileSizeBytes: toNullableNumber(raw.file_size_bytes),
  };
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return value;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value !== "number") {
    return null;
  }
  return Number.isFinite(value) ? value : null;
}

async function createWatermelonDatabase(): Promise<AnyDatabase> {
  const { appSchema, tableSchema, Database } = require("@nozbe/watermelondb") as {
    appSchema: (input: unknown) => unknown;
    tableSchema: (input: unknown) => unknown;
    Database: new (input: unknown) => AnyDatabase;
  };
  const sqliteModule = require("@nozbe/watermelondb/adapters/sqlite");
  const SQLiteAdapter = sqliteModule.default ?? sqliteModule;

  class SongModel {
    static table = TABLES.song;
  }
  class PlaylistModel {
    static table = TABLES.playlist;
  }
  class LikedSongModel {
    static table = TABLES.likedSong;
  }

  const schema = appSchema({
    version: WATERMELON_SCHEMA_VERSION,
    tables: [
      tableSchema({
        name: TABLES.song,
        columns: WATERMELON_TABLE_COLUMNS.songs,
      }),
      tableSchema({
        name: TABLES.playlist,
        columns: WATERMELON_TABLE_COLUMNS.playlists,
      }),
      tableSchema({
        name: TABLES.likedSong,
        columns: WATERMELON_TABLE_COLUMNS.likedSongs,
      }),
    ],
  });

  const adapter = new SQLiteAdapter({
    dbName: WATERMELON_DB_NAME,
    schema,
    jsi: false,
    onSetUpError: (error: unknown) => {
      throw error;
    },
  });

  return new Database({
    adapter,
    modelClasses: [SongModel, PlaylistModel, LikedSongModel],
  });
}

function getWatermelonQ(): { where: (column: string, value: unknown) => unknown } {
  return require("@nozbe/watermelondb").Q as {
    where: (column: string, value: unknown) => unknown;
  };
}
