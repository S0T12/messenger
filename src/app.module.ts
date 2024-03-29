import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { PrismaModule } from './db-prisma/prisma.module';
@Module({
  imports: [PrismaModule, ChatModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
