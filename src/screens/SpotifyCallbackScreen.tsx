import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  configureSpotifyAuth,
  exchangeCodeForTokens,
  saveTokens,
} from '../services/spotify/spotifyAuthService';
import { getSpotifyEnvConfig } from '../config/env';

export function SpotifyCallbackScreen() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const url = await Linking.getInitialURL();
      if (!url) {
        setStatus('error');
        setErrorMessage('No URL found');
        return;
      }

      const parsedUrl = new URL(url);
      const code = parsedUrl.searchParams.get('code');
      const error = parsedUrl.searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(error);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code');
        return;
      }

      configureSpotifyAuth(getSpotifyEnvConfig());
      const tokens = await exchangeCodeForTokens(code);
      await saveTokens(tokens);

      setStatus('success');

      setTimeout(() => {
        Linking.openURL('telebeats://');
      }, 1000);
    } catch (err) {
      console.error('Callback error:', err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {status === 'processing' && (
          <>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.text}>Connecting to Spotify...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Text style={styles.icon}>✅</Text>
            <Text style={styles.text}>Connected successfully!</Text>
            <Text style={styles.subtext}>Redirecting...</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <Text style={styles.icon}>❌</Text>
            <Text style={styles.text}>Connection failed</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginTop: 16,
  },
  subtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
    textAlign: 'center',
  },
});