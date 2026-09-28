import { NestFactory } from '@nestjs/core';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

@Catch()
class SafeGlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resBody: any = exception.getResponse();
      const message =
        typeof resBody === 'string'
          ? resBody
          : resBody?.message || 'Request validation failed';
      return response.status(status).json({
        statusCode: status,
        message,
      });
    }

    this.logger.error('Unhandled exception', (exception as any)?.message);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        'An unexpected error occurred while processing your request. Please try again.',
    });
  }
}

async function bootstrap() {
  const logger = new Logger('CodeLensAI');
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: false,
    }),
  );
  app.useGlobalFilters(new SafeGlobalExceptionFilter());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = Number(process.env.PORT || 4005);
  await app.listen(port);
  logger.log(`CodeLens AI Backend listening on http://localhost:${port}/api`);
}

bootstrap();
