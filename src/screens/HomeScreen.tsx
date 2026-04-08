import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen } from "../components/layout/Screen";
import { getTelegramChannelTargets } from "../config/env";
import { getSongRepository } from "../db";
import type { SongRow } from "../db/schema";
import { syncTelegramChannelMetadata } from "../services/telegram/channelMetadataSync";
import type { TelegramSession } from "../services/telegram/telegramClient";
import { usePlayer } from "../features/player";
import { MINI_PLAYER_HEIGHT_EXPORTED } from "../components/player/MiniPlayer";
import { ChannelRow } from "../components/home/ChannelRow";
import { getRecentlyPlayedIds, subscribeRecentlyPlayed } from "../features/player/recentlyPlayed";

type HomeScreenProps = {
  session: TelegramSession;
  onSignOut: () => Promise<void>;
};

export function HomeScreen({ session, onSignOut }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const channels = useMemo(() => getTelegramChannelTargets(), []);
  
  const [isSyncingMetadata, setIsSyncingMetadata] = useState(false);
  const [allSongs, setAllSongs] = useState<SongRow[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const { playSong, currentSong } = usePlayer();

  const loadSongsFromDb = useCallback(async () => {
    const songRepository = getSongRepository();
    const persistedSongs = await songRepository.getAllSongs();
    setAllSongs(persistedSongs);
  }, []);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    void getRecentlyPlayedIds().then(setRecentIds);
    unsub = subscribeRecentlyPlayed(setRecentIds);
    return () => {
      if (unsub) unsub();
    };
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

  const onPressSong = useCallback(
    (song: SongRow, queue: SongRow[]) => {
      void playSong(song, queue);
    },
    [playSong]
  );

  const songsByChannel = useMemo(() => {
    const map = new Map<string, SongRow[]>();
    for (const s of allSongs) {
      const arr = map.get(s.channelId) ?? [];
      arr.push(s);
      map.set(s.channelId, arr);
    }
    return map;
  }, [allSongs]);

  const recentlyPlayedSongs = useMemo(() => {
    if (recentIds.length === 0 || allSongs.length === 0) return [];
    const idToSong = new Map(allSongs.map((s) => [s.id, s] as const));
    return recentIds.map((id) => idToSong.get(id)).filter(Boolean) as SongRow[];
  }, [allSongs, recentIds]);

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View>
          <Text style={styles.greetingTop}>{getTimeGreeting()}</Text>
          <Text style={styles.greetingBottom}>{maskPhone(session.phone)}</Text>
        </View>
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

      <ScrollView
        refreshControl={<RefreshControl refreshing={isSyncingMetadata} onRefresh={() => void syncChannelMetadata()} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: MINI_PLAYER_HEIGHT_EXPORTED + insets.bottom + 20 }]}
      >
        {recentlyPlayedSongs.length > 0 && (
          <ChannelRow title="Recently Played" songs={recentlyPlayedSongs} onPressSong={onPressSong} />
        )}

        {channels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No channels configured.</Text>
            <Text style={styles.emptySubtext}>Configure channels and sync to see songs.</Text>
          </View>
        ) : (
          channels.map((ch) => (
            <ChannelRow
              key={ch}
              title={ch}
              songs={songsByChannel.get(ch) ?? []}
              onPressSong={onPressSong}
            />
          ))
        )}
      </ScrollView>
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
  greetingTop: { color: '#94A3B8', fontSize: 12 },
  greetingBottom: { color: '#F8FAFC', fontSize: 20, fontWeight: '700' },
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
  scrollContent: {
    paddingTop: 12,
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

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function maskPhone(phone: string): string {
  const trimmed = phone.replace(/\s+/g, '');
  if (trimmed.length <= 4) return trimmed;
  const last4 = trimmed.slice(-4);
  return `+*** ${last4}`;
}
