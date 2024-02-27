import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket } from '@nestjs/websockets';
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
  async handleConnection(@ConnectedSocket() client: Socket) {
    console.log(`Client connected: ${client.id}`);

    client.on('getUser', async (user) => {
      try {
        const groupName = user.branch_name + '-' + user.section_name;
        const branchExists = await this.chatRepository.branchExists(user.branch_name);

        const userData = {
          userId: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          branch: user.branch_name,
          section: user.section_name,
        };
        const savedUser = await this.chatRepository.createUser(userData);

        if (branchExists) {
          client.join(groupName);

          // Fetch and broadcast users in the group
          const users = await this.chatRepository.usersInGroup(user.branch_name, user.section_name);
          console.log('users: ', users);
          this.server.to(groupName).emit('userJoin', users);
        }
      } catch (error) {
        console.error('Error handling connection:', error);
        try {
          client.emit('error', 'Failed to connect to chat');
        } catch (error) {
          console.error('Failed to send error message to client:', error);
        }
      }
    });
  }

  @SubscribeMessage('disconnect')
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  async handleMessage(@ConnectedSocket() client: Socket, message) {
    this.server.emit(message);
  }
}
