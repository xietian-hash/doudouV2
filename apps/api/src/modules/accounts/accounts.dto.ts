import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty({ message: '账户名称不能为空' })
  @MaxLength(50, { message: '账户名称不能超过50个字符' })
  name!: string;

  @IsInt()
  @IsIn([1, 2, 3], { message: '账户类型无效' })
  @Type(() => Number)
  type!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sort?: number;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: '账户名称不能为空' })
  @MaxLength(50, { message: '账户名称不能超过50个字符' })
  name?: string;

  @IsOptional()
  @IsInt()
  @IsIn([1, 2, 3], { message: '账户类型无效' })
  @Type(() => Number)
  type?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sort?: number;
}
