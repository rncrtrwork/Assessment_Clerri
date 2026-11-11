import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsStore } from './documents.store';

describe('DocumentsController bulk-delete validation', () => {
  let controller: DocumentsController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [DocumentsService, DocumentsStore],
    }).compile();

    controller = moduleRef.get(DocumentsController);
  });

  it.each([
    ['missing ids', {}],
    ['ids as a string', { ids: 'doc-01' }],
    ['ids with a non-string entry', { ids: ['doc-01', 42] }],
  ])('rejects %s with 400', async (_label, body) => {
    await expect(controller.bulkDelete(body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('passes a valid list through to the service', async () => {
    await expect(controller.bulkDelete({ ids: ['doc-01'] })).resolves.toEqual({
      deleted: ['doc-01'],
      failed: [],
    });
  });
});
