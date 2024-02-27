import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChatRepository } from '../db-prisma/repositories/chat.repository';

@Injectable()
@WebSocketGateway(8089, { cors: true })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly chatRepository: ChatRepository,
  ) {}

  @SubscribeMessage('connect')
  async handleConnection(@ConnectedSocket() client: Socket, user: any) {
    console.log(`Client connected: ${client.id}`);

    try {
      const groupName = `${user.branch_name}-${user.section_name}`;
      const branchExists = await this.chatRepository.branchExists(
        user.branch_name,
      );

      const userData = {
        userId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        branch: user.branch_name,
        section: user.section_name,
      };
      const savedUser = await this.chatRepository.createUser(userData);

      if (branchExists) {
        await this.chatRepository.addUserToGroup(
          user.id,
          groupName,
          savedUser.id,
        );
        client.join(groupName);
        const users = await this.chatRepository.getUsersInGroup(
          user.branch_name,
          user.section_name,
        );
        this.server.to(groupName).emit('userJoin', users);
      }
    } catch (error) {
      console.error('Error handling connection:', error);
      this.emitErrorToClient(client, 'Failed to connect to chat');
    }
  }

  @SubscribeMessage('disconnect')
  handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(message: string) {
    this.server.emit('message', message);
  }

  private emitErrorToClient(client: Socket, errorMessage: string) {
    try {
      client.emit('error', errorMessage);
    } catch (error) {
      console.error('Failed to send error message to client:', error);
    }
  }
}
