import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProjectsService } from '../projects/projects.service';
import { FilesService } from '../files/files.service';
import { ProvidersService } from '../providers/providers.service';
import { AiEngineService } from '../ai/ai-engine.service';

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

@Injectable()
export class BonusService {
  constructor(
    private readonly db: DatabaseService,
    private readonly projectsService: ProjectsService,
    private readonly filesService: FilesService,
    private readonly providersService: ProvidersService,
    private readonly aiEngine: AiEngineService,
  ) {}

  computeLineDiff(oldText: string, newText: string): {
    lines: DiffLine[];
    stats: { additions: number; deletions: number; unchanged: number };
  } {
    const oldLines = oldText.split(/\r?\n/);
    const newLines = newText.split(/\r?\n/);

    // LCS-based diff for reasonable file sizes
    const m = oldLines.length;
    const n = newLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      new Array(n + 1).fill(0),
    );

    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        if (oldLines[i] === newLines[j]) {
          dp[i][j] = 1 + dp[i + 1][j + 1];
        } else {
          dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }

    const result: DiffLine[] = [];
    let i = 0;
    let j = 0;
    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    while (i < m && j < n) {
      if (oldLines[i] === newLines[j]) {
        result.push({
          type: 'unchanged',
          oldLineNumber: i + 1,
          newLineNumber: j + 1,
          content: oldLines[i],
        });
        unchanged++;
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        result.push({
          type: 'removed',
          oldLineNumber: i + 1,
          newLineNumber: null,
          content: oldLines[i],
        });
        deletions++;
        i++;
      } else {
        result.push({
          type: 'added',
          oldLineNumber: null,
          newLineNumber: j + 1,
          content: newLines[j],
        });
        additions++;
        j++;
      }
    }

    while (i < m) {
      result.push({
        type: 'removed',
        oldLineNumber: i + 1,
        newLineNumber: null,
        content: oldLines[i],
      });
      deletions++;
      i++;
    }

    while (j < n) {
      result.push({
        type: 'added',
        oldLineNumber: null,
        newLineNumber: j + 1,
        content: newLines[j],
      });
      additions++;
      j++;
    }

