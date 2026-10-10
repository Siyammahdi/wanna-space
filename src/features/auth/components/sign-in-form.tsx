"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, PasswordInput } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

import { authErrorMessage } from "../errors";
import { fieldErrors, signInSchema, type FieldErrors } from "../schema";
import { AuthHeading } from "./auth-heading";
import { DevMailboxNote } from "./check-inbox";
import { GoogleButton, OrDivider } from "./google-button";

type Props = { next: string; googleEnabled: boolean; devMailbox: boolean; initialError?: string };

export function SignInForm({ next, googleEnabled, devMailbox, initialError }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>(initialError);
  const [notice, setNotice] = useState<string>();

  function onSubmit(formData: FormData) {
    const parsed = signInSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setFormError(undefined);
    setNotice(undefined);

    startTransition(async () => {
      const { error } = await authClient.signIn.email({ ...parsed.data, callbackURL: next });
      if (error) {
        if (error.code === "EMAIL_NOT_VERIFIED") setNotice(authErrorMessage(error));
        else setFormError(authErrorMessage(error));
        return;
      }
      router.replace(next as "/start");
      router.refresh();
    });
  }

  return (
    <>
      <AuthHeading title="Welcome back" subtitle="Sign in to step back into your space." />

      {googleEnabled && (
        <div className="mb-6 flex flex-col gap-6">
          <GoogleButton next={next} />
          <OrDivider />
        </div>
      )}

      <form action={onSubmit} noValidate className="flex flex-col gap-5">
        {formError && <Alert tone="danger">{formError}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {notice && devMailbox && <DevMailboxNote />}

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

        <Field
          id="password"
          label="Password"
          error={errors.password}
          aside={
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-medium text-accent-ink hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
          />
        </Field>

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
          {pending && <Spinner />}
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-center text-[14px] text-ink-muted">
        New here?{" "}
        <Link href="/sign-up" className="font-medium text-ink hover:underline">
          Create your space
        </Link>
      </p>
    </>
  );
}
