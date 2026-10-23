"use server";

import { auth } from "@/auth";
import { dailyNumberAt } from "@/content/daily/calendar";
import { priceFor, quotedPrice, variantId } from "@/content/pricing/plans";
import { getDb } from "@/db";
import type { Role } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { clientIp, networkFingerprint, screenSignup } from "./abuse";
import { isAuthConfigured, isDbConfigured, isEmailConfigured } from "./config";
import {
  type DailyRunInput,
  type WaitlistEntry,
  addToWaitlist,
  countRecentFromNetwork,
  dailyRunInput,
  forgetNetworkFingerprints,
  gradeDailyRun,
  leaveWaitlist,
  recordDailyResult,
  waitlistEntries,
} from "./daily";
import { sendEmails, waitlistConfirmation, waitlistEmail } from "./email";
import {
  type ChallengeRunInput,
  type QuizAttemptInput,
  challengeRunInput,
  gradeChallengeRun,
  gradeQuizAttempt,
  quizAttemptInput,
} from "./grade";
import { recordSurvey } from "./pricing";
import { setProAccess } from "./pro";
import { insertChallengeRun, insertQuizAttempt } from "./progress";
import { readWaitlistToken } from "./tokens";
import { setRole } from "./users";
import { priceVisitor } from "./visitor";

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
  source: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
  email: z.string().trim().email().max(254).optional(),
  /** Set when a Pro price was on screen: which billing period the person chose. */
  period: z.enum(["monthly", "annual"]).optional(),
  /** A field people never see. Bots fill it in. */
  trap: z.string().max(500).optional(),
  /** Milliseconds from the form appearing to it being sent. */
  elapsedMs: z.number().int().min(0).optional(),
});
export type WaitlistInput = z.infer<typeof waitlistInput>;
export type WaitlistResult =
  | { joined: true; already: boolean }
  | { joined: false; reason: "unavailable" | "invalid-email" | "rate-limited" };

const HOUR_MS = 60 * 60 * 1000;

/**
 * Join a paid plan's waitlist. Signed-in people join with their account's
 * email; signed-out sign-ups are screened for bots first. New members get one
 * confirmation email when email is set up.
 */
export async function joinWaitlist(input: WaitlistInput): Promise<WaitlistResult> {
  if (!isDbConfigured()) return { joined: false, reason: "unavailable" };
  const parsed = waitlistInput.safeParse(input);
  if (!parsed.success) return { joined: false, reason: "invalid-email" };
  const { plan, source, period, trap, elapsedMs } = parsed.data;
  const db = getDb();

  const session = isAuthConfigured() ? await auth() : null;
  const userId = session?.user?.id ?? null;
  const email = (userId && session?.user?.email) || parsed.data.email;
  if (!email) return { joined: false, reason: "invalid-email" };

  // A Google account already vouches for a person; everyone else is screened.
  let ipHash: string | null = null;
  if (!userId) {
    ipHash = networkFingerprint(clientIp(await headers()));
    const recentFromNetwork = ipHash
      ? await countRecentFromNetwork(db, ipHash, new Date(Date.now() - HOUR_MS))
      : 0;
    const screen = screenSignup({ trap, elapsedMs, recentFromNetwork });
    // A bot is told it worked, so it learns nothing; nothing is stored.
    if (screen === "bot") return { joined: true, already: false };
    if (screen === "rate-limited") return { joined: false, reason: "rate-limited" };
  }

  // The price the person saw comes from the server, never from the client.
  // Only visitors in the test count toward it; anyone else keeps just the quote.
  let priced: Partial<WaitlistEntry> = {};
  if (plan === "pro" && period) {
    const v = await priceVisitor();
    const quote = {
      period,
      priceVariant: variantId(v.segment, v.arm, period),
      priceCents: priceFor(v.segment, v.arm, period) * 100,
    };
    priced = v.randomized
      ? { ...quote, arm: v.arm, segment: v.segment, visitorId: v.visitorId }
      : quote;
  }

  const { added } = await addToWaitlist(db, { plan, source, email, userId, ipHash, ...priced });
  await forgetNetworkFingerprints(db, new Date(Date.now() - 24 * HOUR_MS));
  if (added && isEmailConfigured()) {
    const price = quotedPrice(priced.priceVariant ?? null, priced.priceCents ?? null);
    const note = waitlistConfirmation(email, plan, price);
    // Sent after the response; a failed send never fails the join.
    if (note) after(() => sendEmails([note]).catch(() => {}));
  }
  return { joined: true, already: !added };
}

