import type { Track } from 'react-native-track-player';

import type { SongRow } from '../../db/schema';

/** Maps a SongRow + local file URI to a react-native-track-player Track. */
export function mapSongToTrack(song: SongRow, fileUri: string): Track {
  return {
    id: song.id,
    url: fileUri,
    title: song.title,
    artist: song.artist,
    album: song.channelTitle,
    duration: song.durationSec ?? undefined,
  };
}
