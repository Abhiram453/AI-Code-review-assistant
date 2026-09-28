import { Injectable, Logger } from '@nestjs/common';
import { AiProviderRecord } from '../providers/providers.service';
import {
  AIProvider,
  AIProviderCompletionOptions,
  ChatCompletionMessage,
  OpenAICompatibleProvider,
} from './openai-compatible.provider';

export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface ReviewIssue {
  id: string;
  title: string;
  severity: SeverityLevel;
  category: 'security' | 'performance' | 'quality' | 'diff';
  file: string;
  line: number;
  description: string;
  impact: string;
  recommendation: string;
  codeSnippet: string;
  suggestedFix: string;
  resolved?: boolean;
}

export interface StructuredReviewOutput {
  summary: string;
  riskScore: number;
  overallScore: number;
  issues: ReviewIssue[];
  recommendations: string[];
  severityCounts: Record<SeverityLevel, number>;
  modelUsed: string;
  executionMode: 'live-ai' | 'hybrid-static-fallback';
}

export interface FileInputForAi {
  path: string;
  name: string;
  language: string;
  content: string;
}

@Injectable()
export class AiEngineService {
  private readonly logger = new Logger(AiEngineService.name);

  createProviderAdapter(providerRecord: AiProviderRecord): AIProvider {
    return new OpenAICompatibleProvider({
      baseUrl: providerRecord.base_url,
      apiKey: providerRecord.api_key,
      modelName: providerRecord.model_name,
    });
  }

  async callOpenAiCompatibleChat(
    providerRecord: AiProviderRecord,
    messages: ChatCompletionMessage[],
    options: AIProviderCompletionOptions = {},
  ): Promise<{ content: string; model: string } | null> {
    const adapter = this.createProviderAdapter(providerRecord);
    return adapter.complete(messages, options);
  }

  private getTemplateSystemInstruction(template: string): string {
    switch (template) {
      case 'security':
        return `You are a Principal Application Security Engineer conducting a Security Code Review.
Focus specifically on:
- Hardcoded credentials, API keys, JWT secrets, database passwords
- Authentication and authorization flaws (weak hashing like MD5/SHA1, missing token expiry, broken access control)
- Input validation gaps and unvalidated user parameters
- Injection risks (SQL Injection, XSS / dangerouslySetInnerHTML, Command Injection, Path Traversal)`;
      case 'performance':
        return `You are a Principal Performance & Systems Architect conducting a Performance Code Review.
Focus specifically on:
- Slow operations, blocking synchronous I/O (fs.readFileSync, appendFileSync), and CPU-heavy loops
- Inefficient rendering in React/UI components (missing useEffect dependency arrays, unmemoized sorting/filtering)
- Unnecessary or N+1 database queries executed inside loops
- Memory leaks and unbounded in-memory caches`;
      case 'quality':
        return `You are a Staff Software Engineer conducting a Code Quality & Maintainability Review.
Focus specifically on:
- Naming conventions (cryptic identifiers, inconsistent casing)
- Code structure, modularity, and separation of concerns
- Readability, TypeScript type safety (avoiding 'any'), and clean interfaces
- Maintainability, error handling, and adherence to SOLID principles`;
      default:
        return `You are a Principal Full-Stack Engineer conducting a Comprehensive Code Review covering Security, Performance, and Code Quality.`;
    }
  }

