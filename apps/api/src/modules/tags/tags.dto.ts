import { IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty({ message: '标签名称不能为空' })
  @MaxLength(20, { message: '标签名称不能超过20个字符' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '标签描述不能超过255个字符' })
  description?: string;
}

export class UpdateTagDto {
  @IsString()
  @IsNotEmpty({ message: '标签名称不能为空' })
  @MaxLength(20, { message: '标签名称不能超过20个字符' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '标签描述不能超过255个字符' })
  description?: string;
}
