import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { SAMPLE_PROJECT_FILES } from './sample-seed';

export interface QueryResultRow {
  [column: string]: any;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pgPool: Pool | null = null;
  private pglite: PGlite | null = null;
  private engineMode: 'postgres-server' | 'postgres-embedded' = 'postgres-embedded';

  async onModuleInit() {
    await this.initializeDatabase();
    await this.runMigrations();
    await this.seedInitialDataIfNeeded();
  }

  async onModuleDestroy() {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.pglite) {
      await this.pglite.close();
    }
  }

  private async initializeDatabase() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && dbUrl.startsWith('postgres')) {
      try {
        const pool = new Pool({
          connectionString: dbUrl,
          connectionTimeoutMillis: 2500,
        });
        await pool.query('SELECT 1');
        this.pgPool = pool;
        this.engineMode = 'postgres-server';
        this.logger.log('Connected to external PostgreSQL server via DATABASE_URL');
        return;
      } catch (err: any) {
        this.logger.warn(
          `External PostgreSQL at DATABASE_URL not reachable (${err?.message || 'timeout'}). Falling back to embedded PostgreSQL 16 (PGlite).`,
        );
      }
    }

    const dataDir = path.resolve(process.cwd(), 'data', 'pgdata');
    fs.mkdirSync(path.dirname(dataDir), { recursive: true });
    this.pglite = new PGlite(dataDir);
    await this.pglite.waitReady;
    this.engineMode = 'postgres-embedded';
    this.logger.log(`Initialized embedded PostgreSQL 16 engine at ${dataDir}`);
  }

  getEngineInfo() {
    return {
      engine: 'PostgreSQL 16',
      mode: this.engineMode,
    };
  }

  async query<T = QueryResultRow>(
    sql: string,
    params: any[] = [],
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return { rows: res.rows as T[], rowCount: res.rowCount ?? res.rows.length };
    }
    if (this.pglite) {
      const res = await this.pglite.query<T>(sql, params);
      return { rows: res.rows, rowCount: res.rows.length };
    }
    throw new Error('Database engine is not initialized');
  }

  private async runMigrations() {
    const schemaPath = path.resolve(process.cwd(), 'sql', 'schema.sql');
    let schemaSql = '';
    if (fs.existsSync(schemaPath)) {
      schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    } else {
      const fallbackPath = path.resolve(__dirname, '..', '..', 'sql', 'schema.sql');
      schemaSql = fs.readFileSync(fallbackPath, 'utf-8');
    }

    if (this.pgPool) {
      await this.pgPool.query(schemaSql);
    } else if (this.pglite) {
      await this.pglite.exec(schemaSql);
    }
    this.logger.log('PostgreSQL database schema verified');
  }

  async seedUserDefaultProviders(userId: string) {
    const existing = await this.query('SELECT id FROM ai_providers WHERE user_id = $1 LIMIT 1', [
      userId,
    ]);
    if (existing.rowCount > 0) return;

    const presets = [
      {
        id: `prov_${userId.slice(0, 8)}_lmstudio`,
        name: 'LM Studio (Local OpenAI API)',
        provider_type: 'lm-studio',
        base_url: 'http://localhost:1234/v1',
        api_key: 'lm-studio',
        model_name: 'qwen2.5-coder-7b-instruct',
        is_default: true,
      },
      {
        id: `prov_${userId.slice(0, 8)}_openai`,
        name: 'OpenAI Cloud API',
        provider_type: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: '',
        model_name: 'gpt-4o-mini',
        is_default: false,
      },
      {
        id: `prov_${userId.slice(0, 8)}_ollama`,
        name: 'Ollama Local Server',
        provider_type: 'ollama',
        base_url: 'http://localhost:11434/v1',
        api_key: 'ollama',
        model_name: 'llama3.1:8b',
        is_default: false,
      },
      {
        id: `prov_${userId.slice(0, 8)}_openrouter`,
        name: 'OpenRouter Gateway',
        provider_type: 'openrouter',
        base_url: 'https://openrouter.ai/api/v1',
        api_key: '',
        model_name: 'anthropic/claude-3.5-sonnet',
        is_default: false,
      },
    ];

    for (const p of presets) {
      await this.query(
        `INSERT INTO ai_providers (id, user_id, name, provider_type, base_url, api_key, model_name, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, userId, p.name, p.provider_type, p.base_url, p.api_key, p.model_name, p.is_default],
      );
    }
  }

  async seedSampleProjectForUser(userId: string, customName?: string, customDescription?: string) {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const name = customName || 'Commerce & Auth Core Service';
    const description =
      customDescription ||
      'Sample full-stack service containing authentication, order reporting, database client, and React dashboard files for AI security, performance, and diff review.';

    await this.query(
      `INSERT INTO projects (id, user_id, name, description, repo_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [projectId, userId, name, description, 'https://github.com/example/commerce-auth-service'],
    );

    for (const f of SAMPLE_PROJECT_FILES) {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await this.query(
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

    return projectId;
  }

  private async seedInitialDataIfNeeded() {
    const demoEmail = 'demo@codereview.ai';
    const existing = await this.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [
      demoEmail,
    ]);
    if (existing.rowCount > 0) {
      return;
    }

    const demoUserId = 'usr_demo_developer';
    const passwordHash = await bcrypt.hash('DemoPass123!', 10);

    await this.query(
      `INSERT INTO users (id, email, name, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [demoUserId, demoEmail, 'Alex Rivera (Staff Engineer)', passwordHash],
    );

    await this.seedUserDefaultProviders(demoUserId);
    const projectId = await this.seedSampleProjectForUser(demoUserId);

    // Seed an initial Security Review so Review History is immediately populated
    const sampleIssues = [
      {
        id: 'iss_1',
        title: 'Hardcoded Production Secret & Live Stripe API Key',
        severity: 'Critical',
        file: 'src/auth/auth.service.ts',
        line: 5,
        description:
          'JWT_SECRET and STRIPE_API_KEY are hardcoded directly in source code, exposing credentials to anyone with repository access.',
        codeSnippet: 'const STRIPE_API_KEY = "mock_billing_secret_token_998123_example";',
        suggestedFix:
          'Move secrets to environment variables (process.env.JWT_SECRET, process.env.STRIPE_API_KEY) and rotate compromised keys immediately.',
      },
      {
        id: 'iss_2',
        title: 'SQL Injection via Unsanitized String Interpolation',
        severity: 'Critical',
        file: 'src/auth/auth.service.ts',
        line: 10,
        description:
          'User-supplied email is interpolated directly into a raw SQL query string, allowing attackers to bypass authentication via payloads like "\' OR 1=1 --".',
        codeSnippet: "const rawQuery = `SELECT * FROM users WHERE email = '${email}'`;",
        suggestedFix:
          'Use parameterized queries: await db.queryParameterized("SELECT * FROM users WHERE email = $1", [email]);',
      },
      {
        id: 'iss_3',
        title: 'Cryptographically Broken MD5 Password Hashing Without Salt',
        severity: 'High',
        file: 'src/auth/auth.service.ts',
        line: 19,
        description:
          'Passwords are hashed using unsalted MD5, which is vulnerable to fast GPU rainbow-table and collision attacks.',
        codeSnippet: "const hashedInput = crypto.createHash('md5').update(passwordPlain).digest('hex');",
        suggestedFix: 'Use bcrypt or Argon2id with an appropriate work factor (e.g., bcrypt.compare(passwordPlain, user.password_hash)).',
      },
      {
        id: 'iss_4',
        title: 'Cross-Site Scripting (XSS) via dangerouslySetInnerHTML',
        severity: 'High',
        file: 'src/components/UserDashboard.tsx',
        line: 31,
        description:
          'Rendering unsanitized rawBioHtml inside dangerouslySetInnerHTML allows arbitrary script execution in the victim browser.',
        codeSnippet: '<div dangerouslySetInnerHTML={{ __html: rawBioHtml }} />',
        suggestedFix:
          'Sanitize HTML with DOMPurify before rendering or render plain text directly in JSX.',
      },
    ];

    const sampleRecommendations = [
      'Replace all string-interpolated SQL statements with parameterized queries ($1, $2) across AuthService and OrdersController.',
      'Migrate password hashing from unsalted MD5 to Argon2id or bcrypt (cost >= 10) and sign JWTs with RS256/HS256 including an exp claim.',
      'Eliminate hardcoded secrets from src/auth/auth.service.ts and src/database/db-client.ts and enforce secret scanning in CI.',
      'Sanitize user HTML content or remove dangerouslySetInnerHTML in UserDashboard.tsx.',
    ];

    await this.query(
      `INSERT INTO reviews (
        id, project_id, user_id, provider_id, scope_type, template, title,
        target_files, summary, overall_score, issues, recommendations,
        severity_counts, model_used, execution_mode
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        'rev_initial_security_audit',
        projectId,
        demoUserId,
        `prov_${demoUserId.slice(0, 8)}_lmstudio`,
        'project',
        'security',
        'Security Review — Commerce & Auth Core Service',
        JSON.stringify([
          'src/auth/auth.service.ts',
          'src/orders/orders.controller.ts',
          'src/database/db-client.ts',
          'src/components/UserDashboard.tsx',
        ]),
        'Security audit of Commerce & Auth Core Service identified 2 Critical and 2 High severity vulnerabilities, including hardcoded live API keys, SQL injection in authentication flows, unsalted MD5 password hashing, and DOM XSS in the dashboard component.',
        44,
        JSON.stringify(sampleIssues),
        JSON.stringify(sampleRecommendations),
        JSON.stringify({ Critical: 2, High: 2, Medium: 0, Low: 0 }),
        'qwen2.5-coder-7b-instruct',
        'hybrid-fallback',
      ],
    );

    this.logger.log('Seeded initial demo developer account, AI provider presets, and sample project');
  }
}
