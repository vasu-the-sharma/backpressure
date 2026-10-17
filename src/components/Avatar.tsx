/** A person's picture from their Google account, or their initials. */
export function Avatar({
  name,
  email,
  image,
  size = 28,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: number;
}) {
  const label = name || email || "?";
  const initials = label
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  if (image) {
    return (
      // Decorative: the person's name is always shown beside it.
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full border border-line-strong bg-fill object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-fill text-[11px] font-medium text-fg-2"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}