const surveyInput = z.object({
  tooCheap: z.number().int().min(0).max(1_000_000),
  cheap: z.number().int().min(0).max(1_000_000),
  expensive: z.number().int().min(0).max(1_000_000),
  tooExpensive: z.number().int().min(0).max(1_000_000),
});
export type PriceSurveyInput = z.infer<typeof surveyInput>;

/**
 * Van Westendorp answers for a monthly Pro price, in the visitor's currency.
 * Only visitors in the price test answer, once each (a repeat is ignored).
 * Stored as given; the analysis sets contradictory answers aside and counts them.
 */
export async function submitPriceSurvey(input: PriceSurveyInput): Promise<{ saved: boolean }> {
  if (!isDbConfigured()) return { saved: false };
  const parsed = surveyInput.safeParse(input);
  if (!parsed.success) return { saved: false };
  const v = await priceVisitor();
  if (!v.visitorId) return { saved: false };
  await recordSurvey(getDb(), { visitorId: v.visitorId, segment: v.segment, ...parsed.data });
  return { saved: true };
}

export type LeaveState = { done?: boolean; error?: string };

/** Leave every waitlist, from the signed link in a waitlist email. */
export async function leaveWaitlistWithToken(
  _prev: LeaveState,
  form: FormData,
): Promise<LeaveState> {
  const email = readWaitlistToken(String(form.get("t") ?? ""));
  if (!email) return { error: "This link isn't valid. Use the one in your latest email." };
  if (!isDbConfigured()) return { error: "Couldn't do that just now. Try again later." };
  await leaveWaitlist(getDb(), email);
  return { done: true };
}

export type MailFormState = { error?: string; sent?: number; failed?: number; test?: boolean };

const mailInput = z.object({
  plan: z.enum(["pro", "teams"]),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
  mode: z.enum(["test", "all"]),
});

/**
 * Admin-only: email one plan's waitlist, or send yourself a test first.
 * `{price}` in the message becomes the price each person was quoted.
 */
export async function emailWaitlist(_prev: MailFormState, form: FormData): Promise<MailFormState> {
  const session = isAuthConfigured() ? await auth() : null;
  if (session?.user?.role !== "admin" || !session.user.email) {
    return { error: "Only admins can send email." };
  }
  if (!isEmailConfigured()) {
    return { error: "Email isn't set up. Add RESEND_API_KEY and EMAIL_FROM, then redeploy." };
  }
  const parsed = mailInput.safeParse({
    plan: form.get("plan"),
    subject: form.get("subject"),
    body: form.get("body"),
    mode: form.get("mode"),
  });
  if (!parsed.success) return { error: "Choose a plan and write a subject and a message." };
  const { plan, subject, body, mode } = parsed.data;
  if (mode === "all" && form.get("confirm") !== "yes") {
    return { error: "Tick the box to confirm sending to everyone on the list." };
  }

  const entries = await waitlistEntries(getDb(), plan);
  // The test goes to you, with the first quoted price on the list filling {price}.
  const sample = entries.find((e) => e.priceVariant) ?? null;
  const recipients =
    mode === "test"
      ? [
          {
            email: session.user.email,
            priceVariant: sample?.priceVariant ?? null,
            priceCents: sample?.priceCents ?? null,
          },
        ]
      : entries;
  if (recipients.length === 0) return { error: "No one is on that waitlist yet." };

  const emails = recipients.flatMap((r) => {
    const e = waitlistEmail(
      r.email,
      plan,
      subject,
      body,
      quotedPrice(r.priceVariant, r.priceCents),
    );
    return e ? [e] : [];
  });
  const { sent, failed } = await sendEmails(emails);
  return { sent, failed: failed + (recipients.length - emails.length), test: mode === "test" };
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

export type ProFormState = { error?: string; done?: boolean };

/** Admin-only: give someone Pro for 30 or 365 more days, or take it away (form action). */
export async function changeProAccess(_prev: ProFormState, form: FormData): Promise<ProFormState> {
  const actorId = await currentUserId();
  if (!actorId) return { error: "Sign in again to make changes." };
  const targetId = String(form.get("userId") ?? "");
  const days = Number(form.get("days"));
  if (![0, 30, 365].includes(days)) return { error: "Choose how long." };

  const result = await setProAccess(getDb(), actorId, targetId, days);
  if (!result.ok) {
    return {
      error: {
        "not-admin": "Only admins can change Pro access.",
        "not-found": "That person no longer exists.",
      }[result.reason],
    };
  }
  revalidatePath(`/admin/users/${targetId}`);
  return { done: true };
}
