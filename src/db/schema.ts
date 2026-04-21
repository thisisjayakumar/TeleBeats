export const TABLES = {
  song: "songs",
  playlist: "playlists",
  likedSong: "liked_songs",
  spotifyPlaylist: "spotify_playlists",
  spotifyTrack: "spotify_tracks",
  spotifyPlaylistTrack: "spotify_playlist_tracks",
} as const;

export const WATERMELON_DB_NAME = "telebeats";
export const WATERMELON_SCHEMA_VERSION = 2;

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
  spotifyPlaylists: [
    { name: "spotify_id", type: "string" },
    { name: "name", type: "string" },
    { name: "description", type: "string", isOptional: true },
    { name: "image_url", type: "string", isOptional: true },
    { name: "owner_id", type: "string" },
    { name: "track_count", type: "number" },
    { name: "snapshot_id", type: "string", isOptional: true },
    { name: "synced_at_epoch_ms", type: "number" },
    { name: "created_at_epoch_ms", type: "number" },
  ],
  spotifyTracks: [
    { name: "spotify_id", type: "string" },
    { name: "name", type: "string" },
    { name: "artist_names", type: "string" },
    { name: "album_name", type: "string" },
    { name: "album_image_url", type: "string", isOptional: true },
    { name: "duration_ms", type: "number" },
    { name: "track_number", type: "number", isOptional: true },
    { name: "disc_number", type: "number", isOptional: true },
    { name: "added_at_epoch_ms", type: "number", isOptional: true },
  ],
  spotifyPlaylistTracks: [
    { name: "playlist_spotify_id", type: "string" },
    { name: "track_spotify_id", type: "string" },
    { name: "telegram_song_id", type: "string", isOptional: true },
    { name: "position", type: "number" },
    { name: "matched_at_epoch_ms", type: "number", isOptional: true },
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

export type SpotifyPlaylistRow = {
  spotifyId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ownerId: string;
  trackCount: number;
  snapshotId: string | null;
  syncedAtEpochMs: number;
  createdAtEpochMs: number;
};

export type SpotifyTrackRow = {
  spotifyId: string;
  name: string;
  artistNames: string[];
  albumName: string;
  albumImageUrl: string | null;
  durationMs: number;
  trackNumber: number | null;
  discNumber: number | null;
  addedAtEpochMs: number | null;
};

export type SpotifyPlaylistTrackRow = {
  playlistSpotifyId: string;
  trackSpotifyId: string;
  telegramSongId: string | null;
  position: number;
  matchedAtEpochMs: number | null;
};
