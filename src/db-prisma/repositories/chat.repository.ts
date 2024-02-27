import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async branchExists(branchName: string): Promise<boolean> {
    const count = await this.prisma.group.count({
      where: {
        branch: branchName,
      },
    });
    return count > 0;
  }

  async createUser(user: any): Promise<User | null> {
    try {
      const createdUser = await this.prisma.user.create({
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          branch: user.branch,
          section: user.section,
          isBan: false,
        },
      });
      return createdUser;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  async addUserToGroup(userId: string, groupName: string) {
    const group = await this.prisma.group.findFirst({
      where: { branch: groupName },
    });

    if (!group) {
      throw new Error(`Branch "${groupName}" not found`);
    }

    return await this.prisma.usersInGroups.create({
      data: {
        user: { connect: { id: userId } },
        group: { connect: { id: group.id } },
      },
    });
  }
}
