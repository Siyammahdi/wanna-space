"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Avatar } from "@/components/shell/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";

import { Group, PaneHeader, Row } from "./parts";

export type SettingsUser = {
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
};

const NAME_MAX = 60;

export function ProfilePane({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [savingName, startSavingName] = useTransition();

  const trimmed = name.trim();
  const nameChanged = trimmed.length > 0 && trimmed !== user.name;

  function saveName(e: FormEvent) {
    e.preventDefault();
    if (!nameChanged) return;
    startSavingName(async () => {
      const { error } = await authClient.updateUser({ name: trimmed });
      if (error) {
        toast({ id: "settings", message: "Couldn’t update your name.", detail: error.message });
        return;
      }
      setName(trimmed);
      toast({ id: "settings", message: "Name updated" });
      router.refresh();
    });
  }

  return (
    <>
      <PaneHeader title="Profile" description="Who you are in your space." />

      <Group label="You">
        <form onSubmit={saveName} className="flex items-center gap-4 rounded-xl bg-surface p-4">
          <Avatar user={{ ...user, name: trimmed || user.name }} className="size-12 text-[19px]" />
          <div className="min-w-0 flex-1">
            <label htmlFor="settings-name" className="text-[12.5px] font-medium text-ink-subtle">
              Name
            </label>
            <div className="mt-1 flex gap-2">
              <Input
                id="settings-name"
                value={name}
                maxLength={NAME_MAX}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-[14px]"
              />
              {nameChanged && (
                <Button type="submit" variant="accent" disabled={savingName} className="w-18">
                  {savingName ? <Spinner /> : "Save"}
                </Button>
              )}
            </div>
          </div>
        </form>
        <Row
          title={user.email}
          description="The email you sign in with."
          control={user.emailVerified && <Badge tone="accent">Verified</Badge>}
        />
      </Group>
    </>
  );
}
