import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class VoiceParseDto {
  @IsString()
  @IsNotEmpty({ message: '文本不能为空' })
  @MaxLength(500, { message: '文本长度不能超过500个字符' })
  text!: string;
}

export interface VoiceParsedBill {
  type: number; // 1=支出 2=收入
  amount: number;
  categoryName: string;
  categoryId: string | null;
  categoryIcon: string | null;
  remark: string;
  billDate: string; // YYYY-MM-DD
  confidence: number; // 0-1
}
