import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addUser() {}
}
