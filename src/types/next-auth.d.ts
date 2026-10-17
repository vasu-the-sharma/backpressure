import type { Role } from "@/db/schema";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
  interface User {
    role?: Role;
    lastSeenAt?: Date | null;
  }
}
