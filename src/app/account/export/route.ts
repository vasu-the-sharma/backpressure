import { auth } from "@/auth";
import { getDb } from "@/db";
import { isAuthConfigured } from "@/server/config";
import { exportAccount } from "@/server/users";

export const dynamic = "force-dynamic";

/** The signed-in person's data as a JSON download. */
export async function GET() {
  const session = isAuthConfigured() ? await auth() : null;
  const userId = session?.user?.id;
  if (!userId) return new Response("Sign in to download your data.", { status: 401 });

  const data = await exportAccount(getDb(), userId);
  if (!data) return new Response("Not found", { status: 404 });
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backpressure-data-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
