import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { AuthHeading } from "@/features/auth/components/auth-heading";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;

  if (error || typeof token !== "string" || !token) {
    return (
      <>
        <AuthHeading
          title="That link has expired"
          subtitle="Reset links last an hour and work once. Request a new one and we’ll send it right over."
        />
        <Link
          href="/forgot-password"
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          Request a new link
        </Link>
      </>
    );
  }

  return <ResetPasswordForm token={token} />;
}
