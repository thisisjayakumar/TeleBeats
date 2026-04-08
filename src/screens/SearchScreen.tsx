import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { useSearch } from '../features/search/useSearch';
import type { SongRow } from '../db/schema';
import { usePlayer } from '../features/player';

export default function SearchScreen() {
  const { query, setQuery, isLoading, results } = useSearch();
  const { playSong } = usePlayer();

  const onPressSong = useCallback(
    (song: SongRow) => {
      void playSong(song, results);
    },
    [playSong, results]
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Search songs, artists, channels..."
          placeholderTextColor="#64748B"
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#22C55E" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onPressSong(item)} android_ripple={{ color: '#FFFFFF10' }}>
              <View style={styles.thumb}><Text style={{ fontSize: 20 }}>🎵</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{item.artist} • {item.channelTitle}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>Type to search your library</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { color: '#F8FAFC', fontSize: 20, fontWeight: '700' },
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  input: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#334155',
  },
  center: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '600' },
  rowSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  empty: { color: '#94A3B8' },
});

