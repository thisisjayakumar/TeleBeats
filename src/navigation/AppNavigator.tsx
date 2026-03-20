import { hasTelegramEnvConfig } from "../config/env";
import { useTelegramAuth } from "../features/auth";
import { PlayerProvider } from "../features/player";
import { BootstrappingScreen } from "../screens/BootstrappingScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { TelegramAuthScreen } from "../screens/TelegramAuthScreen";
import { TelegramConfigRequiredScreen } from "../screens/TelegramConfigRequiredScreen";
import { MiniPlayer } from "../components/player/MiniPlayer";
import { FullPlayerScreen } from "../components/player/FullPlayerScreen";
import type { TelegramSession } from "../services/telegram/telegramClient";

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
  return (
    <PlayerProvider session={session}>
      <HomeScreen onSignOut={onSignOut} session={session} />
      <MiniPlayer />
      <FullPlayerScreen />
    </PlayerProvider>
  );
}
