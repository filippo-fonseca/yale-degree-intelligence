const LANGUAGE_LEVELS = ["L1", "L2", "L3", "L4", "L5"] as const;

/** Toggle a distributional tag; L-levels are mutually exclusive per course. */
export function toggleDistributionalTag(
  current: string[],
  dist: string,
): string[] {
  if (current.includes(dist)) {
    return current.filter((d) => d !== dist);
  }
  const isLang = (LANGUAGE_LEVELS as readonly string[]).includes(dist);
  if (isLang) {
    return [
      ...current.filter((d) => !(LANGUAGE_LEVELS as readonly string[]).includes(d)),
      dist,
    ];
  }
  return [...current, dist];
}
