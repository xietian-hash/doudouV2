import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/jwt.strategy';
import { ValidationException } from '../../common/errors/business-error';
import { CreateFeedbackDto } from './feedback.dto';
import { FeedbackService } from './feedback.service';

const imageStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = './uploads/feedback';
    mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly configService: ConfigService,
  ) {}

  @Post('images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: imageStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new ValidationException('只能上传图片'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new ValidationException('请选择要上传的照片');
    }
    const serverBase =
      this.configService.get<string>('SERVER_BASE_URL') ??
      'http://localhost:3000';
    return { url: `${serverBase}/uploads/feedback/${file.filename}` };
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(user.id, dto);
  }
}
