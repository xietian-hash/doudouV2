import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ValidationException } from '../../common/errors/business-error';
import { CreateFeedbackDto } from './feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: bigint, dto: CreateFeedbackDto) {
    const content = dto.content.trim();
    if (!content) {
      throw new ValidationException('请输入反馈意见');
    }
    const imageUrls = dto.imageUrls ?? [];
    if (imageUrls.length > 3) {
      throw new ValidationException('最多上传 3 张照片');
    }

    const feedback = await this.prisma.feedback.create({
      data: {
        userId,
        content,
        imageUrls: imageUrls as Prisma.InputJsonArray,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return {
      id: String(feedback.id),
      createdAt: feedback.createdAt,
    };
  }
}
