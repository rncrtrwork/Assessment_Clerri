import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { BulkDeleteResult } from './document.model';
import { DocumentsService } from './documents.service';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { CreateDocumentDto } from './dto/create-document.dto';

// Request bodies are validated by the global ValidationPipe (see validation.ts) against these DTOs,
// so the handlers only ever see well-formed input.
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async findAll() {
    return this.documentsService.findAll();
  }

  @Post()
  async create(@Body() dto: CreateDocumentDto) {
    return this.documentsService.create(dto.title);
  }

  // Always 200 with per-document results, even when some documents were skipped:
  // the request itself succeeded, and the body says exactly what happened to each ID.
  @Post('bulk-delete')
  @HttpCode(200)
  async bulkDelete(@Body() dto: BulkDeleteDto): Promise<BulkDeleteResult> {
    return this.documentsService.bulkDelete(dto.ids);
  }
}
