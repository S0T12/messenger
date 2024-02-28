import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllUsers() {
    return await this.prisma.user.findMany();
  }

  async groupExists(groupName: string) {
    const group = await this.prisma.group.findFirst({
      where: {
        name: groupName,
      },
    });
    return group;
  }

  async findUser(userId: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { userId } });
  }

  async createUser(user: Partial<User>): Promise<User> {
    return await this.prisma.user.create({
      data: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        branch: user.branch,
        section: user.section,
        isBan: user.isBan,
      },
    });
  }

  async userExistsInGroup(userId: string, groupId: string): Promise<boolean> {
    const userExistsInGroup = await this.prisma.usersInGroups.findFirst({
      where: { user_id: userId, group_id: groupId },
    });
    return userExistsInGroup !== null;
  }

  async createGroup(groupName: string) {
    return await this.prisma.group.create({
      data: {
        name: groupName,
        branch: groupName.split('-')[0],
        section: groupName.split('-')[1],
      },
    });
  }

  async addUserToGroup(userId: string, groupName: string, mongoId: string, groupId: string): Promise<void> {
    try {
      await this.prisma.usersInGroups.create({
        data: {
          group_id: groupId,
          user_id: mongoId,
        },
      });
      console.log(`User with ID ${userId} added to group "${groupName}".`);
    } catch (error) {
      console.error('Error adding user to group:', error);
      throw error;
    }
  }

  async getUsersInGroup(groupId: string): Promise<User[] | null> {
    try {
      const group = await this.prisma.group.findFirst({
        where: { id: groupId },
        include: { users: { include: { user: true } } },
      });
      return group?.users.map((usersInGroup) => usersInGroup.user) || null;
    } catch (error) {
      console.error('Error fetching users in group:', error);
      return null;
    }
  }
}
