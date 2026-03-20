import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import { getTelegramEnvConfig, hasTelegramEnvConfig } from "../../config/env";
import {
  createTelegramAuthGateway,
  executeTelegramAuthCall,
  getAuthErrorMessage,
  isRetryableTelegramAuthError,
  TelegramAuthGateway,
  TelegramSession,
  TelegramAuthRetryState,
  TelegramTwoFactorRequiredError,
} from "../../services/telegram";
import {
  getTelemetryClient,
  TelemetryClient,
} from "../../services/telemetry/telemetry";
import { authReducer, initialAuthState } from "./authReducer";
import {
  clearTelegramSession,
  loadTelegramSession,
  saveTelegramSession,
} from "./sessionStorage";

export type AuthRetryState = {
  action: TelegramAuthRetryState["action"];
  attempt: TelegramAuthRetryState["attempt"];
  maxAttempts: TelegramAuthRetryState["maxAttempts"];
  nextDelayMs: TelegramAuthRetryState["nextDelayMs"];
};

export type SessionStorageAdapter = {
  load: () => Promise<TelegramSession | null>;
  save: (session: TelegramSession) => Promise<void>;
  clear: () => Promise<void>;
};

type UseTelegramAuthOptions = {
  hasConfig?: boolean;
  gateway?: TelegramAuthGateway | null;
  storage?: SessionStorageAdapter;
  telemetry?: TelemetryClient;
  retry?: {
    maxAttempts?: number;
    baseDelayMs?: number;
  };
};

const defaultSessionStorageAdapter: SessionStorageAdapter = {
  load: loadTelegramSession,
  save: saveTelegramSession,
  clear: clearTelegramSession,
};

export function useTelegramAuth(options?: UseTelegramAuthOptions) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const [retryState, setRetryState] = useState<AuthRetryState | null>(null);
  const hasConfig = options?.hasConfig ?? hasTelegramEnvConfig();
  const maxAttempts = options?.retry?.maxAttempts ?? 3;
  const baseDelayMs = options?.retry?.baseDelayMs ?? 500;
  const telemetry = options?.telemetry ?? getTelemetryClient();
  const storage = options?.storage ?? defaultSessionStorageAdapter;

  const gateway = useMemo<TelegramAuthGateway | null>(() => {
    if (options?.gateway !== undefined) {
      return options.gateway;
    }

    if (!hasConfig) {
      return null;
    }

    const env = getTelegramEnvConfig();
    return createTelegramAuthGateway(env);
  }, [hasConfig, options?.gateway]);

  const executeWithRetry = useCallback(
    async <T,>(
      action: AuthRetryState["action"],
      task: () => Promise<T>,
      shouldRetry = isRetryableTelegramAuthError
    ): Promise<T> => {
      return executeTelegramAuthCall<T>({
        action,
        task,
        telemetry,
        maxAttempts,
        baseDelayMs,
        shouldRetry,
        onRetryState: setRetryState,
      });
    },
    [baseDelayMs, maxAttempts, telemetry]
  );

  const bootstrap = useCallback(async () => {
    dispatch({ type: "BOOTSTRAP_START" });
    if (!gateway) {
      dispatch({ type: "BOOTSTRAP_SIGNED_OUT" });
      return;
    }
    try {
      const stored = await storage.load();
      if (!stored) {
        dispatch({ type: "BOOTSTRAP_SIGNED_OUT" });
        return;
      }

      const isAuthorized = await gateway.restoreSession(stored);
      if (!isAuthorized) {
        await storage.clear();
        dispatch({ type: "BOOTSTRAP_SIGNED_OUT" });
        return;
      }

      dispatch({ type: "BOOTSTRAP_SIGNED_IN", payload: stored });
    } catch (error) {
      await storage.clear();
      dispatch({ type: "AUTH_ERROR", payload: getAuthErrorMessage(error) });
    }
  }, [gateway, storage]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const requestCode = useCallback(
    async (phone: string) => {
      if (!gateway) {
        dispatch({
          type: "AUTH_ERROR",
          payload: "Telegram env config is missing.",
        });
        return;
      }
      try {
        const response = await executeWithRetry(
          "request_code",
          () =>
          gateway.requestCode({ phone })
        );
        dispatch({ type: "REQUEST_CODE_SUCCESS", payload: response });
      } catch (error) {
        dispatch({ type: "AUTH_ERROR", payload: getAuthErrorMessage(error) });
      } finally {
        setRetryState(null);
      }
    },
    [executeWithRetry, gateway]
  );

  const verifyCode = useCallback(
    async (code: string) => {
      if (!gateway) {
        dispatch({
          type: "AUTH_ERROR",
          payload: "Telegram env config is missing.",
        });
        return;
      }
      if (!state.phoneCodeHash || !state.phone) {
        dispatch({
          type: "AUTH_ERROR",
          payload: "Request OTP before entering verification code.",
        });
        return;
      }

      dispatch({ type: "VERIFY_CODE_START" });
      try {
        const response = await executeWithRetry(
          "verify_code",
          () =>
            gateway.verifyCode({
              phone: state.phone,
              code,
              phoneCodeHash: state.phoneCodeHash!,
            }),
          (error) => !(error instanceof TelegramTwoFactorRequiredError)
        );
        const session: TelegramSession = {
          sessionString: response.sessionString,
          phone: response.phone,
        };
        await storage.save(session);
        dispatch({ type: "VERIFY_CODE_SUCCESS", payload: session });
      } catch (error) {
        if (error instanceof TelegramTwoFactorRequiredError) {
          dispatch({
            type: "PASSWORD_REQUIRED",
            payload: { hint: error.hint ?? null },
          });
          return;
        }
        dispatch({ type: "AUTH_ERROR", payload: getAuthErrorMessage(error) });
      } finally {
        setRetryState(null);
      }
    },
    [executeWithRetry, gateway, state.phone, state.phoneCodeHash, storage]
  );

  const verifyPassword = useCallback(
    async (password: string) => {
      if (!gateway) {
        dispatch({
          type: "AUTH_ERROR",
          payload: "Telegram env config is missing.",
        });
        return;
      }

      if (!state.phone) {
        dispatch({
          type: "AUTH_ERROR",
          payload: "Missing phone context. Restart sign-in.",
        });
        return;
      }

      dispatch({ type: "VERIFY_PASSWORD_START" });
      try {
        const response = await executeWithRetry("verify_password", () =>
          gateway.verifyPassword({ password })
        );
        const session: TelegramSession = {
          sessionString: response.sessionString,
          phone: state.phone,
        };
        await storage.save(session);
        dispatch({ type: "VERIFY_CODE_SUCCESS", payload: session });
      } catch (error) {
        dispatch({ type: "AUTH_ERROR", payload: getAuthErrorMessage(error) });
      } finally {
        setRetryState(null);
      }
    },
    [executeWithRetry, gateway, state.phone, storage]
  );

  const signOut = useCallback(async () => {
    if (!gateway) {
      dispatch({ type: "RESET_TO_SIGNED_OUT" });
      return;
    }
    try {
      await gateway.signOut();
    } catch {
      // Ignore network failures on logout and clear local session anyway.
    } finally {
      await storage.clear();
      dispatch({ type: "RESET_TO_SIGNED_OUT" });
    }
  }, [gateway, storage]);

  const resetToSignedOut = useCallback(() => {
    dispatch({ type: "RESET_TO_SIGNED_OUT" });
  }, []);

  return {
    state,
    requestCode,
    verifyCode,
    verifyPassword,
    signOut,
    resetToSignedOut,
    retryBootstrap: bootstrap,
    retryState,
  };
}
