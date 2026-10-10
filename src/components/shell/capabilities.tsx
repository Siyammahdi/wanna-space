"use client";

import { createContext, use, type ReactNode } from "react";

/** What this deployment has switched on (server/env `features`), for client UI to follow. */
export type Capabilities = { uploads: boolean };

const CapabilitiesContext = createContext<Capabilities>({ uploads: false });

export function CapabilitiesProvider({
  value,
  children,
}: {
  value: Capabilities;
  children: ReactNode;
}) {
  return <CapabilitiesContext value={value}>{children}</CapabilitiesContext>;
}

export const useCapabilities = () => use(CapabilitiesContext);
