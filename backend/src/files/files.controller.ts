import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.filesService.listProjectFiles(user.id, projectId, false);
  }

  @Get(':fileId')
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.filesService.getFileWithContent(user.id, projectId, fileId);
  }

  @Post('upload')
  async uploadFilesJson(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() body: { files: Array<{ path: string; content: string }> },
  ) {
    return this.filesService.upsertFilesBatch(user.id, projectId, body.files || []);
  }

  @Post('upload-zip')
  @UseInterceptors(FileInterceptor('file'))
  async uploadZip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Please attach a .zip archive file');
    }
    return this.filesService.extractAndSaveZipBuffer(user.id, projectId, file.buffer);
  }

  @Post('import-github')
  async importGithub(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() body: { repoUrl: string; branch?: string },
  ) {
    return this.filesService.importFromGithubUrl(
      user.id,
      projectId,
      body.repoUrl,
      body.branch,
    );
  }

  @Delete(':fileId')
  async deleteFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.filesService.deleteFile(user.id, projectId, fileId);
  }
}
