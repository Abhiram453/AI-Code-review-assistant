export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  dbEngine?: {
    engine: string;
    mode: string;
  };
}

export interface AiProviderConfig {
  id: string;
  name: string;
  providerType: string;
  baseUrl: string;
  modelName: string;
  hasApiKey: boolean;
  maskedApiKey: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  repoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  reviewCount: number;
  chatCount?: number;
  latestScore?: number | null;
}

export interface ProjectFileItem {
  id: string;
  projectId: string;
  path: string;
  name: string;
  extension: string;
  language: string;
  size: number;
  content?: string;
  createdAt: string;
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

export interface ReviewIssue {
  id: string;
  title: string;
  severity: SeverityLevel;
  category: 'security' | 'performance' | 'quality' | 'diff';
  file: string;
  line: number;
  description: string;
  impact?: string;
  recommendation?: string;
  codeSnippet: string;
  suggestedFix: string;
  resolved?: boolean;
}

export interface ReviewRecord {
  id: string;
  projectId: string;
  projectName?: string;
  providerId: string | null;
  scopeType: 'file' | 'multiple' | 'project' | 'diff' | 'architecture' | 'documentation';
  template: 'security' | 'performance' | 'quality' | 'comprehensive' | 'diff';
  title: string;
  targetFiles: string[];
  summary: string;
  riskScore?: number;
  overallScore: number;
  issues: ReviewIssue[];
  recommendations: string[];
  severityCounts: Record<SeverityLevel, number>;
  metadata?: Record<string, any>;
  modelUsed: string;
  executionMode: string;
  createdAt: string;
}

export interface ChatSessionItem {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageItem {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  referencedFiles: string[];
  modelUsed?: string | null;
  createdAt: string;
}

export interface DiffLineItem {
  type: 'unchanged' | 'added' | 'removed';
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface DiffReviewResponse {
  reviewId: string;
  projectId: string;
  baseLabel: string;
  targetLabel: string;
  stats: {
    additions: number;
    deletions: number;
    unchanged: number;
  };
  diffLines: DiffLineItem[];
  baseScore: number;
  targetScore: number;
  scoreDelta: number;
  summary: string;
  issues: ReviewIssue[];
  resolvedIssues: ReviewIssue[];
  recommendations: string[];
  severityCounts: Record<SeverityLevel, number>;
  modelUsed: string;
  executionMode: string;
}

export interface ArchitectureAnalysisResponse {
  projectId: string;
  projectName: string;
  metrics: {
    totalFiles: number;
    totalLines: number;
    languages: string[];
    dependencyCount: number;
  };
  layers: {
    presentation: string[];
    controllers: string[];
    services: string[];
    data: string[];
  };
  dependencies: Array<{ from: string; to: string }>;
  mermaidDiagram: string;
  narrative: string;
  modelUsed: string;
  executionMode: string;
  generatedAt: string;
}

export interface DocumentationSuiteResponse {
  projectId: string;
  projectName: string;
  documents: {
    readme: string;
    setupGuide: string;
    apiDocs: string;
  };
  modelUsed: string;
  executionMode: string;
  generatedAt: string;
}
