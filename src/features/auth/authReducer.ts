import { TelegramSession } from "../../services/telegram";

export type AuthStatus =
  | "bootstrapping"
  | "signed_out"
  | "code_sent"
  | "verifying"
  | "password_required"
  | "verifying_password"
  | "signed_in";

export type AuthState = {
  status: AuthStatus;
  phone: string;
  phoneCodeHash: string | null;
  passwordHint: string | null;
  session: TelegramSession | null;
  errorMessage: string | null;
};

export type AuthAction =
  | { type: "BOOTSTRAP_START" }
  | { type: "BOOTSTRAP_SIGNED_IN"; payload: TelegramSession }
  | { type: "BOOTSTRAP_SIGNED_OUT" }
  | { type: "REQUEST_CODE_SUCCESS"; payload: { phone: string; phoneCodeHash: string } }
  | { type: "VERIFY_CODE_START" }
  | { type: "PASSWORD_REQUIRED"; payload: { hint: string | null } }
  | { type: "VERIFY_PASSWORD_START" }
  | { type: "VERIFY_CODE_SUCCESS"; payload: TelegramSession }
  | { type: "AUTH_ERROR"; payload: string }
  | { type: "RESET_TO_SIGNED_OUT" };

export const initialAuthState: AuthState = {
  status: "bootstrapping",
  phone: "",
  phoneCodeHash: null,
  passwordHint: null,
  session: null,
  errorMessage: null,
};

function statusAfterError(status: AuthStatus): AuthStatus {
  if (status === "verifying") {
    return "code_sent";
  }

  if (status === "verifying_password") {
    return "password_required";
  }

  return status === "bootstrapping" ? "signed_out" : status;
}

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "BOOTSTRAP_START":
      return { ...state, status: "bootstrapping", errorMessage: null };
    case "BOOTSTRAP_SIGNED_IN":
      return {
        ...state,
        status: "signed_in",
        session: action.payload,
        phone: action.payload.phone,
        phoneCodeHash: null,
        passwordHint: null,
        errorMessage: null,
      };
    case "BOOTSTRAP_SIGNED_OUT":
      return {
        ...state,
        status: "signed_out",
        phone: "",
        session: null,
        phoneCodeHash: null,
        passwordHint: null,
        errorMessage: null,
      };
    case "REQUEST_CODE_SUCCESS":
      return {
        ...state,
        status: "code_sent",
        phone: action.payload.phone,
        phoneCodeHash: action.payload.phoneCodeHash,
        passwordHint: null,
        errorMessage: null,
      };
    case "VERIFY_CODE_START":
      return { ...state, status: "verifying", errorMessage: null };
    case "PASSWORD_REQUIRED":
      return {
        ...state,
        status: "password_required",
        passwordHint: action.payload.hint,
        errorMessage: null,
      };
    case "VERIFY_PASSWORD_START":
      return { ...state, status: "verifying_password", errorMessage: null };
    case "VERIFY_CODE_SUCCESS":
      return {
        ...state,
        status: "signed_in",
        session: action.payload,
        phone: action.payload.phone,
        phoneCodeHash: null,
        passwordHint: null,
        errorMessage: null,
      };
    case "AUTH_ERROR":
      return {
        ...state,
        status: state.session ? "signed_in" : statusAfterError(state.status),
        errorMessage: action.payload,
      };
    case "RESET_TO_SIGNED_OUT":
      return {
        ...state,
        status: "signed_out",
        phone: "",
        session: null,
        phoneCodeHash: null,
        passwordHint: null,
        errorMessage: null,
      };
    default:
      return state;
  }
}
