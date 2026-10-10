"use client";

import { Check, Laptop, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

import { Group, PaneHeader, Row } from "./parts";

type Device = {
  id: string;
  token: string;
  userAgent?: string | null;
  updatedAt: Date | string;
};

const MIN_PASSWORD = 8;

/** "Chrome on macOS" from a user agent, without a parsing library. */
function describeAgent(ua: string | null | undefined) {
  if (!ua) return { label: "Unknown device", mobile: false };
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  return {
    label: os ? `${browser} on ${os}` : browser,
    mobile: /iPhone|Android|Mobile/.test(ua),
  };
}

const lastActive = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function SecurityPane({ email }: { email: string }) {
  const router = useRouter();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [sendingReset, startSendingReset] = useTransition();
  const [resetSent, setResetSent] = useState(false);
  const [revoking, startRevoking] = useTransition();
  const [signingOut, startSigningOut] = useTransition();

  async function loadDevices() {
    const [sessions, current] = await Promise.all([
      authClient.listSessions(),
      authClient.getSession(),
    ]);
    setDevices((sessions.data as Device[] | null) ?? []);
    setCurrentId(current.data?.session.id ?? null);
  }

  useEffect(() => {
    let live = true;
    void authClient.listAccounts().then(({ data }) => {
      if (live) setHasPassword(Boolean(data?.some((a) => a.providerId === "credential")));
    });
    void Promise.all([authClient.listSessions(), authClient.getSession()]).then(
      ([sessions, current]) => {
        if (!live) return;
        setDevices((sessions.data as Device[] | null) ?? []);
        setCurrentId(current.data?.session.id ?? null);
      },
    );
    return () => {
      live = false;
    };
  }, []);

  function sendReset() {
    startSendingReset(async () => {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      if (error) {
        toast({ id: "settings", message: "Couldn’t send the link.", detail: error.message });
        return;
      }
      setResetSent(true);
      toast({ id: "settings", message: "Check your inbox", detail: email });
    });
  }

  function revoke(device: Device) {
    startRevoking(async () => {
      const { error } = await authClient.revokeSession({ token: device.token });
      if (error) {
        toast({ id: "settings", message: "Couldn’t sign that device out.", detail: error.message });
        return;
      }
      await loadDevices();
    });
  }

  function signOutOthers() {
    startRevoking(async () => {
      const { error } = await authClient.revokeOtherSessions();
      toast(
        error
          ? { id: "settings", message: "Couldn’t sign out other devices.", detail: error.message }
          : { id: "settings", message: "Signed out of every other device" },
      );
      await loadDevices();
    });
  }

  function signOut() {
    startSigningOut(async () => {
      await authClient.signOut();
      router.replace("/sign-in");
      router.refresh();
    });
  }

  const others = devices?.filter((d) => d.id !== currentId) ?? [];
  const sorted = devices
    ? [...devices].sort((a, b) =>
        a.id === currentId
          ? -1
          : b.id === currentId
            ? 1
            : +new Date(b.updatedAt) - +new Date(a.updatedAt),
      )
    : [];

  return (
    <>
      <PaneHeader title="Security" description="Your password and where you’re signed in." />

      <Group label="Password">
        {hasPassword === null ? (
          <div className="flex h-15 items-center justify-center rounded-xl bg-surface">
            <Spinner className="text-ink-faint" />
          </div>
        ) : hasPassword ? (
          <ChangePassword onChanged={loadDevices} />
        ) : (
          <Row
            title="No password yet"
            description="You sign in with Google. We can email you a link to add a password too."
          />
        )}
        <Row
          title={hasPassword ? "Forgot it?" : "Set a password"}
          description="We’ll email you a link to choose a new one."
          control={
            <Button
              variant="secondary"
              size="sm"
              onClick={sendReset}
              disabled={sendingReset || resetSent}
              className="min-w-28"
            >
              {sendingReset ? (
                <Spinner />
              ) : resetSent ? (
                <>
                  <Check /> Link sent
                </>
              ) : (
                "Send link"
              )}
            </Button>
          }
        />
      </Group>

      <Group label="Where you’re signed in">
        <div className="rounded-xl bg-surface p-1.5">
          {devices === null ? (
            <div className="flex h-14 items-center justify-center">
              <Spinner className="text-ink-faint" />
            </div>
          ) : (
            <ul>
              {sorted.map((d) => {
                const { label, mobile } = describeAgent(d.userAgent);
                const Icon = mobile ? Smartphone : Laptop;
                const current = d.id === currentId;
                return (
                  <li
                    key={d.id}
                    className="flex min-h-14 items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface-hover/50"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-md",
                        current
                          ? "bg-accent-soft text-accent-ink"
                          : "bg-surface-sunken text-ink-subtle",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{label}</p>
                      <p className="text-[12px] text-ink-subtle">
                        {current
                          ? "This device"
                          : `Last active ${lastActive.format(new Date(d.updatedAt))}`}
                      </p>
                    </div>
                    {!current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revoking}
                        onClick={() => revoke(d)}
                      >
                        Sign out
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {others.length > 1 && (
          <Row
            title="Every other device"
            description="Sign out everywhere except this browser."
            control={
              <Button
                variant="secondary"
                size="sm"
                onClick={signOutOthers}
                disabled={revoking}
                className="min-w-28"
              >
                {revoking ? <Spinner /> : "Sign out others"}
              </Button>
            }
          />
        )}
        <Row
          title="This device"
          description="Leave your space on this browser."
          control={
            <Button
              variant="secondary"
              size="sm"
              onClick={signOut}
              disabled={signingOut}
              className="min-w-28"
            >
              {signingOut ? <Spinner /> : "Sign out"}
            </Button>
          }
        />
      </Group>
    </>
  );
}

function ChangePassword({ onChanged }: { onChanged: () => Promise<void> }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const tooShort = next.length > 0 && next.length < MIN_PASSWORD;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!current || next.length < MIN_PASSWORD) return;
    setError(null);
    startSaving(async () => {
      const { error: failed } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (failed) {
        setError(
          failed.code === "INVALID_PASSWORD"
            ? "That isn’t your current password."
            : (failed.message ?? "Couldn’t change your password."),
        );
        return;
      }
      setCurrent("");
      setNext("");
      toast({
        id: "settings",
        message: "Password changed",
        detail: "Other devices were signed out.",
      });
      await onChanged();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="current-password" label="Current password">
          <PasswordInput
            id="current-password"
            value={current}
            autoComplete="current-password"
            onChange={(e) => setCurrent(e.target.value)}
            className="h-9 text-[14px]"
          />
        </Field>
        <Field
          id="new-password"
          label="New password"
          error={tooShort ? `At least ${MIN_PASSWORD} characters` : undefined}
        >
          <PasswordInput
            id="new-password"
            value={next}
            autoComplete="new-password"
            aria-invalid={tooShort || undefined}
            aria-describedby={tooShort ? "new-password-error" : undefined}
            onChange={(e) => setNext(e.target.value)}
            className="h-9 text-[14px]"
          />
        </Field>
      </div>
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-ink-subtle">Changing it signs out your other devices.</p>
        <Button
          type="submit"
          variant="accent"
          size="sm"
          disabled={saving || !current || next.length < MIN_PASSWORD}
          className="min-w-32"
        >
          {saving ? <Spinner /> : "Change password"}
        </Button>
      </div>
    </form>
  );
}
