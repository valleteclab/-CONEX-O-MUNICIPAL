import { ApiProperty } from '@nestjs/swagger';
import { AppUserRole } from '../../entities/user.entity';

export class UserPublicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  phone: string | null;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ enum: ['citizen', 'mei', 'company', 'manager', 'admin'] })
  role: AppUserRole;

  @ApiProperty()
  emailVerified: boolean;

  static fromUser(u: {
    id: string;
    email: string;
    phone: string | null;
    fullName: string;
    role: AppUserRole;
    emailVerified: boolean;
  }): UserPublicDto {
    const d = new UserPublicDto();
    d.id = u.id;
    d.email = u.email;
    d.phone = u.phone;
    d.fullName = u.fullName;
    d.role = u.role;
    d.emailVerified = u.emailVerified;
    return d;
  }
}
