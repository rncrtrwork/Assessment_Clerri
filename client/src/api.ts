import type { BulkDeleteResult, Doc } from './types';

/** Must match TITLE_MAX_LENGTH in server/src/documents/dto/create-document.dto.ts. */
export const TITLE_MAX_LENGTH = 200;

/**
 * A failed API request. `userMessage` is the server's explanation for client errors (4xx),
 * which is safe and useful to show; it is null for server errors and unreadable responses.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly userMessage: string | null,
  ) {
    super(`Request failed with status ${status}${userMessage ? `: ${userMessage}` : ''}`);
    this.name = 'ApiError';
  }
}

async function readUserMessage(response: Response): Promise<string | null> {
  if (response.status < 400 || response.status >= 500) return null;
  try {
    // Nest sends { message: string | string[] }; ValidationPipe uses an array, one entry per field.
    const body = await response.json();
    const message = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    return typeof message === 'string' && message ? message : null;
  } catch {
    return null;
  }
}

async function request(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readUserMessage(response));
  }

  return response.json();
}

export function fetchDocuments(): Promise<Doc[]> {
  return request('/documents');
}

export function createDocument(title: string): Promise<Doc> {
  return request('/documents', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function bulkDeleteDocuments(ids: string[]): Promise<BulkDeleteResult> {
  return request('/documents/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}
