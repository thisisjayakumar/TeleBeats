import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createSpotifyRepository, type SpotifyTrackWithMatch } from '../db/spotifyRepository';
import { SpotifyManualMatchModal } from '../components/SpotifyManualMatchModal';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SpotifyStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<SpotifyStackParamList, 'SpotifyPlaylistDetail'>;

export function SpotifyPlaylistDetailScreen({ route, navigation }: Props) {
  const { playlistId, playlistName } = route.params;
  const insets = useSafeAreaInsets();
  const [tracks, setTracks] = useState<SpotifyTrackWithMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrackWithMatch | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    loadTracks();
  }, [playlistId]);

  const loadTracks = async () => {
    try {
      const repo = await createSpotifyRepository();
      const playlistTracks = await repo.getPlaylistTracks(playlistId);
      setTracks(playlistTracks);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualMatch = async (telegramSongId: string) => {
    if (!selectedTrack) return;
    try {
      const repo = await createSpotifyRepository();
      await repo.updateTrackTelegramMapping(selectedTrack.spotifyId, telegramSongId);
      // Refresh tracks
      loadTracks();
    } catch (e) {
      console.error('Failed to manually match:', e);
    }
  };

  const renderTrack = ({ item }: { item: SpotifyTrackWithMatch }) => {
    const isMatched = item.telegramSongId !== null;
    return (
      <Pressable 
        style={styles.trackItem}
        onPress={() => {
          setSelectedTrack(item);
          setIsModalVisible(true);
        }}
      >
        {item.albumImageUrl ? (
          <Image source={{ uri: item.albumImageUrl }} style={styles.trackImage} />
        ) : (
          <View style={[styles.trackImage, styles.placeholderImage]}>
            <Text>🎵</Text>
          </View>
        )}
        <View style={styles.trackInfo}>
          <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{item.artistNames.join(', ')}</Text>
        </View>
        <View style={styles.matchStatus}>
          {isMatched ? (
            <View style={styles.badgeMatched}><Text style={styles.badgeText}>Matched</Text></View>
          ) : (
            <View style={styles.badgeUnmatched}><Text style={styles.badgeText}>Unmatched</Text></View>
          )}
        </View>
      </Pressable>
    );
  };

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
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{playlistName}</Text>
      </View>
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.spotifyId}
        renderItem={renderTrack}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tracks found.</Text>
          </View>
        }
      />
      
      <SpotifyManualMatchModal 
        visible={isModalVisible}
        track={selectedTrack}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedTrack(null);
        }}
        onMatch={handleManualMatch}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    paddingRight: 16,
    paddingVertical: 4,
  },
  backIcon: {
    fontSize: 32,
    color: '#F8FAFC',
    lineHeight: 32,
    marginTop: -4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E293B',
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 13,
    color: '#94A3B8',
  },
  matchStatus: {
    justifyContent: 'center',
  },
  badgeMatched: {
    backgroundColor: '#22C55E20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeUnmatched: {
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 15,
  },
});
