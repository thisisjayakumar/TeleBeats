import {
  authReducer,
  initialAuthState,
  type AuthState,
} from "../authReducer";

describe("authReducer", () => {
  it("moves to code_sent after OTP request success", () => {
    const next = authReducer(initialAuthState, {
      type: "REQUEST_CODE_SUCCESS",
      payload: { phone: "+919999999999", phoneCodeHash: "hash-1" },
    });

    expect(next.status).toBe("code_sent");
    expect(next.phone).toBe("+919999999999");
    expect(next.phoneCodeHash).toBe("hash-1");
  });

  it("moves to signed_in after verify success", () => {
    const current: AuthState = {
      ...initialAuthState,
      status: "verifying",
      phone: "+919999999999",
      phoneCodeHash: "hash-1",
    };

    const next = authReducer(current, {
      type: "VERIFY_CODE_SUCCESS",
      payload: {
        phone: "+919999999999",
        sessionString: "session-string",
      },
    });

    expect(next.status).toBe("signed_in");
    expect(next.session?.sessionString).toBe("session-string");
    expect(next.phoneCodeHash).toBeNull();
  });

  it("returns to signed_out when reset is requested", () => {
    const current: AuthState = {
      ...initialAuthState,
      status: "code_sent",
      phone: "+919999999999",
      phoneCodeHash: "hash-1",
      errorMessage: "Invalid code",
    };

    const next = authReducer(current, { type: "RESET_TO_SIGNED_OUT" });
    expect(next.status).toBe("signed_out");
    expect(next.session).toBeNull();
    expect(next.phoneCodeHash).toBeNull();
    expect(next.errorMessage).toBeNull();
  });

  it("moves to password_required when Telegram asks for 2FA password", () => {
    const current: AuthState = {
      ...initialAuthState,
      status: "verifying",
      phone: "+919999999999",
      phoneCodeHash: "hash-1",
    };

    const next = authReducer(current, {
      type: "PASSWORD_REQUIRED",
      payload: { hint: "pet name" },
    });

    expect(next.status).toBe("password_required");
    expect(next.passwordHint).toBe("pet name");
  });
});
