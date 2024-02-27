import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Group } from '@prisma/client';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async branchExists(groupName: string): Promise<boolean> {
    const count = await this.prisma.group.count({
      where: {
        name: groupName,
      },
    });
    return count > 0;
  }

  async findUser(userId) {
    return await this.prisma.user.findFirst({ where: { userId } });
  }

  async createUser(user) {
    return await this.prisma.user.createMany({
      data: { ...user },
    });
  }

  async userExistsInGroup(mongoId: string, groupId) {
    const userExistsInGroup = await this.prisma.usersInGroups.findFirst({
      where: { group_id: groupId, user_id: mongoId },
    });
    return userExistsInGroup;
  }

  async addUserToGroup(userId: string, groupName: string, mongoId: string): Promise<void> {
    try {
      const group = await this.prisma.group.findFirst({
        where: { name: groupName },
      });

      if (!group) {
        throw new Error(`Group "${groupName}" not found`);
      }

      await this.prisma.usersInGroups.create({
        data: {
          group: { connect: { id: group.id } },
          user: { connect: { id: mongoId } },
        },
      });
      console.log(`User with ID ${userId} added to group "${groupName}".`);
    } catch (error) {
      console.error('Error adding user to group:', error);
      throw error;
    }
  }

  async getUsersInGroup(branch: string, section: string): Promise<Group | null> {
    try {
      return await this.prisma.group.findFirst({
        where: { branch, section },
        include: { users: { include: { user: true } } },
      });
    } catch (error) {
      console.error('Error fetching users in group:', error);
      return null;
    }
  }
}
