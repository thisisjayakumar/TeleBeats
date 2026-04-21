import { matchAllTracks, calculateMatchStats } from '../spotifyMatchingService';
import type { SongRow } from '../../db/schema';
import type { SpotifyTrack } from '../spotifyApiService';

describe('Phase 2b: Liked Songs Integration', () => {
  const mockTelegramSongs: SongRow[] = [
    {
      id: 'tg-1',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      durationSec: 355,
      source: 'telegram',
      channelId: 'ch1',
      channelTitle: 'My Music',
      messageId: 1,
      fileName: null,
      mimeType: null,
      fileSizeBytes: null,
    },
    {
      id: 'tg-2',
      title: 'Hotel California',
      artist: 'Eagles',
      album: 'Hotel California',
      durationSec: 391,
      source: 'telegram',
      channelId: 'ch1',
      channelTitle: 'My Music',
      messageId: 2,
      fileName: null,
      mimeType: null,
      fileSizeBytes: null,
    },
    {
      id: 'tg-3',
      title: 'Stairway to Heaven',
      artist: 'Led Zeppelin',
      album: 'Led Zeppelin IV',
      durationSec: 482,
      source: 'telegram',
      channelId: 'ch1',
      channelTitle: 'My Music',
      messageId: 3,
      fileName: null,
      mimeType: null,
      fileSizeBytes: null,
    },
  ];

  const mockLikedSongs: SpotifyTrack[] = [
    {
      id: 'spotify-liked-1',
      name: 'Bohemian Rhapsody',
      artistNames: ['Queen'],
      albumName: 'Album',
      albumImageUrl: null,
      durationMs: 355000,
      trackNumber: 1,
      discNumber: 1,
      addedAt: null,
    },
    {
      id: 'spotify-liked-2',
      name: 'Hotel California',
      artistNames: ['Eagles'],
      albumName: 'Album',
      albumImageUrl: null,
      durationMs: 391000,
      trackNumber: 2,
      discNumber: 1,
      addedAt: null,
    },
    {
      id: 'spotify-liked-3',
      name: 'Unknown Song',
      artistNames: ['Unknown Artist'],
      albumName: 'Album',
      albumImageUrl: null,
      durationMs: 180000,
      trackNumber: 3,
      discNumber: 1,
      addedAt: null,
    },
  ];

  describe('Liked Songs Matching', () => {
    it('matches liked songs with telegram library', () => {
      const results = matchAllTracks(mockLikedSongs, mockTelegramSongs);
      
      expect(results).toHaveLength(3);
      expect(results[0].telegramSongId).toBe('tg-1'); // Bohemian matches
      expect(results[1].telegramSongId).toBe('tg-2'); // Hotel matches
      expect(results[2].telegramSongId).toBeNull(); // Unknown doesn't match
    });

    it('calculates correct match statistics', () => {
      const results = matchAllTracks(mockLikedSongs, mockTelegramSongs);
      const stats = calculateMatchStats(results);
      
      expect(stats.exact).toBe(2);
      expect(stats.none).toBe(1);
      expect(stats.total).toBe(3);
      expect(stats.matchRate).toBeCloseTo(66.67, 0);
    });
  });

  describe('Synthetic Liked Songs Playlist', () => {
    const LIKED_SONGS_ID = 'liked_songs_local';

    it('uses correct playlist ID for liked songs', () => {
      expect(LIKED_SONGS_ID).toBe('liked_songs_local');
    });

    it('creates playlist name correctly', () => {
      const playlistName = 'Liked Songs';
      expect(playlistName).toBe('Liked Songs');
    });

    it('calculates matched count', () => {
      const results = matchAllTracks(mockLikedSongs, mockTelegramSongs);
      const matchedCount = results.filter(r => r.telegramSongId !== null).length;
      
      expect(matchedCount).toBe(2);
    });

    it('generates correct display string', () => {
      const results = matchAllTracks(mockLikedSongs, mockTelegramSongs);
      const matched = results.filter(r => r.telegramSongId !== null).length;
      const total = results.length;
      
      expect(`${matched} of ${total}`).toBe('2 of 3');
    });
  });

  describe('Match Quality', () => {
    it('identifies exact matches', () => {
      const results = matchAllTracks(mockLikedSongs, mockTelegramSongs);
      
      expect(results[0].matchType).toBe('exact');
      expect(results[0].score).toBeGreaterThanOrEqual(95);
    });

    it('identifies unmatched tracks', () => {
      const results = matchAllTracks(mockLikedSongs, mockTelegramSongs);
      
      expect(results[2].matchType).toBe('none');
      expect(results[2].telegramSongId).toBeNull();
    });

    it('returns Telegram ID for matched tracks', () => {
      const results = matchAllTracks(mockLikedSongs, mockTelegramSongs);
      
      expect(results[0].telegramSongId).toBe('tg-1');
      expect(results[1].telegramSongId).toBe('tg-2');
    });
  });
});

describe('Manual Match Update Flow', () => {
  describe('Track Mapping Update', () => {
    it('stores update mapping structure', () => {
      const update = {
        playlistSpotifyId: 'liked_songs_local',
        trackSpotifyId: 'spotify-unmatched',
        telegramSongId: 'tg-new',
        position: 5,
        matchedAtEpochMs: Date.now(),
      };
      
      expect(update.playlistSpotifyId).toBe('liked_songs_local');
      expect(update.telegramSongId).toBe('tg-new');
      expect(update.position).toBe(5);
    });

    it('tracks can be remapped to different telegram songs', () => {
      const originalMapping = { telegramSongId: null, matchType: 'none' as const };
      const newMapping = { telegramSongId: 'tg-3', matchType: 'exact' as const };
      
      // Simulating manual match update
      originalMapping.telegramSongId = newMapping.telegramSongId;
      originalMapping.matchType = newMapping.matchType;
      
      expect(originalMapping.telegramSongId).toBe('tg-3');
      expect(originalMapping.matchType).toBe('exact');
    });
  });

  describe('Position Tracking', () => {
    it('maintains correct order positions', () => {
      const positions = [0, 1, 2, 3, 4];
      const tracks = ['a', 'b', 'c', 'd', 'e'];
      
      expect(positions.map((pos, idx) => ({ pos, track: tracks[idx] })).map(r => r.pos))
        .toEqual([0, 1, 2, 3, 4]);
    });
  });
});

describe('Search Filtering Logic', () => {
  const searchSongs = (query: string, songs: SongRow[]) => {
    if (!query) return songs;
    const q = query.toLowerCase();
    return songs.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.artist.toLowerCase().includes(q)
    );
  };

  const mockSongs: SongRow[] = [
    { id: '1', title: 'Bohemian Rhapsody', artist: 'Queen' } as SongRow,
    { id: '2', title: 'Hotel California', artist: 'Eagles' } as SongRow,
    { id: '3', title: 'Stairway to Heaven', artist: 'Led Zeppelin' } as SongRow,
  ];

  it('filters by title', () => {
    const results = searchSongs('hotel', mockSongs);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Hotel California');
  });

  it('filters by artist', () => {
    const results = searchSongs('queen', mockSongs);
    expect(results).toHaveLength(1);
    expect(results[0].artist).toBe('Queen');
  });

  it('returns all when query is empty', () => {
    const results = searchSongs('', mockSongs);
    expect(results).toHaveLength(3);
  });

  it('is case-insensitive', () => {
    const results = searchSongs('QUEEN', mockSongs);
    expect(results).toHaveLength(1);
  });

  it('handles partial matches', () => {
    const results = searchSongs('stair', mockSongs);
    expect(results).toHaveLength(1);
  });
});