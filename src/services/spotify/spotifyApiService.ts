import { getValidAccessToken, SpotifyTokens } from './spotifyAuthService';

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ownerId: string;
  trackCount: number;
  snapshotId: string;
  createdAt: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artistNames: string[];
  albumName: string;
  albumImageUrl: string | null;
  durationMs: number;
  trackNumber: number | null;
  discNumber: number | null;
  addedAt: number | null;
}

const BASE_URL = 'https://api.spotify.com/v1';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Not authenticated with Spotify');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify API error: ${response.status} - ${error}`);
  }

  return response;
}

function parseImage(images: SpotifyImage[]): string | null {
  if (!images || images.length === 0) return null;
  const largest = images.reduce((prev, curr) => 
    (prev.width || 0) > (curr.width || 0) ? prev : curr
  );
  return largest.url || null;
}

interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

interface SpotifyArtist {
  id: string;
  name: string;
}

interface SpotifyAlbum {
  name: string;
  images: SpotifyImage[];
  release_date: string;
}

interface SpotifyTrackItem {
  track: {
    id: string;
    name: string;
    artists: SpotifyArtist[];
    album: SpotifyAlbum;
    duration_ms: number;
    track_number: number | null;
    disc_number: number | null;
  };
  added_at: string;
  added_at_ms: number;
}

export async function getUserPlaylists(limit = 50): Promise<SpotifyPlaylist[]> {
  let allPlaylists: SpotifyPlaylist[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchWithAuth(`/me/playlists?limit=${Math.min(50, limit - offset)}&offset=${offset}`);
    const data = await response.json();
    
    const playlists: SpotifyPlaylist[] = data.items.map((item: {
      id: string;
      name: string;
      description: string | null;
      images: SpotifyImage[];
      owner: { id: string };
      tracks: { total: number };
      snapshot_id: string;
      created_at: string;
    }) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: parseImage(item.images),
      ownerId: item.owner.id,
      trackCount: item.tracks.total,
      snapshotId: item.snapshot_id,
      createdAt: new Date(item.created_at).getTime(),
    }));

    allPlaylists = allPlaylists.concat(playlists);
    offset += playlists.length;
    hasMore = data.next !== null && offset < limit;
  }

  return allPlaylists;
}

export async function getPlaylistTracks(
  playlistId: string,
  limit = 100
): Promise<SpotifyTrack[]> {
  let allTracks: SpotifyTrack[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchWithAuth(
      `/playlists/${playlistId}/tracks?limit=${Math.min(100, limit - offset)}&offset=${offset}`
    );
    const data = await response.json();
    
    const tracks: SpotifyTrack[] = data.items
      .filter((item: { track: SpotifyTrackItem['track'] | null }) => item.track !== null)
      .map((item: SpotifyTrackItem) => ({
        id: item.track!.id,
        name: item.track!.name,
        artistNames: item.track!.artists.map((a: SpotifyArtist) => a.name),
        albumName: item.track!.album.name,
        albumImageUrl: parseImage(item.track!.album.images),
        durationMs: item.track!.duration_ms,
        trackNumber: item.track!.track_number,
        discNumber: item.track!.disc_number,
        addedAt: item.added_at_ms || new Date(item.added_at).getTime(),
      }));

    allTracks = allTracks.concat(tracks);
    offset += tracks.length;
    hasMore = data.next !== null && offset < limit;
  }

  return allTracks;
}

export async function getLikedSongs(limit = 50): Promise<SpotifyTrack[]> {
  let allTracks: SpotifyTrack[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchWithAuth(
      `/me/tracks?limit=${Math.min(50, limit - offset)}&offset=${offset}`
    );
    const data = await response.json();
    
    const tracks: SpotifyTrack[] = data.items
      .filter((item: { track: SpotifyTrackItem['track'] | null }) => item.track !== null)
      .map((item: SpotifyTrackItem) => ({
        id: item.track!.id,
        name: item.track!.name,
        artistNames: item.track!.artists.map((a: SpotifyArtist) => a.name),
        albumName: item.track!.album.name,
        albumImageUrl: parseImage(item.track!.album.images),
        durationMs: item.track!.duration_ms,
        trackNumber: item.track!.track_number,
        discNumber: item.track!.disc_number,
        addedAt: item.added_at_ms || new Date(item.added_at).getTime(),
      }));

    allTracks = allTracks.concat(tracks);
    offset += tracks.length;
    hasMore = data.next !== null && offset < limit;
  }

  return allTracks;
}

export async function getUserProfile(): Promise<{ id: string; displayName: string | null }> {
  const response = await fetchWithAuth('/me');
  const data = await response.json();
  return {
    id: data.id,
    displayName: data.display_name,
  };
}

export async function getPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
  const response = await fetchWithAuth(`/playlists/${playlistId}`);
  const data = await response.json();
  
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    imageUrl: parseImage(data.images),
    ownerId: data.owner.id,
    trackCount: data.tracks.total,
    snapshotId: data.snapshot_id,
    createdAt: new Date(data.created_at).getTime(),
  };
}