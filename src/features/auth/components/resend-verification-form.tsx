"use client";

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
import { CheckInbox } from "./check-inbox";

/** Shown when a verification link is expired or invalid. */
export function ResendVerificationForm({ devMailbox }: { devMailbox: boolean }) {
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
      const { error } = await authClient.sendVerificationEmail({
        email: parsed.data.email,
        callbackURL: "/verify-email",
      });
      if (error) return setFormError(authErrorMessage(error));
      setSentTo(parsed.data.email);
    });
  }

  if (sentTo) return <CheckInbox email={sentTo} title="New link sent" devMailbox={devMailbox} />;

  return (
    <>
      <AuthHeading
        title="That link has expired"
        subtitle="Confirmation links last an hour and work once. Enter your email for a fresh one."
      />
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
          Send a new link
        </Button>
      </form>
    </>
  );
}
