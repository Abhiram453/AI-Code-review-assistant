import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async updateProfile(userId: string, dto: { name?: string }) {
    const cleanName = (dto.name || '').trim();
    if (!cleanName || cleanName.length < 2) {
      throw new BadRequestException('Name must be at least 2 characters');
    }

    const res = await this.db.query<{
      id: string;
      email: string;
      name: string;
      created_at: string;
    }>(
      `UPDATE users SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, name, created_at`,
      [cleanName, userId],
    );

    if (res.rowCount === 0) {
      throw new NotFoundException('User account not found');
    }
    return res.rows[0];
  }

  async updatePassword(
    userId: string,
    dto: { currentPassword?: string; newPassword?: string },
  ) {
    if (!dto.newPassword || dto.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    const res = await this.db.query<{ id: string; password_hash: string }>(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [userId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException('User account not found');
    }

    if (dto.currentPassword) {
      const valid = await bcrypt.compare(
        dto.currentPassword,
        res.rows[0].password_hash,
      );
      if (!valid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    const nextHash = await bcrypt.hash(dto.newPassword, 10);
    await this.db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [nextHash, userId],
    );

    return { updated: true, message: 'Password updated successfully' };
  }
}
