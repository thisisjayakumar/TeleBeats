import {
  clearTelegramSession,
  loadTelegramSession,
  saveTelegramSession,
} from "../sessionStorage";
import * as SecureStore from "expo-secure-store";

const secureStoreState = new Map<string, string>();

describe("sessionStorage", () => {
  beforeEach(() => {
    secureStoreState.clear();
    jest
      .spyOn(SecureStore, "getItemAsync")
      .mockImplementation(async (key: string) => secureStoreState.get(key) ?? null);
    jest
      .spyOn(SecureStore, "setItemAsync")
      .mockImplementation(async (key: string, value: string) => {
        secureStoreState.set(key, value);
      });
    jest.spyOn(SecureStore, "deleteItemAsync").mockImplementation(async (key: string) => {
      secureStoreState.delete(key);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("saves and loads telegram session", async () => {
    await saveTelegramSession({
      phone: "+919999999999",
      sessionString: "abc-session",
    });

    const restored = await loadTelegramSession();
    expect(restored).toEqual({
      phone: "+919999999999",
      sessionString: "abc-session",
    });
  });

  it("clears telegram session keys", async () => {
    await saveTelegramSession({
      phone: "+919999999999",
      sessionString: "abc-session",
    });
    await clearTelegramSession();

    const restored = await loadTelegramSession();
    expect(restored).toBeNull();
  });
});
