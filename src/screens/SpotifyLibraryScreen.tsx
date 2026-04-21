import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserPlaylists, getLikedSongs, getPlaylistTracks, type SpotifyPlaylist, type SpotifyTrack } from '../services/spotify/spotifyApiService';
import { createSpotifyRepository, type SpotifyRepository } from '../db/spotifyRepository';
import { getSongRepository } from '../db/songRepository';
import { matchSpotifyTrackToTelegram } from '../services/spotify/spotifyMatchingService';
import type { SpotifyPlaylistRow } from '../db/schema';
import type { TelegramSession } from '../services/telegram/telegramClient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SpotifyStackParamList } from '../navigation/AppNavigator';

type SpotifyLibraryScreenProps = NativeStackScreenProps<SpotifyStackParamList, 'SpotifyLibrary'>;

export function SpotifyLibraryScreen({ navigation, route }: SpotifyLibraryScreenProps) {
  const insets = useSafeAreaInsets();
  const [playlists, setPlaylists] = useState<SpotifyPlaylistRow[]>([]);
  const [likedSongsMatch, setLikedSongsMatch] = useState<{ total: number; matched: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const repo = await createSpotifyRepository();
      const savedPlaylists = await repo.getAllPlaylists();
      setPlaylists(savedPlaylists);
    } catch (error) {
      console.error('Load playlists error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const spotifyPlaylists = await getUserPlaylists(50);
      const likedSongs = await getLikedSongs(50);
      
      const repo = await createSpotifyRepository();
      const songRepo = getSongRepository();
      const allTelegramSongs = await songRepo.getAllSongs();
      const now = Date.now();

      // Process normal playlists
      for (const playlist of spotifyPlaylists) {
        await repo.savePlaylist({
          spotifyId: playlist.id,
          name: playlist.name,
          description: playlist.description,
          imageUrl: playlist.imageUrl,
          ownerId: playlist.ownerId,
          trackCount: playlist.trackCount,
          snapshotId: playlist.snapshotId,
          syncedAtEpochMs: now,
          createdAtEpochMs: playlist.createdAt,
        });

        const tracks = await getPlaylistTracks(playlist.id);
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          await repo.saveTrack({
            spotifyId: track.id,
            name: track.name,
            artistNames: track.artistNames,
            albumName: track.albumName,
            albumImageUrl: track.albumImageUrl,
            durationMs: track.durationMs,
            trackNumber: track.trackNumber,
            discNumber: track.discNumber,
            addedAtEpochMs: track.addedAt,
          });

          const match = matchSpotifyTrackToTelegram(track, allTelegramSongs);

          await repo.savePlaylistTrackMapping({
            playlistSpotifyId: playlist.id,
            trackSpotifyId: track.id,
            telegramSongId: match.telegramSongId,
            position: i,
            matchedAtEpochMs: match.telegramSongId ? now : null,
          });
        }
      }

      // Process Liked Songs as a synthetic playlist
      if (likedSongs.length > 0) {
        const LIKED_SONGS_ID = 'liked_songs_local';
        await repo.savePlaylist({
          spotifyId: LIKED_SONGS_ID,
          name: 'Liked Songs',
          description: 'Your Spotify liked songs',
          imageUrl: null,
          ownerId: 'me',
          trackCount: likedSongs.length,
          snapshotId: 'latest',
          syncedAtEpochMs: now,
          createdAtEpochMs: now,
        });

        let matchedLikedCount = 0;
        for (let i = 0; i < likedSongs.length; i++) {
          const track = likedSongs[i];
          await repo.saveTrack({
            spotifyId: track.id,
            name: track.name,
            artistNames: track.artistNames,
            albumName: track.albumName,
            albumImageUrl: track.albumImageUrl,
            durationMs: track.durationMs,
            trackNumber: track.trackNumber,
            discNumber: track.discNumber,
            addedAtEpochMs: track.addedAt,
          });

          const match = matchSpotifyTrackToTelegram(track, allTelegramSongs);
          if (match.telegramSongId) matchedLikedCount++;

          await repo.savePlaylistTrackMapping({
            playlistSpotifyId: LIKED_SONGS_ID,
            trackSpotifyId: track.id,
            telegramSongId: match.telegramSongId,
            position: i,
            matchedAtEpochMs: match.telegramSongId ? now : null,
          });
        }
        setLikedSongsMatch({ total: likedSongs.length, matched: matchedLikedCount });
      }

      await loadPlaylists();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const renderPlaylistItem = ({ item }: { item: SpotifyPlaylistRow }) => (
    <Pressable 
      style={styles.playlistItem}
      onPress={() => navigation.navigate('SpotifyPlaylistDetail', { playlistId: item.spotifyId, playlistName: item.name })}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.playlistImage} />
      ) : (
        <View style={[styles.playlistImage, styles.playlistImagePlaceholder]}>
          <Text style={styles.playlistImageText}>🎵</Text>
        </View>
      )}
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.playlistMeta}>
          {item.trackCount} tracks
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Spotify</Text>
        <Pressable
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          onPress={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#22C55E" />
          ) : (
            <Text style={styles.syncButtonText}>Sync</Text>
          )}
        </Pressable>
      </View>

      {likedSongsMatch && (
        <Pressable 
          style={styles.likedSongsCard}
          onPress={() => navigation.navigate('SpotifyPlaylistDetail', { playlistId: 'liked_songs_local', playlistName: 'Liked Songs' })}
        >
          <Text style={styles.likedSongsIcon}>❤️</Text>
          <View style={styles.likedSongsInfo}>
            <Text style={styles.likedSongsTitle}>Liked Songs</Text>
            <Text style={styles.likedSongsMeta}>
              {likedSongsMatch.matched} of {likedSongsMatch.total} matched
            </Text>
          </View>
        </Pressable>
      )}

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.spotifyId}
        renderItem={renderPlaylistItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={handleSync}
            tintColor="#22C55E"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎵</Text>
            <Text style={styles.emptyTitle}>No playlists</Text>
            <Text style={styles.emptySubtext}>
              Connect Spotify and sync to import your playlists
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  syncButton: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#22C55E',
    fontWeight: '600',
  },
  likedSongsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  likedSongsIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  likedSongsInfo: {
    flex: 1,
  },
  likedSongsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  likedSongsMeta: {
    fontSize: 14,
    color: '#94A3B8',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E293B',
  },
  playlistImage: {
    width: 56,
    height: 56,
    borderRadius: 4,
    marginRight: 12,
  },
  playlistImagePlaceholder: {
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistImageText: {
    fontSize: 24,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  playlistMeta: {
    fontSize: 14,
    color: '#94A3B8',
  },
  chevron: {
    fontSize: 24,
    color: '#94A3B8',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});