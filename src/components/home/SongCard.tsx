import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SongRow } from '../../db/schema';

type Props = {
  song: SongRow;
  onPress: (song: SongRow) => void;
  thumbnailBase64?: string | null;
  width?: number;
};

export function SongCard({ song, onPress, thumbnailBase64, width = 140 }: Props) {
  const uri = thumbnailBase64 ? `data:image/jpeg;base64,${thumbnailBase64}` : null;
  return (
    <Pressable style={[styles.container, { width }]} onPress={() => onPress(song)} android_ripple={{ color: '#FFFFFF10' }}>
      <View style={styles.artwork}>
        {uri ? (
          <Image source={{ uri }} style={styles.artworkImg} />
        ) : (
          <View style={[styles.artworkImg, styles.artworkPlaceholder]}>
            <Text style={{ fontSize: 28 }}>🎵</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
      <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingRight: 12,
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: 8,
  },
  artworkImg: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  artworkPlaceholder: {
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  artist: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
});

