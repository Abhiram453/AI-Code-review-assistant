import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('projects/:projectId/reviews')
  async triggerProjectReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body()
    body: {
      scopeType: 'file' | 'multiple' | 'project';
      template: 'security' | 'performance' | 'quality' | 'comprehensive';
      fileIds?: string[];
      providerId?: string;
    },
  ) {
    return this.reviewsService.createCodeReview(user.id, projectId, body);
  }

  @Get('projects/:projectId/reviews')
  async listProjectReviews(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Query('template') template?: string,
    @Query('severity') severity?: string,
    @Query('q') q?: string,
  ) {
    return this.reviewsService.listReviews(user.id, {
      projectId,
      template,
      severity,
      q,
    });
  }

  @Get('reviews')
  async listAllReviews(
    @CurrentUser() user: AuthenticatedUser,
    @Query('projectId') projectId?: string,
    @Query('template') template?: string,
    @Query('scopeType') scopeType?: string,
    @Query('severity') severity?: string,
    @Query('q') q?: string,
  ) {
    return this.reviewsService.listReviews(user.id, {
      projectId,
      template,
      scopeType,
      severity,
      q,
    });
  }

  @Get('reviews/:id')
  async getReviewDetails(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.reviewsService.getReviewById(user.id, id);
  }

  @Patch('reviews/:id/issues/:issueId')
  async toggleIssueResolved(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('issueId') issueId: string,
  ) {
    return this.reviewsService.toggleIssueResolved(user.id, id, issueId);
  }

  @Delete('reviews/:id')
  async deleteReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.reviewsService.deleteReview(user.id, id);
  }
}
