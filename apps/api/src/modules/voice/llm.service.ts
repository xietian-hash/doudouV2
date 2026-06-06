import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AppException, ErrorCode } from '../../common/errors/business-error';

interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LlmChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface LlmResponse {
  choices: LlmChoice[];
}

export interface ParsedBillRaw {
  type: number;
  amount: number;
  categoryName: string;
  remark: string;
  billDate: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly configService: ConfigService) {}

  async parseVoiceText(
    text: string,
    today: string,
    categoryNames: string[] = [],
  ): Promise<ParsedBillRaw[]> {
    const baseUrl = this.configService.get<string>('LLM_BASE_URL');
    const model = this.configService.get<string>('LLM_MODEL');
    const apiKey = this.configService.get<string>('LLM_API_KEY');

    const categoryList = categoryNames.length
      ? categoryNames.join('、')
      : '早餐、午餐、晚餐、打车、公交地铁、日用品、工资、其他';
    const exampleCategory1 =
      categoryNames.find((name) => name.includes('午餐')) ||
      categoryNames[0] ||
      '午餐';
    const exampleCategory2 =
      categoryNames.find((name) => name.includes('打车')) ||
      categoryNames.find((name) => name.includes('交通')) ||
      categoryNames[1] ||
      '打车';

    const systemPrompt = `你是一个记账助手，负责从用户的语音文本中提取记账信息。
今天的日期是 ${today}。

【可用分类清单】（共 ${categoryNames.length} 个，必须严格从中选择，禁止返回清单外的名称、禁止返回父级大类名）：
${categoryList}

请将用户描述的消费或收入信息解析成 JSON 数组，每条记录包含以下字段：
- type: 数字，1=支出，2=收入
- amount: 数字，金额（正数）
- categoryName: 字符串，**必须是上面【可用分类清单】中的一个名称**，原样照抄，不要改写、不要返回近义词、不要返回父级大类
- remark: 字符串，备注说明（保留用户原始描述的关键信息）
- billDate: 字符串，账单日期，格式为 YYYY-MM-DD

只返回 JSON 数组，不要包含任何其他文字或 markdown 格式。
如果用户描述无法对应到清单中的任何分类，请挑选语义最接近的；如果完全无法解析出有效记账信息，返回空数组 []。

示例输入："今天午饭花了15块，打车花了30"
示例输出：[{"type":1,"amount":15,"categoryName":"${exampleCategory1}","remark":"午饭","billDate":"${today}"},{"type":1,"amount":30,"categoryName":"${exampleCategory2}","remark":"打车","billDate":"${today}"}]`;

    const messages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ];

    this.logger.log(`LLM请求 model=${model} url=${baseUrl}/chat/completions text="${text.slice(0, 100)}"`);

    try {
      const response = await axios.post<LlmResponse>(
        `${baseUrl}/chat/completions`,
        {
          model,
          messages,
          temperature: 0.1,
          max_tokens: 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const content = response.data.choices[0]?.message?.content ?? '[]';
      const trimmed = content.trim();
      this.logger.log(`LLM响应 status=${response.status} content="${trimmed.slice(0, 200)}"`);

      // 提取JSON数组（处理可能的markdown代码块）
      const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.warn(`LLM返回格式异常: ${trimmed}`);
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]) as ParsedBillRaw[];

      if (!Array.isArray(parsed)) {
        this.logger.warn(`LLM解析结果非数组: ${JSON.stringify(parsed)}`);
        return [];
      }

      const filtered = parsed.filter(
        (item) =>
          typeof item.type === 'number' &&
          typeof item.amount === 'number' &&
          item.amount > 0 &&
          typeof item.categoryName === 'string',
      );
      this.logger.log(`LLM解析完成 原始条数=${parsed.length} 有效条数=${filtered.length} 结果=${JSON.stringify(filtered)}`);
      return filtered;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `LLM请求失败 status=${error.response?.status} message=${error.message} body=${JSON.stringify(error.response?.data)}`,
        );
        throw new AppException(ErrorCode.INTERNAL, 'AI服务暂时不可用，请稍后重试');
      }
      if (error instanceof SyntaxError) {
        this.logger.warn('LLM返回的JSON解析失败');
        return [];
      }
      throw error;
    }
  }
}
