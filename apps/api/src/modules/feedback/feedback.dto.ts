import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsUrl({ require_tld: false }, { each: true })
  imageUrls?: string[];
}
