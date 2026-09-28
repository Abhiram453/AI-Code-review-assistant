# CodeLens AI — AI-Powered Code Review Assistant

A production-ready developer SaaS **AI Code Review Assistant** built with **Next.js 14 (TypeScript + Tailwind CSS + Framer Motion)**, **NestJS 10 (TypeScript)**, and **PostgreSQL 16**.

Designed with a dark-first developer-tool aesthetic inspired by **Linear, Vercel, GitHub, Raycast, and Cursor**, **CodeLens AI** enables engineering teams to upload source files, `.zip` archives, or public **GitHub repository URLs**, explore their codebase in an IDE-inspired workspace, configure any **OpenAI-compatible AI provider** (OpenAI, LM Studio, Ollama, OpenRouter, or custom endpoints), run structured AI code reviews with risk scores, inspect line-by-line diffs, chat with their codebase, and generate **Architecture Summaries & Project Documentation**.

---

## Repository Structure

```text
├── frontend/                  # Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion
│   ├── src/
│   │   ├── app/               # Protected CodeLens AI workspace, sidebar, topbar & auth screen
│   │   ├── components/
│   │   │   ├── ui/            # CodeLensLogo, Button, Input, Badge, SeverityBadge, Card, Dialog, Skeleton
│   │   │   ├── dashboard/     # OverviewView (Quick Review, Stats, Recent Projects & Reviews)
│   │   │   ├── review/        # ConfigureReviewModal, AiReviewProcessModal, ReviewHistoryView
│   │   │   ├── providers/     # AiProvidersView & SettingsView (Account, Security, Preferences)
│   │   │   ├── CommandPalette.tsx     # Cmd/Ctrl + K global command palette
│   │   │   ├── FileTreeExplorer.tsx   # Recursive file tree with search & multi-file checkboxes
│   │   │   ├── SyntaxCodeViewer.tsx   # Sticky-header code editor with inline issue annotations
│   │   │   ├── ReviewInspector.tsx    # Radial Risk Score gauge, severity filters & issue cards
│   │   │   ├── UploadCodeModal.tsx    # Staged upload (Uploaded -> Extracted -> Indexed)
│   │   │   ├── ChatWithCodePanel.tsx  # 2-panel codebase Q&A with Project Context selector
│   │   │   └── BonusStudio.tsx        # AI Diff Review, Architecture Analysis & Docs Generator
│   │   ├── lib/api.ts         # Typed REST & multipart API client with JWT bearer auth
│   │   └── types/index.ts     # Shared TypeScript domain interfaces
│   └── Dockerfile
├── backend/                   # NestJS 10, TypeScript, PostgreSQL 16 (pg + PGlite fallback)
│   ├── sql/schema.sql         # Official PostgreSQL 16 DDL schema & indexes
│   ├── src/
│   │   ├── auth/              # JWT authentication, bcrypt hashing, JwtAuthGuard
│   │   ├── users/             # Profile & password management (PATCH /api/users/profile & /password)
│   │   ├── providers/         # Configurable OpenAI-compatible AI Provider CRUD & masked keys
│   │   ├── ai/                # AIProvider interface -> OpenAICompatibleProvider -> AiEngineService
│   │   ├── projects/          # Project CRUD & sample codebase seeding
│   │   ├── files/             # ZIP extraction (adm-zip + path traversal protection), DnD, GitHub import
│   │   ├── reviews/           # Single-file, Multi-file & Project-wide reviews + issue resolution
│   │   ├── chat/              # Context-aware codebase Q&A with file relevance ranking
│   │   └── bonus/             # Bonus features: LCS Diff Review, Architecture Analysis, Doc Generator
│   └── Dockerfile
├── docker-compose.yml         # One-command PostgreSQL 16 + Backend + Frontend orchestration
├── README.md                  # Setup instructions, features, environment variables & DB setup
├── ARCHITECTURE.md            # Deep-dive into frontend, backend, database & AI integration flow
└── AI_USAGE.md                # Mandatory AI tools, prompts, code breakdown & engineering decisions
```

---

## Features Implemented

### Core Product Capabilities
1. **Authentication & Protected Workspace**
   - Split-layout authentication page (`Sign in to CodeLens AI` / `Create your account`) with email, password, confirm password, and remember me.
   - Secured with `bcryptjs` password hashing and signed JWT tokens (`JwtAuthGuard`).
   - Includes a **1-Click Instant Demo Login** (`demo@codereview.ai`) pre-seeded with a multi-file sample project and initial security audit.
