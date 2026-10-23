/**
 * Glues the last word (usually the unit, e.g. "원") to the number before it,
 * so "1억 3,138만 원" can wrap after "1억" but never leaves "원" alone on a line.
 */
export const keepUnitTogether = (text: string) => text.replace(/ (?=\S+$)/, ' ');
