import { useCallback, useEffect, useState } from 'react';
import CreateDocumentForm from './CreateDocumentForm';
import DocumentList from './DocumentList';
import { bulkDeleteDocuments, createDocument, fetchDocuments } from './api';
import type { BulkDeleteResult, Doc } from './types';

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const MAX_TITLES_IN_CONFIRM = 5;

interface Notice {
  kind: 'success' | 'warning';
  text: string;
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function listTitles(titles: string[], max = Number.POSITIVE_INFINITY) {
  if (titles.length <= max) return titles.join(', ');
  return `${titles.slice(0, max).join(', ')} and ${titles.length - max} more`;
}

function lockedLabel(title: string, lockedBy: string) {
  return `${title} (locked by ${lockedBy})`;
}

function buildConfirmMessage(deletable: Doc[], locked: Doc[]) {
  const lines = [
    `Delete ${plural(deletable.length, 'document')}?`,
    listTitles(deletable.map((doc) => doc.title), MAX_TITLES_IN_CONFIRM),
  ];

  if (locked.length > 0) {
    const labels = locked.map((doc) => lockedLabel(doc.title, doc.lockedBy ?? 'unknown'));
    lines.push('', `${plural(locked.length, 'locked document')} will be skipped: ${listTitles(labels, MAX_TITLES_IN_CONFIRM)}`);
  }

  lines.push('', 'This cannot be undone.');
  return lines.join('\n');
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

  const handleCreate = async (title: string) => {
    setError(null);
    setNotice(null);
    try {
      await createDocument(title);
      await load();
    } catch {
      setError(GENERIC_ERROR);
    }
  };

  const handleDeleteSelected = async () => {
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

    if (!window.confirm(buildConfirmMessage(deletable, locked))) {
      return;
    }

    // Titles come from the list as it was before the delete, so deleted documents can still be named.
    const titleOf = (id: string) => documents.find((doc) => doc.id === id)?.title ?? id;

    setDeleting(true);
    try {
      // Send the whole selection: the server is the source of truth for locks, which may have
      // changed since the list was loaded.
      const result = await bulkDeleteDocuments(selectedIds);
      setNotice(summarizeResult(result, titleOf));
      setSelectedIds(result.failed.flatMap((failure) => (failure.reason === 'locked' ? [failure.id] : [])));
    } catch {
      // The outcome is unknown, so keep the selection and let the reload show what is left.
      setError(GENERIC_ERROR);
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
    </main>
  );
}
