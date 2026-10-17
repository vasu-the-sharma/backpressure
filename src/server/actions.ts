"use server";

import { auth } from "@/auth";
import { getDb } from "@/db";
import type { Role } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { isAuthConfigured } from "./config";
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
