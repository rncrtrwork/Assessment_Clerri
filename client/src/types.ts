export interface Doc {
  id: string;
  title: string;
  updatedAt: string;
  /** Username of the lock holder, or null when the document is unlocked. Matches the API field. */
  lockedBy: string | null;
}
