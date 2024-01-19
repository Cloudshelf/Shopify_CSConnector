import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    Error.stackTraceLimit = 100;

    const app = await NestFactory.create(AppModule, { bodyParser: false });
    app.enableCors();
    app.enableShutdownHooks();

    await app.listen(process.env.PORT || 3100);
}
bootstrap();
