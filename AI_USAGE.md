# Mandatory AI Usage Report (`AI_USAGE.md`)

In accordance with the Full Stack Engineering Internship Assessment policy, this document transparently discloses how AI tools were used during the design, implementation, and verification of **CodeLens AI — AI-Powered Code Review Assistant**, alongside the architectural and engineering decisions made throughout the project.

---

## 1. AI Tools Used

| Tool / Model | Role in Development |
| :--- | :--- |
| **Google Antigravity** | Pair-programming assistant used for scaffolding NestJS modules, structuring PostgreSQL DDL (`schema.sql`), building the CodeLens AI dark-first design system (`Primitives.tsx`, `CommandPalette.tsx`, `OverviewView.tsx`, `ReviewInspector.tsx`), and drafting documentation structure. |
| **OpenAI-Compatible Local & Cloud APIs (`LM Studio`, `Ollama`, `OpenAI`, `OpenRouter`)** | Target runtime inference engines integrated into `OpenAICompatibleProvider` and `AiEngineService` via `POST {baseUrl}/chat/completions`. |

---

## 2. Prompts Used

Below are the key engineering prompts used during development and inside the application's AI Review Engine:

### A. Architecture & Schema Design Prompt
```text
Design a normalized PostgreSQL 16 schema for an AI-Powered Code Review Assistant with tables for:
users, ai_providers (configurable base_url, api_key, model_name, is_default), projects, files (with unique constraint on project_id + path), reviews (storing scope_type, template, target_files JSONB, issues JSONB, recommendations JSONB, severity_counts JSONB), chat_sessions, and messages.
Ensure foreign keys use ON DELETE CASCADE so deleting a project cleanly removes associated files, reviews, and chat sessions.
```

### B. Multi-Mode File Ingestion & Security Prompt
```text
Implement a NestJS FilesService that supports three upload mechanisms:
1. Option A: ZIP archive upload using adm-zip that validates against path traversal (../), enforces a 50MB archive limit, strips single root wrapper folders, and filters out node_modules, .git, lockfiles, and binary files.
2. Option B: Batch file upload from Drag & Drop or pasted source code with automatic language detection from file extensions.
3. Option C: Public GitHub repository URL import via codeload.github.com zipball download.
```

### C. Runtime AI Review System Prompt (Used in `AiEngineService`)
```text
You are a Principal Application Security / Performance / Code Quality Engineer conducting a structured Code Review.
You MUST respond with valid JSON matching this exact structure:
{
  "summary": "High-level executive overview of findings across the reviewed files.",
  "risk_score": 25,
  "overallScore": 75,
  "issues": [
    {
      "title": "Concise issue title",
      "severity": "critical" | "high" | "medium" | "low",
      "category": "security" | "performance" | "quality",
      "file": "path/to/file.ts",
      "line": 12,
      "description": "Clear explanation of why this is a problem.",
      "impact": "Concrete business or technical impact if left unaddressed.",
      "recommendation": "Actionable engineering guidance to remediate the issue.",
      "codeSnippet": "The exact offending line or snippet",
      "suggestedFix": "Concrete code example or remediation steps"
    }
  ],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"]
}
```

---

## 3. Breakdown of Generated vs. Manually Engineered Code

### AI-Assisted / Generated Scaffolding
- **Boilerplate & Configuration**:
  - Initial NestJS module/controller wiring (`app.module.ts`, `auth.module.ts`, `users.module.ts`, `providers.module.ts`, `projects.module.ts`, `files.module.ts`, `reviews.module.ts`, `chat.module.ts`, `bonus.module.ts`).
  - TypeScript interfaces in `frontend/src/types/index.ts` and reusable Tailwind UI primitives in `frontend/src/components/ui/Primitives.tsx`.
  - Sample vulnerable/unoptimized seed files in `backend/src/database/sample-seed.ts` (`auth.service.ts`, `orders.controller.ts`, `orders.controller.v2.ts`, `UserDashboard.tsx`) used to demonstrate security, performance, and diff reviews.

