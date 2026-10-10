import "server-only";

import type { ReactElement } from "react";
import { Resend } from "resend";

import { env, features } from "@/server/env";

const resend = features.email ? new Resend(env.RESEND_API_KEY) : null;

type SendEmailInput = {
  to: string;
  subject: string;
  react: ReactElement;
  /** `<event>/<entity-id>` — prevents duplicate sends on retry (24h window). */
  idempotencyKey: string;
  /** Printed instead of sending when no RESEND_API_KEY is configured in development. */
  devPreviewUrl?: string;
};

export async function sendEmail({
  to,
  subject,
  react,
  idempotencyKey,
  devPreviewUrl,
}: SendEmailInput) {
  const isDev = env.NODE_ENV === "development";

  if (isDev) {
    console.info(
      `\n📬 [email:dev] ${subject} → ${to}${devPreviewUrl ? `\n   ${devPreviewUrl}` : ""}\n`,
    );
  }

  if (!resend) {
    if (env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not configured; cannot send email in production.");
    }
    return;
  }

  const { error } = await resend.emails.send(
    { from: env.EMAIL_FROM, to: [to], subject, react },
    { idempotencyKey },
  );

  if (error) {
    console.error(`[email] Resend rejected "${subject}" → ${to}: ${error.message}`);
    // In dev the link above is enough to keep going (e.g. Resend's test sender only
    // delivers to the account owner).
    if (isDev) return;
    throw new Error("We couldn't send the email. Please try again in a moment.");
  }

  if (isDev) console.info(`[email] Sent via Resend → ${to}`);
}