2. **Overview Dashboard & Global `Cmd/Ctrl + K` Command Palette**
   - Personalized greeting (`Good evening, {Name}`), primary `New Project` / `Quick Review` actions, and 4 compact stat cards (`Total Projects`, `Total Reviews`, `Critical Issues`, `Active AI Provider`).
   - Keyboard-driven `Cmd/Ctrl + K` Command Palette for instant navigation (`Create Project`, `Upload Code`, `Start Review`, `Search Projects`, `Search Reviews`, `Open AI Providers`, `Open Settings`, `Open Chat`).
3. **Project Management & IDE Workspace**
   - Create, search, filter (`All` / `Recent`), and sort projects (`Updated`, `Name`, `Files`), or delete projects with PostgreSQL `ON DELETE CASCADE` cleanup.
   - Dedicated Project Workspace with header actions (`Upload Files`, `Start AI Review`, `Ask AI`, `Settings`) and tabs (`Files`, `Reviews`, `Chat`, `Architecture`, `Documentation`, `Diff Review`).
4. **Multi-Mode Code Upload with Staged Progress**
   - **Option A — ZIP Archive**: Upload `.zip` archives up to 50 MB; backend validates against path traversal (`../`), extracts source files via `adm-zip`, preserves directory hierarchy, and skips `node_modules/`, `.git/`, and binary assets.
   - **Option B — Files / Folder Upload & Code Paste**: Drag and drop multiple source files from desktop or paste source snippets directly.
   - **Option C — GitHub Repository URL**: Import public GitHub repositories by URL (`https://github.com/owner/repo`) and branch.
   - Visual staged feedback (`Uploaded` → `Extracted` → `Indexed`).
5. **Interactive Code Explorer & Syntax Viewer**
   - Collapsible hierarchical folder/file tree with search filter and multi-file selection checkboxes.
   - Sticky editor header with file path, language badge, line count, word-wrap toggle, `Copy`, `Open Review`, `Review This File`, and inline issue annotations with 1-click jump to offending lines.
6. **Configurable AI Review Workflow & Results Inspector**
   - **Configure AI Review Modal**: Select Review Scope (`Current File`, `Selected Files`, `Full Project`), Review Type (`Security`, `Performance`, `Code Quality`, `Full Review`), AI Provider, and Model with live file/line scope estimation.
   - **AI Review Process Screen**: Step-by-step progress checklist (`Reading selected files`, `Preparing code context`, `Running AI analysis`, `Formatting findings`).
   - **Review Results Screen**: Radial Risk Score (`0–100`) & Health Score gauge, Executive Summary, Severity Distribution (`Critical`, `High`, `Medium`, `Low`), Filter/Sort bar, and structured Issue Cards with `Description`, `Code Snippet`, `Impact`, `Recommendation`, `Suggested Fix`, `Open File`, `Copy`, and `Mark Resolved`.
7. **Searchable Review History**
   - Compact tabular review history with Project, Type, Severity, and Date (`7d`, `30d`, `All time`) filters plus keyword search and Markdown (`.md`) report export.
8. **AI Chat With Code (`Ask your codebase`)**
   - 2-panel codebase Q&A interface with a left **Project Context** file selector (`Select All` / `Clear`), quick prompt chips (`Explain this file`, `Find security risks`, `Suggest refactor`, `Check performance`), Markdown code blocks with copy buttons, and clickable file badges.

### Configurable AI Provider Support (`AIProvider` Abstraction)
- Clean backend abstraction (`AIProvider` interface → `OpenAICompatibleProvider` → `AiEngineService` → `ReviewsService`) with zero hardcoded provider settings.
- Runtime UI management for **Provider Type**, **Display Name**, **Base URL**, **API Key** (masked as `••••••••••••••`), and **Model Name**:
  - **OpenAI API**: `https://api.openai.com/v1` (e.g., `gpt-4o-mini`, `gpt-4o`)
  - **LM Studio**: `http://localhost:1234/v1` (e.g., `qwen2.5-coder-7b-instruct`)
  - **Ollama**: `http://localhost:11434/v1` (e.g., `llama3.1:8b`, `deepseek-coder-v2`)
  - **OpenRouter**: `https://openrouter.ai/api/v1` (e.g., `anthropic/claude-3.5-sonnet`)
  - **Custom OpenAI-Compatible Endpoint**
- Live **Test Connection** action checking `/v1/models` reachability and latency (`● Connected`, `○ Not tested`, `× Connection failed`).
- **Resilient Hybrid Static Analysis Fallback**: When evaluating offline without a local LLM running or before configuring an API key, the backend automatically executes a deterministic, line-accurate static analysis engine so every workflow functions out-of-the-box.

