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
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly chatRepository: ChatRepository,
  ) {}

  @SubscribeMessage('connect')
  async handleConnection(@ConnectedSocket() client: Socket) {
    client.on('getUser', async (user) => {
      console.log('user: ', user);
      try {
        const groupName = user.branch_name + '-' + user.section_name;
        const branchExists = await this.chatRepository.branchExists(groupName);
        const userData = {
          userId: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          branch: user.branch_name,
          section: user.section_name,
        };
        const createUser = await this.chatRepository.createUser(userData);
        if (branchExists) {
          client.join(groupName);
          // await this.cacheManager.set(user.branch_name, JSON.stringify({ user, client }));
          // const usersInGroup = await this.cacheManager.get(user.branch_name);
          const users = await this.chatRepository.usersInGroup(
            user.branch_name,
            user.section_name,
          );
          console.log('users: ', users);
          this.server.to(groupName).emit('userJoin', users);
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
