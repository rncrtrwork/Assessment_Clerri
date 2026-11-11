import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { DocumentsStore } from './documents.store';

describe('DocumentsService', () => {
  let moduleRef: TestingModule;
  let service: DocumentsService;
  let store: DocumentsStore;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [DocumentsService, DocumentsStore],
    }).compile();

    await moduleRef.init();

    service = moduleRef.get(DocumentsService);
    store = moduleRef.get(DocumentsStore);
  });

  it('returns the full list of documents', async () => {
    const documents = await service.findAll();

    expect(documents).toHaveLength(20);
    expect(documents[0]).toMatchObject({ id: 'doc-01', title: 'Q3 Vendor Agreement' });
  });

  it('creates a document with the given title', async () => {
    const created = await service.create('Renewal Terms — Acme');

    expect(created.title).toBe('Renewal Terms — Acme');
    expect(created.lockedBy).toBeNull();
    expect(created.id).toBeTruthy();
  });

  it('deletes an unlocked document', async () => {
    await service.delete('doc-01');

    expect(store.findById('doc-01')).toBeUndefined();
    expect(store.all()).toHaveLength(19);
  });

  it('reflects creates and deletes in the list', async () => {
    const created = await service.create('Fresh Doc');
    await service.delete('doc-01');

    const ids = (await service.findAll()).map((doc) => doc.id);

    expect(ids).toContain(created.id);
    expect(ids).not.toContain('doc-01');
  });

  describe('bulkDelete', () => {
    // doc-03 is locked by priya.raman in the seed data; doc-01, doc-02 and doc-04 are unlocked.

    it('deletes unlocked documents and reports locked ones without stopping', async () => {
      const result = await service.bulkDelete(['doc-01', 'doc-03', 'doc-04']);

      expect(result).toEqual({
        deleted: ['doc-01', 'doc-04'],
        failed: [{ id: 'doc-03', reason: 'locked', lockedBy: 'priya.raman' }],
      });
      expect(store.findById('doc-01')).toBeUndefined();
      expect(store.findById('doc-03')).toBeDefined();
      expect(store.findById('doc-04')).toBeUndefined();
    });

    it('gives the same outcome whatever the order of the IDs', async () => {
      const result = await service.bulkDelete(['doc-03', 'doc-04', 'doc-01']);

      expect([...result.deleted].sort()).toEqual(['doc-01', 'doc-04']);
      expect(result.failed).toEqual([{ id: 'doc-03', reason: 'locked', lockedBy: 'priya.raman' }]);
    });

    it('reports missing IDs as not_found and still deletes the rest', async () => {
      const result = await service.bulkDelete(['doc-99', 'doc-02']);

      expect(result).toEqual({
        deleted: ['doc-02'],
        failed: [{ id: 'doc-99', reason: 'not_found' }],
      });
    });

    it('collapses duplicate IDs instead of failing on the second copy', async () => {
      const result = await service.bulkDelete(['doc-02', 'doc-02']);

      expect(result).toEqual({ deleted: ['doc-02'], failed: [] });
      expect(store.all()).toHaveLength(19);
    });

    it('is safe to retry: already-deleted IDs come back as not_found', async () => {
      await service.bulkDelete(['doc-02']);
      const retry = await service.bulkDelete(['doc-02']);

      expect(retry).toEqual({ deleted: [], failed: [{ id: 'doc-02', reason: 'not_found' }] });
    });

    it('does nothing for an empty list', async () => {
      const result = await service.bulkDelete([]);

      expect(result).toEqual({ deleted: [], failed: [] });
      expect(store.all()).toHaveLength(20);
    });
  });
});
