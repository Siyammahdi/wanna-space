"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

import { useNotes } from "./notes-provider";

export function NewPageButton({
  children = "New page",
  ...props
}: Omit<ButtonProps, "onClick" | "children"> & { children?: ReactNode }) {
  const { create } = useNotes();
  return (
    <Button {...props} onClick={() => void create(null)}>
      <Plus />
      {children}
    </Button>
  );
}
