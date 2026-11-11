import { BadRequestException, Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { BulkDeleteResult } from './document.model';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async findAll() {
    return this.documentsService.findAll();
  }

  @Post()
  async create(@Body() dto: { title: string }) {
    return this.documentsService.create(dto.title);
  }

  // Always 200 with per-document results, even when some documents were skipped:
  // the request itself succeeded, and the body says exactly what happened to each ID.
  @Post('bulk-delete')
  @HttpCode(200)
  async bulkDelete(@Body() dto: { ids?: unknown }): Promise<BulkDeleteResult> {
    const ids = dto?.ids;

    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
      throw new BadRequestException('`ids` must be an array of strings');
    }

    return this.documentsService.bulkDelete(ids);
  }
}
