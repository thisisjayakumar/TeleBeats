import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/layout/Screen';

export function LibraryScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.sub}>Coming soon: Liked Songs, Playlists, Channels</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { color: '#F8FAFC', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#94A3B8' },
});

