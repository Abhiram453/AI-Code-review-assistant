import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, name: string, password: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new BadRequestException('Please provide a valid email address');
    }
    if (!cleanName || cleanName.length < 2) {
      throw new BadRequestException('Name must be at least 2 characters');
    }
    if (!password || password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const existing = await this.db.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rowCount > 0) {
      throw new ConflictException('An account with this email already exists');
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    await this.db.query(
      `INSERT INTO users (id, email, name, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [userId, cleanEmail, cleanName, passwordHash],
    );

    await this.db.seedUserDefaultProviders(userId);
    await this.db.seedSampleProjectForUser(userId);

    const user = { id: userId, email: cleanEmail, name: cleanName };
    return {
      user,
      accessToken: await this.signToken(user),
    };
  }

  async login(email: string, password: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const res = await this.db.query<{
      id: string;
      email: string;
      name: string;
      password_hash: string;
    }>('SELECT id, email, name, password_hash FROM users WHERE email = $1', [cleanEmail]);

    if (res.rowCount === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const record = res.rows[0];
    const valid = await bcrypt.compare(password || '', record.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.db.seedUserDefaultProviders(record.id);

    const user = { id: record.id, email: record.email, name: record.name };
    return {
      user,
      accessToken: await this.signToken(user),
    };
  }

  async demoLogin() {
    return this.login('demo@codereview.ai', 'DemoPass123!');
  }

  async getProfile(userId: string) {
    const res = await this.db.query<{
      id: string;
      email: string;
      name: string;
      created_at: string;
    }>('SELECT id, email, name, created_at FROM users WHERE id = $1', [userId]);

    if (res.rowCount === 0) {
      throw new UnauthorizedException('User account not found');
    }
    return {
      ...res.rows[0],
      dbEngine: this.db.getEngineInfo(),
    };
  }

  private async signToken(user: { id: string; email: string; name: string }) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
      },
      {
        secret: process.env.JWT_SECRET || 'dev_code_review_jwt_secret_2026',
        expiresIn: '7d',
      },
    );
  }
}
