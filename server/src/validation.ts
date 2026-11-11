import { ValidationPipe } from '@nestjs/common';

/**
 * The app-wide request validation, shared by main.ts and the tests so both run the same rules.
 * - transform: run DTO @Transform hooks (e.g. trimming titles) and hand controllers DTO instances.
 * - whitelist + forbidNonWhitelisted: reject fields a DTO doesn't declare instead of passing them on.
 * - stopAtFirstError: one clear message per field, not every rule that failed.
 */
export function createValidationPipe() {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    stopAtFirstError: true,
  });
}
