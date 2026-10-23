import { signOut } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { ProgressTables } from "@/components/ProgressTables";
import { SetupNotice } from "@/components/SetupNotice";
import { getDb } from "@/db";
import { shortDate } from "@/lib/format";
import { userProgress } from "@/server/progress";
import { isAuthConfigured, requireUser } from "@/server/session";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your progress" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  if (!isAuthConfigured()) return <SetupNotice />;
  const session = await requireUser("/account");
  const progress = await userProgress(getDb(), session.user.id);
  if (!progress) return <SetupNotice />;
  const { user } = progress;

  return (
    <div>
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} email={user.email} image={user.image} size={44} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">Your progress</h1>
            <p className="mt-1 truncate text-xs text-fg-3">
              {user.email} · member since {shortDate(user.createdAt)}
              {user.role !== "admin" && user.proUntil && user.proUntil > new Date() && (
                <> · Pro until {shortDate(user.proUntil)}</>
              )}
            </p>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="btn btn-secondary">
            Sign out
          </button>
        </form>
      </header>
      <ProgressTables progress={progress} />
    </div>
  );
}
