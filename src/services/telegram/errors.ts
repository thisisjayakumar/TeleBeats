export class TelegramTwoFactorRequiredError extends Error {
  constructor(public readonly hint?: string) {
    super("2FA password is required for this Telegram account.");
    this.name = "TelegramTwoFactorRequiredError";
  }
}
