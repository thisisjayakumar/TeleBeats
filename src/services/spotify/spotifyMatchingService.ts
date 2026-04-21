import type { SongRow } from '../../db/schema';
import type { SpotifyTrack } from './spotifyApiService';

export interface MatchResult {
  spotifyTrackId: string;
  telegramSongId: string | null;
  score: number;
  matchType: 'exact' | 'fuzzy' | 'partial' | 'none';
}

const EXACT_MATCH_THRESHOLD = 95;
const FUZZY_MATCH_THRESHOLD = 80;
const PARTIAL_MATCH_THRESHOLD = 60;

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function stringSimilarity(a: string, b: string): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);

  if (normA === normB) return 100;
  if (normA.includes(normB) || normB.includes(normA)) {
    const shorter = normA.length < normB.length ? normA : normB;
    const longer = normA.length < normB.length ? normB : normA;
    return (shorter.length / longer.length) * 100;
  }

  const distance = levenshteinDistance(normA, normB);
  const maxLength = Math.max(normA.length, normB.length);
  if (maxLength === 0) return 100;

  return ((maxLength - distance) / maxLength) * 100;
}

function artistMatch(spotifyArtists: string[], telegramArtist: string): boolean {
  const normalizedTelegram = normalizeString(telegramArtist);
  
  for (const spotifyArtist of spotifyArtists) {
    const normalizedSpotify = normalizeString(spotifyArtist);
    
    if (normalizedSpotify === normalizedTelegram) return true;
    
    const words1 = normalizedSpotify.split(' ').filter(w => w.length > 2);
    const words2 = normalizedTelegram.split(' ').filter(w => w.length > 2);
    
    const matchingWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
    if (matchingWords.length >= Math.min(2, words1.length)) return true;
  }

  return false;
}

function durationMatch(spotifyDurationMs: number, telegramDurationSec: number | null): boolean {
  if (!telegramDurationSec) return true;
  
  const spotifyDurationSec = spotifyDurationMs / 1000;
  const difference = Math.abs(spotifyDurationSec - telegramDurationSec);
  
  return difference <= 10;
}

export function matchSpotifyTrackToTelegram(
  spotifyTrack: SpotifyTrack,
  telegramSongs: SongRow[]
): MatchResult {
  const spotifyTitle = spotifyTrack.name;
  const spotifyArtists = spotifyTrack.artistNames;
  const spotifyAlbum = spotifyTrack.albumName;
  const spotifyDurationMs = spotifyTrack.durationMs;

  let bestMatch: MatchResult | null = null;

  for (const telegramSong of telegramSongs) {
    const telegramTitle = telegramSong.title;
    const telegramArtist = telegramSong.artist;
    const telegramDurationSec = telegramSong.durationSec;

    const titleScore = stringSimilarity(spotifyTitle, telegramTitle);
    const hasArtistMatch = artistMatch(spotifyArtists, telegramArtist);
    const artistScore = hasArtistMatch ? 100 : stringSimilarity(spotifyArtists.join(' '), telegramArtist) * 0.5;
    const hasDurationMatch = durationMatch(spotifyDurationMs, telegramDurationSec);
    const durationScore = hasDurationMatch ? 100 : 50;

    let totalScore = 0;
    if (titleScore >= EXACT_MATCH_THRESHOLD && hasArtistMatch) {
      totalScore = (titleScore * 0.6) + (artistScore * 0.3) + (durationScore * 0.1);
    } else if (titleScore >= FUZZY_MATCH_THRESHOLD) {
      totalScore = (titleScore * 0.5) + (artistScore * 0.35) + (durationScore * 0.15);
    } else {
      totalScore = (titleScore * 0.4) + (artistScore * 0.4) + (durationScore * 0.2);
    }

    let matchType: MatchResult['matchType'] = 'none';
    if (totalScore >= EXACT_MATCH_THRESHOLD) {
      matchType = 'exact';
    } else if (totalScore >= FUZZY_MATCH_THRESHOLD) {
      matchType = 'fuzzy';
    } else if (totalScore >= PARTIAL_MATCH_THRESHOLD) {
      matchType = 'partial';
    }

    if (matchType !== 'none' && (!bestMatch || totalScore > bestMatch.score)) {
      bestMatch = {
        spotifyTrackId: spotifyTrack.id,
        telegramSongId: telegramSong.id,
        score: totalScore,
        matchType,
      };
    }
  }

  return bestMatch || {
    spotifyTrackId: spotifyTrack.id,
    telegramSongId: null,
    score: 0,
    matchType: 'none',
  };
}

export function matchAllTracks(
  spotifyTracks: SpotifyTrack[],
  telegramSongs: SongRow[]
): MatchResult[] {
  const telegramSongMap = new Map<string, SongRow>();
  
  for (const song of telegramSongs) {
    const normalizedTitle = normalizeString(song.title);
    const key = `${normalizedTitle}::${normalizeString(song.artist)}`;
    telegramSongMap.set(key, song);
    
    telegramSongMap.set(song.id, song);
  }

  const results: MatchResult[] = [];

  for (const track of spotifyTracks) {
    const result = matchSpotifyTrackToTelegram(track, telegramSongs);
    results.push(result);
  }

  return results;
}

export function calculateMatchStats(results: MatchResult[]): {
  exact: number;
  fuzzy: number;
  partial: number;
  none: number;
  total: number;
  matchRate: number;
} {
  const stats = {
    exact: 0,
    fuzzy: 0,
    partial: 0,
    none: 0,
    total: results.length,
  };

  for (const result of results) {
    stats[result.matchType]++;
  }

  const matched = stats.exact + stats.fuzzy + stats.partial;
  stats.matchRate = stats.total > 0 ? (matched / stats.total) * 100 : 0;

  return stats;
}