import * as SecureStore from 'expo-secure-store';

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SpotifyAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

const DEFAULT_CONFIG: SpotifyAuthConfig = {
  clientId: '',
  clientSecret: '',
  redirectUri: 'telebeats://spotify-callback',
  scopes: [
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-library-read',
  ],
};

let currentConfig = { ...DEFAULT_CONFIG };

export function configureSpotifyAuth(config: Partial<SpotifyAuthConfig>): void {
  currentConfig = { ...DEFAULT_CONFIG, ...config };
}

export function getSpotifyAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: currentConfig.clientId,
    response_type: 'code',
    redirect_uri: currentConfig.redirectUri,
    scope: currentConfig.scopes.join(' '),
    show_dialog: 'true',
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokens> {
  const credentials = btoa(`${currentConfig.clientId}:${currentConfig.clientSecret}`);
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: currentConfig.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  const expiresAt = Date.now() + (data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  const credentials = btoa(`${currentConfig.clientId}:${currentConfig.clientSecret}`);
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();
  const expiresAt = Date.now() + (data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt,
  };
}

const TOKENS_KEY = 'spotify_tokens';

export async function saveTokens(tokens: SpotifyTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
}

export async function getTokens(): Promise<SpotifyTokens | null> {
  const stored = await SecureStore.getItemAsync(TOKENS_KEY);
  if (!stored) return null;
  
  try {
    const tokens: SpotifyTokens = JSON.parse(stored);
    if (tokens.expiresAt < Date.now()) {
      return null;
    }
    return tokens;
  } catch {
    return null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) return null;
  
  if (tokens.expiresAt < Date.now() + 60000) {
    try {
      const newTokens = await refreshAccessToken(tokens.refreshToken);
      await saveTokens(newTokens);
      return newTokens.accessToken;
    } catch {
      await clearTokens();
      return null;
    }
  }
  
  return tokens.accessToken;
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKENS_KEY);
}

export function isAuthenticated(): Promise<boolean> {
  return getValidAccessToken().then(token => token !== null);
}