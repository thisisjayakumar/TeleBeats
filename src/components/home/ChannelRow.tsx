import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { SongRow } from '../../db/schema';
import { SongCard } from './SongCard';

type Props = {
  title: string;
  songs: SongRow[];
  onPressSong: (song: SongRow, all: SongRow[]) => void;
};

export function ChannelRow({ title, songs, onPressSong }: Props) {
  if (songs.length === 0) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={songs}
        keyExtractor={(s) => s.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <SongCard song={item} onPress={(song) => onPressSong(song, songs)} thumbnailBase64={null} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16, marginBottom: 8 },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});

