import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SAMPLE_PROJECT_FILES } from '../database/sample-seed';

@Injectable()
export class ProjectsService {
  constructor(private readonly db: DatabaseService) {}

  async listProjects(userId: string) {
    const res = await this.db.query<{
      id: string;
      name: string;
      description: string;
      repo_url: string | null;
      created_at: string;
      updated_at: string;
      file_count: string | number;
      review_count: string | number;
      latest_score: string | number | null;
    }>(
      `SELECT
         p.id,
         p.name,
         p.description,
         p.repo_url,
         p.created_at,
         p.updated_at,
         (SELECT COUNT(*) FROM files f WHERE f.project_id = p.id) AS file_count,
         (SELECT COUNT(*) FROM reviews r WHERE r.project_id = p.id) AS review_count,
         (SELECT r2.overall_score FROM reviews r2 WHERE r2.project_id = p.id ORDER BY r2.created_at DESC LIMIT 1) AS latest_score
       FROM projects p
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId],
    );

    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      repoUrl: r.repo_url,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      fileCount: Number(r.file_count || 0),
      reviewCount: Number(r.review_count || 0),
      latestScore: r.latest_score !== null && r.latest_score !== undefined ? Number(r.latest_score) : null,
    }));
  }

  async getProjectById(userId: string, projectId: string) {
    const res = await this.db.query<{
      id: string;
      user_id: string;
      name: string;
      description: string;
      repo_url: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);

    if (res.rowCount === 0) {
      throw new NotFoundException('Project not found');
    }

    const p = res.rows[0];
    const counts = await this.db.query<{
      file_count: string | number;
      review_count: string | number;
      chat_count: string | number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM files WHERE project_id = $1) AS file_count,
         (SELECT COUNT(*) FROM reviews WHERE project_id = $1) AS review_count,
         (SELECT COUNT(*) FROM chat_sessions WHERE project_id = $1) AS chat_count`,
      [projectId],
    );

    const c = counts.rows[0] || { file_count: 0, review_count: 0, chat_count: 0 };

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      repoUrl: p.repo_url,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      fileCount: Number(c.file_count || 0),
      reviewCount: Number(c.review_count || 0),
      chatCount: Number(c.chat_count || 0),
    };
  }

  async createProject(
    userId: string,
    dto: { name: string; description?: string; repoUrl?: string; seedSample?: boolean },
  ) {
    const cleanName = (dto.name || '').trim();
    if (!cleanName) {
      throw new BadRequestException('Project name is required');
    }

    if (dto.seedSample) {
      const id = await this.db.seedSampleProjectForUser(
        userId,
        cleanName,
        (dto.description || '').trim(),
      );
      return this.getProjectById(userId, id);
    }

    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await this.db.query(
      `INSERT INTO projects (id, user_id, name, description, repo_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, cleanName, (dto.description || '').trim(), dto.repoUrl || null],
    );

    return this.getProjectById(userId, id);
  }

  async deleteProject(userId: string, projectId: string) {
    const res = await this.db.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [projectId, userId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException('Project not found');
    }
    return { deleted: true, id: projectId };
  }

  async seedSampleFilesIntoProject(userId: string, projectId: string) {
    await this.getProjectById(userId, projectId);
    for (const f of SAMPLE_PROJECT_FILES) {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await this.db.query(
        `INSERT INTO files (id, project_id, path, name, extension, language, size, content)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (project_id, path) DO UPDATE SET content = EXCLUDED.content, size = EXCLUDED.size`,
        [
          fileId,
          projectId,
          f.path,
          f.name,
          f.extension,
          f.language,
          Buffer.byteLength(f.content, 'utf8'),
          f.content,
        ],
      );
    }
    return this.getProjectById(userId, projectId);
  }
}
