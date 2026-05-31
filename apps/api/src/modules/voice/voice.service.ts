import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import { CategoriesRepo } from '../categories/categories.repo';
import { VoiceParsedBill } from './voice.dto';

function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calcConfidence(matched: boolean): number {
  return matched ? 0.9 : 0.5;
}

function findBestCategory(
  categoryName: string,
  categories: Array<{
    id: bigint;
    name: string;
    icon: string | null;
    parentId: bigint | null;
  }>,
): { id: string; icon: string | null; name: string } | null {
  if (!categoryName) return null;

  // 精确匹配
  const exact = categories.find((c) => c.name === categoryName);
  if (exact) {
    return {
      id: exact.id.toString(),
      icon: exact.icon,
      name: exact.name,
    };
  }

  // 模糊匹配（包含）
  const fuzzy = categories.find(
    (c) =>
      c.name.includes(categoryName) || categoryName.includes(c.name),
  );
  if (fuzzy) {
    return {
      id: fuzzy.id.toString(),
      icon: fuzzy.icon,
      name: fuzzy.name,
    };
  }

  return null;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly categoriesRepo: CategoriesRepo,
  ) {}

  async parseText(text: string, userId: bigint): Promise<VoiceParsedBill[]> {
    const today = getTodayStr();
    this.logger.log(`开始解析语音文本 userId=${userId} text="${text}"`);

    // 获取用户的叶子分类
    const leafCategories = await this.categoriesRepo.findLeafCategories(userId);
    this.logger.log(`叶子分类数量=${leafCategories.length} names=${leafCategories.map((c) => c.name).join(',')}`);

    // 调用LLM解析
    const rawBills = await this.llmService.parseVoiceText(text, today);

    if (rawBills.length === 0) {
      this.logger.warn(`LLM解析无结果 userId=${userId} text="${text}"`);
      return [];
    }

    // 匹配分类
    const results: VoiceParsedBill[] = rawBills.map((raw) => {
      const matched = findBestCategory(raw.categoryName, leafCategories);
      this.logger.log(`分类匹配 llm分类="${raw.categoryName}" 匹配结果=${matched ? `"${matched.name}"(id=${matched.id})` : '未匹配'}`);
      return {
        type: raw.type === 2 ? 2 : 1,
        amount: raw.amount,
        categoryName: matched?.name ?? raw.categoryName,
        categoryId: matched?.id ?? null,
        categoryIcon: matched?.icon ?? null,
        remark: raw.remark ?? '',
        billDate: raw.billDate || today,
        confidence: calcConfidence(matched !== null),
      };
    });

    this.logger.log(`解析完成 返回账单数=${results.length}`);
    return results;
  }
}
