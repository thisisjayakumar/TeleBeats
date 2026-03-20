import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen } from "../components/layout/Screen";
import { getTelegramChannelTargets } from "../config/env";
import { getSongRepository } from "../db";
import type { SongRow } from "../db/schema";
import { syncTelegramChannelMetadata } from "../services/telegram/channelMetadataSync";
import type { TelegramSession } from "../services/telegram/telegramClient";
import { usePlayer } from "../features/player";
import { MINI_PLAYER_HEIGHT_EXPORTED } from "../components/player/MiniPlayer";

type HomeScreenProps = {
  session: TelegramSession;
  onSignOut: () => Promise<void>;
};

export function HomeScreen({ session, onSignOut }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const channels = useMemo(() => getTelegramChannelTargets(), []);
  
  const [isSyncingMetadata, setIsSyncingMetadata] = useState(false);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const { playSong, currentSong } = usePlayer();

  const loadSongsFromDb = useCallback(async () => {
    const songRepository = getSongRepository();
    const persistedSongs = await songRepository.getAllSongs();
    setSongs(persistedSongs);
  }, []);

  const syncChannelMetadata = useCallback(async () => {
    if (channels.length === 0) return;

    setIsSyncingMetadata(true);
    try {
      const fetchedSongs = await syncTelegramChannelMetadata({
        session,
        channels,
      });
      const songRepository = getSongRepository();
      await songRepository.seedFromTelegramSongs(fetchedSongs);
      await loadSongsFromDb();
    } catch (error) {
      console.error("Metadata sync failed:", error);
    } finally {
      setIsSyncingMetadata(false);
    }
  }, [channels, loadSongsFromDb, session]);

  useEffect(() => {
    void loadSongsFromDb();
    void syncChannelMetadata();
  }, [loadSongsFromDb, syncChannelMetadata]);

  const renderSong = useCallback(
    ({ item }: { item: SongRow }) => {
      const isPlaying = currentSong?.id === item.id;
      return (
        <Pressable
          style={[styles.songRow, isPlaying && styles.songRowActive]}
          onPress={() => void playSong(item, songs)}
          android_ripple={{ color: '#FFFFFF10' }}
        >
          <View style={styles.thumbnail}>
            <Text style={styles.thumbnailText}>🎵</Text>
          </View>
          <View style={styles.songInfo}>
            <Text style={[styles.songTitle, isPlaying && styles.songTitleActive]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {item.artist}
            </Text>
          </View>
        </Pressable>
      );
    },
    [currentSong?.id, playSong, songs]
  );

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>TeleBeats</Text>
        <Pressable
          style={styles.syncButton}
          onPress={() => void syncChannelMetadata()}
          disabled={isSyncingMetadata}
        >
          {isSyncingMetadata ? (
            <ActivityIndicator size="small" color="#22C55E" />
          ) : (
            <Text style={styles.syncButtonText}>Sync</Text>
          )}
        </Pressable>
      </View>

      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={renderSong}
        contentContainerStyle={[styles.listContent, { paddingBottom: MINI_PLAYER_HEIGHT_EXPORTED + insets.bottom + 20 }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No songs found.</Text>
            <Text style={styles.emptySubtext}>Waiting for sync or channels are empty.</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: 'bold',
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
  },
  syncButtonText: {
    color: '#22C55E',
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 16,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  songRowActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumbnailText: {
    fontSize: 24,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  songTitleActive: {
    color: '#22C55E',
  },
  songArtist: {
    color: '#94A3B8',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
});
