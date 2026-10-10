"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

import { authErrorMessage } from "../errors";
import { fieldErrors, resetPasswordSchema, type FieldErrors } from "../schema";
import { AuthHeading } from "./auth-heading";

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [done, setDone] = useState(false);

  function onSubmit(formData: FormData) {
    const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setFormError(undefined);

    startTransition(async () => {
      const { error } = await authClient.resetPassword({
        newPassword: parsed.data.password,
        token,
      });
      if (error) return setFormError(authErrorMessage(error));
      setDone(true);
    });
  }

  if (done) {
    return (
      <>
        <AuthHeading
          title="Password updated"
          subtitle="You’ve been signed out everywhere else. Sign in with your new password."
        />
        <Link href="/sign-in" className={buttonVariants({ size: "lg", className: "w-full" })}>
          Sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Choose a new password" subtitle="Make it something you’ll remember." />
      <form action={onSubmit} noValidate className="flex flex-col gap-5">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Field
          id="password"
          label="New password"
          error={errors.password}
          hint="At least 8 characters."
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            autoFocus
          />
        </Field>
        <Field id="confirm" label="Confirm password" error={errors.confirm}>
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirm)}
          />
        </Field>
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
          {pending && <Spinner />}
          Update password
        </Button>
      </form>
    </>
  );
}
