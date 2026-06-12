import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsIn,
  IsArray,
  IsDateString,
  IsPositive,
  IsNumber,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetBillsQueryDto {
  @IsOptional()
  @IsString()
  month?: string; // 格式: YYYY-MM

  @IsOptional()
  @IsString()
  date?: string; // 格式: YYYY-MM-DD

  @IsOptional()
  @IsString()
  year?: string; // 格式: YYYY（与 month/date 互斥使用，用于按整年筛选）

  @IsOptional()
  @IsString()
  categoryId?: string; // 精确匹配单个分类（叶子）

  @IsOptional()
  @IsInt()
  @IsIn([1, 2])
  @Type(() => Number)
  type?: number; // 1=支出 2=收入

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageNo?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  pageSize?: number;
}

export class GetCalendarSummaryQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'month 不能为空' })
  month!: string; // 格式: YYYY-MM
}

export class CreateBillDto {
  @IsString()
  @IsNotEmpty({ message: 'accountId 不能为空' })
  accountId!: string;

  @IsString()
  @IsNotEmpty({ message: 'categoryId 不能为空' })
  categoryId!: string;

  @IsInt()
  @IsIn([1, 2], { message: '账单类型无效，1=支出 2=收入' })
  @Type(() => Number)
  type!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: '金额必须大于0' })
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;

  @IsDateString({}, { message: 'billDate 格式无效，请使用 YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss' })
  billDate!: string;

  @IsOptional()
  @IsInt()
  @IsIn([1, 2, 3], { message: '来源类型无效' })
  @Type(() => Number)
  source?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  voiceText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}

export class BatchCreateBillDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillDto)
  bills!: CreateBillDto[];
}

export class UpdateBillDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @IsIn([1, 2], { message: '账单类型无效，1=支出 2=收入' })
  @Type(() => Number)
  type?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: '金额必须大于0' })
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;

  @IsOptional()
  @IsDateString({}, { message: 'billDate 格式无效，请使用 YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss' })
  billDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