### Bonus Features Implemented
1. **Bonus 1 — AI Diff Review**:
   - Compare any two project files (e.g., `orders.controller.ts` vs `orders.controller.v2.ts`) or custom code versions.
   - Computes an LCS line-by-line unified diff (`+additions` / `-deletions`), calculates the **Quality Score Delta** (`44 → 96 (+52 pts)`), highlights resolved vs remaining issues, and stores the diff audit in Review History.
2. **Bonus 2 — Architecture Analysis & Documentation Generator**:
   - **Architecture Analysis**: Categorizes project files into architectural layers (`Presentation`, `Controllers`, `Services`, `Data Access`), extracts cross-file `import` dependencies, generates a **Mermaid Architecture Diagram**, and produces an architectural risk report.
   - **Documentation Generator**: Automatically generates a downloadable `README.md`, `Setup Guide`, and `API Documentation` from the uploaded source files.

---

## Setup Instructions

### Prerequisites
- **Node.js**: `v20+` (tested with Node `v20` and `v24`)
- **npm**: `v10+`
- **Database**: PostgreSQL 16 (via Docker or local install). *Note: If external PostgreSQL is not running, the backend automatically initializes an embedded **PostgreSQL 16 (PGlite)** instance persisted in `backend/data/pgdata` so you can run the project with zero external setup.*

### 1. Clone & Install Dependencies

```bash
# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Variables

Copy the example environment files in both `backend/` and `frontend/`:

#### Backend (`backend/.env`)
```env
PORT=4005
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/ai_code_review
JWT_SECRET=super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3005
DEFAULT_AI_BASE_URL=http://localhost:1234/v1
DEFAULT_AI_MODEL=qwen2.5-coder-7b-instruct
DEFAULT_AI_API_KEY=
```

#### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4005/api
```

### 3. Database Setup

#### Option A: Zero-Config Embedded PostgreSQL 16 (Automatic)
Simply start the backend (`npm run start:dev`). If `DATABASE_URL` is not reachable, `DatabaseService` automatically boots embedded PostgreSQL 16 (`@electric-sql/pglite`), executes `backend/sql/schema.sql`, and seeds the demo user and sample project.

#### Option B: External PostgreSQL 16 (Docker or Local Server)
```bash
# Start PostgreSQL 16 via Docker Compose (mapped to host port 5435)
docker compose up -d postgres

# Or apply schema manually to an existing PostgreSQL database
psql -h localhost -p 5435 -U postgres -d ai_code_review -f backend/sql/schema.sql
```

### 4. Running the Application Locally

Open two terminals:

**Terminal 1 — Start NestJS Backend (`http://localhost:4005/api`)**
```bash
cd backend
npm run start:dev
```

**Terminal 2 — Start Next.js Frontend (`http://localhost:3005`)**
```bash
cd frontend
npm run dev
```

Visit **`http://localhost:3005`** in your browser. Click **"1-Click Instant Demo Login"** or register a new account.

---

## Architecture Overview

```mermaid
flowchart LR
  subgraph Client["Frontend (Next.js 14 + TypeScript + Tailwind + Framer Motion)"]
    Shell["Global Sidebar, Top Bar & Cmd+K Palette"]
    Explorer["IDE File Tree & Syntax Viewer"]
    ReviewsUI["Review Config, 4-Step Progress & Inspector"]
    ChatUI["Ask Your Codebase (2-Panel Chat)"]
    ProvidersUI["AI Providers & Settings"]
  end

  subgraph Server["Backend (NestJS 10 REST API)"]
    Auth["AuthModule & UsersModule (JWT + Bcrypt)"]
    Files["FilesModule (ZIP / DnD / GitHub)"]
    Reviews["ReviewsModule & BonusModule"]
    Chat["ChatModule (Context Ranker)"]
    AIEngine["AiEngineService -> OpenAICompatibleProvider"]
  end

  subgraph Storage["Database Layer"]
    PG[("PostgreSQL 16\n(pg Pool / PGlite)")]
  end

  subgraph LLMs["Configurable OpenAI-Compatible Endpoints"]
    OpenAI["OpenAI API\napi.openai.com/v1"]
    LMStudio["LM Studio\nlocalhost:1234/v1"]
    Ollama["Ollama\nlocalhost:11434/v1"]
    OpenRouter["OpenRouter\nopenrouter.ai/api/v1"]
  end

  Client <-->|"REST JSON / Multipart + JWT"| Server
  Server <-->|"Parameterized SQL"| PG
  AIEngine <-->|"POST {baseUrl}/chat/completions"| LLMs
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed breakdown of the frontend design system, backend modules, database schema, and AI integration pipeline, and [AI_USAGE.md](./AI_USAGE.md) for the mandatory AI usage disclosure.
