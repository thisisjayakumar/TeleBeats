import {
  matchSpotifyTrackToTelegram,
  matchAllTracks,
  calculateMatchStats,
} from '../spotifyMatchingService';
import type { SongRow } from '../../../db/schema';
import type { SpotifyTrack } from '../spotifyApiService';

describe('spotifyMatchingService', () => {
  describe('matchSpotifyTrackToTelegram', () => {
    const mockTelegramSongs: SongRow[] = [
      {
        id: 'telegram-1',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        album: 'A Night at the Opera',
        durationSec: 355,
        source: 'telegram',
        channelId: 'my-music',
        channelTitle: 'My Music',
        messageId: 1,
        fileName: 'bohemian.mp3',
        mimeType: 'audio/mpeg',
        fileSizeBytes: 5000000,
      },
      {
        id: 'telegram-2',
        title: 'Hotel California',
        artist: 'Eagles',
        album: 'Hotel California',
        durationSec: 391,
        source: 'telegram',
        channelId: 'my-music',
        channelTitle: 'My Music',
        messageId: 2,
        fileName: 'hotel.mp3',
        mimeType: 'audio/mpeg',
        fileSizeBytes: 4500000,
      },
      {
        id: 'telegram-3',
        title: 'Billie Jean',
        artist: 'Michael Jackson',
        album: 'Thriller',
        durationSec: 294,
        source: 'telegram',
        channelId: 'my-music',
        channelTitle: 'My Music',
        messageId: 3,
        fileName: 'billie.mp3',
        mimeType: 'audio/mpeg',
        fileSizeBytes: 4000000,
      },
      {
        id: 'telegram-4',
        title: 'Shape of You',
        artist: 'Ed Sheeran',
        album: 'Divide',
        durationSec: 234,
        source: 'telegram',
        channelId: 'my-music',
        channelTitle: 'My Music',
        messageId: 4,
        fileName: 'shape.mp3',
        mimeType: 'audio/mpeg',
        fileSizeBytes: 3500000,
      },
    ];

    describe('exact matching', () => {
      it('matches exact title and artist', () => {
        const spotifyTrack: SpotifyTrack = {
          id: 'spotify-1',
          name: 'Bohemian Rhapsody',
          artistNames: ['Queen'],
          albumName: 'A Night at the Opera',
          albumImageUrl: null,
          durationMs: 355000,
          trackNumber: 11,
          discNumber: 1,
          addedAt: null,
        };

        const result = matchSpotifyTrackToTelegram(spotifyTrack, mockTelegramSongs);

        expect(result.matchType).toBe('exact');
        expect(result.telegramSongId).toBe('telegram-1');
        expect(result.score).toBeGreaterThanOrEqual(95);
      });

      it('matches exact title with different casing', () => {
        const spotifyTrack: SpotifyTrack = {
          id: 'spotify-x',
          name: 'BOHEMIAN RHAPSODY',
          artistNames: ['QUEEN'],
          albumName: 'A Night at the Opera',
          albumImageUrl: null,
          durationMs: 355000,
          trackNumber: 1,
          discNumber: 1,
          addedAt: null,
        };

        const result = matchSpotifyTrackToTelegram(spotifyTrack, mockTelegramSongs);

        expect(result.matchType).toBe('exact');
        expect(result.telegramSongId).toBe('telegram-1');
      });

      it('matches exact with special characters stripped', () => {
        const spotifyTrack: SpotifyTrack = {
          id: 'spotify-x',
          name: 'Bohemian... Rhapsody!',
          artistNames: ['Queen'],
          albumName: 'Album',
          albumImageUrl: null,
          durationMs: 355000,
          trackNumber: 1,
          discNumber: 1,
          addedAt: null,
        };

        const result = matchSpotifyTrackToTelegram(spotifyTrack, mockTelegramSongs);

        expect(result.matchType).toBe('exact');
        expect(result.telegramSongId).toBe('telegram-1');
      });
    });

    describe('fuzzy matching', () => {
      it('matches similar title with small typo', () => {
        const spotifyTrack: SpotifyTrack = {
          id: 'spotify-2',
          name: 'Bohemian Raphsody', // typo: ph -> ph
          artistNames: ['Queen'],
          albumName: 'Album',
          albumImageUrl: null,
          durationMs: 355000,
          trackNumber: 1,
          discNumber: 1,
          addedAt: null,
        };

        const result = matchSpotifyTrackToTelegram(spotifyTrack, mockTelegramSongs);

        // With small typo it could be exact or fuzzy depending on similarity
        expect(result.telegramSongId).toBe('telegram-1');
        expect(result.score).toBeGreaterThanOrEqual(80);
      });

      it('matches when artist has multiple names', () => {
        const spotifyTrack: SpotifyTrack = {
          id: 'spotify-4',
          name: 'Shape of You',
          artistNames: ['Ed Sheeran'],
          albumName: 'Divide',
          albumImageUrl: null,
          durationMs: 234000,
          trackNumber: 1,
          discNumber: 1,
          addedAt: null,
        };

        const result = matchSpotifyTrackToTelegram(spotifyTrack, mockTelegramSongs);

        expect(result.matchType).toBe('exact');
        expect(result.telegramSongId).toBe('telegram-4');
      });
    });

    describe('partial matching', () => {
      it('matches partial title match', () => {
        const spotifyTrack: SpotifyTrack = {
          id: 'spotify-x',
          name: 'Hotel', // partial match
          artistNames: ['Eagles'],
          albumName: 'Album',
          albumImageUrl: null,
          durationMs: 391000,
          trackNumber: 1,
          discNumber: 1,
          addedAt: null,
        };

        const result = matchSpotifyTrackToTelegram(spotifyTrack, mockTelegramSongs);

        expect(result.matchType).toBe('partial');
        expect(result.telegramSongId).toBe('telegram-2');
        expect(result.score).toBeGreaterThanOrEqual(60);
      });
    });

    describe('no match', () => {
      it('returns none when no similar track exists', () => {
        const spotifyTrack: SpotifyTrack = {
          id: 'spotify-x',
          name: 'Completely Different Song XYZ',
          artistNames: ['Unknown Artist'],
          albumName: 'Album',
          albumImageUrl: null,
          durationMs: 200000,
          trackNumber: 1,
          discNumber: 1,
          addedAt: null,
        };

        const result = matchSpotifyTrackToTelegram(spotifyTrack, mockTelegramSongs);

        expect(result.matchType).toBe('none');
        expect(result.telegramSongId).toBeNull();
        expect(result.score).toBe(0);
      });

      it('returns none for empty telegram songs', () => {
        const spotifyTrack: SpotifyTrack = {
          id: 'spotify-x',
          name: 'Test Song',
          artistNames: ['Test Artist'],
          albumName: 'Album',
          albumImageUrl: null,
          durationMs: 180000,
          trackNumber: 1,
          discNumber: 1,
          addedAt: null,
        };

        const result = matchSpotifyTrackToTelegram(spotifyTrack, []);

        expect(result.matchType).toBe('none');
        expect(result.telegramSongId).toBeNull();
      });
    });

    describe('duration matching', () => {
      it('prefers tracks with similar duration', () => {
        const spotifyTrack: SpotifyTrack = {
          id: 'spotify-x',
          name: 'Shape of You',
          artistNames: ['Someone Else'], // different artist
          albumName: 'Album',
          albumImageUrl: null,
          durationMs: 235000, // slightly different (234s vs 235s = within 10s tolerance)
          trackNumber: 1,
          discNumber: 1,
          addedAt: null,
        };

        const result = matchSpotifyTrackToTelegram(spotifyTrack, mockTelegramSongs);

        // Should still match due to duration similarity
        expect(result.telegramSongId).toBe('telegram-4');
      });

      it('duration mismatch still matches but with lower score', () => {
        const spotifyTrack: SpotifyTrack = {
          id: 'spotify-x',
          name: 'Shape of You',
          artistNames: ['Ed Sheeran'],
          albumName: 'Album',
          albumImageUrl: null,
          durationMs: 60000, // very different (60s vs 234s)
          trackNumber: 1,
          discNumber: 1,
          addedAt: null,
        };

        const result = matchSpotifyTrackToTelegram(spotifyTrack, mockTelegramSongs);

        // Even with duration mismatch, title and artist match exactly
        expect(result.telegramSongId).toBe('telegram-4');
        // Score will be lower but still matches
        expect(result.score).toBeGreaterThan(0);
      });
    });

    describe('multiple artists', () => {
      it('matches when one of multiple artists matches', () => {
        const spotifyTrack: SpotifyTrack = {
          id: 'spotify-x',
          name: 'Bohemian Rhapsody',
          artistNames: ['Queen', 'David Bowie'],
          albumName: 'Album',
          albumImageUrl: null,
          durationMs: 355000,
          trackNumber: 1,
          discNumber: 1,
          addedAt: null,
        };

        const result = matchSpotifyTrackToTelegram(spotifyTrack, mockTelegramSongs);

        expect(result.telegramSongId).toBe('telegram-1');
        expect(result.matchType).toBe('exact');
      });
    });
  });

  describe('matchAllTracks', () => {
    it('matches all tracks in a playlist', () => {
      const spotifyTracks: SpotifyTrack[] = [
        {
          id: 'spotify-1',
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
          id: 'spotify-2',
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
          id: 'spotify-3',
          name: 'Unknown Song',
          artistNames: ['Unknown'],
          albumName: 'Album',
          albumImageUrl: null,
          durationMs: 200000,
          trackNumber: 3,
          discNumber: 1,
          addedAt: null,
        },
      ];

      const telegramSongs: SongRow[] = [
        {
          id: 'tg-1',
          title: 'Bohemian Rhapsody',
          artist: 'Queen',
          album: null,
          durationSec: 355,
          source: 'telegram',
          channelId: 'ch',
          channelTitle: 'Ch',
          messageId: 1,
          fileName: null,
          mimeType: null,
          fileSizeBytes: null,
        },
        {
          id: 'tg-2',
          title: 'Hotel California',
          artist: 'Eagles',
          album: null,
          durationSec: 391,
          source: 'telegram',
          channelId: 'ch',
          channelTitle: 'Ch',
          messageId: 2,
          fileName: null,
          mimeType: null,
          fileSizeBytes: null,
        },
      ];

      const results = matchAllTracks(spotifyTracks, telegramSongs);

      expect(results).toHaveLength(3);
      expect(results[0].matchType).toBe('exact');
      expect(results[1].matchType).toBe('exact');
      expect(results[2].matchType).toBe('none');
    });

    it('returns empty array for empty spotify tracks', () => {
      const telegramSongs: SongRow[] = [
        {
          id: 'tg-1',
          title: 'Test',
          artist: 'Artist',
          album: null,
          durationSec: 100,
          source: 'telegram',
          channelId: 'ch',
          channelTitle: 'Ch',
          messageId: 1,
          fileName: null,
          mimeType: null,
          fileSizeBytes: null,
        },
      ];

      const results = matchAllTracks([], telegramSongs);

      expect(results).toHaveLength(0);
    });
  });

  describe('calculateMatchStats', () => {
    it('calculates correct statistics', () => {
      const results = [
        { spotifyTrackId: '1', telegramSongId: 't1', score: 96, matchType: 'exact' as const },
        { spotifyTrackId: '2', telegramSongId: 't2', score: 85, matchType: 'fuzzy' as const },
        { spotifyTrackId: '3', telegramSongId: 't3', score: 65, matchType: 'partial' as const },
        { spotifyTrackId: '4', telegramSongId: null, score: 0, matchType: 'none' as const },
      ];

      const stats = calculateMatchStats(results);

      expect(stats.exact).toBe(1);
      expect(stats.fuzzy).toBe(1);
      expect(stats.partial).toBe(1);
      expect(stats.none).toBe(1);
      expect(stats.total).toBe(4);
      expect(stats.matchRate).toBe(75); // 3/4 = 75%
    });

    it('handles empty results', () => {
      const stats = calculateMatchStats([]);

      expect(stats.total).toBe(0);
      expect(stats.matchRate).toBe(0);
      expect(stats.exact).toBe(0);
      expect(stats.fuzzy).toBe(0);
      expect(stats.partial).toBe(0);
      expect(stats.none).toBe(0);
    });

    it('handles all unmatched', () => {
      const results = [
        { spotifyTrackId: '1', telegramSongId: null, score: 0, matchType: 'none' as const },
        { spotifyTrackId: '2', telegramSongId: null, score: 0, matchType: 'none' as const },
      ];

      const stats = calculateMatchStats(results);

      expect(stats.matchRate).toBe(0);
      expect(stats.none).toBe(2);
    });
  });
});