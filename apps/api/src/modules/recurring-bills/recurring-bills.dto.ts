import {
  IsInt,
  IsIn,
  IsOptional,
  IsPositive,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRecurringBillDto {
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

  @IsInt()
  @IsIn([1, 2, 3], { message: '重复类型无效，1=按日 2=按月 3=按年' })
  @Type(() => Number)
  repeatType!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  repeatDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  repeatMonth?: number;

  @IsDateString({}, { message: 'startDate 格式无效，请使用 YYYY-MM-DD' })
  startDate!: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate 格式无效，请使用 YYYY-MM-DD' })
  endDate?: string;
}

export class UpdateRecurringBillDto extends CreateRecurringBillDto {}
