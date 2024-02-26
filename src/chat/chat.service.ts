import { Injectable } from '@nestjs/common';
import { ConnectedSocket } from '@nestjs/websockets';

@Injectable()
export class ChatService {
  constructor() {}

  async handleConnection() {}

  async handleDisconnect() {}

  async message() {}
}
