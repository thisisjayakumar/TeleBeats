import { hasTelegramEnvConfig, hasSpotifyEnvConfig } from "../config/env";
import { useTelegramAuth } from "../features/auth";
import { PlayerProvider } from "../features/player";
import { BootstrappingScreen } from "../screens/BootstrappingScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { TelegramAuthScreen } from "../screens/TelegramAuthScreen";
import { TelegramConfigRequiredScreen } from "../screens/TelegramConfigRequiredScreen";
import { MiniPlayer } from "../components/player/MiniPlayer";
import { FullPlayerScreen } from "../components/player/FullPlayerScreen";
import type { TelegramSession } from "../services/telegram/telegramClient";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import SearchScreen from "../screens/SearchScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { SpotifyConnectScreen } from "../screens/SpotifyConnectScreen";
import { SpotifyLibraryScreen } from "../screens/SpotifyLibraryScreen";
import { SpotifyPlaylistDetailScreen } from "../screens/SpotifyPlaylistDetailScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

export type SpotifyStackParamList = {
  SpotifyConnect: undefined;
  SpotifyLibrary: undefined;
  SpotifyPlaylistDetail: { playlistId: string; playlistName: string };
};

const SpotifyStack = createNativeStackNavigator<SpotifyStackParamList>();
const Tab = createBottomTabNavigator();

function SpotifyNavigator() {
  return (
    <SpotifyStack.Navigator screenOptions={{ headerShown: false }}>
      <SpotifyStack.Screen name="SpotifyConnect" component={SpotifyConnectScreen} />
      <SpotifyStack.Screen name="SpotifyLibrary" component={SpotifyLibraryScreen} />
      <SpotifyStack.Screen name="SpotifyPlaylistDetail" component={SpotifyPlaylistDetailScreen} />
    </SpotifyStack.Navigator>
  );
}

export function AppNavigator() {
  const auth = useTelegramAuth();
  const hasConfig = hasTelegramEnvConfig();

  if (!hasConfig) {
    return <TelegramConfigRequiredScreen />;
  }

  if (auth.state.status === "bootstrapping") {
    return <BootstrappingScreen />;
  }

  if (auth.state.status === "signed_in" && auth.state.session) {
    return <AuthenticatedApp session={auth.state.session} onSignOut={auth.signOut} />;
  }

  return (
    <TelegramAuthScreen
      authState={auth.state}
      onRequestCode={auth.requestCode}
      onReset={auth.resetToSignedOut}
      onVerifyCode={auth.verifyCode}
      onVerifyPassword={auth.verifyPassword}
      retryState={auth.retryState}
    />
  );
}

function AuthenticatedApp({
  session,
  onSignOut,
}: {
  session: TelegramSession;
  onSignOut: () => Promise<void>;
}) {
  const hasSpotify = hasSpotifyEnvConfig();

  return (
    <PlayerProvider session={session}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#0B1220', borderTopColor: '#122033' },
          tabBarActiveTintColor: '#22C55E',
          tabBarInactiveTintColor: '#94A3B8',
        }}
      >
        <Tab.Screen name="Home">
          {() => <HomeScreen onSignOut={onSignOut} session={session} />}
        </Tab.Screen>
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="Library" component={LibraryScreen} />
        {hasSpotify && (
          <Tab.Screen name="Spotify" component={SpotifyNavigator} />
        )}
        <Tab.Screen name="Profile">
          {() => <ProfileScreen session={session} onSignOut={onSignOut} />}
        </Tab.Screen>
      </Tab.Navigator>
      <MiniPlayer />
      <FullPlayerScreen />
    </PlayerProvider>
  );
}
