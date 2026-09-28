import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProjectsService } from '../projects/projects.service';
import { ProvidersService } from '../providers/providers.service';
import { AiEngineService, FileInputForAi } from '../ai/ai-engine.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly db: DatabaseService,
    private readonly projectsService: ProjectsService,
    private readonly providersService: ProvidersService,
    private readonly aiEngine: AiEngineService,
  ) {}

  async listSessions(userId: string, projectId: string) {
    await this.projectsService.getProjectById(userId, projectId);
    const res = await this.db.query<{
      id: string;
      project_id: string;
      title: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, project_id, title, created_at, updated_at
       FROM chat_sessions
       WHERE project_id = $1 AND user_id = $2
       ORDER BY updated_at DESC`,
      [projectId, userId],
    );

    return res.rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      title: r.title,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async createSession(userId: string, projectId: string, title?: string) {
    await this.projectsService.getProjectById(userId, projectId);
    const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const cleanTitle = (title || '').trim() || 'Codebase Q&A Session';

    const res = await this.db.query<{
      id: string;
      project_id: string;
      title: string;
      created_at: string;
      updated_at: string;
    }>(
      `INSERT INTO chat_sessions (id, project_id, user_id, title)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, projectId, userId, cleanTitle],
    );

    const row = res.rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getSessionMessages(userId: string, sessionId: string) {
    const sess = await this.db.query<{
      id: string;
      project_id: string;
      user_id: string;
      title: string;
    }>('SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);

    if (sess.rowCount === 0) {
      throw new NotFoundException('Chat session not found');
    }

    const msgs = await this.db.query<{
      id: string;
      session_id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      referenced_files: any;
      model_used: string | null;
      created_at: string;
    }>(
      `SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId],
    );

    return {
      session: {
        id: sess.rows[0].id,
        projectId: sess.rows[0].project_id,
        title: sess.rows[0].title,
      },
      messages: msgs.rows.map((m) => ({
        id: m.id,
        sessionId: m.session_id,
        role: m.role,
        content: m.content,
        referencedFiles:
          typeof m.referenced_files === 'string'
            ? JSON.parse(m.referenced_files)
            : m.referenced_files || [],
        modelUsed: m.model_used,
        createdAt: m.created_at,
      })),
    };
  }

  async sendMessage(
    userId: string,
    projectId: string,
    dto: {
      sessionId?: string;
      question: string;
      pinnedFileIds?: string[];
      providerId?: string;
    },
  ) {
    const cleanQuestion = (dto.question || '').trim();
    if (!cleanQuestion) {
      throw new BadRequestException('Question cannot be empty');
    }

    let sessionId = dto.sessionId;
    if (!sessionId) {
      const created = await this.createSession(
        userId,
        projectId,
        cleanQuestion.slice(0, 48),
      );
      sessionId = created.id;
    } else {
      const existing = await this.db.query(
        'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId],
      );
      if (existing.rowCount === 0) {
        const created = await this.createSession(
          userId,
          projectId,
          cleanQuestion.slice(0, 48),
        );
        sessionId = created.id;
      }
    }

    // Retrieve all project files and rank them by relevance to the question
    const allFilesRes = await this.db.query<{
      id: string;
      path: string;
      name: string;
      language: string;
      content: string;
    }>(
      'SELECT id, path, name, language, content FROM files WHERE project_id = $1 ORDER BY path ASC',
      [projectId],
    );

    const relevantFiles = this.retrieveTopRelevantFiles(
      allFilesRes.rows,
      cleanQuestion,
      dto.pinnedFileIds || [],
    );

    // Load recent conversation history
    const historyRes = await this.db.query<{
      role: 'user' | 'assistant';
      content: string;
    }>(
      `SELECT role, content FROM messages
       WHERE session_id = $1 AND role IN ('user', 'assistant')
       ORDER BY created_at DESC LIMIT 6`,
      [sessionId],
    );
    const history = historyRes.rows.reverse();

    // Save user message
    const userMsgId = `msg_${Date.now()}_u_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.query(
      `INSERT INTO messages (id, session_id, role, content, referenced_files)
       VALUES ($1, $2, 'user', $3, $4)`,
      [userMsgId, sessionId, cleanQuestion, JSON.stringify([])],
    );

    const provider = await this.providersService.getActiveProviderForUser(
      userId,
      dto.providerId,
    );

    const aiReply = await this.aiEngine.answerCodebaseQuestion(
      provider,
      cleanQuestion,
      relevantFiles,
      history,
    );

    const assistantMsgId = `msg_${Date.now()}_a_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.query(
      `INSERT INTO messages (id, session_id, role, content, referenced_files, model_used)
       VALUES ($1, $2, 'assistant', $3, $4, $5)`,
      [
        assistantMsgId,
        sessionId,
        aiReply.answer,
        JSON.stringify(aiReply.referencedFiles),
        aiReply.modelUsed,
      ],
    );

    await this.db.query(
      `UPDATE chat_sessions SET updated_at = NOW(), title = CASE WHEN title = 'Codebase Q&A Session' THEN $1 ELSE title END WHERE id = $2`,
      [cleanQuestion.slice(0, 52), sessionId],
    );

    return this.getSessionMessages(userId, sessionId);
  }

  async deleteSession(userId: string, sessionId: string) {
    const res = await this.db.query(
      'DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [sessionId, userId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException('Chat session not found');
    }
    return { deleted: true, id: sessionId };
  }

  private retrieveTopRelevantFiles(
    files: Array<{
      id: string;
      path: string;
      name: string;
      language: string;
      content: string;
    }>,
    question: string,
    pinnedFileIds: string[],
  ): FileInputForAi[] {
    if (files.length <= 6) {
      return files;
    }

    const pinnedSet = new Set(pinnedFileIds);
    const terms = question
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2);

    const scored = files.map((f) => {
      let score = pinnedSet.has(f.id) ? 1000 : 0;
      const lowerPath = f.path.toLowerCase();
      const lowerContent = f.content.toLowerCase();

      for (const term of terms) {
        if (lowerPath.includes(term)) score += 25;
        if (term === 'auth' && lowerPath.includes('auth')) score += 40;
        if ((term === 'database' || term === 'db') && (lowerPath.includes('db') || lowerPath.includes('database'))) {
          score += 40;
        }
        const matches = lowerContent.split(term).length - 1;
        score += Math.min(matches * 3, 24);
      }

      return { file: f, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map((s) => s.file);
  }
}
