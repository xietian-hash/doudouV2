import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { seedUserData } from '../../../prisma/seed';

@Injectable()
export class UserInitService {
  private readonly logger = new Logger(UserInitService.name);

  constructor(private readonly prisma: PrismaService) {}

  async initNewUser(prisma: PrismaService, userId: bigint): Promise<void> {
    try {
      await seedUserData(prisma, userId);
      this.logger.log(`新用户初始化完成 userId=${userId}`);
    } catch (error) {
      this.logger.error(`新用户初始化失败 userId=${userId}`, error);
      throw error;
    }
  }
}
