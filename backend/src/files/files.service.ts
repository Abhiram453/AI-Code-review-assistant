import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import AdmZip from 'adm-zip';
import * as path from 'path';
import { DatabaseService } from '../database/database.service';
import { ProjectsService } from '../projects/projects.service';

export interface ProjectFileRecord {
  id: string;
  project_id: string;
  path: string;
  name: string;
  extension: string;
  language: string;
  size: number;
  content: string;
  created_at: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  fileId?: string;
  language?: string;
  size?: number;
  children?: FileTreeNode[];
}

const IGNORED_SEGMENTS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.venv',
  'venv',
  '__pycache__',
  '.idea',
  '.vscode',
]);

const BINARY_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'ico',
  'pdf',
  'zip',
  'tar',
  'gz',
  'exe',
  'dll',
  'so',
  'dylib',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'mp4',
  'mp3',
  'lock',
]);

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly projectsService: ProjectsService,
  ) {}

  detectLanguage(filePath: string): { ext: string; language: string } {
    const ext = path.extname(filePath).replace(/^\./, '').toLowerCase();
    const map: Record<string, string> = {
      ts: 'typescript',
      tsx: 'tsx',
      js: 'javascript',
      jsx: 'jsx',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      rb: 'ruby',
      php: 'php',
      sql: 'sql',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sh: 'bash',
      dockerfile: 'dockerfile',
    };
    const baseName = path.basename(filePath).toLowerCase();
    if (baseName === 'dockerfile') {
      return { ext: 'dockerfile', language: 'dockerfile' };
    }
    return {
      ext,
      language: map[ext] || 'plaintext',
    };
  }

  isUnsafePath(rawPath: string): boolean {
    if (!rawPath || rawPath.includes('\u0000')) return true;
    const slashNormalized = rawPath.replace(/\\/g, '/');
    if (
      slashNormalized.startsWith('/') ||
      /^[a-zA-Z]:/.test(slashNormalized) ||
      slashNormalized.split('/').some((seg) => seg === '..')
    ) {
      return true;
    }
    const posixNorm = path.posix.normalize(slashNormalized);
    return posixNorm.startsWith('..') || posixNorm.startsWith('/');
  }

  shouldIncludeFile(relativePath: string, byteLength: number): boolean {
    if (this.isUnsafePath(relativePath)) return false;
    const normalized = path.posix
      .normalize(relativePath.replace(/\\/g, '/'))
      .replace(/^\/+/, '');
    if (!normalized || normalized === '.' || normalized.endsWith('/')) return false;
    if (byteLength > 500_000) return false; // Skip single files larger than 500KB

    const segments = normalized.split('/');
    if (segments.some((s) => IGNORED_SEGMENTS.has(s))) return false;

    const base = path.basename(normalized);
    if (base === 'package-lock.json' || base === 'pnpm-lock.yaml' || base === 'yarn.lock') {
      return false;
    }

    const ext = path.extname(normalized).replace(/^\./, '').toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) return false;

    return true;
  }

  async listProjectFiles(userId: string, projectId: string, includeContent = false) {
    await this.projectsService.getProjectById(userId, projectId);

    const cols = includeContent
      ? 'id, project_id, path, name, extension, language, size, content, created_at'
      : 'id, project_id, path, name, extension, language, size, created_at';

    const res = await this.db.query<ProjectFileRecord>(
      `SELECT ${cols} FROM files WHERE project_id = $1 ORDER BY path ASC`,
      [projectId],
    );

    const files = res.rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      path: r.path,
      name: r.name,
      extension: r.extension,
      language: r.language,
      size: r.size,
      content: includeContent ? r.content : undefined,
      createdAt: r.created_at,
    }));

    return {
      files,
      tree: this.buildFileTree(files),
    };
  }

  async getFileWithContent(userId: string, projectId: string, fileId: string) {
    await this.projectsService.getProjectById(userId, projectId);
    const res = await this.db.query<ProjectFileRecord>(
      'SELECT * FROM files WHERE id = $1 AND project_id = $2',
      [fileId, projectId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException('File not found in project');
    }
    const r = res.rows[0];
    return {
      id: r.id,
      projectId: r.project_id,
      path: r.path,
      name: r.name,
      extension: r.extension,
      language: r.language,
      size: r.size,
      content: r.content,
      createdAt: r.created_at,
    };
  }

  async upsertFilesBatch(
    userId: string,
    projectId: string,
    items: Array<{ path: string; content: string }>,
  ) {
    await this.projectsService.getProjectById(userId, projectId);
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('No valid source files provided');
    }

    let importedCount = 0;
    for (const item of items.slice(0, 120)) {
      const rawPath = (item.path || '').trim();
      if (this.isUnsafePath(rawPath)) {
        throw new BadRequestException('That archive contains unsupported or unsafe files.');
      }
      const normalizedPath = path.posix
        .normalize(rawPath.replace(/\\/g, '/'))
        .replace(/^\/+/, '');
      const content = typeof item.content === 'string' ? item.content : '';
      if (!normalizedPath || content.includes('\u0000')) continue;

      const size = Buffer.byteLength(content, 'utf8');
      if (!this.shouldIncludeFile(normalizedPath, size)) continue;

      const name = path.posix.basename(normalizedPath);
      const { ext, language } = this.detectLanguage(normalizedPath);
      const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await this.db.query(
        `INSERT INTO files (id, project_id, path, name, extension, language, size, content)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (project_id, path) DO UPDATE
         SET content = EXCLUDED.content,
             size = EXCLUDED.size,
             language = EXCLUDED.language`,
        [fileId, projectId, normalizedPath, name, ext, language, size, content],
      );
      importedCount++;
    }

    await this.db.query('UPDATE projects SET updated_at = NOW() WHERE id = $1', [projectId]);

    const updated = await this.listProjectFiles(userId, projectId, false);
    return {
      importedCount,
      ...updated,
    };
  }

  async extractAndSaveZipBuffer(userId: string, projectId: string, buffer: Buffer) {
    await this.projectsService.getProjectById(userId, projectId);
    if (buffer.length > 50 * 1024 * 1024) {
      throw new BadRequestException('ZIP archive exceeds the 50 MB size limit.');
    }
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch {
      throw new BadRequestException('That archive contains unsupported or unsafe files.');
    }

    const entries = zip.getEntries();
    const rawFiles: Array<{ path: string; content: string }> = [];

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      if (this.isUnsafePath(entry.entryName)) {
        throw new BadRequestException('That archive contains unsupported or unsafe files.');
      }
      const entryName = path.posix
        .normalize(entry.entryName.replace(/\\/g, '/'))
        .replace(/^\/+/, '');
      const data = entry.getData();
      if (!this.shouldIncludeFile(entryName, data.length)) continue;

      const text = data.toString('utf8');
      if (text.includes('\u0000')) continue; // Skip binary files
      rawFiles.push({ path: entryName, content: text });
    }

    // Strip common single top-level directory if present (e.g. repo-main/src/... -> src/...)
    if (rawFiles.length > 0) {
      const firstSegments = new Set(
        rawFiles.map((f) => f.path.split('/')[0]).filter(Boolean),
      );
      if (firstSegments.size === 1 && rawFiles.every((f) => f.path.includes('/'))) {
        const prefix = `${Array.from(firstSegments)[0]}/`;
        for (const f of rawFiles) {
          if (f.path.startsWith(prefix)) {
            f.path = f.path.slice(prefix.length);
          }
        }
      }
    }

    if (rawFiles.length === 0) {
      throw new BadRequestException(
        'No supported text source files found in the ZIP archive',
      );
    }

    return this.upsertFilesBatch(userId, projectId, rawFiles);
  }

  async importFromGithubUrl(userId: string, projectId: string, repoUrl: string, branch?: string) {
    await this.projectsService.getProjectById(userId, projectId);
    const cleaned = (repoUrl || '').trim().replace(/\.git$/, '').replace(/\/+$/, '');
    const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/i);
    if (!match) {
      throw new BadRequestException(
        'Please provide a valid GitHub repository URL (e.g., https://github.com/owner/repo)',
      );
    }

    const owner = match[1];
    const repo = match[2];
    const candidateBranches = branch
      ? [branch]
      : match[3]
        ? [match[3]]
        : ['main', 'master'];

    let lastError = '';
    for (const br of candidateBranches) {
      const zipUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${br}`;
      try {
        const response = await fetch(zipUrl);
        if (response.ok) {
          const arrayBuf = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          await this.db.query('UPDATE projects SET repo_url = $1, updated_at = NOW() WHERE id = $2', [
            `https://github.com/${owner}/${repo}`,
            projectId,
          ]);
          return await this.extractAndSaveZipBuffer(userId, projectId, buffer);
        }
        lastError = `HTTP ${response.status} on branch ${br}`;
      } catch (err: any) {
        lastError = err?.message || 'Network error fetching GitHub archive';
      }
    }

    throw new BadRequestException(
      `Could not download public GitHub repository ${owner}/${repo} (${lastError}). Ensure the repository is public and branch name is valid.`,
    );
  }

  async deleteFile(userId: string, projectId: string, fileId: string) {
    await this.projectsService.getProjectById(userId, projectId);
    const res = await this.db.query(
      'DELETE FROM files WHERE id = $1 AND project_id = $2 RETURNING id',
      [fileId, projectId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException('File not found');
    }
    return { deleted: true, id: fileId };
  }

  private buildFileTree(
    files: Array<{
      id: string;
      path: string;
      name: string;
      language: string;
      size: number;
    }>,
  ): FileTreeNode[] {
    const root: FileTreeNode[] = [];

    for (const file of files) {
      const parts = file.path.split('/').filter(Boolean);
      let currentLevel = root;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = i === parts.length - 1;

        if (isLast) {
          currentLevel.push({
            name: part,
            path: file.path,
            type: 'file',
            fileId: file.id,
            language: file.language,
            size: file.size,
          });
        } else {
          let folder = currentLevel.find(
            (n) => n.type === 'folder' && n.name === part,
          );
          if (!folder) {
            folder = {
              name: part,
              path: currentPath,
              type: 'folder',
              children: [],
            };
            currentLevel.push(folder);
          }
          currentLevel = folder.children!;
        }
      }
    }

    const sortNodes = (nodes: FileTreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      for (const n of nodes) {
        if (n.children) sortNodes(n.children);
      }
    };

    sortNodes(root);
    return root;
  }
}
