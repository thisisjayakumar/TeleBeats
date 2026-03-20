export type TelegramEnvConfig = {
  apiId: number;
  apiHash: string;
};

const CHANNEL_LIST_SEPARATOR = ",";

export function hasTelegramEnvConfig(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_TELEGRAM_API_ID &&
      process.env.EXPO_PUBLIC_TELEGRAM_API_HASH
  );
}

export function getTelegramEnvConfig(): TelegramEnvConfig {
  const telegramApiId = process.env.EXPO_PUBLIC_TELEGRAM_API_ID;
  const telegramApiHash = process.env.EXPO_PUBLIC_TELEGRAM_API_HASH;

  if (!telegramApiId || !telegramApiHash) {
    throw new Error(
      "Missing EXPO_PUBLIC_TELEGRAM_API_ID or EXPO_PUBLIC_TELEGRAM_API_HASH."
    );
  }

  const apiId = Number.parseInt(telegramApiId, 10);
  if (!Number.isFinite(apiId)) {
    throw new Error("EXPO_PUBLIC_TELEGRAM_API_ID must be a valid integer.");
  }

  return {
    apiId,
    apiHash: telegramApiHash,
  };
}

export function getTelegramChannelTargets(): string[] {
  const raw = process.env.EXPO_PUBLIC_TELEGRAM_CHANNELS;
  if (!raw) {
    return [];
  }

  return raw
    .split(CHANNEL_LIST_SEPARATOR)
    .map((entry: string) => entry.trim())
    .filter((entry: string) => entry.length > 0);
}
