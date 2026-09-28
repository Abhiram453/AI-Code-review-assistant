import {
  AiProviderConfig,
  ArchitectureAnalysisResponse,
  ChatMessageItem,
  ChatSessionItem,
  DiffReviewResponse,
  DocumentationSuiteResponse,
  FileTreeNode,
  ProjectFileItem,
  ProjectSummary,
  ReviewRecord,
  UserProfile,
} from '@/types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005/api';

const TOKEN_STORAGE_KEY = 'codereview_jwt_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMessage = `Request failed (HTTP ${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) {
        errMessage = Array.isArray(data.message)
          ? data.message.join(', ')
          : String(data.message);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errMessage);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Authentication
  register(body: { email: string; name: string; password: string }) {
    return request<{ user: UserProfile; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  login(body: { email: string; password: string }) {
    return request<{ user: UserProfile; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  demoLogin() {
    return request<{ user: UserProfile; accessToken: string }>('/auth/demo', {
      method: 'POST',
    });
  },

  getMe() {
    return request<UserProfile>('/auth/me');
  },

  logout() {
    return request<{ success: boolean }>('/auth/logout', { method: 'POST' });
  },

  updateProfile(body: { name: string }) {
    return request<UserProfile>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  updatePassword(body: { currentPassword?: string; newPassword: string }) {
    return request<{ updated: boolean; message: string }>('/users/password', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  // Configurable AI Providers
  listProviders() {
    return request<AiProviderConfig[]>('/providers');
  },

  createProvider(body: {
    name: string;
    providerType?: string;
    baseUrl: string;
    apiKey?: string;
    modelName: string;
    isDefault?: boolean;
  }) {
    return request<AiProviderConfig>('/providers', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  updateProvider(
    id: string,
    body: {
      name?: string;
      providerType?: string;
      baseUrl?: string;
      apiKey?: string;
      modelName?: string;
      isDefault?: boolean;
    },
  ) {
    return request<AiProviderConfig>(`/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  deleteProvider(id: string) {
    return request<{ deleted: boolean; id: string }>(`/providers/${id}`, {
      method: 'DELETE',
    });
  },

  testProvider(body: {
    providerId?: string;
    baseUrl?: string;
    apiKey?: string;
    modelName?: string;
  }) {
    return request<{
      reachable: boolean;
      status: number;
      latencyMs: number;
      baseUrl: string;
      modelName: string;
      discoveredModels: string[];
      message: string;
    }>('/providers/test', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Projects
  listProjects() {
    return request<ProjectSummary[]>('/projects');
  },

  createProject(body: {
    name: string;
    description?: string;
    repoUrl?: string;
    seedSample?: boolean;
  }) {
    return request<ProjectSummary>('/projects', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getProject(id: string) {
    return request<ProjectSummary>(`/projects/${id}`);
  },

  deleteProject(id: string) {
    return request<{ deleted: boolean; id: string }>(`/projects/${id}`, {
      method: 'DELETE',
    });
  },

  seedSampleProjectFiles(projectId: string) {
    return request<ProjectSummary>(`/projects/${projectId}/seed-sample`, {
      method: 'POST',
    });
  },

  // Files & Code Upload
  listProjectFiles(projectId: string) {
    return request<{ files: ProjectFileItem[]; tree: FileTreeNode[] }>(
      `/projects/${projectId}/files`,
    );
  },

  getFileWithContent(projectId: string, fileId: string) {
    return request<ProjectFileItem>(`/projects/${projectId}/files/${fileId}`);
  },

  uploadFilesBatch(
    projectId: string,
    files: Array<{ path: string; content: string }>,
  ) {
    return request<{
      importedCount: number;
      files: ProjectFileItem[];
      tree: FileTreeNode[];
    }>(`/projects/${projectId}/files/upload`, {
      method: 'POST',
      body: JSON.stringify({ files }),
    });
  },

  uploadZipArchive(projectId: string, zipFile: File) {
    const formData = new FormData();
    formData.append('file', zipFile);
    return request<{
      importedCount: number;
      files: ProjectFileItem[];
      tree: FileTreeNode[];
    }>(`/projects/${projectId}/files/upload-zip`, {
      method: 'POST',
      body: formData,
    });
  },

  importGithubRepo(
    projectId: string,
    body: { repoUrl: string; branch?: string },
  ) {
    return request<{
      importedCount: number;
      files: ProjectFileItem[];
      tree: FileTreeNode[];
    }>(`/projects/${projectId}/files/import-github`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  deleteFile(projectId: string, fileId: string) {
    return request<{ deleted: boolean; id: string }>(
      `/projects/${projectId}/files/${fileId}`,
      { method: 'DELETE' },
    );
  },

  // Reviews & Review History
  triggerReview(
    projectId: string,
    body: {
      scopeType: 'file' | 'multiple' | 'project';
      template: 'security' | 'performance' | 'quality' | 'comprehensive';
      fileIds?: string[];
      providerId?: string;
    },
  ) {
    return request<ReviewRecord>(`/projects/${projectId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  listReviews(params?: {
    projectId?: string;
    template?: string;
    scopeType?: string;
    severity?: string;
    q?: string;
  }) {
    const search = new URLSearchParams();
    if (params?.projectId) search.set('projectId', params.projectId);
    if (params?.template && params.template !== 'all')
      search.set('template', params.template);
    if (params?.scopeType && params.scopeType !== 'all')
      search.set('scopeType', params.scopeType);
    if (params?.severity && params.severity !== 'all')
      search.set('severity', params.severity);
    if (params?.q) search.set('q', params.q);
    const qs = search.toString();
    return request<ReviewRecord[]>(`/reviews${qs ? `?${qs}` : ''}`);
  },

  getReview(id: string) {
    return request<ReviewRecord>(`/reviews/${id}`);
  },

  toggleIssueResolved(reviewId: string, issueId: string) {
    return request<ReviewRecord>(`/reviews/${reviewId}/issues/${issueId}`, {
      method: 'PATCH',
    });
  },

  deleteReview(id: string) {
    return request<{ deleted: boolean; id: string }>(`/reviews/${id}`, {
      method: 'DELETE',
    });
  },

  // AI Chat With Code
  listChatSessions(projectId: string) {
    return request<ChatSessionItem[]>(`/projects/${projectId}/chats`);
  },

  createChatSession(projectId: string, title?: string) {
    return request<ChatSessionItem>(`/projects/${projectId}/chats`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  getChatMessages(sessionId: string) {
    return request<{
      session: { id: string; projectId: string; title: string };
      messages: ChatMessageItem[];
    }>(`/chats/${sessionId}`);
  },

  askCodeQuestion(
    projectId: string,
    body: {
      sessionId?: string;
      question: string;
      pinnedFileIds?: string[];
      providerId?: string;
    },
  ) {
    return request<{
      session: { id: string; projectId: string; title: string };
      messages: ChatMessageItem[];
    }>(`/projects/${projectId}/chats/ask`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  deleteChatSession(sessionId: string) {
    return request<{ deleted: boolean; id: string }>(`/chats/${sessionId}`, {
      method: 'DELETE',
    });
  },

  // Bonus Features
  runDiffReview(
    projectId: string,
    body: {
      baseFileId?: string;
      targetFileId?: string;
      baseLabel?: string;
      targetLabel?: string;
      baseContent?: string;
      targetContent?: string;
      providerId?: string;
    },
  ) {
    return request<DiffReviewResponse>(
      `/projects/${projectId}/bonus/diff-review`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  },

  runArchitectureAnalysis(projectId: string, providerId?: string) {
    return request<ArchitectureAnalysisResponse>(
      `/projects/${projectId}/bonus/architecture`,
      {
        method: 'POST',
        body: JSON.stringify({ providerId }),
      },
    );
  },

  generateDocumentation(
    projectId: string,
    body?: { docType?: 'readme' | 'setup' | 'api' | 'all'; providerId?: string },
  ) {
    return request<DocumentationSuiteResponse>(
      `/projects/${projectId}/bonus/documentation`,
      {
        method: 'POST',
        body: JSON.stringify(body || {}),
      },
    );
  },
};
