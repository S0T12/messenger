import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { CacheModule } from '@nestjs/cache-manager';
import type { RedisClientOptions } from 'redis';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register<RedisClientOptions>({
      isGlobal: true,
      store: redisStore,
      url: 'redis://localhost:6379',
      ttl: 100,
    }),
    ChatModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
