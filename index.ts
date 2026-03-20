import './shim';

import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

import App from './App';
import { PlaybackService } from './src/services/audio/playbackService';

// Register the TrackPlayer headless background service (must be at module root)
TrackPlayer.registerPlaybackService(() => PlaybackService);

registerRootComponent(App);

