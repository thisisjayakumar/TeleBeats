export const TABLES = {
  song: "songs",
  playlist: "playlists",
  likedSong: "liked_songs",
} as const;

export const WATERMELON_DB_NAME = "telebeats";
export const WATERMELON_SCHEMA_VERSION = 1;

export const WATERMELON_TABLE_COLUMNS = {
  songs: [
    { name: "song_id", type: "string" },
    { name: "title", type: "string" },
    { name: "artist", type: "string" },
    { name: "album", type: "string", isOptional: true },
    { name: "duration_sec", type: "number", isOptional: true },
    { name: "source", type: "string" },
    { name: "channel_id", type: "string" },
    { name: "channel_title", type: "string" },
    { name: "message_id", type: "number" },
    { name: "file_name", type: "string", isOptional: true },
    { name: "mime_type", type: "string", isOptional: true },
    { name: "file_size_bytes", type: "number", isOptional: true },
    { name: "created_at_epoch_ms", type: "number" },
    { name: "updated_at_epoch_ms", type: "number" },
  ],
  playlists: [
    { name: "title", type: "string" },
    { name: "created_at_epoch_ms", type: "number" },
  ],
  likedSongs: [
    { name: "song_id", type: "string" },
    { name: "liked_at_epoch_ms", type: "number" },
  ],
} as const;

export type SongRow = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  durationSec: number | null;
  source: "telegram";
  channelId: string;
  channelTitle: string;
  messageId: number;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
};

export type PlaylistRow = {
  id: string;
  title: string;
  createdAtEpochMs: number;
};

export type LikedSongRow = {
  id: string;
  songId: string;
  likedAtEpochMs: number;
};
