import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/layout/Screen';
import type { TelegramSession } from '../services/telegram/telegramClient';

export function ProfileScreen({ session, onSignOut }: { session: TelegramSession; onSignOut: () => Promise<void> }) {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.row}>Phone: <Text style={styles.mono}>{session.phone}</Text></Text>
        <Pressable style={styles.signOut} onPress={() => void onSignOut()}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { color: '#F8FAFC', fontSize: 20, fontWeight: '700' },
  row: { color: '#94A3B8' },
  mono: { color: '#F8FAFC', fontFamily: 'System' },
  signOut: { backgroundColor: '#1E293B', paddingVertical: 10, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  signOutText: { color: '#22C55E', fontWeight: '700' },
});