    return {
      lines: result,
      stats: { additions, deletions, unchanged },
    };
  }

  async runDiffReview(
    userId: string,
    projectId: string,
    dto: {
      baseFileId?: string;
      targetFileId?: string;
      baseLabel?: string;
      targetLabel?: string;
      baseContent?: string;
      targetContent?: string;
      providerId?: string;
    },
  ) {
    const project = await this.projectsService.getProjectById(userId, projectId);
    let baseLabel = dto.baseLabel || 'Original File';
    let targetLabel = dto.targetLabel || 'Modified File';
    let baseContent = dto.baseContent ?? '';
    let targetContent = dto.targetContent ?? '';

    if (dto.baseFileId) {
      const f1 = await this.filesService.getFileWithContent(
        userId,
        projectId,
        dto.baseFileId,
      );
      baseLabel = f1.path;
      baseContent = f1.content;
    }

    if (dto.targetFileId) {
      const f2 = await this.filesService.getFileWithContent(
        userId,
        projectId,
        dto.targetFileId,
      );
      targetLabel = f2.path;
      targetContent = f2.content;
    }

    if (!baseContent && !targetContent) {
      throw new BadRequestException(
        'Please select two files or provide original and modified code to compare.',
      );
    }

    const diff = this.computeLineDiff(baseContent, targetContent);
    const provider = await this.providersService.getActiveProviderForUser(
      userId,
      dto.providerId,
    );

    // Run review on the target (modified) file and also compare with base file
    const targetReview = await this.aiEngine.runCodeReview(
      provider,
      'comprehensive',
      [
        {
          path: targetLabel,
          name: targetLabel.split('/').pop() || targetLabel,
          language: 'typescript',
          content: targetContent,
        },
      ],
    );

    const baseReview = await this.aiEngine.runCodeReview(
      provider,
      'comprehensive',
      [
        {
          path: baseLabel,
          name: baseLabel.split('/').pop() || baseLabel,
          language: 'typescript',
          content: baseContent,
        },
      ],
    );

    const resolvedIssuesCount = Math.max(
      0,
      baseReview.issues.length - targetReview.issues.length,
    );
    const scoreDelta = targetReview.overallScore - baseReview.overallScore;

    const diffSummary = `Diff Review comparing ${baseLabel} → ${targetLabel} (+${diff.stats.additions} / -${diff.stats.deletions} lines). Quality score shifted from ${baseReview.overallScore}/100 to ${targetReview.overallScore}/100 (${scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts). ${
      resolvedIssuesCount > 0
        ? `Resolved ${resolvedIssuesCount} issue(s) present in ${baseLabel}. `
        : ''
    }${targetReview.summary}`;

    const recommendations = [
      ...(scoreDelta > 0
        ? [
            `Positive refactoring: health score improved by +${scoreDelta} points from ${baseLabel} to ${targetLabel}.`,
          ]
        : []),
      ...targetReview.recommendations,
    ];

    const reviewId = `rev_diff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await this.db.query(
      `INSERT INTO reviews (
        id, project_id, user_id, provider_id, scope_type, template, title,
        target_files, summary, overall_score, issues, recommendations,
        severity_counts, metadata, model_used, execution_mode
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        reviewId,
        projectId,
        userId,
        provider.id.startsWith('fallback') ? null : provider.id,
        'diff',
        'diff',
        `Diff Review: ${baseLabel.split('/').pop()} vs ${targetLabel.split('/').pop()}`,
        JSON.stringify([baseLabel, targetLabel]),
        diffSummary,
        targetReview.overallScore,
        JSON.stringify(targetReview.issues),
        JSON.stringify(recommendations),
        JSON.stringify(targetReview.severityCounts),
        JSON.stringify({
          baseLabel,
          targetLabel,
          stats: diff.stats,
          baseScore: baseReview.overallScore,
          targetScore: targetReview.overallScore,
          scoreDelta,
        }),
        targetReview.modelUsed,
        targetReview.executionMode,
      ],
    );

    return {
      reviewId,
      projectId: project.id,
      baseLabel,
      targetLabel,
      stats: diff.stats,
      diffLines: diff.lines,
      baseScore: baseReview.overallScore,
      targetScore: targetReview.overallScore,
      scoreDelta,
      summary: diffSummary,
      issues: targetReview.issues,
      resolvedIssues: baseReview.issues,
      recommendations,
      severityCounts: targetReview.severityCounts,
      modelUsed: targetReview.modelUsed,
      executionMode: targetReview.executionMode,
    };
  }

  async generateArchitectureAnalysis(
    userId: string,
    projectId: string,
    providerId?: string,
  ) {
    const project = await this.projectsService.getProjectById(userId, projectId);
    const { files } = await this.filesService.listProjectFiles(userId, projectId, true);

    if (files.length === 0) {
      throw new BadRequestException('Upload project files before running Architecture Analysis');
    }

    const provider = await this.providersService.getActiveProviderForUser(userId, providerId);

    // Analyze layers, imports, and modules across the project
    const layers = {
      presentation: files.filter((f) => /component|page|view|ui|\.tsx$/i.test(f.path)),
      controllers: files.filter((f) => /controller|route|handler|api/i.test(f.path)),
      services: files.filter((f) => /service|usecase|engine|auth|manager/i.test(f.path)),
      data: files.filter((f) => /db|database|repo|schema|model|prisma|sql/i.test(f.path)),
    };

    const dependencies: Array<{ from: string; to: string }> = [];
    for (const f of files) {
      const content = f.content || '';
      const importMatches = content.matchAll(/from\s+['"]([^'"]+)['"]/g);
      for (const m of importMatches) {
        dependencies.push({ from: f.path, to: m[1] });
      }
    }

    const languages = Array.from(new Set(files.map((f) => f.language)));
    const totalLines = files.reduce(
      (acc, f) => acc + (f.content ? f.content.split(/\r?\n/).length : 0),
      0,
    );

    const mermaidDiagram = [
      'flowchart TD',
      '  subgraph Presentation["Presentation / UI Layer"]',
      ...(layers.presentation.length > 0
        ? layers.presentation.map(
            (f, idx) => `    UI_${idx}["${f.name}"]`,
          )
        : ['    UI_0["Client Consumer"]']),
      '  end',
      '  subgraph Controllers["API / Controller Layer"]',
      ...(layers.controllers.length > 0
        ? layers.controllers.map((f, idx) => `    CTRL_${idx}["${f.name}"]`)
        : ['    CTRL_0["API Entrypoint"]']),
      '  end',
      '  subgraph Services["Domain & Business Logic"]',
      ...(layers.services.length > 0
        ? layers.services.map((f, idx) => `    SVC_${idx}["${f.name}"]`)
        : ['    SVC_0["Core Service"]']),
      '  end',
      '  subgraph DataLayer["Data Access & Persistence"]',
      ...(layers.data.length > 0
        ? layers.data.map((f, idx) => `    DB_${idx}["${f.name}"]`)
        : ['    DB_0["Database Store"]']),
      '  end',
      '  Presentation --> Controllers',
      '  Controllers --> Services',
      '  Services --> DataLayer',
    ].join('\n');

    let aiNarrative = '';
    const liveAi = await this.aiEngine.callOpenAiCompatibleChat(provider, [
      {
        role: 'system',
        content:
          'You are a Principal Software Architect. Provide a concise, structured architectural analysis of the project covering System Overview, Component Layers, Data Flow, and Architectural Risks.',
      },
      {
        role: 'user',
        content: `Project: ${project.name}\nFiles:\n${files
          .map((f) => `- ${f.path} (${f.language}, ${f.size} bytes)`)
          .join('\n')}\nImports:\n${dependencies
          .map((d) => `${d.from} -> ${d.to}`)
          .join('\n')}`,
      },
    ]);

    if (liveAi) {
      aiNarrative = liveAi.content;
    } else {
      aiNarrative = `### Architectural Overview: ${project.name}
The codebase consists of **${files.length} source files** totaling **${totalLines} lines of code** across **${languages.join(', ')}**.

#### 1. Layered Module Breakdown
- **Presentation / UI Layer (${layers.presentation.length} files)**: ${
        layers.presentation.map((f) => `\`${f.path}\``).join(', ') || 'None detected'
      }
