import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { usePlayer, usePlaybackProgress } from '../../features/player';

const MINI_PLAYER_HEIGHT = 72;

export const MINI_PLAYER_HEIGHT_EXPORTED = MINI_PLAYER_HEIGHT;

export function MiniPlayer() {
  const {
    currentSong,
    isPlaying,
    isLoading,
    togglePlayPause,
    skipToNext,
    openPlayer,
  } = usePlayer();

  const { progressFraction } = usePlaybackProgress();
  const translateY = useSharedValue(MINI_PLAYER_HEIGHT + 20);

  useEffect(() => {
    if (currentSong) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 160 });
    } else {
      translateY.value = withSpring(MINI_PLAYER_HEIGHT + 20, { damping: 18, stiffness: 160 });
    }
  }, [currentSong, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!currentSong) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Progress bar at top of mini player */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressFraction * 100}%` }]} />
      </View>

      <Pressable style={styles.body} onPress={openPlayer} android_ripple={{ color: '#FFFFFF10' }}>
        {/* Artwork placeholder */}
        <View style={styles.artwork}>
          <Text style={styles.artworkIcon}>🎵</Text>
        </View>

        {/* Song info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {isLoading ? (
            <ActivityIndicator color="#22C55E" size="small" />
          ) : (
            <Pressable style={styles.iconBtn} onPress={togglePlayPause} hitSlop={12}>
              <Text style={styles.icon}>{isPlaying ? '⏸' : '▶️'}</Text>
            </Pressable>
          )}
          <Pressable style={styles.iconBtn} onPress={skipToNext} hitSlop={12}>
            <Text style={styles.icon}>⏭</Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MINI_PLAYER_HEIGHT,
    backgroundColor: '#1E293B',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#334155',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  progressBar: {
    height: 2,
    backgroundColor: '#334155',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#22C55E',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkIcon: { fontSize: 22 },
  info: { flex: 1 },
  title: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  artist: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 8 },
  icon: { fontSize: 20 },
});
