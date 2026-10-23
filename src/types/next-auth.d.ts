import type { Role } from "@/db/schema";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; pro: boolean } & DefaultSession["user"];
  }
  interface User {
    role?: Role;
    lastSeenAt?: Date | null;
    proUntil?: Date | null;
    proSource?: string | null;
  }
}
