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
  async handleConnection(@ConnectedSocket() client: Socket) {
    console.log(`Client connected: ${client.id}`);

    client.on('getUser', async (user) => {
      try {
        const groupName = user.branch + '-' + user.section;
        let groupExists = await this.chatRepository.branchExists(groupName);

        if (!groupExists) {
          // If group doesn't exist, create it
          await this.chatRepository.createGroup(groupName);
          groupExists = true;
        }

        const userData = {
          userId: user.id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          branch: user.branch,
          section: user.section,
          isBan: false,
        };
        const savedUser = await this.chatRepository.createUser(userData);

        const groupId = await this.chatRepository.getGroupIdByName(groupName);
        const userExistsInGroup = await this.chatRepository.userExistsInGroup(
          savedUser.id,
          groupId,
        );

        if (!userExistsInGroup) {
          // If user is not in group, add them
          await this.chatRepository.addUserToGroup(
            user.id.toString(),
            groupName,
            savedUser.id,
            groupId,
          );

          client.join(groupName);

          // Store user in group data in cache
          await this.cacheManager.set(groupName, savedUser);

          // Get user in group in cache
          const userList = await this.cacheManager.get(groupName);

          // Emit user object to clients in the group
          this.server.to(groupName).emit('userJoin', userList);
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
