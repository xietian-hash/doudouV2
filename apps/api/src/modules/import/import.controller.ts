import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/jwt.strategy';
import { ImportService } from './import.service';
import { ValidationException } from '../../common/errors/business-error';

const importStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname) || '.xlsx';
    cb(null, `import-${uuidv4()}${ext}`);
  },
});

@Controller('import')
@UseGuards(JwtAuthGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Get('template')
  async getTemplate(@CurrentUser() user: JwtUser, @Res() res: Response) {
    const buffer = await this.importService.getTemplate(user.id);
    const filename = encodeURIComponent('兜兜有钱-导入模板.xlsx');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send(buffer);
  }

  @Post('bills')
  @UseInterceptors(FileInterceptor('file', { storage: importStorage, limits: { fileSize: 10 * 1024 * 1024 } }))
  async importBills(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new ValidationException('请上传 Excel 文件');
    }
    const ext = extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      throw new ValidationException('仅支持 .xlsx 或 .xls 格式');
    }
    return this.importService.importBills(user.id, file.path);
  }
}
