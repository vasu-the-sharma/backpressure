import { Avatar } from "@/components/Avatar";
import { SetupNotice } from "@/components/SetupNotice";
import { ChevronRight } from "@/components/ui";
import { getAllChallenges } from "@/content/challenges/registry";
import { getDb } from "@/db";
import { shortDate, timeAgo } from "@/lib/format";
import { adminOverview, listUsersWithStats } from "@/server/progress";
import { isAuthConfigured, requireAdmin } from "@/server/session";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!isAuthConfigured()) return <SetupNotice />;
  await requireAdmin("/admin");
  const { q } = await searchParams;
  const db = getDb();
  const [overview, people] = await Promise.all([adminOverview(db), listUsersWithStats(db, q)]);
  const totalChallenges = getAllChallenges().length;

  const stats = [
    { label: "People", value: overview.people },
    { label: "Active this week", value: overview.activeThisWeek },
    { label: "Runs this week", value: overview.runsThisWeek },
    { label: "Passing runs this week", value: overview.passesThisWeek },
  ];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Clients</h1>
        <p className="mt-1 text-xs text-fg-3">
          Everyone who has signed in, most recently active first.
        </p>
      </header>

      <dl className="panel mb-8 grid grid-cols-2 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`px-4 py-3 ${i % 2 === 0 ? "border-r border-line" : ""} ${
              i < 2 ? "border-b border-line sm:border-b-0" : ""
            } ${i === 1 ? "sm:border-r" : ""}`}
          >
            <dt className="text-xs text-fg-3">{s.label}</dt>
            <dd className="tnum mt-0.5 text-xl tracking-tight text-fg">
              {s.value.toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>

      <search>
        <form className="mb-3 flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search by name or email
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name or email"
            className="focus-ring h-8 w-full max-w-xs rounded-md border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-4"
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
          {q && (
            <Link href="/admin" className="btn btn-ghost">
              Clear
            </Link>
          )}
        </form>
      </search>

      {people.length === 0 ? (
        <p className="panel px-4 py-10 text-center text-sm text-fg-3">
          {q ? `No one matches “${q}”.` : "No one has signed in yet."}
        </p>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-xs text-fg-3">
                <th scope="col" className="px-4 py-2.5 font-normal">
                  Person
                </th>
                <th scope="col" className="px-4 py-2.5 font-normal">
                  Role
                </th>
                <th scope="col" className="px-4 py-2.5 font-normal">
                  Joined
                </th>
                <th scope="col" className="px-4 py-2.5 font-normal">
                  Last seen
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal">
                  Runs
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal">
                  Solved
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal">
                  Best quiz
                </th>
                <th scope="col" className="w-8 px-2 py-2.5">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {people.map((p) => (
                <tr
                  key={p.id}
                  className="group transition-colors duration-150 ease-out hover:bg-surface-2"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/users/${p.id}`}
                      className="focus-ring flex min-w-0 items-center gap-2.5 rounded-sm"
                    >
                      <Avatar name={p.name} email={p.email} image={p.image} size={26} />
                      <span className="min-w-0">
                        <span className="block truncate text-fg">{p.name ?? "—"}</span>
                        <span className="block truncate text-xs text-fg-3">{p.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className={p.role === "admin" ? "text-warn-fg" : "text-fg-2"}>
                      {p.role === "admin" ? "Admin" : "Client"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-fg-3">{shortDate(p.createdAt)}</td>
                  <td className="px-4 py-2.5 text-xs text-fg-2">{timeAgo(p.lastSeenAt)}</td>
                  <td className="tnum px-4 py-2.5 text-right text-fg-2">{p.runs}</td>
                  <td className="tnum px-4 py-2.5 text-right text-fg-2">
                    {p.solved}/{totalChallenges}
                  </td>
                  <td className="tnum px-4 py-2.5 text-right text-fg-2">
                    {p.bestQuizPct == null ? "—" : `${p.bestQuizPct}%`}
                  </td>
                  <td className="px-2 py-2.5">
                    <ChevronRight
                      size={14}
                      className="text-fg-3 transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-fg"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
