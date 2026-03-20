import { TelemetryClient } from "../telemetry/telemetry";
import { retryWithBackoff } from "../../utils/retryWithBackoff";
import { TelegramTwoFactorRequiredError } from "./errors";

export type TelegramAuthAction = "request_code" | "verify_code" | "verify_password";

export type TelegramAuthRetryState = {
  action: TelegramAuthAction;
  attempt: number;
  maxAttempts: number;
  nextDelayMs: number;
};

type ExecuteTelegramAuthCallOptions<T> = {
  action: TelegramAuthAction;
  task: () => Promise<T>;
  telemetry: TelemetryClient;
  maxAttempts: number;
  baseDelayMs: number;
  onRetryState: (state: TelegramAuthRetryState | null) => void;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown authentication error.";
}

export function isRetryableTelegramAuthError(error: unknown): boolean {
  if (error instanceof TelegramTwoFactorRequiredError) {
    return false;
  }

  const message = getAuthErrorMessage(error).toUpperCase();
  if (
    message.includes("PASSWORD_HASH_INVALID") ||
    message.includes("PHONE_CODE_INVALID") ||
    message.includes("PHONE_NUMBER_INVALID") ||
    message.includes("FLOOD_WAIT")
  ) {
    return false;
  }

  return true;
}

export async function executeTelegramAuthCall<T>({
  action,
  task,
  telemetry,
  maxAttempts,
  baseDelayMs,
  onRetryState,
  shouldRetry = isRetryableTelegramAuthError,
}: ExecuteTelegramAuthCallOptions<T>): Promise<T> {
  onRetryState(null);
  return retryWithBackoff<T>({
    task,
    maxAttempts,
    baseDelayMs,
    shouldRetry,
    onRetry: ({ attempt, maxAttempts: retryMax, nextDelayMs, error }) => {
      telemetry.track({
        name: "telegram_auth_retry",
        attributes: {
          action,
          attempt,
          max_attempts: retryMax,
          delay_ms: nextDelayMs,
          error: getAuthErrorMessage(error),
        },
      });
      onRetryState({ action, attempt, maxAttempts: retryMax, nextDelayMs });
    },
  });
}
