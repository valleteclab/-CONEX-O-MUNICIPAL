import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async updateProfile(user: User, dto: UpdateProfileDto): Promise<User> {
    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName.trim();
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone?.trim() || null;
    }
    await this.users.save(user);
    return this.users.findOneOrFail({ where: { id: user.id } });
  }
}
