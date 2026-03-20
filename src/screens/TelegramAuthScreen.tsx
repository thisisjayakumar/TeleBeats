import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Screen } from "../components/layout/Screen";
import {
  AuthRetryState,
  AuthState,
  formatPhoneForDisplay,
  getDefaultCountryIso,
  normalizeCountryIso,
  parsePhoneToE164,
} from "../features/auth";

type TelegramAuthScreenProps = {
  authState: AuthState;
  onRequestCode: (phone: string) => Promise<void>;
  onVerifyCode: (code: string) => Promise<void>;
  onVerifyPassword: (password: string) => Promise<void>;
  onReset: () => void;
  retryState: AuthRetryState | null;
};

export function TelegramAuthScreen({
  authState,
  onRequestCode,
  onVerifyCode,
  onVerifyPassword,
  onReset,
  retryState,
}: TelegramAuthScreenProps) {
  const [countryIso, setCountryIso] = useState(getDefaultCountryIso());
  const [phoneInput, setPhoneInput] = useState(authState.phone);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const isCodeStep =
    authState.status === "code_sent" ||
    authState.status === "verifying" ||
    authState.status === "password_required" ||
    authState.status === "verifying_password";
  const isPasswordStep =
    authState.status === "password_required" || authState.status === "verifying_password";
  const isBusy =
    authState.status === "verifying" || authState.status === "verifying_password";

  const phonePlaceholder = useMemo(
    () => "Phone number (country inferred from ISO)",
    []
  );

  const retryMessage = useMemo(() => {
    if (!retryState) {
      return null;
    }

    return `Retrying ${retryState.action.replaceAll("_", " ")}... attempt ${
      retryState.attempt + 1
    }/${retryState.maxAttempts} in ${Math.ceil(retryState.nextDelayMs / 1000)}s`;
  }, [retryState]);

  return (
    <Screen>
      <View className="flex-1 justify-center gap-5">
        <Text className="text-3xl font-bold text-brand-text">Connect Telegram</Text>
        <Text className="text-base text-brand-muted">
          Day 3-4 login flow with OTP and session persistence.
        </Text>

        {authState.errorMessage || validationError ? (
          <View className="rounded-xl border border-red-500/40 bg-red-500/10 p-3">
            <Text className="text-red-200">{authState.errorMessage ?? validationError}</Text>
          </View>
        ) : null}

        {retryMessage ? (
          <View className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
            <Text className="text-amber-200">{retryMessage}</Text>
          </View>
        ) : null}

        {!isCodeStep ? (
          <>
            <View className="flex-row gap-3">
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                className="w-20 rounded-xl border border-slate-600 px-4 py-3 text-brand-text"
                maxLength={2}
                onChangeText={(value) => setCountryIso(normalizeCountryIso(value))}
                placeholder="ISO"
                placeholderTextColor="#64748B"
                value={countryIso}
              />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 rounded-xl border border-slate-600 px-4 py-3 text-brand-text"
                keyboardType="phone-pad"
                onChangeText={(value) =>
                  setPhoneInput(formatPhoneForDisplay(value, countryIso))
                }
                placeholder={phonePlaceholder}
                placeholderTextColor="#64748B"
                value={phoneInput}
              />
            </View>
            <Pressable
              className="rounded-xl bg-brand-primary px-4 py-3"
              onPress={() => {
                const parsed = parsePhoneToE164(phoneInput, countryIso);
                if (!parsed.ok) {
                  setValidationError(parsed.error);
                  return;
                }
                setValidationError(null);
                void onRequestCode(parsed.e164);
              }}
            >
              <Text className="text-center font-semibold text-slate-950">Send OTP</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-brand-muted">OTP sent to {authState.phone}</Text>
            {!isPasswordStep ? (
              <>
                <TextInput
                  className="rounded-xl border border-slate-600 px-4 py-3 text-brand-text"
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={setCode}
                  placeholder="Enter 5-6 digit OTP"
                  placeholderTextColor="#64748B"
                  value={code}
                />
                <Pressable
                  className="rounded-xl bg-brand-primary px-4 py-3"
                  disabled={isBusy}
                  onPress={() => void onVerifyCode(code)}
                >
                  <Text className="text-center font-semibold text-slate-950">
                    {isBusy ? "Verifying..." : "Verify OTP"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-brand-muted">
                  2FA password required
                  {authState.passwordHint ? ` (hint: ${authState.passwordHint})` : ""}
                </Text>
                <TextInput
                  className="rounded-xl border border-slate-600 px-4 py-3 text-brand-text"
                  onChangeText={setPassword}
                  placeholder="Enter Telegram 2FA password"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  value={password}
                />
                <Pressable
                  className="rounded-xl bg-brand-primary px-4 py-3"
                  disabled={isBusy}
                  onPress={() => void onVerifyPassword(password)}
                >
                  <Text className="text-center font-semibold text-slate-950">
                    {isBusy ? "Verifying password..." : "Submit 2FA Password"}
                  </Text>
                </Pressable>
              </>
            )}
            <Pressable
              className="rounded-xl border border-slate-600 px-4 py-3"
              onPress={() => {
                setValidationError(null);
                onReset();
              }}
            >
              <Text className="text-center font-semibold text-brand-text">
                Change phone number
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </Screen>
  );
}
