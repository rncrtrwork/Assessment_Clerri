import { useState } from 'react';
import { TITLE_MAX_LENGTH } from './api';

/** Show the character counter once the title is this close to the limit. */
const COUNTER_THRESHOLD = Math.floor(TITLE_MAX_LENGTH * 0.8);

interface CreateDocumentFormProps {
  /** Resolves true when the document was created; false keeps the typed title so the user can fix it. */
  onCreate: (title: string) => Promise<boolean>;
}

export default function CreateDocumentForm({ onCreate }: CreateDocumentFormProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      if (await onCreate(trimmed)) {
        setTitle('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const showCounter = title.length >= COUNTER_THRESHOLD;

  return (
    <>
      <form className="create-form" onSubmit={handleSubmit}>
        <label htmlFor="new-document-title">New document</label>
        <input
          id="new-document-title"
          value={title}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="e.g. Q4 Vendor Agreement"
          aria-describedby={showCounter ? 'new-document-title-count' : undefined}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit" disabled={submitting || !title.trim()}>
          Create
        </button>
      </form>
      {showCounter && (
        <div id="new-document-title-count" className="char-count muted">
          {title.length} / {TITLE_MAX_LENGTH}
        </div>
      )}
    </>
  );
}
