import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AppException, ErrorCode } from '../../common/errors/business-error';

interface WechatSessionResponse {
  openid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  constructor(private readonly configService: ConfigService) {}

  async getOpenid(wxCode: string): Promise<string> {
    const appId = this.configService.get<string>('WECHAT_APP_ID');
    const appSecret = this.configService.get<string>('WECHAT_APP_SECRET');

    const url = 'https://api.weixin.qq.com/sns/jscode2session';
    const params = {
      appid: appId,
      secret: appSecret,
      js_code: wxCode,
      grant_type: 'authorization_code',
    };

    try {
      const response = await axios.get<WechatSessionResponse>(url, { params });
      const data = response.data;

      if (data.errcode) {
        this.logger.warn(
          `微信登录失败 errcode=${data.errcode} errmsg=${data.errmsg}`,
        );
        throw new AppException(
          ErrorCode.UNAUTHORIZED,
          `微信登录失败: ${data.errmsg ?? '未知错误'}`,
        );
      }

      if (!data.openid) {
        throw new AppException(ErrorCode.UNAUTHORIZED, '获取openid失败');
      }

      return data.openid;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error('调用微信API失败', error);
      throw new AppException(ErrorCode.INTERNAL, '微信服务不可用');
    }
  }
}
