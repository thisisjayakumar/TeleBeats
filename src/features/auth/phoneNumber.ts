import * as Localization from "expo-localization";
import {
  AsYouType,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";

export type CountryIso = string;

export type ParsedPhoneResult =
  | { ok: true; e164: string }
  | { ok: false; error: string };

const FALLBACK_COUNTRY_ISO = "US";

export function getDefaultCountryIso(): CountryIso {
  const regionCode = Localization.getLocales()?.[0]?.regionCode?.toUpperCase();
  if (regionCode && isSupportedCountry(regionCode)) {
    return regionCode;
  }
  return FALLBACK_COUNTRY_ISO;
}

export function normalizeCountryIso(input: string): CountryIso {
  const value = input.trim().toUpperCase();
  if (value.length !== 2 || !isSupportedCountry(value)) {
    return FALLBACK_COUNTRY_ISO;
  }
  return value;
}

export function normalizePhoneInput(input: string): string {
  return input.replace(/[^\d+]/g, "");
}

export function formatPhoneForDisplay(input: string, countryIso: CountryIso): string {
  return new AsYouType(countryIso as CountryCode).input(normalizePhoneInput(input));
}

export function parsePhoneToE164(
  phoneInput: string,
  countryIso: CountryIso
): ParsedPhoneResult {
  const parsed = parsePhoneNumberFromString(phoneInput, countryIso as CountryCode);
  if (!parsed || !parsed.isValid()) {
    return { ok: false, error: "Enter a valid phone number for your selected country." };
  }

  return { ok: true, e164: parsed.number };
}
