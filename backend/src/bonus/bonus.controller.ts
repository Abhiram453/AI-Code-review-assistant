import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { BonusService } from './bonus.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/bonus')
export class BonusController {
  constructor(private readonly bonusService: BonusService) {}

  @Post('diff-review')
  async diffReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body()
    body: {
      baseFileId?: string;
      targetFileId?: string;
      baseLabel?: string;
      targetLabel?: string;
      baseContent?: string;
      targetContent?: string;
      providerId?: string;
    },
  ) {
    return this.bonusService.runDiffReview(user.id, projectId, body);
  }

  @Post('architecture')
  async architectureAnalysis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() body: { providerId?: string },
  ) {
    return this.bonusService.generateArchitectureAnalysis(
      user.id,
      projectId,
      body?.providerId,
    );
  }

  @Post('documentation')
  async generateDocumentation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body()
    body: {
      docType?: 'readme' | 'setup' | 'api' | 'all';
      providerId?: string;
    },
  ) {
    return this.bonusService.generateDocumentationSuite(
      user.id,
      projectId,
      body || {},
    );
  }
}
