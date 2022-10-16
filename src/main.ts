import { NestFactory } from '@nestjs/core';
import { useContainer } from 'class-validator';
import * as cookieParser from 'cookie-parser';

import { MongoExceptionFilter } from './exceptions/mongoose-exception-filter';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.useGlobalFilters(new MongoExceptionFilter());
  // app.useGlobalGuards(IpStatusGuard);
  app.use(cookieParser());
  await app.listen(3000);
}

bootstrap();
