import "server-only";

import { createHash } from "node:crypto";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { createElement } from "react";

import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { sendEmail } from "@/server/email/send";
import ActionEmail from "@/server/email/templates/action-email";
import { env, features } from "@/server/env";
import { ensurePersonalSpace } from "@/server/spaces";

const tokenKey = (token: string) => createHash("sha256").update(token).digest("hex").slice(0, 32);

const isDev = env.NODE_ENV === "development";

export const auth = betterAuth({
  appName: "Wanna Space",
  // In dev, any localhost port works and email links follow the port you're on.
  baseURL: isDev
    ? { allowedHosts: ["localhost:*", "127.0.0.1:*"], fallback: env.BETTER_AUTH_URL }
    : env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: isDev
    ? [env.BETTER_AUTH_URL, "http://localhost:*", "http://127.0.0.1:*"]
    : [env.BETTER_AUTH_URL],

  database: drizzleAdapter(db, { provider: "pg", schema }),
  advanced: {
    database: { generateId: false },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    // Sign-up with a taken email returns a fake success (no enumeration), so tell the real
    // owner by email instead: a fresh confirmation link, or a nudge to sign in.
    onExistingUserSignUp: async ({ user }) => {
      if (!user.emailVerified) {
        await auth.api.sendVerificationEmail({
          body: { email: user.email, callbackURL: "/verify-email" },
        });
        return;
      }
      await sendEmail({
        to: user.email,
        subject: "You already have a Wanna Space",
        idempotencyKey: `existing-signup/${user.id}/${new Date().toISOString().slice(0, 13)}`,
        devPreviewUrl: `${env.BETTER_AUTH_URL}/sign-in`,
        react: createElement(ActionEmail, {
          preview: "Someone tried to create an account with this email",
          heading: "You already have a space",
          greetingName: user.name,
          body: "Someone (hopefully you) tried to sign up with this email. Your account already exists — just sign in. If you’ve forgotten your password, you can reset it from the sign-in page.",
          actionLabel: "Sign in",
          actionUrl: `${env.BETTER_AUTH_URL}/sign-in`,
          expiryNote: "If this wasn’t you, you can ignore this email. Nothing has changed.",
        }),
      });
    },
    sendResetPassword: async ({ user, url, token }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Wanna Space password",
        idempotencyKey: `reset-password/${tokenKey(token)}`,
        devPreviewUrl: url,
        react: createElement(ActionEmail, {
          preview: "Reset your password",
          heading: "Reset your password",
          greetingName: user.name,
          body: "We got a request to reset the password for your space. Choose a new one below.",
          actionLabel: "Choose a new password",
          actionUrl: url,
          expiryNote:
            "This link expires in 1 hour and works once. Your password stays the same until you set a new one.",
        }),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      await sendEmail({
        to: user.email,
        subject: "Confirm your email for Wanna Space",
        idempotencyKey: `verify-email/${tokenKey(token)}`,
        devPreviewUrl: url,
        react: createElement(ActionEmail, {
          preview: "Confirm your email to open your space",
          heading: "Confirm your email",
          greetingName: user.name,
          body: "One tap and your space is ready. Confirm this address to finish signing up.",
          actionLabel: "Confirm email",
          actionUrl: url,
          expiryNote: "This link expires in 1 hour.",
        }),
      });
    },
  },

  socialProviders: features.google
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
        },
      }
    : {},

  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensurePersonalSpace(user.id, user.name);
        },
      },
    },
  },

  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
