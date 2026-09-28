import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProjectsService } from '../projects/projects.service';
import { ProvidersService } from '../providers/providers.service';
import { AiEngineService, FileInputForAi } from '../ai/ai-engine.service';

export interface ReviewDbRow {
  id: string;
  project_id: string;
  project_name?: string;
  user_id: string;
  provider_id: string | null;
  scope_type: string;
  template: string;
  title: string;
  target_files: any;
  summary: string;
  overall_score: number;
  issues: any;
  recommendations: any;
  severity_counts: any;
  metadata: any;
  model_used: string;
  execution_mode: string;
  created_at: string;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly projectsService: ProjectsService,
    private readonly providersService: ProvidersService,
    private readonly aiEngine: AiEngineService,
  ) {}

  private formatReviewRow(row: ReviewDbRow) {
    const parseJsonSafe = (val: any, fallback: any) => {
      if (val === null || val === undefined) return fallback;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return fallback;
        }
      }
      return val;
    };

    const rawIssues = parseJsonSafe(row.issues, []);
    const normalizedIssues = Array.isArray(rawIssues)
      ? rawIssues.map((iss: any, idx: number) => ({
          id: iss.id || `iss_${idx + 1}`,
          title: iss.title || 'Code Issue',
          severity: iss.severity || 'Medium',
          category: iss.category || row.template || 'quality',
          file: iss.file || 'unknown',
          line: Number(iss.line) || 1,
          description: iss.description || '',
          impact:
            iss.impact ||
            'Potential security exposure, performance bottleneck, or maintainability debt if left unaddressed.',
          recommendation:
            iss.recommendation ||
            iss.suggestedFix ||
            'Apply the recommended refactoring and verify with unit tests.',
          codeSnippet: iss.codeSnippet || '',
          suggestedFix: iss.suggestedFix || iss.recommendation || '',
          resolved: Boolean(iss.resolved),
        }))
      : [];

    const score = Number(row.overall_score ?? 75);

    return {
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name || undefined,
      providerId: row.provider_id,
      scopeType: row.scope_type,
      template: row.template,
      title: row.title,
      targetFiles: parseJsonSafe(row.target_files, []),
      summary: row.summary,
      riskScore: score,
      overallScore: score,
      issues: normalizedIssues,
      recommendations: parseJsonSafe(row.recommendations, []),
      severityCounts: parseJsonSafe(row.severity_counts, {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
      }),
      metadata: parseJsonSafe(row.metadata, {}),
      modelUsed: row.model_used,
      executionMode: row.execution_mode,
      createdAt: row.created_at,
    };
  }

  async createCodeReview(
    userId: string,
    projectId: string,
    dto: {
      scopeType: 'file' | 'multiple' | 'project';
      template: 'security' | 'performance' | 'quality' | 'comprehensive';
      fileIds?: string[];
      providerId?: string;
    },
  ) {
    const project = await this.projectsService.getProjectById(userId, projectId);
    const provider = await this.providersService.getActiveProviderForUser(
      userId,
      dto.providerId,
    );

    let filesRes;
    if (dto.scopeType === 'project') {
      filesRes = await this.db.query<{
        id: string;
        path: string;
        name: string;
        language: string;
        content: string;
      }>(
        'SELECT id, path, name, language, content FROM files WHERE project_id = $1 ORDER BY path ASC',
        [projectId],
      );
    } else {
      const ids = Array.isArray(dto.fileIds) ? dto.fileIds.filter(Boolean) : [];
      if (ids.length === 0) {
        throw new BadRequestException(
          'Please select at least one file for single-file or multi-file review',
        );
      }
      const placeholders = ids.map((_, idx) => `$${idx + 2}`).join(', ');
      filesRes = await this.db.query<{
        id: string;
        path: string;
        name: string;
        language: string;
        content: string;
      }>(
        `SELECT id, path, name, language, content FROM files WHERE project_id = $1 AND id IN (${placeholders}) ORDER BY path ASC`,
        [projectId, ...ids],
      );
    }

    if (filesRes.rowCount === 0) {
      throw new BadRequestException(
        'No source files found in the selected scope. Upload files first.',
      );
    }

    const filesForAi: FileInputForAi[] = filesRes.rows.map((f) => ({
      path: f.path,
      name: f.name,
      language: f.language,
      content: f.content,
    }));

    const template = dto.template || 'security';
    const result = await this.aiEngine.runCodeReview(provider, template, filesForAi);

    const templateTitle =
      template === 'security'
        ? 'Security Review'
        : template === 'performance'
          ? 'Performance Review'
          : template === 'quality'
            ? 'Code Quality Review'
            : 'Comprehensive Review';

    const scopeLabel =
      dto.scopeType === 'file'
        ? filesForAi[0].name
        : dto.scopeType === 'multiple'
          ? `${filesForAi.length} selected files`
          : project.name;

    const title = `${templateTitle} — ${scopeLabel}`;
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const insertRes = await this.db.query<ReviewDbRow>(
      `INSERT INTO reviews (
         id, project_id, user_id, provider_id, scope_type, template, title,
         target_files, summary, overall_score, issues, recommendations,
         severity_counts, model_used, execution_mode
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        reviewId,
        projectId,
        userId,
        provider.id.startsWith('fallback') ? null : provider.id,
        dto.scopeType,
        template,
        title,
        JSON.stringify(filesForAi.map((f) => f.path)),
        result.summary,
        result.overallScore,
        JSON.stringify(result.issues),
        JSON.stringify(result.recommendations),
        JSON.stringify(result.severityCounts),
        result.modelUsed,
        result.executionMode,
      ],
    );

    return {
      ...this.formatReviewRow(insertRes.rows[0]),
      projectName: project.name,
    };
  }

  async toggleIssueResolved(userId: string, reviewId: string, issueId: string) {
    const current = await this.getReviewById(userId, reviewId);
    const updatedIssues = current.issues.map((iss: any) =>
      iss.id === issueId ? { ...iss, resolved: !iss.resolved } : iss,
    );

    await this.db.query(
      'UPDATE reviews SET issues = $1 WHERE id = $2 AND user_id = $3',
      [JSON.stringify(updatedIssues), reviewId, userId],
    );

    return this.getReviewById(userId, reviewId);
  }

  async listReviews(
    userId: string,
    filters: {
      projectId?: string;
      template?: string;
      scopeType?: string;
      severity?: string;
      q?: string;
    },
  ) {
    const conditions: string[] = ['r.user_id = $1'];
    const params: any[] = [userId];
    let paramIdx = 2;

    if (filters.projectId) {
      conditions.push(`r.project_id = $${paramIdx++}`);
      params.push(filters.projectId);
    }

    if (filters.template && filters.template !== 'all') {
      conditions.push(`r.template = $${paramIdx++}`);
      params.push(filters.template);
    }

    if (filters.scopeType && filters.scopeType !== 'all') {
      conditions.push(`r.scope_type = $${paramIdx++}`);
      params.push(filters.scopeType);
    }

    if (filters.q && filters.q.trim().length > 0) {
      conditions.push(
        `(r.title ILIKE $${paramIdx} OR r.summary ILIKE $${paramIdx} OR CAST(r.issues AS TEXT) ILIKE $${paramIdx} OR CAST(r.target_files AS TEXT) ILIKE $${paramIdx})`,
      );
      params.push(`%${filters.q.trim()}%`);
      paramIdx++;
    }

    const res = await this.db.query<ReviewDbRow>(
      `SELECT r.*, p.name AS project_name
       FROM reviews r
       INNER JOIN projects p ON p.id = r.project_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.created_at DESC`,
      params,
    );

    let items = res.rows.map((r) => this.formatReviewRow(r));

    if (filters.severity && filters.severity !== 'all') {
      const sev = filters.severity;
      items = items.filter(
        (item) =>
          (item.severityCounts && Number(item.severityCounts[sev]) > 0) ||
          item.issues.some((iss: any) => iss.severity === sev),
      );
    }

    return items;
  }

  async getReviewById(userId: string, reviewId: string) {
    const res = await this.db.query<ReviewDbRow>(
      `SELECT r.*, p.name AS project_name
       FROM reviews r
       INNER JOIN projects p ON p.id = r.project_id
       WHERE r.id = $1 AND r.user_id = $2`,
      [reviewId, userId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException('Review not found');
    }
    return this.formatReviewRow(res.rows[0]);
  }

  async deleteReview(userId: string, reviewId: string) {
    const res = await this.db.query(
      'DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING id',
      [reviewId, userId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException('Review not found');
    }
    return { deleted: true, id: reviewId };
  }
}
