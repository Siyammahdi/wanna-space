import { z } from "zod";

const email = z.email("Enter a valid email address").trim().toLowerCase();
const newPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Keep it under 128 characters");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Tell us what to call you").max(80, "That’s a bit long"),
  email,
  password: newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don’t match" });

export type FieldErrors = Partial<Record<string, string>>;

/** Flattens zod issues to the first message per field. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Only allow same-origin relative paths as post-auth destinations. */
export function safeNext(next: string | null | undefined, fallback = "/start") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
