/**
 * Current and best streaks from the days a player solved, newest first. A
 * streak survives until the end of today: solving yesterday but not yet
 * today still counts.
 */
export function streakFrom(
  solvedDaysDesc: number[],
  today: number,
): { current: number; best: number } {
  const days = [...new Set(solvedDaysDesc)].sort((a, b) => b - a);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    run = prev !== null && d === prev - 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  let current = 0;
  let expect = days[0] === today ? today : today - 1;
  for (const d of days) {
    if (d > today) continue;
    if (d !== expect) break;
    current += 1;
    expect -= 1;
  }
  return { current, best };
}
