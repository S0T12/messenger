import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const ioAdapter = new IoAdapter(app);
  await ioAdapter.createIOServer(8089, { cors: { origin: '*' }});
  app.useWebSocketAdapter(ioAdapter);
  app.enableCors();

  await app.listen(3000);
}
bootstrap();
