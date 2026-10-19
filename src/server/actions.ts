"use server";

import { auth } from "@/auth";
import { dailyNumberAt } from "@/content/daily/calendar";
import { getDb } from "@/db";
import type { Role } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAuthConfigured, isDbConfigured } from "./config";
import {
  type DailyRunInput,
  addToWaitlist,
  dailyRunInput,
  gradeDailyRun,
  recordDailyResult,
} from "./daily";
import {
  type ChallengeRunInput,
  type QuizAttemptInput,
  challengeRunInput,
  gradeChallengeRun,
  gradeQuizAttempt,
  quizAttemptInput,
} from "./grade";
import { insertChallengeRun, insertQuizAttempt } from "./progress";
import { setRole } from "./users";

export type SaveResult = { saved: true } | { saved: false; reason: "signed-out" | "invalid" };

async function currentUserId(): Promise<string | null> {
  if (!isAuthConfigured()) return null;
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Record a Playground run for the signed-in client. The server re-scores the design itself. */
export async function saveChallengeRun(input: ChallengeRunInput): Promise<SaveResult> {
  const userId = await currentUserId();
  if (!userId) return { saved: false, reason: "signed-out" };
  const parsed = challengeRunInput.safeParse(input);
  if (!parsed.success) return { saved: false, reason: "invalid" };
  const graded = gradeChallengeRun(parsed.data);
  if (!graded.ok) return { saved: false, reason: "invalid" };
  await insertChallengeRun(getDb(), userId, graded.run);
  return { saved: true };
}

/** Record a finished quiz for the signed-in client. The server grades the answers itself. */
export async function saveQuizAttempt(input: QuizAttemptInput): Promise<SaveResult> {
  const userId = await currentUserId();
  if (!userId) return { saved: false, reason: "signed-out" };
  const parsed = quizAttemptInput.safeParse(input);
  if (!parsed.success) return { saved: false, reason: "invalid" };
  const graded = gradeQuizAttempt(parsed.data);
  if (!graded.ok) return { saved: false, reason: "invalid" };
  await insertQuizAttempt(getDb(), userId, graded);
  return { saved: true };
}

export type DailySubmitResult =
  | { saved: true; improved: boolean }
  | { saved: false; reason: "signed-out" | "invalid" | "expired" | "not-passed" };

/**
 * Put a passing run on today's leaderboard. The server re-scores the design
 * against the day's puzzle; only today's puzzle counts.
 */
export async function submitDailyRun(input: DailyRunInput): Promise<DailySubmitResult> {
  const userId = await currentUserId();
  if (!userId) return { saved: false, reason: "signed-out" };
  const parsed = dailyRunInput.safeParse(input);
  if (!parsed.success) return { saved: false, reason: "invalid" };
  if (parsed.data.day !== dailyNumberAt(Date.now())) return { saved: false, reason: "expired" };
  const graded = gradeDailyRun(parsed.data);
  if (!graded.ok) return { saved: false, reason: "invalid" };
  if (!graded.run.passed) return { saved: false, reason: "not-passed" };
  const { improved } = await recordDailyResult(getDb(), userId, graded.run);
  revalidatePath("/daily");
  return { saved: true, improved };
}

const waitlistInput = z.object({
  plan: z.enum(["pro", "teams"]),
  source: z.string().min(1).max(40),
  email: z.string().trim().email().max(254).optional(),
  priceVariant: z.string().max(40).optional(),
  priceCents: z.number().int().min(0).max(1_000_000).optional(),
});
export type WaitlistInput = z.infer<typeof waitlistInput>;
export type WaitlistResult =
  | { joined: true; already: boolean }
  | { joined: false; reason: "unavailable" | "invalid-email" };

/** Join a paid plan's waitlist. Signed-in people join with their account's email. */
export async function joinWaitlist(input: WaitlistInput): Promise<WaitlistResult> {
  if (!isDbConfigured()) return { joined: false, reason: "unavailable" };
  const parsed = waitlistInput.safeParse(input);
  if (!parsed.success) return { joined: false, reason: "invalid-email" };
  let email = parsed.data.email;
  let userId: string | null = null;
  if (isAuthConfigured()) {
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
      email = session.user.email ?? email;
    }
  }
  if (!email) return { joined: false, reason: "invalid-email" };
  const { added } = await addToWaitlist(getDb(), { ...parsed.data, email, userId });
  return { joined: true, already: !added };
}

export type RoleFormState = { error?: string; done?: boolean };

/** Admin-only: change a person's role (form action on the admin user page). */
export async function changeRole(_prev: RoleFormState, form: FormData): Promise<RoleFormState> {
  const actorId = await currentUserId();
  if (!actorId) return { error: "Sign in again to make changes." };
  const targetId = String(form.get("userId") ?? "");
  const role = form.get("role");
  if (role !== "client" && role !== "admin") return { error: "Choose a role." };

  const result = await setRole(getDb(), actorId, targetId, role as Role);
  if (!result.ok) {
    return {
      error: {
        "not-admin": "Only admins can change roles.",
        "not-found": "That person no longer exists.",
        "last-admin": "You can't remove the last admin. Make someone else an admin first.",
      }[result.reason],
    };
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/users/${targetId}`);
  return { done: true };
}
