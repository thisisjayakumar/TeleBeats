import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import { RepeatMode } from 'react-native-track-player';

import { usePlayer, usePlaybackProgress } from '../../features/player';
import { SeekBar } from './SeekBar';

export function FullPlayerScreen() {
  const {
    currentSong,
    isPlaying,
    isLoading,
    isPlayerVisible,
    shuffleEnabled,
    repeatMode,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    seekTo,
    toggleShuffle,
    cycleRepeatMode,
    closePlayer,
  } = usePlayer();

  const { positionSec, durationSec } = usePlaybackProgress();
  const insets = useSafeAreaInsets();

  if (!isPlayerVisible || !currentSong) return null;

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={isPlayerVisible} onRequestClose={closePlayer}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={closePlayer} hitSlop={20}>
            <Text style={styles.iconButton}>🔽</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <View style={{ width: 24 }} /> {/* Balance spacer */}
        </View>

        {/* Artwork */}
        <View style={styles.artworkContainer}>
          <View style={styles.artwork}>
            <Text style={styles.artworkIcon}>🎵</Text>
          </View>
        </View>

        {/* Title / Artist / Like */}
        <View style={styles.infoRow}>
          <View style={styles.infoText}>
            <Text style={styles.title} numberOfLines={1}>
              {currentSong.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>
          <Pressable hitSlop={10}>
            <Text style={styles.iconButton}>🤍</Text>
          </Pressable>
        </View>

        {/* Seek Bar */}
        <View style={styles.seekContainer}>
          <SeekBar positionSec={positionSec} durationSec={durationSec} onSeek={seekTo} />
        </View>

        {/* Playback Controls */}
        <View style={styles.controlsRow}>
          <Pressable onPress={toggleShuffle} hitSlop={15}>
            <Text style={[styles.controlIcon, shuffleEnabled && styles.activeControl]}>🔀</Text>
          </Pressable>
          
          <View style={styles.centerControls}>
            <Pressable onPress={skipToPrevious} hitSlop={15}>
              <Text style={styles.controlIconLg}>⏮</Text>
            </Pressable>
            
            <Pressable onPress={togglePlayPause} style={styles.playPauseBtn}>
              {isLoading ? (
                <ActivityIndicator color="#0F172A" size="large" />
              ) : (
                <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
              )}
            </Pressable>

            <Pressable onPress={skipToNext} hitSlop={15}>
              <Text style={styles.controlIconLg}>⏭</Text>
            </Pressable>
          </View>

          <Pressable onPress={cycleRepeatMode} hitSlop={15}>
            <Text style={[styles.controlIcon, repeatMode !== RepeatMode.Off && styles.activeControl]}>
              {repeatMode === RepeatMode.Track ? '🔂' : '🔁'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  iconButton: { fontSize: 24 },
  artworkContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  artworkIcon: { fontSize: 80 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  infoText: { flex: 1, paddingRight: 16 },
  title: { color: '#F8FAFC', fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  artist: { color: '#94A3B8', fontSize: 18 },
  seekContainer: { marginBottom: 32 },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 48,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  controlIcon: { fontSize: 24, opacity: 0.5 },
  activeControl: { opacity: 1 },
  controlIconLg: { fontSize: 36, color: '#F8FAFC' },
  playPauseBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 32, marginLeft: 4 }, // align play triangle
});
