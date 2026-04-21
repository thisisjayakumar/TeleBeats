# TeleBeats Documentation

## Tech Stack
React Native (Expo 54), react-native-track-player, GramJS, WatermelonDB, NativeWind.

## Features
- **Completed**: Telegram OTP/2FA auth, channel metadata sync, audio streaming, WatermelonDB caching, basic player UI.
- **In-Progress/Pending**: Advanced caching, pre-downloading, Spotify import, cross-device sync.

## Phase 2: Spotify Import
- **Concept**: Import Spotify metadata, match with Telegram files. 
- **DB Schema**: `src/db/schema.ts` (spotify_playlists, spotify_tracks, spotify_playlist_tracks).
- **Matching Algo**: `src/services/spotify/spotifyMatchingService.ts` (uses title/artist/duration fuzzy match).
- **Auth**: `src/services/spotify/spotifyAuthService.ts` (OAuth 2).
- **API**: `src/services/spotify/spotifyApiService.ts`.

## Scaling Optimizations
- **Caching**: Needs L1 (Memory) -> L2 (Disk layer LRU) -> L3 (Telegram CDN). Ref `tieredCacheManager.ts`.
- **Data**: Needs pagination (`paginatedSongRepository.ts`), incremental sync, FTS indexing.
- **UI**: Optimize `FlatList` with `getItemLayout`, lazy loading, `expo-image`.

## Dual Device Playback
- **Approach**: WebSocket signaling server.
- **Logic**: `dualPlayService.ts` (Session sync, play/pause state).
- **Hooks**: `useDualPlay.ts`.
- **Sync**: Latency compensation via calculated offset timestamps.