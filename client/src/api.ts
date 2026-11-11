import type { Doc } from './types';

async function request(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  return response.json();
}

export function fetchDocuments(): Promise<Doc[]> {
  return request('/documents');
}

export function createDocument(title: string) {
  return request('/documents', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function bulkDeleteDocuments(ids: string[]) {
  return request('/documents/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}
