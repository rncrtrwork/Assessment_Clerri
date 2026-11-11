import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createValidationPipe } from './validation';

const PORT = 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(createValidationPipe());
  await app.listen(PORT);
  console.log(`API listening on http://localhost:${PORT}`);
}

bootstrap();
