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
        const groupExists = await this.chatRepository.branchExists(groupName);

        const userData = {
          userId: user.id.toString(),
          firstName: user.first_name,
          lastName: user.last_name,
          branch: user.branch_name,
          section: user.section_name,
        };
        const savedUser = await this.chatRepository.createUser(userData);

        if (groupExists) {
          const result = await this.chatRepository.addUserToGroup(user.id.toString(), groupName, savedUser.id);
          console.log('result', result);

          client.join(groupName);

          const usersInGroups = await this.chatRepository.getUsersInGroup(user.branch_name, user.section_name);
          this.server.to(groupName).emit('userJoin', usersInGroups[0].users[0].user);
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
