import { Song } from "../types/song";
import {
  SongRow,
  TABLES,
  WATERMELON_DB_NAME,
  WATERMELON_SCHEMA_VERSION,
  WATERMELON_TABLE_COLUMNS,
  SpotifyPlaylistRow,
  SpotifyTrackRow,
  SpotifyPlaylistTrackRow,
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

export async function createSpotifyRepository(): Promise<SpotifyRepository> {
  const database = await createSpotifyDatabase();
  return new WatermelonSpotifyRepository(database);
}

export interface SpotifyRepository {
  savePlaylist(playlist: SpotifyPlaylistRow): Promise<void>;
  saveTrack(track: SpotifyTrackRow): Promise<void>;
  savePlaylistTrackMapping(mapping: SpotifyPlaylistTrackRow): Promise<void>;
  updateTrackTelegramMapping(trackSpotifyId: string, telegramSongId: string): Promise<void>;
  
  getAllPlaylists(): Promise<SpotifyPlaylistRow[]>;
  getPlaylistTracks(playlistSpotifyId: string): Promise<SpotifyTrackWithMatch[]>;
  getAllSpotifyTracks(): Promise<SpotifyTrackRow[]>;
  
  deletePlaylist(spotifyId: string): Promise<void>;
  clearAll(): Promise<void>;
}

export interface SpotifyTrackWithMatch extends SpotifyTrackRow {
  telegramSongId: string | null;
  telegramSong: SongRow | null;
}

class WatermelonSpotifyRepository implements SpotifyRepository {
  constructor(private readonly database: AnyDatabase) {}

  async savePlaylist(playlist: SpotifyPlaylistRow): Promise<void> {
    const collection = this.database.get(TABLES.spotifyPlaylist);
    const now = Date.now();

    await this.database.write(async () => {
      const existing = await collection
        .query(getWatermelonQ().where("spotify_id", playlist.spotifyId))
        .fetch();

      if (existing.length > 0) {
        await existing[0].update((record) => {
          record._raw.name = playlist.name;
          record._raw.description = playlist.description;
          record._raw.image_url = playlist.imageUrl;
          record._raw.owner_id = playlist.ownerId;
          record._raw.track_count = playlist.trackCount;
          record._raw.snapshot_id = playlist.snapshotId;
          record._raw.synced_at_epoch_ms = now;
        });
      } else {
        await collection.create((record) => {
          record._raw.spotify_id = playlist.spotifyId;
          record._raw.name = playlist.name;
          record._raw.description = playlist.description;
          record._raw.image_url = playlist.imageUrl;
          record._raw.owner_id = playlist.ownerId;
          record._raw.track_count = playlist.trackCount;
          record._raw.snapshot_id = playlist.snapshotId;
          record._raw.synced_at_epoch_ms = now;
          record._raw.created_at_epoch_ms = playlist.createdAtEpochMs;
        });
      }
    });
  }

  async saveTrack(track: SpotifyTrackRow): Promise<void> {
    const collection = this.database.get(TABLES.spotifyTrack);

    await this.database.write(async () => {
      const existing = await collection
        .query(getWatermelonQ().where("spotify_id", track.spotifyId))
        .fetch();

      if (existing.length > 0) {
        await existing[0].update((record) => {
          record._raw.name = track.name;
          record._raw.artist_names = JSON.stringify(track.artistNames);
          record._raw.album_name = track.albumName;
          record._raw.album_image_url = track.albumImageUrl;
          record._raw.duration_ms = track.durationMs;
          record._raw.track_number = track.trackNumber;
          record._raw.disc_number = track.discNumber;
          record._raw.added_at_epoch_ms = track.addedAtEpochMs;
        });
      } else {
        await collection.create((record) => {
          record._raw.spotify_id = track.spotifyId;
          record._raw.name = track.name;
          record._raw.artist_names = JSON.stringify(track.artistNames);
          record._raw.album_name = track.albumName;
          record._raw.album_image_url = track.albumImageUrl;
          record._raw.duration_ms = track.durationMs;
          record._raw.track_number = track.trackNumber;
          record._raw.disc_number = track.discNumber;
          record._raw.added_at_epoch_ms = track.addedAtEpochMs;
        });
      }
    });
  }

  async savePlaylistTrackMapping(mapping: SpotifyPlaylistTrackRow): Promise<void> {
    const collection = this.database.get(TABLES.spotifyPlaylistTrack);
    const now = Date.now();

    await this.database.write(async () => {
      const existing = await collection
        .query(
          getWatermelonQ().where("playlist_spotify_id", mapping.playlistSpotifyId),
          getWatermelonQ().where("track_spotify_id", mapping.trackSpotifyId)
        )
        .fetch();

      if (existing.length > 0) {
        await existing[0].update((record) => {
          record._raw.position = mapping.position;
          record._raw.telegram_song_id = mapping.telegramSongId;
          record._raw.matched_at_epoch_ms = mapping.matchedAtEpochMs;
        });
      } else {
        await collection.create((record) => {
          record._raw.playlist_spotify_id = mapping.playlistSpotifyId;
          record._raw.track_spotify_id = mapping.trackSpotifyId;
          record._raw.telegram_song_id = mapping.telegramSongId;
          record._raw.position = mapping.position;
          record._raw.matched_at_epoch_ms = mapping.matchedAtEpochMs;
        });
      }
    });
  }

  async updateTrackTelegramMapping(
    trackSpotifyId: string,
    telegramSongId: string
  ): Promise<void> {
    const collection = this.database.get(TABLES.spotifyPlaylistTrack);
    const now = Date.now();

    await this.database.write(async () => {
      const existing = await collection
        .query(getWatermelonQ().where("track_spotify_id", trackSpotifyId))
        .fetch();

      if (existing.length > 0) {
        await existing[0].update((record) => {
          record._raw.telegram_song_id = telegramSongId;
          record._raw.matched_at_epoch_ms = now;
        });
      }
    });
  }

  async getAllPlaylists(): Promise<SpotifyPlaylistRow[]> {
    const rows = await this.database.get(TABLES.spotifyPlaylist).query().fetch();
    return rows.map(mapRawToSpotifyPlaylist);
  }

  async getPlaylistTracks(
    playlistSpotifyId: string
  ): Promise<SpotifyTrackWithMatch[]> {
    const mappingCollection = this.database.get(TABLES.spotifyPlaylistTrack);
    const trackCollection = this.database.get(TABLES.spotifyTrack);
    const songCollection = this.database.get(TABLES.song);

    const mappings = await mappingCollection
      .query(getWatermelonQ().where("playlist_spotify_id", playlistSpotifyId))
      .fetch();

    const result: SpotifyTrackWithMatch[] = [];

    for (const mapping of mappings.sort((a, b) => a._raw.position - b._raw.position)) {
      const trackSpotifyId = String(mapping._raw.track_spotify_id);
      const telegramSongId = mapping._raw.telegram_song_id
        ? String(mapping._raw.telegram_song_id)
        : null;

      const trackRows = await trackCollection
        .query(getWatermelonQ().where("spotify_id", trackSpotifyId))
        .fetch();

      let songRow: SongRow | null = null;
      if (telegramSongId) {
        const songRows = await songCollection
          .query(getWatermelonQ().where("song_id", telegramSongId))
          .fetch();
        if (songRows.length > 0) {
          songRow = mapRawToSongRow(songRows[0]);
        }
      }

      if (trackRows.length > 0) {
        result.push({
          ...mapRawToSpotifyTrack(trackRows[0]),
          telegramSongId,
          telegramSong: songRow,
        });
      }
    }

    return result;
  }

  async getAllSpotifyTracks(): Promise<SpotifyTrackRow[]> {
    const rows = await this.database.get(TABLES.spotifyTrack).query().fetch();
    return rows.map(mapRawToSpotifyTrack);
  }

  async deletePlaylist(spotifyId: string): Promise<void> {
    await this.database.write(async () => {
      const playlistCollection = this.database.get(TABLES.spotifyPlaylist);
      const mappingsCollection = this.database.get(TABLES.spotifyPlaylistTrack);

      const playlists = await playlistCollection
        .query(getWatermelonQ().where("spotify_id", spotifyId))
        .fetch();
      for (const p of playlists) {
        await (p as AnyRecord).update((r) => {
          r._raw.name = '';
          r._raw.deleted_at_epoch_ms = Date.now();
        });
      }

      const mappings = await mappingsCollection
        .query(getWatermelonQ().where("playlist_spotify_id", spotifyId))
        .fetch();
      for (const m of mappings) {
        await (m as AnyRecord).update((r) => {
          r._raw.position = -1;
        });
      }
    });
  }

  async clearAll(): Promise<void> {
    await this.database.write(async () => {
      const tables = [
        TABLES.spotifyPlaylist,
        TABLES.spotifyTrack,
        TABLES.spotifyPlaylistTrack,
      ];
      for (const table of tables) {
        const collection = this.database.get(table);
        const all = await collection.query().fetch();
        for (const record of all) {
          await (record as AnyRecord).update((r) => {
            r._raw.deleted_at_epoch_ms = Date.now();
          });
        }
      }
    });
  }
}

function mapRawToSpotifyPlaylist(record: AnyRecord): SpotifyPlaylistRow {
  const raw = record._raw;
  return {
    spotifyId: String(raw.spotify_id),
    name: String(raw.name),
    description: toNullableString(raw.description),
    imageUrl: toNullableString(raw.image_url),
    ownerId: String(raw.owner_id),
    trackCount: Number(raw.track_count),
    snapshotId: toNullableString(raw.snapshot_id),
    syncedAtEpochMs: Number(raw.synced_at_epoch_ms || Date.now()),
    createdAtEpochMs: Number(raw.created_at_epoch_ms || Date.now()),
  };
}

function mapRawToSpotifyTrack(record: AnyRecord): SpotifyTrackRow {
  const raw = record._raw;
  let artistNames: string[] = [];
  try {
    artistNames = JSON.parse(String(raw.artist_names || '[]'));
  } catch {
    artistNames = [];
  }
  return {
    spotifyId: String(raw.spotify_id),
    name: String(raw.name),
    artistNames,
    albumName: String(raw.album_name),
    albumImageUrl: toNullableString(raw.album_image_url),
    durationMs: Number(raw.duration_ms),
    trackNumber: toNullableNumber(raw.track_number),
    discNumber: toNullableNumber(raw.disc_number),
    addedAtEpochMs: toNullableNumber(raw.added_at_epoch_ms),
  };
}

function mapRawToSongRow(record: AnyRecord): SongRow {
  const raw = record._raw;
  return {
    id: String(raw.song_id),
    title: String(raw.title),
    artist: String(raw.artist),
    album: toNullableString(raw.album),
    durationSec: toNullableNumber(raw.duration_sec),
    source: 'telegram',
    channelId: String(raw.channel_id),
    channelTitle: String(raw.channel_title),
    messageId: Number(raw.message_id),
    fileName: toNullableString(raw.file_name),
    mimeType: toNullableString(raw.mime_type),
    fileSizeBytes: toNullableNumber(raw.file_size_bytes),
  };
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) ? value : null;
}

