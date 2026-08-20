import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Confia só no primeiro salto (o Caddy, único proxy na frente da API) —
  // sem isso, req.ip sempre retorna o IP interno do Caddy pra todo mundo,
  // o que quebra tanto o rate limit por IP quanto o IP registrado na
  // auditoria (todo mundo apareceria como o mesmo "usuário").
  app.set('trust proxy', 1);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    app.enableCors({ origin: corsOrigin.split(','), credentials: true });
  }

  app.setGlobalPrefix('api');

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API rodando na porta ${port}`);
}

bootstrap();
