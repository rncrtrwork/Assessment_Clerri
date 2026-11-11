export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Joins titles with commas, collapsing anything past `max` into "and N more". */
export function listTitles(titles: string[], max = Number.POSITIVE_INFINITY) {
  if (titles.length <= max) return titles.join(', ');
  return `${titles.slice(0, max).join(', ')} and ${titles.length - max} more`;
}

export function lockedLabel(title: string, lockedBy: string) {
  return `${title} (locked by ${lockedBy})`;
}
