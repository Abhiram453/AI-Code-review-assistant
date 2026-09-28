import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { ProjectsService } from './projects/projects.service';
import { FilesService } from './files/files.service';
import { ReviewsService } from './reviews/reviews.service';
import { ChatService } from './chat/chat.service';
import { BonusService } from './bonus/bonus.service';
import { ProvidersService } from './providers/providers.service';

describe('AI Code Review Assistant Integration Suite', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let projectsService: ProjectsService;
  let filesService: FilesService;
  let reviewsService: ReviewsService;
  let chatService: ChatService;
  let bonusService: BonusService;
  let providersService: ProvidersService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await moduleRef.init();

    authService = moduleRef.get(AuthService);
    projectsService = moduleRef.get(ProjectsService);
    filesService = moduleRef.get(FilesService);
    reviewsService = moduleRef.get(ReviewsService);
    chatService = moduleRef.get(ChatService);
    bonusService = moduleRef.get(BonusService);
    providersService = moduleRef.get(ProvidersService);
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('authenticates demo user, loads seeded providers, projects, and file tree', async () => {
    const loginRes = await authService.demoLogin();
    expect(loginRes.accessToken).toBeDefined();
    expect(loginRes.user.email).toBe('demo@codereview.ai');

    const providers = await providersService.listProviders(loginRes.user.id);
    expect(providers.length).toBeGreaterThanOrEqual(4);

    const projects = await projectsService.listProjects(loginRes.user.id);
    expect(projects.length).toBeGreaterThanOrEqual(1);

    const projectId = projects[0].id;
    const { files, tree } = await filesService.listProjectFiles(
      loginRes.user.id,
      projectId,
    );
    expect(files.length).toBeGreaterThanOrEqual(4);
    expect(tree.length).toBeGreaterThan(0);
  });

  it('executes Security, Performance, and Code Quality reviews and stores history', async () => {
    const { user } = await authService.demoLogin();
    const projects = await projectsService.listProjects(user.id);
    const projectId = projects[0].id;

    const perfReview = await reviewsService.createCodeReview(user.id, projectId, {
      scopeType: 'project',
      template: 'performance',
    });

    expect(perfReview.issues.length).toBeGreaterThan(0);
    expect(perfReview.severityCounts).toBeDefined();

    const history = await reviewsService.listReviews(user.id, {
      projectId,
      q: 'N+1',
    });
    expect(history.length).toBeGreaterThan(0);
  });

  it('answers codebase questions and executes Diff Review, Architecture Analysis, and Docs Generator', async () => {
    const { user } = await authService.demoLogin();
    const projects = await projectsService.listProjects(user.id);
    const projectId = projects[0].id;
    const { files } = await filesService.listProjectFiles(user.id, projectId);

    const chatRes = await chatService.sendMessage(user.id, projectId, {
      question: 'Explain how authentication works.',
    });
    expect(chatRes.messages.length).toBe(2);
    expect(chatRes.messages[1].referencedFiles.length).toBeGreaterThan(0);

    const v1 = files.find((f) => f.name === 'orders.controller.ts');
    const v2 = files.find((f) => f.name === 'orders.controller.v2.ts');
    const diffRes = await bonusService.runDiffReview(user.id, projectId, {
      baseFileId: v1?.id,
      targetFileId: v2?.id,
    });
    expect(diffRes.stats.additions).toBeGreaterThan(0);
    expect(diffRes.scoreDelta).toBeGreaterThan(0);

    const archRes = await bonusService.generateArchitectureAnalysis(
      user.id,
      projectId,
    );
    expect(archRes.mermaidDiagram).toContain('flowchart TD');

    const docsRes = await bonusService.generateDocumentationSuite(
      user.id,
      projectId,
      { docType: 'all' },
    );
    expect(docsRes.documents.readme).toContain(projects[0].name);
  });
});
