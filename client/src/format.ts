export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Joins titles with commas, collapsing anything past `max` into "and N more". */
export function listTitles(titles: string[], max = Number.POSITIVE_INFINITY) {
  if (titles.length <= max) return titles.join(', ');
  return `${titles.slice(0, max).join(', ')} and ${titles.length - max} more`;
}

/** Titles quoted inside a sentence are cut to this many characters so messages stay readable. */
export const SHORT_TITLE_LENGTH = 60;

/** Shortens a title for use inside a sentence, ending in "…" when it was cut. */
export function shortTitle(title: string, max = SHORT_TITLE_LENGTH) {
  const chars = [...title]; // by code point, so an emoji is never split in half
  return chars.length <= max ? title : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

export function lockedLabel(title: string, lockedBy: string) {
  return `${shortTitle(title)} (locked by ${lockedBy})`;
}
