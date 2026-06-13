import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import { CategoriesRepo } from '../categories/categories.repo';
import { VoiceParsedBill } from './voice.dto';
import { LedgersService } from '../ledgers/ledgers.service';

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

function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  let hits = 0;
  for (const ch of shorter) {
    if (longer.includes(ch)) hits += 1;
  }
  return hits / shorter.length;
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

  // 精确匹配（LLM 已被白名单约束，绝大多数走这里）
  const exact = categories.find((c) => c.name === categoryName);
  if (exact) {
    return {
      id: exact.id.toString(),
      icon: exact.icon,
      name: exact.name,
    };
  }

  // 兜底：字符重叠度评分，挑选得分最高且 ≥0.6 的叶子分类
  let best: { id: string; icon: string | null; name: string } | null = null;
  let bestScore = 0;
  for (const c of categories) {
    const score = similarityScore(categoryName, c.name);
    if (score > bestScore) {
      bestScore = score;
      best = { id: c.id.toString(), icon: c.icon, name: c.name };
    }
  }
  if (bestScore >= 0.6) return best;

  return null;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly categoriesRepo: CategoriesRepo,
    private readonly ledgersService: LedgersService,
  ) {}

  async parseText(text: string, userId: bigint): Promise<VoiceParsedBill[]> {
    const today = getTodayStr();
    this.logger.log(`开始解析语音文本 userId=${userId} text="${text}"`);

    // 获取用户的叶子分类
    const ledger = await this.ledgersService.getOrCreateDefaultLedger(userId);
    const leafCategories = await this.categoriesRepo.findLeafCategories(
      userId,
      undefined,
      ledger.id,
    );
    this.logger.log(
      `叶子分类数量=${leafCategories.length} names=${leafCategories.map((c) => c.name).join(',')}`,
    );

    // 调用LLM解析（将叶子分类白名单注入 prompt，强约束 LLM 只能从中选择）
    const leafNames = leafCategories.map((c) => c.name);
    const rawBills = await this.llmService.parseVoiceText(text, today, leafNames);

    if (rawBills.length === 0) {
      this.logger.warn(`LLM解析无结果 userId=${userId} text="${text}"`);
      return [];
    }

    // 匹配分类
    const results: VoiceParsedBill[] = rawBills.map((raw) => {
      const matched = findBestCategory(raw.categoryName, leafCategories);
      this.logger.log(
        `分类匹配 llm分类="${raw.categoryName}" 匹配结果=${matched ? `"${matched.name}"(id=${matched.id})` : '未匹配'}`,
      );
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
