"use client";

import { SessionProvider } from "next-auth/react";
import { type ReactNode, createContext, useContext } from "react";

const AuthEnabled = createContext(false);

/** Whether this deployment has accounts configured (a database and Google sign-in). */
export function useAuthEnabled(): boolean {
  return useContext(AuthEnabled);
}

/**
 * Makes the signed-in user available to client components. The session is
 * fetched in the browser after load, so every content page stays static.
 * When accounts aren't configured, the provider starts with "no session" and
 * never calls the auth API, so there are no failing requests.
 */
export function AuthProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return (
    <AuthEnabled.Provider value={enabled}>
      <SessionProvider session={enabled ? undefined : null} refetchOnWindowFocus={false}>
        {children}
      </SessionProvider>
    </AuthEnabled.Provider>
  );
}
