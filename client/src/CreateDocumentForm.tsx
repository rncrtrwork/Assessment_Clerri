import { useState } from 'react';
import { TITLE_MAX_LENGTH } from './api';

/** Show the character counter once the title is this close to the limit. */
const COUNTER_THRESHOLD = Math.floor(TITLE_MAX_LENGTH * 0.8);

/**
 * Counts characters the way the server's @MaxLength does (validator.js isLength): an emoji
 * stored as a surrogate pair counts once, and emoji presentation selectors don't count.
 * Plain `string.length` would count 😀 as 2 and block titles the server accepts.
 */
function titleLength(value: string) {
  const surrogatePairs = value.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g)?.length ?? 0;
  const presentationSelectors = value.match(/[︎️]/g)?.length ?? 0;
  return value.length - surrogatePairs - presentationSelectors;
}

interface CreateDocumentFormProps {
  /** Resolves true when the document was created; false keeps the typed title so the user can fix it. */
  onCreate: (title: string) => Promise<boolean>;
}

export default function CreateDocumentForm({ onCreate }: CreateDocumentFormProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Measure what will be saved: the server trims before checking the limit.
  const trimmed = title.trim();
  const length = titleLength(trimmed);
  const overBy = length - TITLE_MAX_LENGTH;
  const tooLong = overBy > 0;
  const showCounter = length >= COUNTER_THRESHOLD;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trimmed || tooLong) return;

    setSubmitting(true);
    try {
      if (await onCreate(trimmed)) {
        setTitle('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* No maxLength on purpose: it silently drops typed or pasted text past the limit.
          Keeping the text and saying how much is too long lets the user decide what to cut. */}
      <form className="create-form" onSubmit={handleSubmit}>
        <label htmlFor="new-document-title">New document</label>
        <input
          id="new-document-title"
          value={title}
          placeholder="e.g. Q4 Vendor Agreement"
          aria-invalid={tooLong || undefined}
          aria-describedby={showCounter ? 'new-document-title-count' : undefined}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit" disabled={submitting || !trimmed || tooLong}>
          Create
        </button>
      </form>
      {showCounter && (
        <div id="new-document-title-count" className={tooLong ? 'char-count over' : 'char-count muted'}>
          {length} / {TITLE_MAX_LENGTH}
          {tooLong && ` - ${overBy} ${overBy === 1 ? 'character' : 'characters'} too long`}
        </div>
      )}
      {/* Announced once when the limit is crossed; the text doesn't change per keystroke, so
          screen readers aren't interrupted while the user types or deletes. */}
      <span className="visually-hidden" role="status">
        {tooLong ? `Title is over the ${TITLE_MAX_LENGTH}-character limit.` : ''}
      </span>
    </>
  );
}
