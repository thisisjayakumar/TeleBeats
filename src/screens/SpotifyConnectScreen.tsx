import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  configureSpotifyAuth,
  getSpotifyAuthUrl,
  exchangeCodeForTokens,
  saveTokens,
  getValidAccessToken,
  clearTokens,
} from '../services/spotify/spotifyAuthService';
import { getSpotifyEnvConfig } from '../config/env';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SpotifyStackParamList } from '../navigation/AppNavigator';

type SpotifyConnectScreenProps = NativeStackScreenProps<SpotifyStackParamList, 'SpotifyConnect'>;

const REDIRECT_URI = 'telebeats://spotify-callback';

export function SpotifyConnectScreen({ navigation }: SpotifyConnectScreenProps) {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    configureSpotifyAuth(getSpotifyEnvConfig());
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    const token = await getValidAccessToken();
    if (token) {
      navigation.replace('SpotifyLibrary');
    }
  };

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const authUrl = getSpotifyAuthUrl();
      await Linking.openURL(authUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to open Spotify login');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    Alert.alert(
      'Disconnect Spotify',
      'This will remove your Spotify account from TeleBeats. You can reconnect anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await clearTokens();
            setIsLoading(false);
          },
        },
      ]
    );
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Connect Spotify</Text>
        <Text style={styles.subtitle}>
          Link your Spotify account to import playlists
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎵</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Your Playlists</Text>
            <Text style={styles.cardDescription}>
              Import your Spotify playlists and match them with your Telegram files
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎶</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Liked Songs</Text>
            <Text style={styles.cardDescription}>
              Sync your liked songs from Spotify
            </Text>
          </View>
        </View>

        <View style={[styles.card, styles.infoCard]}>
          <Text style={styles.infoText}>
            Only your playlist metadata is imported. Your music files stay on your Telegram
            server.
          </Text>
        </View>
      </View>

      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.button, isConnecting && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={isConnecting}
        >
          <Text style={styles.buttonText}>
            {isConnecting ? 'Opening Spotify...' : 'Connect Spotify'}
          </Text>
        </Pressable>

        <Pressable style={styles.disconnectButton} onPress={handleDisconnect}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22C55E20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardDescription: {
    fontSize: 14,
    color: '#94A3B8',
  },
  infoCard: {
    backgroundColor: '#1E293B80',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  button: {
    backgroundColor: '#22C55E',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0B1220',
  },
  disconnectButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  disconnectText: {
    fontSize: 14,
    color: '#EF4444',
  },
});