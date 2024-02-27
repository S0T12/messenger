import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ChatRepository } from './repositories/chat.repository';

@Global()
@Module({
  imports: [],
  providers: [PrismaService, ChatRepository],
  exports: [PrismaService, ChatRepository],
})
export class PrismaModule {}
