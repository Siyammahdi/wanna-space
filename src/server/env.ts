import "server-only";

import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().min(3).default("Wanna Space <onboarding@resend.dev>"),
  CLOUDINARY_URL: optional.refine(
    (value) => !value || value.startsWith("cloudinary://"),
    "CLOUDINARY_URL must look like cloudinary://API_KEY:API_SECRET@CLOUD_NAME",
  ),
  CLOUDINARY_CLOUD_NAME: optional,
  CLOUDINARY_API_KEY: optional,
  CLOUDINARY_API_SECRET: optional,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`);
  throw new Error(`Invalid environment configuration:\n${issues.join("\n")}\nSee .env.example.`);
}

export const env = parsed.data;

/** Cloudinary credentials from CLOUDINARY_URL or the three separate variables. */
function cloudinaryCredentials() {
  if (env.CLOUDINARY_URL) {
    const url = new URL(env.CLOUDINARY_URL);
    const credentials = {
      cloudName: url.hostname,
      apiKey: decodeURIComponent(url.username),
      apiSecret: decodeURIComponent(url.password),
    };
    if (credentials.cloudName && credentials.apiKey && credentials.apiSecret) return credentials;
  }
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    return {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      apiSecret: env.CLOUDINARY_API_SECRET,
    };
  }
  return null;
}

export const cloudinaryConfig = cloudinaryCredentials();

export const features = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  email: Boolean(env.RESEND_API_KEY),
  uploads: cloudinaryConfig !== null,
};
