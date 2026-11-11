import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BulkDeleteResult, Document } from './document.model';
import { DocumentsStore } from './documents.store';

@Injectable()
export class DocumentsService {
  constructor(private readonly store: DocumentsStore) {}

  // Read from the store on every request. A startup snapshot used to live here, but it never
  // saw creates or deletes; the store is in memory and small, so a cache saves nothing.
  async findAll(): Promise<Document[]> {
    return this.store.all();
  }

  async create(title: string): Promise<Document> {
    return this.store.insert(title);
  }

  async delete(id: string): Promise<void> {
    const document = this.store.findById(id);

    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    if (document.lockedBy !== null) {
      throw new ConflictException(`Document ${id} is locked by ${document.lockedBy}`);
    }

    this.store.remove(id);
  }

  /**
   * Deletes every unlocked document in `ids` and reports the rest, instead of stopping at the
   * first locked or missing one. Duplicate IDs are collapsed, so the outcome does not depend on
   * how often or in what order an ID appears.
   */
  async bulkDelete(ids: string[]): Promise<BulkDeleteResult> {
    const result: BulkDeleteResult = { deleted: [], failed: [] };

    for (const id of new Set(ids)) {
      const document = this.store.findById(id);

      if (!document) {
        result.failed.push({ id, reason: 'not_found' });
      } else if (document.lockedBy !== null) {
        result.failed.push({ id, reason: 'locked', lockedBy: document.lockedBy });
      } else {
        this.store.remove(id);
        result.deleted.push(id);
      }
    }

    return result;
  }
}
