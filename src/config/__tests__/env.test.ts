import {
  getTelegramChannelTargets,
  getTelegramEnvConfig,
  hasTelegramEnvConfig,
} from "../env";

describe("Telegram env config", () => {
  const originalApiId = process.env.EXPO_PUBLIC_TELEGRAM_API_ID;
  const originalApiHash = process.env.EXPO_PUBLIC_TELEGRAM_API_HASH;
  const originalChannels = process.env.EXPO_PUBLIC_TELEGRAM_CHANNELS;

  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_TELEGRAM_API_ID;
    delete process.env.EXPO_PUBLIC_TELEGRAM_API_HASH;
    delete process.env.EXPO_PUBLIC_TELEGRAM_CHANNELS;
  });

  afterAll(() => {
    if (originalApiId) {
      process.env.EXPO_PUBLIC_TELEGRAM_API_ID = originalApiId;
    } else {
      delete process.env.EXPO_PUBLIC_TELEGRAM_API_ID;
    }

    if (originalApiHash) {
      process.env.EXPO_PUBLIC_TELEGRAM_API_HASH = originalApiHash;
    } else {
      delete process.env.EXPO_PUBLIC_TELEGRAM_API_HASH;
    }

    if (originalChannels) {
      process.env.EXPO_PUBLIC_TELEGRAM_CHANNELS = originalChannels;
    } else {
      delete process.env.EXPO_PUBLIC_TELEGRAM_CHANNELS;
    }
  });

  it("returns true when required Telegram env vars are present", () => {
    process.env.EXPO_PUBLIC_TELEGRAM_API_ID = "12345";
    process.env.EXPO_PUBLIC_TELEGRAM_API_HASH = "abcd123";

    expect(hasTelegramEnvConfig()).toBe(true);
    expect(getTelegramEnvConfig()).toEqual({ apiId: 12345, apiHash: "abcd123" });
  });

  it("throws when api id is invalid", () => {
    process.env.EXPO_PUBLIC_TELEGRAM_API_ID = "abc";
    process.env.EXPO_PUBLIC_TELEGRAM_API_HASH = "abcd123";

    expect(() => getTelegramEnvConfig()).toThrow(
      "EXPO_PUBLIC_TELEGRAM_API_ID must be a valid integer."
    );
  });

  it("parses comma-separated channel list", () => {
    process.env.EXPO_PUBLIC_TELEGRAM_CHANNELS = "channelA, @channelB , ,channelC";

    expect(getTelegramChannelTargets()).toEqual([
      "channelA",
      "@channelB",
      "channelC",
    ]);
  });
});
