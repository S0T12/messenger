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
      const userExists = await this.prisma.user.findUnique({
        where: { userId: user.userId },
      });
      if (userExists) {
        console.log(`User with ID ${user.userId} already exists.`);
        return userExists;
      }

      const createdUser = await this.prisma.user.create({
        data: user,
      });
      console.log(`User created:`, createdUser);
      return createdUser;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  async addUserToGroup(userId: string, groupName, mongoId): Promise<void> {
    try {
      const group = await this.prisma.group.findFirst({
        where: { name: groupName },
      });

      if (!group) {
        throw new Error(`Branch "${groupName}" not found`);
      }

      const userExistsInGroup = await this.prisma.usersInGroups.findFirst({
        where: { group_id: group.id, user_id: userId },
      });

      if (userExistsInGroup) {
        console.log(`User with ID ${userId} already exists in the group.`);
        return;
      }

      await this.prisma.group.update({
        where: { id: group.id.toString() },
        data: {
          users: {
            connect: { id: mongoId },
          },
        },
      });
      console.log(`User with ID ${userId} added to group "${groupName}".`);
    } catch (error) {
      console.error('Error adding user to group:', error);
      throw error;
    }
  }

  async usersInGroup(branch: string, section: string) {
    const group = await this.prisma.group.findFirst({
      where: { branch, section },
      include: { users: true },
    });

    return group;
  }
}
