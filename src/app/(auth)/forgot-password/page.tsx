import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { redirectIfSignedIn } from "@/server/dal";
import { features } from "@/server/env";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage() {
  await redirectIfSignedIn();
  return <ForgotPasswordForm devMailbox={!features.email} />;
}
