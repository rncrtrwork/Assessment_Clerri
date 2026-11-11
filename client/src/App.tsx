import { useCallback, useEffect, useState } from 'react';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';
import CreateDocumentForm from './CreateDocumentForm';
import DocumentList from './DocumentList';
import { ApiError, bulkDeleteDocuments, createDocument, fetchDocuments } from './api';
import { listTitles, lockedLabel, plural, shortTitle } from './format';
import type { BulkDeleteResult, Doc } from './types';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/** The server's explanation for a rejected request, or the generic message for anything else. */
function errorMessage(err: unknown) {
  return err instanceof ApiError && err.userMessage ? err.userMessage : GENERIC_ERROR;
}

interface Notice {
  kind: 'success' | 'warning';
  text: string;
}

/** The selection split as it was when the user clicked Delete, shown in the confirm dialog. */
interface PendingDelete {
  deletable: Doc[];
  locked: Doc[];
}

function summarizeResult(result: BulkDeleteResult, titleOf: (id: string) => string): Notice {
  const parts = [result.deleted.length > 0 ? `Deleted ${plural(result.deleted.length, 'document')}.` : 'Nothing was deleted.'];

  const locked = result.failed.flatMap((failure) => (failure.reason === 'locked' ? [failure] : []));
  const notFound = result.failed.filter((failure) => failure.reason === 'not_found');

  if (locked.length > 0) {
    const labels = locked.map((failure) => lockedLabel(titleOf(failure.id), failure.lockedBy));
    parts.push(
      `Skipped ${plural(locked.length, 'locked document')}: ${listTitles(labels)}.`,
      locked.length === 1 ? 'It is still selected.' : 'They are still selected.',
    );
  }

  if (notFound.length > 0) {
    parts.push(`${plural(notFound.length, 'document')} had already been deleted: ${listTitles(notFound.map((failure) => titleOf(failure.id)))}.`);
  }

  return { kind: result.failed.length > 0 ? 'warning' : 'success', text: parts.join(' ') };
}

export default function App() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocuments(await fetchDocuments());
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (title: string): Promise<boolean> => {
    setError(null);
    setNotice(null);
    try {
      await createDocument(title);
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
    // load() reports its own errors; the document was created either way.
    await load();
    return true;
  };

  // Step 1: the Delete button opens the confirm dialog (or explains why there is nothing to delete).
  const handleDeleteSelected = () => {
    const selectedDocs = documents.filter((doc) => selectedIds.includes(doc.id));
    const locked = selectedDocs.filter((doc) => doc.lockedBy !== null);
    const deletable = selectedDocs.filter((doc) => doc.lockedBy === null);

    setError(null);
    setNotice(null);

    if (deletable.length === 0) {
      const labels = locked.map((doc) => lockedLabel(doc.title, doc.lockedBy ?? 'unknown'));
      setNotice({ kind: 'warning', text: `Nothing to delete. The selected documents are locked: ${listTitles(labels)}.` });
      return;
    }

    setPendingDelete({ deletable, locked });
  };

  // Step 2: the user confirmed in the dialog.
  const handleConfirmDelete = async () => {
    setPendingDelete(null);

    // Titles come from the list as it was before the delete, so deleted documents can still be named.
    const titleOf = (id: string) => shortTitle(documents.find((doc) => doc.id === id)?.title ?? id);

    setDeleting(true);
    try {
      // Send the whole selection: the server is the source of truth for locks, which may have
      // changed since the list was loaded.
      const result = await bulkDeleteDocuments(selectedIds);
      setNotice(summarizeResult(result, titleOf));
      setSelectedIds(result.failed.flatMap((failure) => (failure.reason === 'locked' ? [failure.id] : [])));
    } catch (err) {
      // Keep the selection and let the reload show what is left.
      setError(errorMessage(err));
    } finally {
      setDeleting(false);
      await load();
    }
  };

  return (
    <main className="app">
      <header className="app-header">
        <h1>Documents</h1>
        <button
          type="button"
          className="danger"
          onClick={handleDeleteSelected}
          disabled={selectedIds.length === 0 || deleting}
        >
          {deleting ? 'Deleting…' : `Delete selected${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}
        </button>
      </header>

      <CreateDocumentForm onCreate={handleCreate} />

      {error && (
        <p className="status error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={`status ${notice.kind}`} role="status">
          {notice.text}
        </p>
      )}
      {loading ? (
        <p className="status">Loading documents…</p>
      ) : (
        <DocumentList
          documents={documents}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}

      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        deletable={pendingDelete?.deletable ?? []}
        locked={pendingDelete?.locked ?? []}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  );
}
