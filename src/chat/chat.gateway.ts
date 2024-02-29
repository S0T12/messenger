import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ChatRepository } from '../db-prisma/repositories/chat.repository';

@Injectable()
@WebSocketGateway(8089, { cors: true })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly chatRepository: ChatRepository,
  ) {}

  @SubscribeMessage('connect')
  async handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    client.on('getUser', async (user) => {
      this.logger.debug('Received getUser event');
      try {
        this.logger.debug('Received user data:', user);
        const groupName = user.branch + '-' + user.section;
        let groupExists = await this.chatRepository.groupExists(groupName);

        if (!groupExists) {
          this.logger.debug(`Group ${groupName} does not exist, creating...`);
          groupExists = await this.chatRepository.createGroup(groupName);
        }

        const userDataCache = {
          userId: user.id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          branch: user.branch,
          section: user.section,
          socketId: client.id,
          isBan: false,
        };
        type userDataCacheType = {
          userId: string;
          firstName: string;
          lastName: string;
          branch: string;
          section: string;
          socketId: string;
          isBan: boolean;
        };

        let userExists = await this.chatRepository.findUser(user.id.toString());
        const { socketId, ...userData } = userDataCache;
        if (!userExists) {
          userExists = await this.chatRepository.createUser(userData);
          this.logger.debug(`New user created: ${userExists.id}`);
        }
        const groupInCache: Array<userDataCacheType> =
          await this.cacheManager.get(groupName);
        if (!groupInCache) {
          this.logger.debug(
            `No cache found for group ${groupName}, creating...`,
          );
          await this.cacheManager.set(groupName, [userDataCache], 86400000);
        } else {
          this.logger.debug(`Cache found for group ${groupName}`);
          const users = [...groupInCache];
          const index = users.findIndex(
            (u) => u.userId === userDataCache.userId,
          );
          if (index != -1) {
            const newUsers = users.splice(index, 1);
          } else {
            this.logger.debug('User not connected before');
          }
          users.push(userDataCache);
          await this.cacheManager.set(groupName, [...users], 86400000);
        }

        const userExistsInGroup = await this.chatRepository.userExistsInGroup(
          userExists.id,
          groupExists.id,
        );

        if (!userExistsInGroup) {
          await this.chatRepository.addUserToGroup(
            user.id.toString(),
            groupName,
            userExists.id,
            groupExists.id,
          );
          this.logger.debug(
            `Added user ${userExists.id} to group ${groupExists.id}`,
          );
        }

        client.join(groupName);

        const userList = await this.cacheManager.get(groupName);

        this.server.to(groupName).emit('userList', userList);
      } catch (error) {
        this.logger.error('Error handling connection:', error.stack);
        try {
          client.emit('error', 'Failed to connect to chat');
        } catch (error) {
          this.logger.error(
            'Failed to send error message to client:',
            error.stack,
          );
        }
      }
    });

    client.on('dis', async (user) => {
      this.logger.log('User disconnected');
      const groupName = `${user.branch}-${user.section}`;

      const userDataCache = {
        userId: user.id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        branch: user.branch,
        section: user.section,
        socketId: user.socketId,
        isBan: false,
      };
      type userDataCacheType = {
        userId: string;
        firstName: string;
        lastName: string;
        branch: string;
        section: string;
        socketId: string;
        isBan: boolean;
      };

      const groupInCache: Array<userDataCacheType> =
        await this.cacheManager.get(groupName);
      if (groupInCache) {
        const users = [...groupInCache];
        console.log(users);
        const index = users.findIndex((u) => u.userId === userDataCache.userId);
        console.log(index);
        if (index != -1) {
          const newUsers = users.splice(index, 1);
        } else {
          this.logger.warn('User not connected');
        }
        await this.cacheManager.set(groupName, [...users]);
      }
      const userList = await this.cacheManager.get(groupName);

      if (!userList) {
        this.server.to(groupName).emit('userList', []);
        return;
      }
      this.server.to(groupName).emit('userList', userList);
      this.logger.log(`Client disconnected: ${user.id}`);
    });

    client.on('privateMessage', (payload: { socketId; message }) => {
      this.logger.debug('Received privateMessage event');
      this.logger.debug('Payload:', payload);
      this.server.to(payload.socketId).emit('privateMessage', payload.message);
    });
  }
}
