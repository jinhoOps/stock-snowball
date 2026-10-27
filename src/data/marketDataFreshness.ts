/** Last date of each dataset in a catalog manifest, keyed by asset id. */
const endDates = (manifestText: string): Map<string, string> => {
  const assets = (JSON.parse(manifestText) as { assets?: Record<string, { endDate?: unknown } | null> }).assets ?? {};
  return new Map(Object.entries(assets).flatMap(([id, coverage]) =>
    typeof coverage?.endDate === 'string' ? [[id, coverage.endDate] as const] : []));
};

/**
 * Whether catalog `a` reaches a later day than `b` on some dataset and falls behind on none.
 * Release names can't tell this: bundled data and remote releases are named differently even when they hold the same days.
 */
export const isNewerCatalog = (a: string, b: string): boolean => {
  const ours = endDates(a);
  let ahead = false;
  for (const [id, theirEnd] of endDates(b)) {
    const ourEnd = ours.get(id);
    if (ourEnd === undefined || ourEnd < theirEnd) return false;
    if (ourEnd > theirEnd) ahead = true;
  }
  return ahead;
};
