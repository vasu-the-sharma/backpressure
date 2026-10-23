import { getDb } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { hasPro } from "@/server/pro";
import { promoteListedAdmin, touchLastSeen } from "@/server/users";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth.js: Google sign-in, sessions stored in Postgres. The config is built
 * lazily per request, so the app builds and its public pages serve without
 * any auth environment variables set.
 *
 * Sessions are database sessions, so the role on a session is read fresh
 * from the `user` row on every request: promoting or demoting someone takes
 * effect immediately.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const db = getDb();
  return {
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    providers: [Google],
    session: { strategy: "database" },
    pages: { signIn: "/signin" },
    callbacks: {
      async session({ session, user }) {
        session.user.id = user.id;
        session.user.role = user.role ?? "client";
        session.user.pro = hasPro(user);
        await touchLastSeen(db, user.id, user.lastSeenAt ?? null);
        return session;
      },
    },
    events: {
      // Runs on every sign-in (new account or returning), so adding an email
      // to ADMIN_EMAILS later still promotes that person next time they sign in.
      async signIn({ user }) {
        if (user.id) await promoteListedAdmin(db, user.id, user.email ?? null);
      },
    },
  };
});
