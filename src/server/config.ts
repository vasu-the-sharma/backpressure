/** Whether a database is connected (the waitlist needs only this; accounts need more). */
export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Whether accounts can work in this environment: a database and Google sign-in are both set up. */
export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL &&
      process.env.AUTH_SECRET &&
      process.env.AUTH_GOOGLE_ID &&
      process.env.AUTH_GOOGLE_SECRET,
  );
}

/**
 * Emails that are made admins when they sign in, from `ADMIN_EMAILS`
 * (comma-separated). This is how the first admin is created; after that,
 * admins can promote others from the admin pages.
 */
export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
