import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';

type SeekBarProps = {
  positionSec: number;
  durationSec: number;
  onSeek: (positionSec: number) => void;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SeekBar({ positionSec, durationSec, onSeek }: SeekBarProps) {
  const isSeeking = useSharedValue(false);
  const seekFraction = useSharedValue(0);
  const containerWidth = useSharedValue(0);

  const fraction = isSeeking.value
    ? seekFraction.value
    : durationSec > 0
      ? positionSec / durationSec
      : 0;

  const handleSeek = useCallback(
    (frac: number) => {
      onSeek(frac * durationSec);
    },
    [durationSec, onSeek]
  );

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      isSeeking.value = true;
    })
    .onUpdate((e) => {
      if (containerWidth.value > 0) {
        seekFraction.value = Math.max(0, Math.min(1, e.x / containerWidth.value));
      }
    })
    .onEnd(() => {
      isSeeking.value = false;
      runOnJS(handleSeek)(seekFraction.value);
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    if (containerWidth.value > 0) {
      runOnJS(handleSeek)(e.x / containerWidth.value);
    }
  });

  const progressStyle = useAnimatedStyle(() => ({
    width: `${fraction * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <GestureHandlerRootView style={styles.trackContainer}>
        <View
          style={styles.track}
          onLayout={(e) => {
            containerWidth.value = e.nativeEvent.layout.width;
          }}
        >
          <GestureDetector gesture={Gesture.Race(panGesture, tapGesture)}>
            <View style={styles.touchArea}>
              <View style={styles.trackBg} />
              <Animated.View style={[styles.trackFill, progressStyle]} />
              <Animated.View
                style={[
                  styles.thumb,
                  useAnimatedStyle(() => ({
                    left: `${fraction * 100}%`,
                  })),
                ]}
              />
            </View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
      <View style={styles.labels}>
        <Text style={styles.time}>{formatTime(positionSec)}</Text>
        <Text style={styles.time}>{formatTime(durationSec)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  trackContainer: { width: '100%', paddingVertical: 12 },
  track: { width: '100%', height: 4, position: 'relative' },
  touchArea: {
    position: 'absolute',
    top: -14,
    bottom: -14,
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  trackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    position: 'absolute',
    left: 0,
    right: 0,
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22C55E',
    position: 'absolute',
    left: 0,
  },
  thumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F8FAFC',
    position: 'absolute',
    marginLeft: -7,
    top: -5,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  time: { fontSize: 12, color: '#94A3B8' },
});
