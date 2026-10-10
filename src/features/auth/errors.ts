const messages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD:
    "That email and password don’t match. Try again or reset your password.",
  EMAIL_NOT_VERIFIED: "Confirm your email first — we’ve just sent you a fresh link.",
  USER_ALREADY_EXISTS: "An account with this email already exists. Try signing in instead.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "An account with this email already exists. Try signing in instead.",
  INVALID_TOKEN: "This link has expired or was already used. Request a new one.",
  TOO_MANY_REQUESTS: "Too many attempts. Take a breath and try again in a minute.",
  PASSWORD_TOO_SHORT: "Use at least 8 characters.",
};

export function authErrorMessage(
  error: { code?: string; status?: number; message?: string } | null,
) {
  if (!error) return "Something went wrong. Please try again.";
  if (error.status === 429) return messages.TOO_MANY_REQUESTS;
  return (
    (error.code && messages[error.code]) ||
    error.message ||
    "Something went wrong. Please try again."
  );
}
