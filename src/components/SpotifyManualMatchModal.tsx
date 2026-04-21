import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { getSongRepository } from '../db/songRepository';
import type { SongRow } from '../db/schema';
import type { SpotifyTrackWithMatch } from '../db/spotifyRepository';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  track: SpotifyTrackWithMatch | null;
  onClose: () => void;
  onMatch: (telegramSongId: string) => Promise<void>;
};

export function SpotifyManualMatchModal({ visible, track, onClose, onMatch }: Props) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSongs();
      setSearchQuery(track?.name || '');
    }
  }, [visible, track]);

  const loadSongs = async () => {
    try {
      const repo = getSongRepository();
      const allSongs = await repo.getAllSongs();
      setSongs(allSongs);
    } catch (error) {
      console.error('Error loading songs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSongs = useMemo(() => {
    if (!searchQuery) return songs;
    const q = searchQuery.toLowerCase();
    return songs.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.artist.toLowerCase().includes(q)
    );
  }, [songs, searchQuery]);

  const handleSelect = async (songId: string) => {
    setIsMatching(true);
    try {
      await onMatch(songId);
    } finally {
      setIsMatching(false);
      onClose();
    }
  };

  const renderItem = ({ item }: { item: SongRow }) => (
    <Pressable style={styles.songItem} onPress={() => handleSelect(item.id)}>
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      <Text style={styles.selectText}>Select</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(16, insets.top) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Match Track</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        {track && (
          <View style={styles.trackInfo}>
            <Text style={styles.trackLabel}>Matching for:</Text>
            <Text style={styles.trackValue}>{track.name} - {track.artistNames.join(', ')}</Text>
          </View>
        )}

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Telegram songs..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>

        {isLoading || isMatching ? (
          <ActivityIndicator style={styles.loader} color="#22C55E" />
        ) : (
          <FlatList
            data={filteredSongs}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1E293B' },
  title: { fontSize: 18, fontWeight: '600', color: '#F8FAFC' },
  closeBtn: { padding: 4 },
  closeText: { color: '#22C55E', fontSize: 16 },
  trackInfo: { padding: 16, backgroundColor: '#1E293B80' },
  trackLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  trackValue: { fontSize: 14, color: '#F8FAFC', fontWeight: '500' },
  searchContainer: { padding: 16 },
  searchInput: { backgroundColor: '#1E293B', borderRadius: 8, padding: 12, color: '#F8FAFC', fontSize: 16 },
  loader: { marginTop: 32 },
  listContent: { paddingHorizontal: 16 },
  songItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1E293B' },
  songInfo: { flex: 1, marginRight: 12 },
  songTitle: { fontSize: 16, color: '#F8FAFC', marginBottom: 4 },
  songArtist: { fontSize: 14, color: '#94A3B8' },
  selectText: { color: '#22C55E', fontWeight: '600' }
});
