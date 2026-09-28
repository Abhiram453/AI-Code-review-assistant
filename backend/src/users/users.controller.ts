import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name?: string },
  ) {
    return this.usersService.updateProfile(user.id, body);
  }

  @Patch('password')
  async updatePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    return this.usersService.updatePassword(user.id, body);
  }
}
