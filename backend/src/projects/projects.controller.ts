import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.listProjects(user.id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      name: string;
      description?: string;
      repoUrl?: string;
      seedSample?: boolean;
    },
  ) {
    return this.projectsService.createProject(user.id, body);
  }

  @Get(':id')
  async getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.getProjectById(user.id, id);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.deleteProject(user.id, id);
  }

  @Post(':id/seed-sample')
  async seedSample(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.seedSampleFilesIntoProject(user.id, id);
  }
}
