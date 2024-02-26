import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
@WebSocketGateway(8080)
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor() {}

  @SubscribeMessage('connect')
  async handleConnection(@ConnectedSocket() client: Socket, user) {
    // this.server.socketsJoin();
    console.log(`Client connected: ${client.id}`);
    console.log('user: ', user);
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    payload: { recipientId: string; message: string },
  ): Promise<void> {}
}
