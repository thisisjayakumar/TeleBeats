import {
  executeTelegramAuthCall,
  getAuthErrorMessage,
  isRetryableTelegramAuthError,
} from "../telegramAuthExecutor";
import { TelegramTwoFactorRequiredError } from "../errors";

describe("telegramAuthExecutor", () => {
  it("marks 2FA-required error as non-retryable", () => {
    expect(isRetryableTelegramAuthError(new TelegramTwoFactorRequiredError())).toBe(
      false
    );
  });

  it("tracks retry telemetry and resolves on next attempt", async () => {
    const telemetry = { track: jest.fn() };
    const onRetryState = jest.fn();

    let calls = 0;
    const result = await executeTelegramAuthCall({
      action: "request_code",
      task: async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error("temporary failure");
        }
        return "ok";
      },
      telemetry,
      maxAttempts: 2,
      baseDelayMs: 0,
      onRetryState,
    });

    expect(result).toBe("ok");
    expect(telemetry.track).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "telegram_auth_retry",
      })
    );
  });

  it("returns default message for unknown errors", () => {
    expect(getAuthErrorMessage(null)).toBe("Unknown authentication error.");
  });
});
