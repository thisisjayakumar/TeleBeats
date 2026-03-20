import { Text, View } from "react-native";

import { Screen } from "../components/layout/Screen";

export function TelegramConfigRequiredScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-3">
        <Text className="text-center text-2xl font-bold text-brand-text">
          Telegram Config Missing
        </Text>
        <Text className="text-center text-brand-muted">
          Set EXPO_PUBLIC_TELEGRAM_API_ID and EXPO_PUBLIC_TELEGRAM_API_HASH in your
          environment, then restart Expo.
        </Text>
      </View>
    </Screen>
  );
}
