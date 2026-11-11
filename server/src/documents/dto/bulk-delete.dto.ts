import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export const BULK_DELETE_MAX_IDS = 1000;

export class BulkDeleteDto {
  // Checked bottom-up, stopping at the first failure (see CreateDocumentDto): array → size → entries.
  @IsString({ each: true, message: 'Each document ID must be a string.' })
  @ArrayMaxSize(BULK_DELETE_MAX_IDS, { message: `Bulk delete accepts at most ${BULK_DELETE_MAX_IDS} IDs per request.` })
  @IsArray({ message: '`ids` must be an array of document IDs.' })
  ids!: string[];
}
