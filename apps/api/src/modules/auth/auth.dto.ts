import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class WechatLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'wxCode 不能为空' })
  wxCode!: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
