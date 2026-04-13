import { IsNotEmpty, IsString } from 'class-validator';

export class SupportLoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
