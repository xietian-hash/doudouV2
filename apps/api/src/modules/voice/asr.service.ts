import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { AppException, ErrorCode } from '../../common/errors/business-error';

interface AsrQueryResponse {
  audio_info?: { duration?: number };
  result?: {
    text?: string;
    additions?: { duration?: string };
    utterances?: Array<{ text?: string; start_time?: number; end_time?: number }>;
  };
  // 错误场景（部分错误码通过此字段返回）
  base_resp?: { status_code?: number; status_message?: string };
}

@Injectable()
export class AsrService {
  private readonly logger = new Logger(AsrService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 提交音频 URL 到火山引擎 ASR，轮询直到识别完成，返回识别文本。
   * 音频 URL 必须是火山引擎可公网访问的地址。
   */
  async transcribeAudioUrl(
    audioUrl: string,
    format: string = 'mp3',
  ): Promise<string> {
    const apiKey = this.configService.get<string>('ASR_API_KEY') ?? '';
    const resourceId =
      this.configService.get<string>('ASR_RESOURCE_ID') ?? 'volc.seedasr.auc';

    if (!apiKey || apiKey.startsWith('placeholder')) {
      this.logger.warn('ASR_API_KEY 未配置，跳过语音识别');
      return '';
    }

    const requestId = uuidv4();
    this.logger.log(`提交 ASR 任务 requestId=${requestId} url=${audioUrl}`);

    await this.submitTask(requestId, audioUrl, format, apiKey, resourceId);
    const text = await this.pollResult(requestId, apiKey, resourceId);

    this.logger.log(`ASR 完成 requestId=${requestId} text="${text.slice(0, 50)}"`);
    return text;
  }

  private async submitTask(
    requestId: string,
    audioUrl: string,
    format: string,
    apiKey: string,
    resourceId: string,
  ): Promise<void> {
    const body = {
      user: { uid: 'ddyq-api' },
      audio: {
        format,
        url: audioUrl,
        language: 'zh-CN',
        codec: 'raw',
        rate: 16000,
        bits: 16,
        channel: 1,
      },
      request: {
        model_name: 'bigmodel',
        enable_itn: true,
        enable_punc: true,
        enable_speaker_info: false,
      },
    };

    const submitUrl =
      this.configService.get<string>('ASR_SUBMIT_URL') ??
      'https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit';

    try {
      await axios.post(submitUrl, body, {
        headers: this.buildHeaders(apiKey, resourceId, requestId, true),
        timeout: 15000,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`ASR 提交失败: ${error.message}`, error.response?.data);
        throw new AppException(ErrorCode.INTERNAL, '语音识别服务暂时不可用，请稍后重试');
      }
      throw error;
    }
  }

  private async pollResult(
    requestId: string,
    apiKey: string,
    resourceId: string,
    maxAttempts = 30,
    intervalMs = 2000,
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));

      const queryUrl =
        this.configService.get<string>('ASR_QUERY_URL') ??
        'https://openspeech.bytedance.com/api/v3/auc/bigmodel/query';

      let data: AsrQueryResponse;
      try {
        const res = await axios.post<AsrQueryResponse>(
          queryUrl,
          {},
          {
            headers: this.buildHeaders(apiKey, resourceId, requestId, false),
            timeout: 15000,
          },
        );
        data = res.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          this.logger.warn(`ASR 查询请求失败 attempt=${i + 1}: ${error.message}`);
          continue;
        }
        throw error;
      }

      // 成功：result.text 有值
      if (data.result?.text != null) {
        return data.result.text;
      }

      // 错误码（部分场景通过 base_resp 返回）
      const errCode = data.base_resp?.status_code;
      if (errCode != null) {
        const msg = data.base_resp?.status_message ?? '识别失败';
        this.logger.error(`ASR 错误 code=${errCode} msg=${msg}`);
        throw new AppException(ErrorCode.INTERNAL, `语音识别失败: ${msg}`);
      }

      // 空响应：任务仍在处理中
      this.logger.debug(`ASR 进行中 attempt=${i + 1}`);
    }

    throw new AppException(ErrorCode.INTERNAL, '语音识别超时（60s），请重试');
  }

  private buildHeaders(
    apiKey: string,
    resourceId: string,
    requestId: string,
    isSubmit: boolean,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      'X-Api-Resource-Id': resourceId,
      'X-Api-Request-Id': requestId,
    };
    if (isSubmit) {
      headers['X-Api-Sequence'] = '-1';
    }
    return headers;
  }
}