- **API / Controller Layer (${layers.controllers.length} files)**: ${
        layers.controllers.map((f) => `\`${f.path}\``).join(', ') || 'None detected'
      }
- **Service & Domain Layer (${layers.services.length} files)**: ${
        layers.services.map((f) => `\`${f.path}\``).join(', ') || 'None detected'
      }
- **Data Access Layer (${layers.data.length} files)**: ${
        layers.data.map((f) => `\`${f.path}\``).join(', ') || 'None detected'
      }

#### 2. Dependency & Data Flow Topology
${
  dependencies.length > 0
    ? dependencies.map((d) => `- \`${d.from}\` imports \`${d.to}\``).join('\n')
    : '- Standalone modular files with minimal cross-file coupling.'
}

#### 3. Key Architectural Recommendations
1. **Enforce Parameterized Data Access**: Consolidate all raw SQL execution behind \`queryParameterized\` in the data layer and deprecate raw string query execution.
2. **Introduce DTO & Input Validation Boundaries**: Add schema validation at the Controller boundary before invoking domain services.
3. **Decouple Audit Logging & Caching**: Replace synchronous file logging and unbounded object caches with asynchronous event streams and bounded LRU/Redis caches.`;
    }

    return {
      projectId: project.id,
      projectName: project.name,
      metrics: {
        totalFiles: files.length,
        totalLines,
        languages,
        dependencyCount: dependencies.length,
      },
      layers: {
        presentation: layers.presentation.map((f) => f.path),
        controllers: layers.controllers.map((f) => f.path),
        services: layers.services.map((f) => f.path),
        data: layers.data.map((f) => f.path),
      },
      dependencies,
      mermaidDiagram,
      narrative: aiNarrative,
      modelUsed: liveAi ? liveAi.model : `${provider.model_name} (Architecture Analyzer)`,
      executionMode: liveAi ? 'live-ai' : 'hybrid-static-fallback',
      generatedAt: new Date().toISOString(),
    };
  }

  async generateDocumentationSuite(
    userId: string,
    projectId: string,
    dto: { docType?: 'readme' | 'setup' | 'api' | 'all'; providerId?: string },
  ) {
    const project = await this.projectsService.getProjectById(userId, projectId);
    const { files } = await this.filesService.listProjectFiles(userId, projectId, true);

    if (files.length === 0) {
      throw new BadRequestException('Upload project files before generating documentation');
    }

    const provider = await this.providersService.getActiveProviderForUser(
      userId,
      dto.providerId,
    );

    // Extract exported classes, functions, and interfaces from the files
    const exportedSymbols: Array<{ file: string; signatures: string[] }> = [];
    for (const f of files) {
      const lines = (f.content || '').split(/\r?\n/);
      const sigs = lines
        .map((l) => l.trim())
        .filter((l) =>
          /^(export\s+(class|interface|function|async\s+function|const)|async\s+\w+\s*\()/.test(
            l,
          ),
        )
        .map((l) => l.replace(/\{$/, '').trim());
      exportedSymbols.push({ file: f.path, signatures: sigs });
    }

    const readmeMarkdown = `# ${project.name}

> ${project.description || 'Project documentation automatically generated by AI Code Review Assistant.'}

## Overview

\`${project.name}\` contains **${files.length}** source files across **${Array.from(
      new Set(files.map((f) => f.language)),
    ).join(', ')}**.

## Directory Structure

\`\`\`text
${files.map((f) => `├── ${f.path} (${f.size} B)`).join('\n')}
\`\`\`

## Key Modules

${exportedSymbols
  .map(
    (s) =>
      `### \`${s.file}\`\n${
        s.signatures.length > 0
          ? s.signatures.map((sig) => `- \`${sig}\``).join('\n')
          : '- Internal module definitions'
      }`,
  )
  .join('\n\n')}
`;

    const setupGuideMarkdown = `# Setup & Development Guide — ${project.name}

## 1. Prerequisites

- **Node.js**: v20+ LTS recommended
- **Database**: PostgreSQL 15+ (if applicable to data layer modules)
- **Package Manager**: \`npm\` or \`pnpm\`

## 2. Environment Variables

Create a \`.env\` file at the root of the service:

\`\`\`env
NODE_ENV=development
PORT=4000
DB_URL=postgresql://postgres:postgres@localhost:5432/commerce_db
JWT_SECRET=replace_with_secure_random_secret
STRIPE_API_KEY=sk_test_replace_with_test_key
\`\`\`

## 3. Installation & Running

\`\`\`bash
# Install dependencies
npm install

# Run in development watch mode
npm run start:dev

# Run test suite
npm test
\`\`\`
`;

    const apiDocMarkdown = `# API & Module Reference — ${project.name}

${exportedSymbols
  .map(
    (s) => `## Module: \`${s.file}\`

### Exported Symbols & Methods
${
  s.signatures.length > 0
    ? s.signatures.map((sig) => `- \`${sig}\``).join('\n')
    : '- Standard module exports'
}
`,
  )
  .join('\n')}
`;

    // If live AI is connected and a specific docType was requested, allow AI enhancement
    const liveAi = await this.aiEngine.callOpenAiCompatibleChat(provider, [
      {
        role: 'system',
        content:
          'You are a Senior Developer Relations Engineer. Generate clean, well-structured Markdown documentation for the provided codebase.',
      },
      {
        role: 'user',
        content: `Generate concise documentation notes for ${project.name} with files: ${files
          .map((f) => f.path)
          .join(', ')}`,
      },
    ]);

    return {
      projectId: project.id,
      projectName: project.name,
      documents: {
        readme: liveAi && dto.docType === 'readme' ? liveAi.content : readmeMarkdown,
        setupGuide: setupGuideMarkdown,
        apiDocs: apiDocMarkdown,
      },
      modelUsed: liveAi ? liveAi.model : `${provider.model_name} (Doc Generator)`,
      executionMode: liveAi ? 'live-ai' : 'hybrid-static-fallback',
      generatedAt: new Date().toISOString(),
    };
  }
}
