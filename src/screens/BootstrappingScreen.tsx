import { ActivityIndicator, Text, View } from "react-native";

import { Screen } from "../components/layout/Screen";

export function BootstrappingScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-4">
        <ActivityIndicator color="#22C55E" />
        <Text className="text-brand-muted">Restoring Telegram session...</Text>
      </View>
    </Screen>
  );
}
