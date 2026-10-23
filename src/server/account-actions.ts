"use server";

import { auth, signOut } from "@/auth";
import { getDb } from "@/db";
import { isAuthConfigured } from "./config";
import { deleteAccount } from "./users";

export type DeleteFormState = { error?: string };

/** Delete the signed-in person's account, after they type "delete" to confirm. */
export async function deleteMyAccount(
  _prev: DeleteFormState,
  form: FormData,
): Promise<DeleteFormState> {
  const session = isAuthConfigured() ? await auth() : null;
  const userId = session?.user?.id;
  if (!userId) return { error: "Sign in again to delete your account." };
  if (
    String(form.get("confirm") ?? "")
      .trim()
      .toLowerCase() !== "delete"
  ) {
    return { error: "Type delete to confirm." };
  }

  const result = await deleteAccount(getDb(), userId);
  if (!result.ok) {
    return {
      error:
        result.reason === "last-admin"
          ? "You're the only admin. Make someone else an admin first."
          : "That account no longer exists.",
    };
  }
  // The sessions went with the account; this clears the cookie and leaves.
  await signOut({ redirectTo: "/" });
  return {};
}
