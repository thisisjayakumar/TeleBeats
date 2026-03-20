import * as Localization from "expo-localization";

import {
  formatPhoneForDisplay,
  getDefaultCountryIso,
  normalizeCountryIso,
  parsePhoneToE164,
} from "../phoneNumber";

describe("phoneNumber", () => {
  beforeEach(() => {
    jest.spyOn(Localization, "getLocales").mockReturnValue([
      { regionCode: "IN" } as Localization.Locale,
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("detects default country from locale", () => {
    expect(getDefaultCountryIso()).toBe("IN");
  });

  it("normalizes unsupported country to fallback", () => {
    expect(normalizeCountryIso("ZZ")).toBe("US");
  });

  it("formats and parses valid phone to E164", () => {
    const formatted = formatPhoneForDisplay("9876543210", "IN");
    const parsed = parsePhoneToE164(formatted, "IN");

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.e164).toBe("+919876543210");
    }
  });
});
