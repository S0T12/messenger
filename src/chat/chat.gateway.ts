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
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async handleConnection(@ConnectedSocket() client: Socket, user) {
    // this.server.socketsJoin();
    console.log(`Client connected: ${client.id}`);
    await this.cacheManager.set(client.id, true);
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    await this.cacheManager.del(client.id);
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    payload: { recipientId: string; message: string },
  ): Promise<void> {
    const recipientId = payload.recipientId;
    const recipientSocketId = await this.cacheManager.get<string>(recipientId);

    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('message', payload.message);
    } else {
      console.log(`Recipient ${recipientId} not found.`);
    }
  }
}
