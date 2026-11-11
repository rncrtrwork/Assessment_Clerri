import { useLayoutEffect, useRef } from 'react';
import { plural } from './format';
import type { Doc } from './types';

const MAX_TITLES = 5;

interface ConfirmDeleteDialogProps {
  open: boolean;
  /** Selected documents that will be deleted. */
  deletable: Doc[];
  /** Selected documents that are locked and will be skipped. */
  locked: Doc[];
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation for bulk delete, built on the native <dialog> element. showModal() gives us
 * the backdrop, Esc to cancel, focus kept inside the dialog, and focus returned to the
 * Delete button on close, without a focus-trap library.
 */
export default function ConfirmDeleteDialog({ open, deletable, locked, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Layout effect, so the dialog closes before the browser paints the emptied content.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // Start on Cancel so an accidental Enter never deletes anything.
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const shownTitles = deletable.slice(0, MAX_TITLES);
  const hiddenCount = deletable.length - shownTitles.length;

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirm-delete-title"
      aria-describedby="confirm-delete-description"
      // Esc fires `cancel`; keep the parent's `open` state in charge of closing.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      // A click on the dialog element itself (not its content) is a click on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="confirm-dialog-body">
        <h2 id="confirm-delete-title">Delete {plural(deletable.length, 'document')}?</h2>

        <div id="confirm-delete-description">
          <ul className="confirm-dialog-list">
            {shownTitles.map((doc) => (
              <li key={doc.id}>{doc.title}</li>
            ))}
            {hiddenCount > 0 && <li className="muted">and {hiddenCount} more</li>}
          </ul>

          {locked.length > 0 && (
            <div className="confirm-dialog-warning">
              {plural(locked.length, 'locked document')} will be skipped:{' '}
              {locked.slice(0, MAX_TITLES).map((doc, index) => (
                <span key={doc.id}>
                  {index > 0 && ', '}
                  <strong>{doc.title}</strong> (locked by {doc.lockedBy})
                </span>
              ))}
              {locked.length > MAX_TITLES && ` and ${locked.length - MAX_TITLES} more`}
            </div>
          )}

          <p className="muted">This cannot be undone.</p>
        </div>

        <div className="confirm-dialog-actions">
          <button type="button" ref={cancelRef} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="danger" onClick={onConfirm}>
            Delete {deletable.length}
          </button>
        </div>
      </div>
    </dialog>
  );
}
