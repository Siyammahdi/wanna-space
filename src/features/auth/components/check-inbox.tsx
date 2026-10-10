"use client";

import { MailCheck } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { spring } from "@/lib/motion";

import { authErrorMessage } from "../errors";

const COOLDOWN_SECONDS = 30;

type Props = { email: string; title?: string; devMailbox?: boolean };

export function CheckInbox({ email, title = "Check your inbox", devMailbox = false }: Props) {
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [status, setStatus] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  async function resend() {
    setCooldown(COOLDOWN_SECONDS);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/verify-email",
    });
    setStatus(
      error
        ? { tone: "danger", text: authErrorMessage(error) }
        : { tone: "success", text: "Sent. It can take a minute to arrive." },
    );
  }

  return (
    <div className="flex flex-col items-start">
      <motion.span
        initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={spring.bouncy}
        className="mb-6 flex size-14 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"
      >
        <MailCheck className="size-7" strokeWidth={1.75} />
      </motion.span>
      <h1 className="font-heading text-[30px] leading-tight font-semibold tracking-[-0.035em] text-ink">
        {title}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
        We sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Open
        it on this device to step into your space.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3">
        {devMailbox && <DevMailboxNote />}
        {status && <Alert tone={status.tone}>{status.text}</Alert>}
        <Button variant="secondary" size="lg" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend the link"}
        </Button>
      </div>
    </div>
  );
}

export function DevMailboxNote() {
  return (
    <Alert tone="info">
      Development mode: no email provider is configured, so the link was printed in the terminal
      running <code className="font-mono text-[12px]">pnpm dev</code> (look for 📬).
    </Alert>
  );
}
