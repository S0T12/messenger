import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { ChatRepository } from '../db-prisma/repositories/chat.repository';
import { UserType } from '../common/types/user.type';

@Injectable()
@WebSocketGateway(8080, { cors: true })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatRepository: ChatRepository) {}

  @SubscribeMessage('connect')
  async handleConnection(@ConnectedSocket() client: Socket) {
    client.on('user', async (user: UserType) => {
      try {
        console.log("user data on 'user': ", user);
        const branchExists = await this.chatRepository.branchExists(
          user.branch_name,
        );

        if (branchExists) {
          const newUser = await this.chatRepository.createUser(user);
          const addUserToGroup = await this.chatRepository.addUserToGroup(
            newUser.id,
            user.branch_name,
          );
          if (newUser && addUserToGroup) {
            client.join(user.branch_name);
            client.to(user.branch_name).emit('userJoin', {
              userId: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
            });
          }
        }

        // const usersInGroup = await this.chatRepository.usersInGroup(
        //   user.branch_name,
        // );

        // client.to(user.branch_name).emit('usersInGroup', usersInGroup);
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
