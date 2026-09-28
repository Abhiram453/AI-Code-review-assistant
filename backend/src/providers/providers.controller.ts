import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.providersService.listProviders(user.id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      name: string;
      providerType?: string;
      baseUrl: string;
      apiKey?: string;
      modelName: string;
      isDefault?: boolean;
    },
  ) {
    return this.providersService.createProvider(user.id, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      providerType?: string;
      baseUrl?: string;
      apiKey?: string;
      modelName?: string;
      isDefault?: boolean;
    },
  ) {
    return this.providersService.updateProvider(user.id, id, body);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.providersService.deleteProvider(user.id, id);
  }

  @Post('test')
  async testConnection(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      providerId?: string;
      baseUrl?: string;
      apiKey?: string;
      modelName?: string;
    },
  ) {
    return this.providersService.testProviderConnection(user.id, body);
  }
}
