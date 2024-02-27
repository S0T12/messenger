import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable } from '@nestjs/common';
import { UserType } from '../common/types/user.type';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChatRepository } from '../db-prisma/repositories/chat.repository';

@Injectable()
@WebSocketGateway(8080, { cors: true })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly chatRepository: ChatRepository,
  ) {}

  @SubscribeMessage('connect')
  async handleConnection(@ConnectedSocket() client: Socket) {
    client.on('user', async (user: UserType) => {
      try {
        const branchExists = await this.chatRepository.branchExists(
          user.branch_name,
        );
        if (branchExists) {
          client.join(user.branch_name);
          await this.cacheManager.set(
            user.branch_name,
            JSON.stringify({ user, client }),
          );
          const usersInGroup = await this.cacheManager.get(user.branch_name);
          this.server.to(user.branch_name).emit('userJoin', usersInGroup);
        }
      } catch (error) {
        console.error('Error handling connection:', error);
      }
    });

    console.log(`Client connected: ${client.id}`);
  }

  @SubscribeMessage('disconnect')
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  async handleMessage(@ConnectedSocket() client: Socket, message) {
    client.emit(message);
  }
}
