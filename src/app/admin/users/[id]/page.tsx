import { Avatar } from "@/components/Avatar";
import { ProForm } from "@/components/ProForm";
import { ProgressTables } from "@/components/ProgressTables";
import { RoleForm } from "@/components/RoleForm";
import { SetupNotice } from "@/components/SetupNotice";
import { Breadcrumbs } from "@/components/ui";
import { getDb } from "@/db";
import { shortDate, timeAgo } from "@/lib/format";
import { userProgress } from "@/server/progress";
import { isAuthConfigured, requireAdmin } from "@/server/session";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Client", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isAuthConfigured()) return <SetupNotice />;
  const { id } = await params;
  const session = await requireAdmin(`/admin/users/${id}`);
  const progress = await userProgress(getDb(), id);
  if (!progress) notFound();
  const { user } = progress;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Clients", href: "/admin" },
          { label: user.name ?? user.email ?? "Person" },
        ]}
      />
      <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} email={user.email} image={user.image} size={44} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              {user.name ?? user.email}
            </h1>
            <p className="mt-1 text-xs text-fg-3">
              {user.email} · joined {shortDate(user.createdAt)} · last seen{" "}
              {timeAgo(user.lastSeenAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 sm:items-end">
          <RoleForm userId={user.id} role={user.role} isSelf={user.id === session.user.id} />
          <ProForm userId={user.id} isAdmin={user.role === "admin"} proUntil={user.proUntil} />
        </div>
      </header>
      <ProgressTables progress={progress} />
    </div>
  );
}
