"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

import { authErrorMessage } from "../errors";
import { fieldErrors, forgotPasswordSchema, type FieldErrors } from "../schema";
import { AuthHeading } from "./auth-heading";
import { DevMailboxNote } from "./check-inbox";

export function ForgotPasswordForm({ devMailbox }: { devMailbox: boolean }) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();

  function onSubmit(formData: FormData) {
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setFormError(undefined);

    startTransition(async () => {
      const { error } = await authClient.requestPasswordReset({
        email: parsed.data.email,
        redirectTo: "/reset-password",
      });
      if (error) return setFormError(authErrorMessage(error));
      setSentTo(parsed.data.email);
    });
  }

  return (
    <>
      <AuthHeading
        title="Reset your password"
        subtitle="Enter the email you signed up with and we’ll send you a link to choose a new one."
      />

      {sentTo ? (
        <div className="flex flex-col gap-3">
          <Alert tone="success">
            If an account exists for <span className="font-medium">{sentTo}</span>, a reset link is
            on its way. It expires in 1 hour.
          </Alert>
          {devMailbox && <DevMailboxNote />}
        </div>
      ) : (
        <form action={onSubmit} noValidate className="flex flex-col gap-5">
          {formError && <Alert tone="danger">{formError}</Alert>}
          <Field id="email" label="Email" error={errors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              autoFocus
            />
          </Field>
          <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
            {pending && <Spinner />}
            Send reset link
          </Button>
        </form>
      )}

      <Link
        href="/sign-in"
        className="mt-8 inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
    </>
  );
}
