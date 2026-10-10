import type { Metadata } from "next";

import { SignInForm } from "@/features/auth/components/sign-in-form";
import { safeNext } from "@/features/auth/schema";
import { redirectIfSignedIn } from "@/server/dal";
import { features } from "@/server/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  await redirectIfSignedIn();
  const { next, error } = await searchParams;

  return (
    <SignInForm
      next={safeNext(typeof next === "string" ? next : undefined)}
      googleEnabled={features.google}
      devMailbox={features.devMailbox}
      initialError={error ? "Google sign-in didn’t complete. Please try again." : undefined}
    />
  );
}
