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
        console.log('USER: ', user);
        const groupName = user.branch + '-' + user.section;
        let groupExists = await this.chatRepository.groupExists(groupName);

        if (!groupExists) {
          // If group doesn't exist, create it
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

        let userExixsts = await this.chatRepository.findUser(
          user.id.toString(),
        );
        const { socketId, ...userData } = userDataCache;
        if (!userExixsts) {
          userExixsts = await this.chatRepository.createUser(userData);
        }
        const groupInCache: Array<userDataCacheType> =
          await this.cacheManager.get(groupName);
        if (!groupInCache) {
          await this.cacheManager.set(groupName, [userDataCache], 86400000);
        } else {
          const users = [...groupInCache];
          console.log('users: ', users);
          const index = users.findIndex(
            (u) => u.userId === userDataCache.userId,
          );
          console.log(index);
          if (index != -1) {
            const newUsers = users.splice(index, 1);
            console.log('newUsersssssssss', users);
          }
          await this.cacheManager.set(groupName, [...users]);
          users.push(userDataCache);
          await this.cacheManager.set(groupName, [...users], 86400000);
        }

        const userExistsInGroup = await this.chatRepository.userExistsInGroup(
          userExixsts.id,
          groupExists.id,
        );
        console.log('userExistsInGroup: ', userExistsInGroup);

        if (!userExistsInGroup) {
          // If user is not in group, add that
          await this.chatRepository.addUserToGroup(
            user.id.toString(),
            groupName,
            userExixsts.id,
            groupExists.id,
          );
        }

        client.join(groupName);

        const userList = await this.cacheManager.get(groupName);

        this.server.to(groupName).emit('userList', userList);
      } catch (error) {
        console.error('Error handling connection:', error);
        try {
          client.emit('error', 'Failed to connect to chat');
        } catch (error) {
          console.error('Failed to send error message to client:', error);
        }
      }
    });

    client.on('dis', async (user) => {
      console.log('userDisconnect');
      const groupName = user.branch + '-' + user.section;

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
          console.log('user not connected');
        }
        await this.cacheManager.set(groupName, [...users]);
      }
      const userList = await this.cacheManager.get(groupName);
      this.server.to(groupName).emit('userList', userList);
      console.log(`Client disconnected: ${user.id}`);
    });

    client.on('privateMessage', (payload: { socketId; message }) => {
      console.log('here is privateMessage');
      console.log(payload);

      this.server.to(payload.socketId).emit('privateMessage', payload.message);
    });
  }
}
