import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async branchExists(groupName: string) {
    const group = await this.prisma.group.findFirst({
      where: {
        name: groupName,
      },
    });
    return group;
  }

  async createUser(user: any): Promise<User | null> {
    try {
      const userExists = await this.prisma.user.findUnique({ where: { userId: user.userId } });
      if (userExists) return null;
      const createdUser = await this.prisma.user.create({
        // data: {
        //   id: user.id,
        //   firstName: user.firstName,
        //   lastName: user.lastName,
        //   branch: user.branch,
        //   section: user.section,
        //   isBan: false,
        // },
        data: { ...user },
      });
      console.log(createdUser);
      return createdUser;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  async addUserToGroup(userId: string, groupName: string) {
    const group = await this.prisma.group.findFirst({
      where: { name: groupName },
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

  async usersInGroup(branch, section) {
    const users = await this.prisma.group.findFirst({
      where: { branch, section },
      include: { users: true },
    });
    // console.log('------------', users.users[0]);
    return users;
  }
}
