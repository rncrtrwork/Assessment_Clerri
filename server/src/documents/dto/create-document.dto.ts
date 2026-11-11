import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const TITLE_MAX_LENGTH = 200;

export class CreateDocumentDto {
  // Trim before validating, so "   " counts as empty and stored titles carry no stray spaces.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  // class-validator runs these bottom-up and the pipe stops at the first failure,
  // so the most basic check sits at the bottom: required → text → length.
  @MaxLength(TITLE_MAX_LENGTH, { message: `Title must be ${TITLE_MAX_LENGTH} characters or fewer.` })
  @IsString({ message: 'Title must be text.' })
  @IsNotEmpty({ message: 'Title is required.' })
  title!: string;
}
