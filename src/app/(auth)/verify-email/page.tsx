import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { AuthHeading } from "@/features/auth/components/auth-heading";
import { ResendVerificationForm } from "@/features/auth/components/resend-verification-form";
import { redirectIfSignedIn } from "@/server/dal";
import { features } from "@/server/env";

export const metadata: Metadata = { title: "Confirm your email" };

/** Landing spot for verification links (callbackURL). Success auto-signs in and moves on. */
export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  await redirectIfSignedIn();
  const { error } = await searchParams;

  if (error) return <ResendVerificationForm devMailbox={!features.email} />;

  return (
    <>
      <AuthHeading
        title="Email confirmed"
        subtitle="You’re all set. Sign in to step into your space."
      />
      <Link href="/sign-in" className={buttonVariants({ size: "lg", className: "w-full" })}>
        Sign in
      </Link>
    </>
  );
}