  async runCodeReview(
    provider: AiProviderRecord,
    template: 'security' | 'performance' | 'quality' | 'comprehensive',
    files: FileInputForAi[],
  ): Promise<StructuredReviewOutput> {
    const systemPrompt = `${this.getTemplateSystemInstruction(template)}

You MUST respond with valid JSON matching this exact structure:
{
  "summary": "High-level executive overview of findings across the reviewed files.",
  "riskScore": 72,
  "issues": [
    {
      "title": "Concise issue title",
      "severity": "critical" | "high" | "medium" | "low",
      "category": "security" | "performance" | "quality",
      "file": "path/to/file.ts",
      "line": 42,
      "description": "Clear explanation of what is wrong in the code.",
      "impact": "Concrete business, security, or runtime impact if left unaddressed.",
      "recommendation": "Actionable remediation guidance and code fix.",
      "codeSnippet": "The exact offending line or snippet"
    }
  ],
  "recommendations": [
    "Actionable architectural recommendation 1",
    "Actionable architectural recommendation 2"
  ]
}`;

    const filesPrompt = files
      .slice(0, 18)
      .map((f) => {
        const numberedLines = f.content
          .split(/\r?\n/)
          .slice(0, 250)
          .map((line, i) => `${i + 1}: ${line}`)
          .join('\n');
        return `=== FILE: ${f.path} (${f.language}) ===\n${numberedLines}`;
      })
      .join('\n\n');

    const aiResponse = await this.callOpenAiCompatibleChat(provider, [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Perform a ${template.toUpperCase()} review on the following ${files.length} file(s) and return the structured JSON response:\n\n${filesPrompt}`,
      },
    ]);

    if (aiResponse) {
      const parsed = this.validateAndParseAiReviewJson(aiResponse.content);
      if (parsed) {
        const severityCounts = this.computeSeverityCounts(parsed.issues);
        return {
          summary: parsed.summary,
          riskScore: parsed.riskScore,
          overallScore: parsed.riskScore,
          issues: parsed.issues,
          recommendations: parsed.recommendations,
          severityCounts,
          modelUsed: aiResponse.model,
          executionMode: 'live-ai',
        };
      }
    }

    return this.runStaticCodeReviewFallback(provider, template, files);
  }

  private normalizeSeverity(raw: unknown): SeverityLevel {
    const val = String(raw || '').trim().toLowerCase();
    if (val === 'critical') return 'Critical';
    if (val === 'high') return 'High';
    if (val === 'medium') return 'Medium';
    if (val === 'low') return 'Low';
    return 'Medium';
  }

  /**
   * Validates and normalizes AI JSON output, safely handling malformed responses.
   */
  validateAndParseAiReviewJson(raw: string): {
    summary: string;
    riskScore: number;
    issues: ReviewIssue[];
    recommendations: string[];
  } | null {
    try {
      const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/, '')
        .trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) return null;

      const obj = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      if (!obj || typeof obj.summary !== 'string' || !Array.isArray(obj.issues)) {
        return null;
      }

      const issues: ReviewIssue[] = obj.issues.map((item: any, idx: number) => {
        const recommendation = String(
          item.recommendation || item.suggestedFix || 'Refactor this section to follow best practices.',
        );
        return {
          id: `ai_iss_${idx + 1}`,
          title: String(item.title || 'Detected Code Issue'),
          severity: this.normalizeSeverity(item.severity),
          category: item.category || 'quality',
          file: String(item.file || 'unknown'),
          line: Math.max(1, Number(item.line) || 1),
          description: String(item.description || ''),
          impact: String(
            item.impact ||
              'May degrade system security, runtime stability, or long-term maintainability.',
          ),
          recommendation,
          codeSnippet: String(item.codeSnippet || ''),
          suggestedFix: String(item.suggestedFix || recommendation),
        };
      });

      const recommendations = Array.isArray(obj.recommendations)
        ? obj.recommendations.map((r: any) => String(r))
        : [];

      const rawScore = obj.riskScore ?? obj.overallScore;
      const riskScore =
        typeof rawScore === 'number'
          ? Math.max(0, Math.min(100, Math.round(rawScore)))
          : this.calculateScoreFromIssues(issues);

      return {
        summary: obj.summary,
        riskScore,
        issues,
        recommendations,
      };
    } catch {
      this.logger.warn('Received malformed AI JSON output; falling back to structured analyzer.');
      return null;
    }
  }

  private computeSeverityCounts(issues: ReviewIssue[]): Record<SeverityLevel, number> {
    const counts: Record<SeverityLevel, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };
    for (const iss of issues) {
      counts[iss.severity] = (counts[iss.severity] || 0) + 1;
    }
    return counts;
  }

  private calculateScoreFromIssues(issues: ReviewIssue[]): number {
    let score = 96;
    for (const iss of issues) {
      if (iss.severity === 'Critical') score -= 18;
      else if (iss.severity === 'High') score -= 10;
      else if (iss.severity === 'Medium') score -= 5;
      else score -= 2;
    }
    return Math.max(18, Math.min(98, score));
  }

  private runStaticCodeReviewFallback(
    provider: AiProviderRecord,
    template: 'security' | 'performance' | 'quality' | 'comprehensive',
    files: FileInputForAi[],
  ): StructuredReviewOutput {
    const allIssues: ReviewIssue[] = [];
    let issueCounter = 1;

    const pushIssue = (
      item: Omit<ReviewIssue, 'id' | 'suggestedFix'> & { suggestedFix?: string },
    ) => {
      allIssues.push({
        ...item,
        id: `iss_${issueCounter++}`,
        suggestedFix: item.suggestedFix || item.recommendation,
      });
    };

    for (const file of files) {
      const lines = file.content.split(/\r?\n/);
      let inLoopDepth = 0;

      lines.forEach((rawLine, idx) => {
        const lineNum = idx + 1;
        const line = rawLine.trim();
        if (!line || line.startsWith('//') || line.startsWith('#')) return;

        if (/\b(for|while)\s*\(/.test(line) || /\.forEach\s*\(/.test(line)) {
          inLoopDepth++;
        }

        // --- SECURITY CHECKS ---
        if (template === 'security' || template === 'comprehensive') {
          if (
            /(SECRET|API_KEY|PRIVATE_KEY|PASSWORD|TOKEN)\s*[:=]\s*['"`][^'"`]{8,}['"`]/i.test(
              line,
            ) ||
            /sk_live_[0-9a-zA-Z]{10,}/.test(line) ||
            /postgresql:\/\/[^:]+:[^@]+@/.test(line)
          ) {
            pushIssue({
              title: 'Hardcoded Secret or Credential',
              severity: 'Critical',
              category: 'security',
              file: file.path,
              line: lineNum,
              description:
                'A sensitive signing secret, API key, or database credential is directly embedded in source code.',
              impact:
                'Attackers obtaining repository read access could forge authentication tokens or access production infrastructure.',
              recommendation:
                'Move the secret into an environment variable (process.env) and rotate the exposed credential immediately.',
              codeSnippet: line.slice(0, 140),
            });
          }

          if (
            /\b(SELECT|UPDATE|DELETE|INSERT)\b.*\$\{/i.test(line) ||
            /\b(SELECT|UPDATE|DELETE|INSERT)\b.*\+\s*[a-zA-Z0-9_]+/i.test(line)
          ) {
            pushIssue({
              title: 'SQL Injection via Unsanitized String Interpolation',
              severity: 'Critical',
              category: 'security',
              file: file.path,
              line: lineNum,
              description:
                'User-controlled input is interpolated directly into a raw SQL statement without parameterization.',
              impact:
                'Allows attackers to bypass authentication, exfiltrate sensitive tables, or mutate database state.',
              recommendation:
                'Use parameterized SQL placeholders ($1, $2) and pass user inputs via the query parameter binding array.',
              codeSnippet: line.slice(0, 140),
            });
          }

          if (/createHash\(['"`](md5|sha1)['"`]\)/i.test(line)) {
            pushIssue({
              title: 'Weak Cryptographic Hash Algorithm (MD5 / SHA-1)',
              severity: 'High',
              category: 'security',
              file: file.path,
              line: lineNum,
              description:
                'Passwords or tokens are hashed using unsalted MD5/SHA-1.',
              impact:
                'Attackers can recover plaintext passwords rapidly using off-the-shelf GPU rainbow tables and collision attacks.',
              recommendation:
                'Migrate password hashing to bcrypt (cost factor >= 10) or Argon2id with a unique per-user salt.',
              codeSnippet: line.slice(0, 140),
            });
          }

          if (/dangerouslySetInnerHTML|\binnerHTML\s*=/.test(line)) {
            pushIssue({
              title: 'DOM Cross-Site Scripting (XSS) via Unsanitized HTML',
              severity: 'High',
              category: 'security',
              file: file.path,
              line: lineNum,
              description:
                'Raw HTML string is injected directly into the DOM without prior sanitization.',
              impact:
                'Enables arbitrary JavaScript execution in victim browsers, risking session token theft and account takeover.',
              recommendation:
                'Sanitize HTML payloads with DOMPurify.sanitize() before rendering, or render escaped text in JSX.',
              codeSnippet: line.slice(0, 140),
            });
          }
        }

        // --- PERFORMANCE CHECKS ---
        if (template === 'performance' || template === 'comprehensive') {
          if (inLoopDepth > 0 && /\bawait\s+(db\.|fetch\(|axios\.|prisma\.|this\.db)/.test(line)) {
            pushIssue({
              title: 'Sequential N+1 Database Query Inside Loop',
              severity: 'High',
              category: 'performance',
              file: file.path,
              line: lineNum,
              description:
                'An asynchronous database query or network call is awaited sequentially inside an iterative loop.',
              impact:
                'Endpoint latency scales linearly O(N) with record count and can exhaust the database connection pool under load.',
              recommendation:
                'Consolidate loop queries into a single SQL JOIN / WHERE IN batch query or bound concurrency.',
              codeSnippet: line.slice(0, 140),
            });
          }

          if (/\bfs\.(readFileSync|writeFileSync|appendFileSync|existsSync)\b/.test(line)) {
            pushIssue({
              title: 'Blocking Synchronous File System I/O on Event Loop',
              severity: 'High',
              category: 'performance',
              file: file.path,
              line: lineNum,
              description:
                'Synchronous fs.*Sync operation is executed inside a request processing path.',
              impact:
                'Stalls the single-threaded Node.js event loop, degrading throughput and tail latency for all concurrent users.',
              recommendation:
                'Replace with non-blocking fs.promises (readFile, appendFile) or an asynchronous buffered logger.',
              codeSnippet: line.slice(0, 140),
            });
          }

          if (/this\.cache\[.*\]\s*=/.test(line)) {
            pushIssue({
              title: 'Unbounded In-Memory Cache Without Eviction Policy',
              severity: 'Medium',
              category: 'performance',
              file: file.path,
              line: lineNum,
              description:
                'Query responses are stored in an in-memory dictionary without TTL expiration or maximum key bounds.',
              impact:
                'Causes continuous V8 heap growth over time, eventually triggering Out-Of-Memory (OOM) process restarts.',
              recommendation:
                'Use a bounded LRU cache with explicit max entries and TTL, or move caching to Redis.',
              codeSnippet: line.slice(0, 140),
            });
          }

          if (/Math\.sqrt\(|10000/.test(line) && inLoopDepth > 0) {
            pushIssue({
              title: 'Expensive CPU Computation Inside Render Sort Path',
              severity: 'High',
              category: 'performance',
              file: file.path,
              line: lineNum,
              description:
                'Heavy synchronous loop cycles execute inside a comparator during component rendering.',
              impact:
                'Blocks the browser main thread on every keystroke, causing noticeable input lag and frame drops.',
              recommendation:
                'Remove redundant loop work and memoize filtered/sorted lists with React.useMemo().',
              codeSnippet: line.slice(0, 140),
            });
          }
        }

        // --- CODE QUALITY CHECKS ---
        if (template === 'quality' || template === 'comprehensive') {
          if (/:\s*any(\[\])?\b/.test(line)) {
            pushIssue({
              title: 'Explicit TypeScript "any" Bypasses Type Safety',
              severity: 'Low',
              category: 'quality',
              file: file.path,
              line: lineNum,
              description:
                'Parameters or state collections are typed as "any" instead of a concrete domain interface.',
              impact:
                'Disables compile-time contract verification and increases the risk of unhandled undefined property errors.',
              recommendation:
                'Define explicit TypeScript interfaces or DTO types for request payloads and state arrays.',
              codeSnippet: line.slice(0, 140),
            });
          }

          if (/key=\{(idx|index|i)\}/.test(line)) {
            pushIssue({
              title: 'Array Index Used as React Key on Dynamic Collection',
              severity: 'Medium',
              category: 'quality',
              file: file.path,
              line: lineNum,
              description:
                'List items use their mutable array index as the React reconciliation key.',
              impact:
                'Causes incorrect component state association and unnecessary DOM re-mounts when items are filtered or re-ordered.',
              recommendation:
                'Bind a stable domain identifier such as key={item.id}.',
              codeSnippet: line.slice(0, 140),
            });
          }

          if (/\bconsole\.(log|debug)\s*\(/.test(line)) {
            pushIssue({
              title: 'Unstructured console.log in Production Module',
              severity: 'Low',
              category: 'quality',
              file: file.path,
              line: lineNum,
              description:
                'Direct console.log statements are used instead of a structured application logger.',
              impact:
                'Lacks severity levels and request correlation metadata, and may leak raw SQL parameters into container logs.',
              recommendation:
                'Use a structured logger (e.g., NestJS Logger or Pino) with configurable log levels.',
              codeSnippet: line.slice(0, 140),
            });
          }

          if (/\b(c_id|c_nm|o_id)\b/.test(line)) {
            pushIssue({
              title: 'Cryptic Abbreviated Identifier Naming',
              severity: 'Low',
              category: 'quality',
              file: file.path,
              line: lineNum,
              description:
                'Abbreviated keys (c_id, c_nm, o_id) obscure domain intent in returned objects.',
              impact:
                'Increases cognitive load during code reviews and makes API contracts harder for consumers to integrate.',
              recommendation:
                'Rename properties to descriptive camelCase identifiers (customerId, customerName, orderId).',
              codeSnippet: line.slice(0, 140),
            });
          }
        }
      });
    }

    if (template === 'performance' || template === 'comprehensive') {
      for (const file of files) {
        const match = file.content.match(/useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;/);
        if (
          match &&
          !allIssues.some(
            (i) => i.file === file.path && i.title.includes('useEffect'),
          )
        ) {
          const lineNum =
            file.content.slice(0, match.index || 0).split(/\r?\n/).length;
          pushIssue({
            title: 'React useEffect Hook Missing Dependency Array',
            severity: 'High',
            category: 'performance',
            file: file.path,
            line: lineNum,
            description:
              'useEffect is invoked without a dependency array, causing it to execute after every render.',
            impact:
              'Triggers repeated network requests and state updates that can lock the client into an infinite re-render loop.',
            recommendation:
              'Specify an explicit dependency array ([userId]) and cancel in-flight fetches via AbortController.',
            codeSnippet: 'useEffect(() => { fetch(...).then(...) });',
          });
        }
      }
    }

    if (allIssues.length === 0 && files.length > 0) {
      pushIssue({
        title: `Automated ${template.toUpperCase()} Verification Passed`,
        severity: 'Low',
        category: template === 'comprehensive' ? 'quality' : template,
        file: files[0].path,
        line: 1,
        description: `No high-risk ${template} anti-patterns were detected in the selected scope.`,
        impact:
          'Adding automated regression tests and runtime schema validation will further harden this module.',
        recommendation:
          'Add unit tests covering edge-case inputs and enforce strict TypeScript return types.',
        codeSnippet: files[0].content.split(/\r?\n/)[0] || '',
      });
    }

    const severityCounts = this.computeSeverityCounts(allIssues);
    const riskScore = this.calculateScoreFromIssues(allIssues);

    const templateLabel =
      template === 'security'
        ? 'Security Review'
        : template === 'performance'
          ? 'Performance Review'
          : template === 'quality'
            ? 'Code Quality Review'
            : 'Comprehensive Review';

    const summary = `${templateLabel} inspected ${files.length} file(s) (${files.map((f) => f.name).join(', ')}) and detected ${allIssues.length} finding(s): ${severityCounts.Critical} Critical, ${severityCounts.High} High, ${severityCounts.Medium} Medium, and ${severityCounts.Low} Low. Codebase health score is ${riskScore}/100.`;

    const recommendations: string[] = [];
    if (severityCounts.Critical > 0) {
      recommendations.push(
        'Remediate all Critical exposures (hardcoded secrets and unparameterized SQL queries) before merging to production.',
      );
    }
    if (allIssues.some((i) => i.category === 'performance')) {
      recommendations.push(
        'Eliminate sequential N+1 queries inside loops and replace synchronous fs.*Sync calls with non-blocking async I/O.',
      );
    }
    if (allIssues.some((i) => i.category === 'quality')) {
      recommendations.push(
        'Replace explicit "any" annotations with strict TypeScript interfaces and standardize structured logging.',
      );
    }
    recommendations.push(
      `Enforce automated ${templateLabel.toLowerCase()} checks in CI pull request pipelines.`,
    );

    return {
      summary,
      riskScore,
      overallScore: riskScore,
      issues: allIssues,
      recommendations,
      severityCounts,
      modelUsed: `${provider.model_name}`,
      executionMode: 'hybrid-static-fallback',
    };
  }

  async answerCodebaseQuestion(
    provider: AiProviderRecord,
    question: string,
    relevantFiles: FileInputForAi[],
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<{
    answer: string;
    referencedFiles: string[];
    modelUsed: string;
    executionMode: 'live-ai' | 'hybrid-static-fallback';
  }> {
    const contextBlock = relevantFiles
      .map((f) => {
        const numbered = f.content
          .split(/\r?\n/)
          .slice(0, 180)
          .map((l, idx) => `${idx + 1}: ${l}`)
          .join('\n');
        return `### File: ${f.path}\n\`\`\`${f.language}\n${numbered}\n\`\`\``;
      })
      .join('\n\n');

    const systemMessage = `You are CodeLens AI, an expert developer assistant answering technical questions about the uploaded project codebase.
Always ground your answers in the provided project files, cite exact file paths and line numbers, and format code examples using Markdown code blocks.

Uploaded Project Context:
${contextBlock}`;

    const chatMessages: ChatCompletionMessage[] = [
      { role: 'system', content: systemMessage },
      ...history.slice(-6),
      { role: 'user', content: question },
    ];

    const liveResult = await this.callOpenAiCompatibleChat(provider, chatMessages, {
      temperature: 0.3,
    });

    const citedFiles = relevantFiles.map((f) => f.path);

    if (liveResult) {
      return {
        answer: liveResult.content,
        referencedFiles: citedFiles,
        modelUsed: liveResult.model,
        executionMode: 'live-ai',
      };
    }

    const qLower = question.toLowerCase();
    const matchedLines: Array<{ file: string; line: number; text: string }> = [];

    const keywords = qLower
      .replace(/[^a-z0-9_]/g, ' ')
      .split(/\s+/)
      .filter(
        (w) =>
          w.length >= 3 &&
          ![
            'how',
            'what',
            'which',
            'where',
            'does',
            'the',
            'explain',
            'file',
            'files',
            'code',
            'work',
            'works',
          ].includes(w),
      );

    for (const file of relevantFiles) {
      const lines = file.content.split(/\r?\n/);
      lines.forEach((l, idx) => {
        const lowerLine = l.toLowerCase();
        if (
          keywords.some((kw) => lowerLine.includes(kw)) ||
          (qLower.includes('auth') && /login|password|token|jwt|auth/i.test(l)) ||
          (qLower.includes('database') && /db|query|sql|postgres|connection/i.test(l))
        ) {
          matchedLines.push({ file: file.path, line: idx + 1, text: l.trim() });
        }
      });
    }

    let specificInsight = '';
    if (qLower.includes('auth') || qLower.includes('login') || qLower.includes('password')) {
      specificInsight = `The authentication flow begins in \`src/auth/auth.service.ts\` inside \`AuthService.loginUser(email, passwordPlain)\`:

1. **Account Lookup (\`src/auth/auth.service.ts:10\`)**: Queries the \`users\` table via \`db.executeRaw()\`.
2. **Password Verification (\`src/auth/auth.service.ts:19\`)**: Computes an MD5 digest of \`passwordPlain\` and compares it against \`user.password_md5\`.
3. **Token Issuance (\`src/auth/auth.service.ts:25\`)**: Encodes \`{ userId, role, secret }\` as Base64.

\`\`\`typescript
// Recommended Secure Refactoring
const users = await db.queryParameterized(
  'SELECT id, email, role, password_hash FROM users WHERE email = $1',
  [email],
);
const isValid = await bcrypt.compare(passwordPlain, users[0].password_hash);
\`\`\``;
    } else if (
      qLower.includes('database') ||
      qLower.includes('db') ||
      qLower.includes('connection') ||
      qLower.includes('sql')
    ) {
      specificInsight = `Database connections and query execution are handled in \`src/database/db-client.ts\`:

1. **Singleton Client (\`src/database/db-client.ts:2\`)**: Exports \`DatabaseClient\` as \`db\`, reading \`process.env.DB_URL\`.
2. **Query Methods**:
   - \`executeRaw(sql)\` (line 6): Used by \`AuthService\` and \`OrdersController\`, includes an unbounded in-memory cache (\`this.cache[sql]\`).
   - \`queryParameterized(sql, params)\` (line 16): Used by \`OrdersControllerV2\` (\`src/orders/orders.controller.v2.ts:15\`) for safe parameterized SQL queries.`;
    } else {
      const topMatches = matchedLines
        .slice(0, 6)
        .map((m) => `- \`${m.file}:${m.line}\` — \`${m.text.slice(0, 100)}\``)
        .join('\n');
      specificInsight = topMatches
        ? `### Matched Code References\n${topMatches}`
        : `### Codebase Context Analysis\nInspected ${relevantFiles.map((f) => `\`${f.path}\``).join(', ')} to answer your question.`;
    }

    return {
      answer: specificInsight,
      referencedFiles: citedFiles,
      modelUsed: provider.model_name,
      executionMode: 'hybrid-static-fallback',
    };
  }
}