### Manually Designed & Engineered Logic
- **Dual-Mode PostgreSQL 16 Persistence (`backend/src/database/database.service.ts`)**:
  - Engineered the database layer to connect to external PostgreSQL via `pg.Pool` when `DATABASE_URL` is reachable, and automatically initialize embedded **PostgreSQL 16 (`@electric-sql/pglite`)** persisted to `backend/data/pgdata` when running in an environment without a local Postgres daemon or Docker running. Both modes execute the exact same PostgreSQL 16 `backend/sql/schema.sql` DDL and parameterized `$1, $2` SQL queries.
- **Zero-Hardcoding `AIProvider` Abstraction (`backend/src/ai/openai-compatible.provider.ts` & `backend/src/providers/providers.service.ts`)**:
  - Designed the `AIProvider` interface and `OpenAICompatibleProvider` adapter supporting per-user runtime configuration of `baseUrl`, `apiKey`, and `modelName`, strict API key masking (`••••••••••••••`) on read responses, and a live `/v1/models` endpoint health/latency tester.
- **Resilient Hybrid Static + LLM Analysis Pipeline (`backend/src/ai/ai-engine.service.ts`)**:
  - Built a line-accurate fallback static analyzer (`runStaticCodeReviewFallback`) alongside `OpenAICompatibleProvider`. If a reviewer evaluates the repo without a running local LM Studio/Ollama server or paid OpenAI key, the review engine still performs genuine line-by-line inspection for SQL injection, hardcoded secrets, weak MD5/SHA1 crypto, XSS, N+1 queries in loops, blocking synchronous `fs.*Sync` calls, missing React `useEffect` dependency arrays, and TypeScript `any` usage.
- **LCS Unified Diff Engine (`backend/src/bonus/bonus.service.ts`)**:
  - Implemented the Longest Common Subsequence (LCS) dynamic programming algorithm (`computeLineDiff`) to compute line-accurate `+additions`, `-deletions`, and quality score deltas between any two project files or custom snippets.
- **Codebase Context Retrieval Ranker (`backend/src/chat/chat.service.ts`)**:
  - Implemented `retrieveTopRelevantFiles` combining explicit user-pinned file IDs, path/filename matching, and term frequency scoring to select relevant files for **AI Chat With Code**.

---

## 4. Key Engineering Decisions & Trade-offs

1. **Why NestJS + Raw Parameterized PostgreSQL (`pg` + `PGlite`) Instead of Heavy ORM Magic?**
   - Using explicit parameterized SQL queries (`$1, $2`) against `backend/sql/schema.sql` makes the database layer transparent, prevents SQL injection by construction, leverages PostgreSQL `JSONB` columns natively for review issues/recommendations, and allows seamless compatibility between `pg.Pool` (Docker/Cloud PostgreSQL) and `@electric-sql/pglite` (zero-config embedded PostgreSQL 16).
2. **Why Normalize All AI Providers to the `AIProvider` / OpenAI `/chat/completions` Contract?**
   - OpenAI, LM Studio (`http://localhost:1234/v1`), Ollama (`http://localhost:11434/v1`), OpenRouter (`https://openrouter.ai/api/v1`), and vLLM all expose the standard `/v1/chat/completions` and `/v1/models` endpoints. Normalizing around a user-configurable `{ baseUrl, apiKey, modelName }` tuple avoids vendor lock-in and eliminates hardcoded provider logic.
3. **Why Include a Hybrid Static Analyzer Fallback?**
   - Local LLM servers (`localhost:1234`) or cloud API keys may not always be active during automated grading or initial setup. Providing a line-accurate static analysis fallback guarantees deterministic, high-value output in every environment while supporting live LLM completions whenever an endpoint is reachable.
4. **Security Practices Applied**:
   - No API keys or `.env` files are committed to Git (`.gitignore` excludes all `.env*` files; `.env.example` templates are provided).
   - User passwords are hashed with `bcryptjs` (cost factor 10).
   - Stored AI provider API keys are masked as `••••••••••••••` before being returned to the frontend.
   - ZIP archives are checked for path traversal (`../`) and size limits before extraction.
   - All workspace endpoints are protected by `JwtAuthGuard`, scoped by `user_id`, and wrapped in `SafeGlobalExceptionFilter` to prevent stack trace leakage.
