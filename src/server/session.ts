import { auth } from "@/auth";
import type { Session } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { isAuthConfigured } from "./config";

/** Only same-site paths are allowed as post-sign-in destinations. */
export function safeCallback(raw: unknown, fallback = "/account"): string {
  return typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}

/** The signed-in session, or a redirect to sign-in that comes back to `path`. */
export async function requireUser(path: string): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?callbackUrl=${encodeURIComponent(path)}`);
  return session;
}

/** An admin session. Non-admins get a 404, so the admin area's existence isn't advertised. */
export async function requireAdmin(path: string): Promise<Session> {
  const session = await requireUser(path);
  if (session.user.role !== "admin") notFound();
  return session;
}

export { isAuthConfigured };
