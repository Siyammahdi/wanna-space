"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, PasswordInput } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { ease } from "@/lib/motion";

import { authErrorMessage } from "../errors";
import { fieldErrors, signUpSchema, type FieldErrors } from "../schema";
import { AuthHeading } from "./auth-heading";
import { CheckInbox } from "./check-inbox";
import { GoogleButton, OrDivider } from "./google-button";

type Props = { googleEnabled: boolean; devMailbox: boolean };

export function SignUpForm({ googleEnabled, devMailbox }: Props) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();

  function onSubmit(formData: FormData) {
    const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setFormError(undefined);

    startTransition(async () => {
      const { error } = await authClient.signUp.email({
        ...parsed.data,
        callbackURL: "/verify-email",
      });
      if (error) return setFormError(authErrorMessage(error));
      setSentTo(parsed.data.email);
    });
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {sentTo ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: ease.out }}
        >
          <CheckInbox email={sentTo} devMailbox={devMailbox} />
        </motion.div>
      ) : (
        <motion.div
          key="form"
          exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
          transition={{ duration: 0.2, ease: ease.out }}
        >
          <AuthHeading
            title="Create your space"
            subtitle="Notes, tasks, time and everything that inspires you — in one quiet place."
          />

          {googleEnabled && (
            <div className="mb-6 flex flex-col gap-6">
              <GoogleButton next="/start" />
              <OrDivider />
            </div>
          )}

          <form action={onSubmit} noValidate className="flex flex-col gap-5">
            {formError && <Alert tone="danger">{formError}</Alert>}

            <Field id="name" label="Name" error={errors.name}>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="What should we call you?"
                aria-invalid={Boolean(errors.name)}
                autoFocus
              />
            </Field>

            <Field id="email" label="Email" error={errors.email}>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
              />
            </Field>

            <Field
              id="password"
              label="Password"
              error={errors.password}
              hint="At least 8 characters."
            >
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
              />
            </Field>

            <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
              {pending && <Spinner />}
              Create account
            </Button>
          </form>

          <p className="mt-8 text-center text-[14px] text-ink-muted">
            Already have a space?{" "}
            <Link href="/sign-in" className="font-medium text-ink hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
