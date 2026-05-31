import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty({ message: '标签名称不能为空' })
  @MaxLength(20, { message: '标签名称不能超过20个字符' })
  name!: string;
}

export class UpdateTagDto {
  @IsString()
  @IsNotEmpty({ message: '标签名称不能为空' })
  @MaxLength(20, { message: '标签名称不能超过20个字符' })
  name!: string;
}
