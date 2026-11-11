import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createValidationPipe } from '../validation';
import { DocumentsModule } from './documents.module';

/**
 * Runs the real HTTP stack (controller + global ValidationPipe + DTOs) on a random port,
 * so these tests cover the same request handling as main.ts.
 */
describe('Documents API request validation', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [DocumentsModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalPipes(createValidationPipe());
    await app.listen(0);
    baseUrl = `${await app.getUrl()}/documents`.replace('[::1]', 'localhost');
  });

  afterEach(async () => {
    await app.close();
  });

  async function post(path: string, body: unknown) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }

  describe('POST /documents', () => {
    it('creates a document and trims the title', async () => {
      const { status, body } = await post('', { title: '  Renewal Terms  ' });

      expect(status).toBe(201);
      expect(body.title).toBe('Renewal Terms');
    });

    it('accepts a title of exactly 200 characters', async () => {
      const { status } = await post('', { title: 'a'.repeat(200) });

      expect(status).toBe(201);
    });

    it.each([
      ['a missing title', {}, 'Title is required.'],
      ['a whitespace-only title', { title: '   ' }, 'Title is required.'],
      ['a number', { title: 123 }, 'Title must be text.'],
      ['an object', { title: { x: 1 } }, 'Title must be text.'],
      ['a 201-character title', { title: 'a'.repeat(201) }, 'Title must be 200 characters or fewer.'],
      ['an unknown field', { title: 'Ok', lockedBy: 'someone' }, 'property lockedBy should not exist'],
    ])('rejects %s with 400', async (_label, payload, message) => {
      const { status, body } = await post('', payload);

      expect(status).toBe(400);
      expect(body.message).toEqual([message]);
    });

    it('does not store rejected documents', async () => {
      await post('', { title: { x: 1 } });
      const list = await (await fetch(baseUrl)).json();

      expect(list).toHaveLength(20);
    });
  });

  describe('POST /documents/bulk-delete', () => {
    it('passes a valid list through to the service', async () => {
      const { status, body } = await post('/bulk-delete', { ids: ['doc-01'] });

      expect(status).toBe(200);
      expect(body).toEqual({ deleted: ['doc-01'], failed: [] });
    });

    it.each([
      ['missing ids', {}, '`ids` must be an array of document IDs.'],
      ['ids as a string', { ids: 'doc-01' }, '`ids` must be an array of document IDs.'],
      ['a non-string id', { ids: ['doc-01', 42] }, 'Each document ID must be a string.'],
      ['more than 1000 ids', { ids: Array.from({ length: 1001 }, (_, i) => `doc-${i}`) }, 'Bulk delete accepts at most 1000 IDs per request.'],
    ])('rejects %s with 400', async (_label, payload, message) => {
      const { status, body } = await post('/bulk-delete', payload);

      expect(status).toBe(400);
      expect(body.message).toEqual([message]);
    });
  });
});
