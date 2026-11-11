export interface Doc {
  id: string;
  title: string;
  updatedAt: string;
  /** Username of the lock holder, or null when the document is unlocked. Matches the API field. */
  lockedBy: string | null;
}

/** Response of POST /documents/bulk-delete. Mirrors BulkDeleteResult on the server. */
export interface BulkDeleteResult {
  deleted: string[];
  failed: Array<{ id: string; reason: 'locked'; lockedBy: string } | { id: string; reason: 'not_found' }>;
}
