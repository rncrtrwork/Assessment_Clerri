export interface Document {
  id: string;
  title: string;
  updatedAt: string;
  lockedBy: string | null;
}

export type BulkDeleteFailure =
  | { id: string; reason: 'locked'; lockedBy: string }
  | { id: string; reason: 'not_found' };

/** Per-document outcome of a bulk delete. Every requested ID appears in exactly one list. */
export interface BulkDeleteResult {
  deleted: string[];
  failed: BulkDeleteFailure[];
}
