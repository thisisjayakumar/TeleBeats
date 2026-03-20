import { act, renderHook, waitFor } from "@testing-library/react-native";

import { TelemetryClient } from "../../../services/telemetry/telemetry";
import { TelegramTwoFactorRequiredError } from "../../../services/telegram/errors";
import type { TelegramAuthGateway } from "../../../services/telegram";
import { useTelegramAuth } from "..";

jest.mock("../../../services/telegram", () => ({
  ...jest.requireActual("../../../services/telegram/telegramAuthExecutor"),
  ...jest.requireActual("../../../services/telegram/errors"),
  createTelegramAuthGateway: jest.fn(),
}));

type MockGateway = jest.Mocked<TelegramAuthGateway>;

function createMockGateway(): MockGateway {
  return {
    requestCode: jest.fn(),
    restoreSession: jest.fn(),
    signOut: jest.fn(),
    verifyCode: jest.fn(),
    verifyPassword: jest.fn(),
  };
}

describe("useTelegramAuth integration", () => {
  it("handles OTP -> 2FA password continuation -> signed in", async () => {
    const gateway = createMockGateway();
    gateway.requestCode.mockResolvedValue({
      phone: "+919876543210",
      phoneCodeHash: "hash-123",
    });
    gateway.verifyCode.mockRejectedValue(
      new TelegramTwoFactorRequiredError("pet name")
    );
    gateway.verifyPassword.mockResolvedValue({ sessionString: "session-xyz" });

    const storage = {
      load: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    const options = {
      hasConfig: true,
      gateway,
      storage,
    };

    const { result } = renderHook(() => useTelegramAuth(options));

    await waitFor(() => expect(result.current.state.status).toBe("signed_out"));

    await act(async () => {
      await result.current.requestCode("+919876543210");
    });
    await waitFor(() => expect(result.current.state.status).toBe("code_sent"));

    await act(async () => {
      await result.current.verifyCode("12345");
    });
    await waitFor(() => expect(result.current.state.status).toBe("password_required"));
    expect(result.current.state.passwordHint).toBe("pet name");

    await act(async () => {
      await result.current.verifyPassword("secret-2fa");
    });
    await waitFor(() => expect(result.current.state.status).toBe("signed_in"));
    expect(storage.save).toHaveBeenCalledWith({
      phone: "+919876543210",
      sessionString: "session-xyz",
    });
  });

  it("retries failed requests and emits telemetry retry events", async () => {
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0);
    const gateway = createMockGateway();
    gateway.requestCode
      .mockRejectedValueOnce(new Error("temporary network issue"))
      .mockResolvedValue({
        phone: "+14155552671",
        phoneCodeHash: "hash-retry",
      });

    const telemetry: TelemetryClient = {
      track: jest.fn(),
    };
    const storage = {
      load: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    const options = {
      hasConfig: true,
      gateway,
      storage,
      telemetry,
      retry: { maxAttempts: 2, baseDelayMs: 0 },
    };

    const { result } = renderHook(() => useTelegramAuth(options));

    await waitFor(() => expect(result.current.state.status).toBe("signed_out"));
    await act(async () => {
      await result.current.requestCode("+14155552671");
    });

    expect(gateway.requestCode).toHaveBeenCalledTimes(2);
    expect(telemetry.track).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "telegram_auth_retry",
        attributes: expect.objectContaining({
          action: "request_code",
          attempt: 1,
        }),
      })
    );
    randomSpy.mockRestore();
  });
});
