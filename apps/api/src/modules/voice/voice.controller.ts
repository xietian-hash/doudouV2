import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { unlink } from 'fs/promises';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/jwt.strategy';
import { VoiceService } from './voice.service';
import { AsrService } from './asr.service';
import { VoiceParseDto } from './voice.dto';

// 清洗 ASR 文本：去除所有空白与中英文标点后，仍 >= 3 字符才视为有意义
function isMeaningfulText(text: string): boolean {
  const cleaned = (text || '').replace(/[\s\p{P}]+/gu, '');
  return cleaned.length >= 3;
}

const audioStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname) || '.mp3';
    cb(null, `${uuidv4()}${ext}`);
  },
});

@Controller('voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(
    private readonly voiceService: VoiceService,
    private readonly asrService: AsrService,
    private readonly configService: ConfigService,
  ) {}

  @Post('parse')
  parse(@CurrentUser() user: JwtUser, @Body() dto: VoiceParseDto) {
    return this.voiceService.parseText(dto.text, user.id);
  }

  @Post('upload-audio')
  @UseInterceptors(FileInterceptor('file', { storage: audioStorage }))
  async uploadAudio(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const serverBase =
      this.configService.get<string>('SERVER_BASE_URL') ??
      'http://localhost:3000';

    const audioUrl = `${serverBase}/uploads/${file.filename}`;
    const format = extname(file.originalname).replace('.', '') || 'mp3';

    let text = '';
    try {
      text = await this.asrService.transcribeAudioUrl(audioUrl, format);
    } finally {
      // 无论成功与否都删除临时文件
      unlink(file.path).catch(() => undefined);
    }

    if (!isMeaningfulText(text)) {
      this.logger.warn(
        `语音识别文本无效，跳过 LLM 解析。userId=${user.id} text=${JSON.stringify(text)}`,
      );
      return { text, bills: [] };
    }

    const bills = await this.voiceService.parseText(text, user.id);
    return { text, bills };
  }
}