async function createSpotifyDatabase(): Promise<AnyDatabase> {
  const { appSchema, tableSchema, Database } = require('@nozbe/watermelondb') as {
    appSchema: (input: unknown) => unknown;
    tableSchema: (input: unknown) => unknown;
    Database: new (input: unknown) => AnyDatabase;
  };
  const sqliteModule = require('@nozbe/watermelondb/adapters/sqlite');
  const SQLiteAdapter = sqliteModule.default ?? sqliteModule;

  const schema = appSchema({
    version: WATERMELON_SCHEMA_VERSION,
    tables: [
      tableSchema({
        name: TABLES.spotifyPlaylist,
        columns: WATERMELON_TABLE_COLUMNS.spotifyPlaylists,
      }),
      tableSchema({
        name: TABLES.spotifyTrack,
        columns: WATERMELON_TABLE_COLUMNS.spotifyTracks,
      }),
      tableSchema({
        name: TABLES.spotifyPlaylistTrack,
        columns: WATERMELON_TABLE_COLUMNS.spotifyPlaylistTracks,
      }),
    ],
  });

  const adapter = new SQLiteAdapter({
    dbName: WATERMELON_DB_NAME,
    schema,
    jsi: false,
    onSetUpError: (error: unknown) => {
      console.error('Database setup error:', error);
    },
  });

  return new Database({
    adapter,
    modelClasses: [],
  });
}

function getWatermelonQ(): { where: (...args: unknown[]) => unknown } {
  return require('@nozbe/watermelondb').Q as {
    where: (...args: unknown[]) => unknown;
  };
}