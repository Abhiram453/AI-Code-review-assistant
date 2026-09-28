import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('projects/:projectId/chats')
  async listSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.chatService.listSessions(user.id, projectId);
  }

  @Post('projects/:projectId/chats')
  async createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() body: { title?: string },
  ) {
    return this.chatService.createSession(user.id, projectId, body?.title);
  }

  @Post('projects/:projectId/chats/ask')
  async askQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body()
    body: {
      sessionId?: string;
      question: string;
      pinnedFileIds?: string[];
      providerId?: string;
    },
  ) {
    return this.chatService.sendMessage(user.id, projectId, body);
  }

  @Get('chats/:sessionId')
  async getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatService.getSessionMessages(user.id, sessionId);
  }

  @Delete('chats/:sessionId')
  async deleteSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.chatService.deleteSession(user.id, sessionId);
  }
}
