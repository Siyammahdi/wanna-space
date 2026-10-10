import type { Metadata } from "next";

import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { redirectIfSignedIn } from "@/server/dal";
import { features } from "@/server/env";

export const metadata: Metadata = { title: "Create your space" };

export default async function SignUpPage() {
  await redirectIfSignedIn();
  return (
    <SignUpForm
      googleEnabled={features.google}
      devMailbox={features.devMailbox}
      emailReady={features.email || features.devMailbox}
    />
  );
}
