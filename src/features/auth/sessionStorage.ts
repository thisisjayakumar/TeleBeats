import * as SecureStore from "expo-secure-store";

import { TelegramSession } from "../../services/telegram";

const TELEGRAM_SESSION_KEY = "telebeats.telegram.session.v1";
const TELEGRAM_PHONE_KEY = "telebeats.telegram.phone.v1";

export async function loadTelegramSession(): Promise<TelegramSession | null> {
  const [sessionString, phone] = await Promise.all([
    SecureStore.getItemAsync(TELEGRAM_SESSION_KEY),
    SecureStore.getItemAsync(TELEGRAM_PHONE_KEY),
  ]);

  if (!sessionString || !phone) {
    return null;
  }

  return {
    sessionString,
    phone,
  };
}

export async function saveTelegramSession(session: TelegramSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TELEGRAM_SESSION_KEY, session.sessionString),
    SecureStore.setItemAsync(TELEGRAM_PHONE_KEY, session.phone),
  ]);
}

export async function clearTelegramSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TELEGRAM_SESSION_KEY),
    SecureStore.deleteItemAsync(TELEGRAM_PHONE_KEY),
  ]);
}
