import { ReactNode } from "react";
import { View } from "react-native";

type ScreenProps = {
  children: ReactNode;
};

export function Screen({ children }: ScreenProps) {
  return <View className="flex-1 bg-brand-background px-6">{children}</View>;
}
