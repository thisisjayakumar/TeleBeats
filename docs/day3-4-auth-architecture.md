# TeleBeats Day 3-4 Architecture

## Scope

- Telegram OTP authentication using GramJS.
- Local session persistence across app restarts.
- Lightweight UI/state pattern that is easy to extend.

## Design Choices

- **Gateway pattern**: `TelegramAuthGateway` hides vendor-specific details and keeps UI independent from GramJS.
- **Reducer-driven auth state**: deterministic state transitions with simple action types.
- **Secure storage**: `expo-secure-store` stores Telegram session string and phone using minimal footprint.
- **Progressive UX**: bootstrapping screen, config guard screen, OTP screen, signed-in screen.

## Flow

1. App boot checks env vars (`EXPO_PUBLIC_TELEGRAM_API_ID`, `EXPO_PUBLIC_TELEGRAM_API_HASH`).
2. `useTelegramAuth` loads stored session.
3. Gateway validates stored session with Telegram.
4. If no valid session, user enters phone number and requests OTP.
5. User enters OTP and app verifies with Telegram.
6. Session string is persisted in secure storage.

## Why this scales

- Swapping auth backend needs only a new gateway implementation.
- Reducer actions are test-friendly and suitable for future analytics hooks.
- Session layer is isolated and can later migrate to MMKV without touching UI.
