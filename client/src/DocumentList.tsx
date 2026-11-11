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
    // On narrow screens the table scrolls inside this wrapper instead of squeezing the title column.
    <div className="table-scroll">
      <table className="documents">
        {/* Fixed column widths (see table-layout in styles.css); the title column takes the rest. */}
        <colgroup>
          <col style={{ width: 60 }} />
          <col />
          <col style={{ width: 130 }} />
          <col style={{ width: 190 }} />
        </colgroup>
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
              <td className="title-cell" title={doc.title}>
                {doc.title}
              </td>
              <td className="muted date-cell">{formatDate(doc.updatedAt)}</td>
              <td>{isLocked(doc) ? <span className="lock">Locked by {doc.lockedBy}</span> : <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
