import type { Doc } from './types';

interface DocumentListProps {
  documents: Doc[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function isLocked(doc: Doc) {
  return doc.lockedBy !== null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function DocumentList({ documents, selectedIds, onSelectionChange }: DocumentListProps) {
  const allSelected = documents.length > 0 && selectedIds.length === documents.length;

  const toggleAll = () => {
    onSelectionChange(allSelected ? [] : documents.map((doc) => doc.id));
  };

  const toggleOne = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((selected) => selected !== id) : [...selectedIds, id],
    );
  };

  return (
    <table className="documents">
      <thead>
        <tr>
          <th className="checkbox-cell">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          </th>
          <th>Title</th>
          <th>Last updated</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <tr key={doc.id} className={selectedIds.includes(doc.id) ? 'selected' : undefined}>
            <td className="checkbox-cell">
              <input
                type="checkbox"
                aria-label={`Select ${doc.title}`}
                checked={selectedIds.includes(doc.id)}
                onChange={() => toggleOne(doc.id)}
              />
            </td>
            <td>{doc.title}</td>
            <td className="muted">{formatDate(doc.updatedAt)}</td>
            <td>{isLocked(doc) ? <span className="lock">Locked by {doc.lockedBy}</span> : <span className="muted">—</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
