'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FolderGit2,
  History,
  MessageSquare,
  Cpu,
  Settings,
  Search,
  Bell,
  HelpCircle,
  LogOut,
  Plus,
  Upload,
  Sparkles,
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  FileCode,
  Layers,
  BookOpen,
  GitCompare,
  ArrowUpRight,
} from 'lucide-react';
import {
  AiProviderConfig,
  FileTreeNode,
  ProjectFileItem,
  ProjectSummary,
  ReviewRecord,
  UserProfile,
} from '@/types';
import { api, getStoredToken, setStoredToken } from '@/lib/api';
import { CodeLensLogo } from '@/components/ui/CodeLensLogo';
import { AnimatedCodeScannerIllustration } from '@/components/ui/AnimatedIllustrations';
import {
  Button,
  Dialog,
  EmptyState,
  InlineErrorState,
  Skeleton,
} from '@/components/ui/Primitives';
import { CommandPalette } from '@/components/CommandPalette';
import { OverviewView } from '@/components/dashboard/OverviewView';
import { FileTreeExplorer } from '@/components/FileTreeExplorer';
import { SyntaxCodeViewer } from '@/components/SyntaxCodeViewer';
import { ReviewInspector } from '@/components/ReviewInspector';
import { ReviewHistoryView } from '@/components/review/ReviewHistoryView';
import {
  AiReviewProcessModal,
  ConfigureReviewModal,
} from '@/components/review/ReviewWorkflowModals';
import { UploadCodeModal } from '@/components/UploadCodeModal';
import { ChatWithCodePanel } from '@/components/ChatWithCodePanel';
import { BonusStudio } from '@/components/BonusStudio';
import {
  AiProvidersView,
  SettingsView,
} from '@/components/providers/AiProvidersView';

type PrimarySection =
  | 'overview'
  | 'projects'
  | 'project-detail'
  | 'reviews'
  | 'review-detail'
  | 'chat'
  | 'providers'
  | 'settings';

type ProjectSubTab =
  | 'files'
  | 'reviews'
  | 'chat'
  | 'architecture'
  | 'documentation'
  | 'diff';

export default function CodeLensApp() {
  // Authentication State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('demo@codereview.ai');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('DemoPass123!');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Navigation & Layout State
  const [section, setSection] = useState<PrimarySection>('overview');
  const [projectTab, setProjectTab] = useState<ProjectSubTab>('files');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // Modals
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [configureReviewModalOpen, setConfigureReviewModalOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  // AI Review Process Animation State
  const [reviewRunning, setReviewRunning] = useState(false);
  const [reviewProcessStep, setReviewProcessStep] = useState(0);

  // Data State
  const [providers, setProviders] = useState<AiProviderConfig[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Project Creation Form
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectSeed, setNewProjectSeed] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);

  // Code Explorer State
  const [projectFiles, setProjectFiles] = useState<ProjectFileItem[]>([]);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFileContent, setActiveFileContent] =
    useState<ProjectFileItem | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);

  // Review Configuration State
  const [reviewScope, setReviewScope] = useState<
    'file' | 'multiple' | 'project'
  >('project');
  const [reviewTemplate, setReviewTemplate] = useState<
    'security' | 'performance' | 'quality' | 'comprehensive'
  >('security');

  // Reviews State
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [activeReview, setActiveReview] = useState<ReviewRecord | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Cmd/Ctrl + K global listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const loadProviders = useCallback(async () => {
    const list = await api.listProviders();
    setProviders(list);
    const def = list.find((p) => p.isDefault) || list[0];
    if (def) {
      setSelectedProviderId((prev) => prev || def.id);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    const list = await api.listProjects();
    setProjects(list);
    if (list.length > 0) {
      setActiveProjectId((prev) =>
        prev && list.some((p) => p.id === prev) ? prev : list[0].id,
      );
    } else {
      setActiveProjectId(null);
    }
  }, []);

  const loadAllReviews = useCallback(async () => {
    const list = await api.listReviews();
    setReviews(list);
    if (list.length > 0) {
      setActiveReview((prev) =>
        prev && list.some((r) => r.id === prev.id)
          ? list.find((r) => r.id === prev.id) || list[0]
          : list[0],
      );
    }
  }, []);

  const loadFilesForProject = useCallback(async (projectId: string) => {
    setFilesLoading(true);
    try {
      const data = await api.listProjectFiles(projectId);
      setProjectFiles(data.files);
      setFileTree(data.tree);
      if (data.files.length > 0) {
        setActiveFileId((prev) =>
          prev && data.files.some((f) => f.id === prev)
            ? prev
            : data.files[0].id,
        );
      } else {
        setActiveFileId(null);
        setActiveFileContent(null);
      }
    } finally {
      setFilesLoading(false);
    }
  }, []);

  // Verify session on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }
    api
      .getMe()
      .then(async (profile) => {
        setUser(profile);
        await Promise.all([loadProviders(), loadProjects(), loadAllReviews()]);
      })
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => setAuthChecking(false));
  }, [loadAllReviews, loadProjects, loadProviders]);

  // Load project files when activeProjectId changes
  useEffect(() => {
    if (!user || !activeProjectId) return;
    setSelectedFileIds([]);
    loadFilesForProject(activeProjectId);
  }, [user, activeProjectId, loadFilesForProject]);

  // Load file content when activeFileId changes
  useEffect(() => {
    if (!user || !activeProjectId || !activeFileId) {
      setActiveFileContent(null);
      return;
    }
    api
      .getFileWithContent(activeProjectId, activeFileId)
      .then((file) => setActiveFileContent(file))
      .catch(() => setActiveFileContent(null));
  }, [user, activeProjectId, activeFileId]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res =
        authMode === 'login'
          ? await api.login({ email: authEmail, password: authPassword })
          : await api.register({
              email: authEmail,
              name: authName,
              password: authPassword,
            });
      setStoredToken(res.accessToken);
      const profile = await api.getMe();
      setUser(profile);
      await Promise.all([loadProviders(), loadProjects(), loadAllReviews()]);
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await api.demoLogin();
      setStoredToken(res.accessToken);
      const profile = await api.getMe();
      setUser(profile);
      await Promise.all([loadProviders(), loadProjects(), loadAllReviews()]);
    } catch (err: any) {
      setAuthError(err?.message || 'Demo login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    setProjects([]);
    setReviews([]);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    setInlineError(null);
    try {
      const created = await api.createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        seedSample: newProjectSeed,
      });
      setNewProjectName('');
      setNewProjectDesc('');
      setCreateProjectModalOpen(false);
      await loadProjects();
      setActiveProjectId(created.id);
      setSection('project-detail');
      setProjectTab('files');
    } catch (err: any) {
      setInlineError(err?.message || 'Could not create project');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await api.deleteProject(id);
      await loadProjects();
      await loadAllReviews();
      setSection('projects');
    } catch (err: any) {
      setInlineError(err?.message || 'Could not delete project');
    }
  };

  const executeAiReview = async (
    targetProjectId?: string,
    overrideScope?: 'file' | 'multiple' | 'project',
    overrideTemplate?: 'security' | 'performance' | 'quality' | 'comprehensive',
  ) => {
    const pid = targetProjectId || activeProjectId;
    if (!pid) return;

    const scope = overrideScope || reviewScope;
    const tmpl = overrideTemplate || reviewTemplate;

    setInlineError(null);
    setReviewRunning(true);
    setReviewProcessStep(1);

    const stepTimer1 = setTimeout(() => setReviewProcessStep(2), 320);
    const stepTimer2 = setTimeout(() => setReviewProcessStep(3), 650);

    try {
      let targetIds: string[] | undefined;
      if (scope === 'file') {
        const singleId = selectedFileIds[0] || activeFileId;
        if (!singleId) throw new Error('Select a file in the explorer first.');
        targetIds = [singleId];
      } else if (scope === 'multiple') {
        targetIds =
          selectedFileIds.length > 0
            ? selectedFileIds
            : activeFileId
              ? [activeFileId]
              : [];
        if (targetIds.length === 0)
          throw new Error('Select at least one file to review.');
      }

      const created = await api.triggerReview(pid, {
        scopeType: scope,
        template: tmpl,
        fileIds: targetIds,
        providerId: selectedProviderId || undefined,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setReviewProcessStep(4);

      await Promise.all([loadAllReviews(), loadProjects()]);
      setActiveReview(created);
      setReviewRunning(false);
      setSection('review-detail');
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setReviewRunning(false);
      setInlineError(
        err?.message || "CodeLens couldn't complete the review request.",
      );
    }
  };

  const handleToggleIssueResolved = async (
    reviewId: string,
    issueId: string,
  ) => {
    const updated = await api.toggleIssueResolved(reviewId, issueId);
    setActiveReview(updated);
    await loadAllReviews();
  };

  const handleJumpToFile = (filePath: string, line?: number) => {
    const matched = projectFiles.find(
      (f) => f.path === filePath || f.name === filePath,
    );
    if (matched) {
      setActiveFileId(matched.id);
      setHighlightLine(line || null);
      setSection('project-detail');
      setProjectTab('files');
    }
  };

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  const activeProvider =
    providers.find((p) => p.id === selectedProviderId) ||
    providers.find((p) => p.isDefault) ||
    providers[0];

  const projectReviews = reviews.filter(
    (r) => r.projectId === activeProject?.id,
  );

  const issuesForActiveFile =
    activeReview && activeFileContent
      ? (activeReview.issues || []).filter(
          (i) =>
            i.file === activeFileContent.path ||
            i.file === activeFileContent.name,
        )
      : [];

  // Loading Skeleton Gate
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-center">
            <CodeLensLogo size="lg" />
          </div>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  // --- LOGIN / REGISTRATION SCREEN ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090B] bg-codelens-canvas flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Precision Architectural Grid + Dot-Matrix Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-codelens-grid opacity-80" />
        <div className="pointer-events-none absolute inset-0 bg-codelens-dots opacity-60" />

        {/* Ambient Obsidian Aurora Light Blooms */}
        <div
          className="pointer-events-none absolute -top-24 left-1/4 w-[680px] h-[360px] opacity-25 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.55) 0%, rgba(59,130,246,0.2) 45%, rgba(9,9,11,0) 75%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10"
        >
          {/* Left Panel: Brand Identity & Live Code Inspection Preview */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <CodeLensLogo size="lg" />

            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#141418]/90 border border-[#27272A] text-[11px] font-mono text-[#A78BFA]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                AI-Native Static & Semantic Code Intelligence
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#F4F4F5] tracking-tight leading-tight">
                Understand your code. Find what matters.{' '}
                <span className="text-[#A78BFA]">Ship with confidence.</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-lg leading-relaxed">
                Upload repositories, connect OpenAI, LM Studio, Ollama, or
                OpenRouter, and run line-accurate security, performance, and
                architectural reviews in seconds.
              </p>
            </div>

            {/* Animated 3D Neural Prism + SVG Code Scanner Illustration */}
            <div className="hidden sm:block">
              <AnimatedCodeScannerIllustration />
            </div>
          </div>

          {/* Right Panel: Auth Card */}
          <div className="lg:col-span-5 w-full max-w-sm mx-auto">
            <div className="rounded-xl bg-[#141418]/95 backdrop-blur-md border border-[#27272A] shadow-cl-modal p-5 space-y-4">
              <div>
                <h2 className="font-display text-base font-semibold text-[#F4F4F5] tracking-tight">
                  {authMode === 'login'
                    ? 'Sign in to CodeLens AI'
                    : 'Create your account'}
                </h2>
                <p className="text-xs text-[#71717A] mt-0.5">
                  {authMode === 'login'
                    ? 'Access your projects, review history, and AI providers.'
                    : 'Start reviewing repositories with cloud or local LLMs.'}
                </p>
              </div>

              {/* 1-Click Evaluator Demo Login */}
              <Button
                variant="primary"
                size="md"
                className="w-full font-semibold"
                disabled={authLoading}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={handleDemoLogin}
              >
                Continue with Demo Workspace →
              </Button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#27272A]" />
                <span className="flex-shrink mx-3 text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
                  or email credentials
                </span>
                <div className="flex-grow border-t border-[#27272A]" />
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className={`py-1.5 rounded transition ${
                    authMode === 'login'
                      ? 'bg-[#18181C] text-[#F4F4F5] border border-[#27272A]'
                      : 'text-[#71717A] hover:text-[#A1A1AA]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthEmail('');
                    setAuthPassword('');
                    setAuthError(null);
                  }}
                  className={`py-1.5 rounded transition ${
                    authMode === 'register'
                      ? 'bg-[#18181C] text-[#F4F4F5] border border-[#27272A]'
                      : 'text-[#71717A] hover:text-[#A1A1AA]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs text-[#A1A1AA] mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full px-3 py-2 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••••••••"
                    className="w-full px-3 py-2 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                {authError && (
                  <div className="p-2.5 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444]">
                    {authError}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  className="w-full font-semibold"
                  disabled={authLoading}
                >
                  {authLoading
                    ? 'Authenticating...'
                    : authMode === 'login'
                      ? 'Sign In'
                      : 'Create Account'}
                </Button>
              </form>
            </div>

            <div className="text-center text-[11px] font-mono text-[#71717A] mt-3">
              OpenAI · LM Studio · Ollama · OpenRouter Compatible
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Breadcrumb label helper
  const getBreadcrumb = () => {
    if (section === 'overview') return ['Overview'];
    if (section === 'projects') return ['Projects'];
    if (section === 'project-detail')
      return ['Projects', activeProject?.name || 'Workspace', projectTab];
    if (section === 'reviews') return ['Reviews'];
    if (section === 'review-detail')
      return ['Reviews', activeReview?.title || 'Report'];
    if (section === 'chat')
      return ['Chat', activeProject?.name || 'Workspace'];
    if (section === 'providers') return ['AI Providers'];
    if (section === 'settings') return ['Settings'];
    return ['Workspace'];
  };

  const navPrimary = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      active: section === 'overview',
      onClick: () => setSection('overview'),
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderGit2,
      count: projects.length,
      active: section === 'projects' || section === 'project-detail',
      onClick: () => setSection('projects'),
    },
    {
      id: 'reviews',
      label: 'Reviews',
      icon: History,
      count: reviews.length,
      active: section === 'reviews' || section === 'review-detail',
      onClick: () => setSection('reviews'),
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquare,
      active: section === 'chat',
      onClick: () => setSection('chat'),
    },
  ];

  const navSecondary = [
    {
      id: 'providers',
      label: 'AI Providers',
      icon: Cpu,
      active: section === 'providers',
      onClick: () => setSection('providers'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      active: section === 'settings',
      onClick: () => setSection('settings'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] bg-codelens-canvas text-[#F4F4F5] flex flex-col">
      {/* ==================================================
          TOP BAR (Section 4)
         ================================================== */}
      <header className="h-12 shrink-0 border-b border-[#27272A] bg-[#09090B]/90 backdrop-blur-md px-4 flex items-center justify-between gap-4 sticky top-0 z-30">
        {/* Left: Brand + Mobile Menu + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-1.5 rounded-md text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181C]"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSection('overview')}
            className="flex items-center gap-2 text-left"
          >
            <CodeLensLogo size="sm" />
          </button>

          <span className="text-[#27272A] hidden sm:inline">/</span>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs truncate">
            {getBreadcrumb().map((crumb, idx, arr) => (
              <React.Fragment key={idx}>
                <span
                  className={
                    idx === arr.length - 1
                      ? 'font-medium text-[#F4F4F5] capitalize truncate'
                      : 'text-[#71717A]'
                  }
                >
                  {crumb}
                </span>
                {idx < arr.length - 1 && (
                  <span className="text-[#71717A]">/</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Center: Search / Cmd K Trigger */}
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="flex items-center justify-between gap-6 px-3 py-1.5 rounded-md bg-[#0F0F12] hover:bg-[#141418] border border-[#27272A] text-xs text-[#71717A] hover:text-[#A1A1AA] transition w-full max-w-xs"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#71717A]" />
            <span>Search or jump to...</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#18181C] border border-[#27272A] font-mono text-[10px] text-[#A1A1AA]">
            ⌘K
          </kbd>
        </button>

        {/* Right: Help, Notifications, User Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            title="Keyboard Shortcuts & Help (Cmd+K)"
            className="p-1.5 rounded-md text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181C] transition"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setSection('reviews')}
            title="Recent Review Notifications"
            className="relative p-1.5 rounded-md text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181C] transition"
          >
            <Bell className="w-4 h-4" />
            {reviews.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] absolute top-1.5 right-1.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSection('settings')}
            className="flex items-center gap-2 pl-2 border-l border-[#27272A] text-xs text-[#A1A1AA] hover:text-[#F4F4F5]"
          >
            <div className="w-6 h-6 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A78BFA] flex items-center justify-center font-mono text-[11px] font-semibold">
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
          </button>
        </div>
      </header>

      {/* ==================================================
          BODY: SIDEBAR (240px) + MAIN CONTENT
         ================================================== */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Desktop & Mobile Sidebar */}
        <aside
          className={`${
            mobileMenuOpen
              ? 'fixed inset-y-12 left-0 z-40 w-[240px] flex'
              : 'hidden lg:flex'
          } ${
            sidebarCollapsed ? 'lg:w-[64px]' : 'lg:w-[240px]'
          } shrink-0 border-r border-[#27272A] bg-[#0F0F12] flex-col justify-between transition-all duration-150`}
        >
          {/* Top Navigation Links */}
          <div className="p-2.5 space-y-4">
            <div className="space-y-0.5">
              {navPrimary.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.onClick();
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                      item.active
                        ? 'bg-[#8B5CF6]/15 text-[#F4F4F5] border-l-2 border-[#8B5CF6]'
                        : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181C]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          item.active ? 'text-[#A78BFA]' : 'text-[#71717A]'
                        }`}
                      />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </div>
                    {!sidebarCollapsed && item.count !== undefined && (
                      <span className="font-mono text-[10.5px] text-[#71717A] px-1.5 py-0.5 rounded bg-[#141418] border border-[#27272A]">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-[#27272A]" />

            {/* Secondary Navigation */}
            <div className="space-y-0.5">
              {navSecondary.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.onClick();
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                      item.active
                        ? 'bg-[#8B5CF6]/15 text-[#F4F4F5] border-l-2 border-[#8B5CF6]'
                        : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181C]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        item.active ? 'text-[#A78BFA]' : 'text-[#71717A]'
                      }`}
                    />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Bottom: AI Connected Status + User Profile */}
          <div className="p-2.5 border-t border-[#27272A] space-y-2 bg-[#09090B]/40">
            {/* ● AI Connected */}
            <button
              type="button"
              onClick={() => setSection('providers')}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-md bg-[#141418] hover:bg-[#18181C] border border-[#27272A] text-xs transition"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0" />
                {!sidebarCollapsed && (
                  <div className="text-left truncate">
                    <div className="text-[11px] font-medium text-[#F4F4F5] leading-none">
                      AI Connected
                    </div>
                    <div className="text-[10px] font-mono text-[#71717A] truncate mt-0.5">
                      {activeProvider?.modelName || 'Local Model'}
                    </div>
                  </div>
                )}
              </div>
            </button>

            {/* User Profile + Collapse + Logout */}
            <div className="flex items-center justify-between px-1.5 py-1">
              {!sidebarCollapsed && (
                <div className="truncate pr-2">
                  <div className="text-xs font-medium text-[#F4F4F5] truncate">
                    {user.name}
                  </div>
                  <div className="text-[10.5px] text-[#71717A] truncate">
                    {user.email}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((c) => !c)}
                  title={
                    sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
                  }
                  className="hidden lg:inline-flex p-1.5 rounded text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#18181C]"
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="w-3.5 h-3.5" />
                  ) : (
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-1.5 rounded text-[#71717A] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ==================================================
            MAIN CONTENT AREA
           ================================================== */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-6 relative">
          <div className="pointer-events-none absolute inset-0 bg-codelens-dots opacity-50" />
          <div className="relative z-10">
          {inlineError && (
            <div className="mb-4 max-w-6xl mx-auto">
              <InlineErrorState
                title="AI provider or workspace notice"
                message={inlineError}
                onRetry={() => setInlineError(null)}
                secondaryActionLabel="Open Provider Settings"
                onSecondaryAction={() => {
                  setInlineError(null);
                  setSection('providers');
                }}
              />
            </div>
          )}

          {/* 1. OVERVIEW / DASHBOARD */}
          {section === 'overview' && (
            <OverviewView
              user={user}
              projects={projects}
              reviews={reviews}
              activeProvider={activeProvider}
              onCreateProjectClick={() => setCreateProjectModalOpen(true)}
              onOpenProject={(projectId) => {
                setActiveProjectId(projectId);
                setSection('project-detail');
                setProjectTab('files');
              }}
              onOpenReview={(rev) => {
                setActiveReview(rev);
                setSection('review-detail');
              }}
              onStartQuickReview={(projectId, tmpl) => {
                setActiveProjectId(projectId);
                setReviewScope('project');
                setReviewTemplate(tmpl);
                executeAiReview(projectId, 'project', tmpl);
              }}
              onOpenUploadModal={(projectId) => {
                setActiveProjectId(projectId);
                setUploadModalOpen(true);
              }}
            />
          )}

          {/* 2. PROJECTS LIST */}
          {section === 'projects' && (
            <div className="space-y-5 max-w-6xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#27272A]">
                <div>
                  <h1 className="text-lg font-semibold text-[#F4F4F5] tracking-tight">
                    Projects
                  </h1>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Select a repository to inspect files, run AI code reviews, or generate documentation.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setCreateProjectModalOpen(true)}
                >
                  New Project
                </Button>
              </div>

              {projects.length === 0 ? (
                <EmptyState
                  icon={<FolderGit2 className="w-5 h-5" />}
                  title="No projects yet."
                  description="Your codebase deserves a second pair of eyes."
                  actionLabel="Create Your First Project"
                  onAction={() => setCreateProjectModalOpen(true)}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {projects.map((p) => (
                    <motion.div
                      key={p.id}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.16 }}
                      onClick={() => {
                        setActiveProjectId(p.id);
                        setSection('project-detail');
                        setProjectTab('files');
                      }}
                      className="group rounded-lg bg-[#141418] border border-[#27272A] hover:border-[#8B5CF6]/50 hover:shadow-cl-glow p-4 cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[#F4F4F5] group-hover:text-[#A78BFA] transition-colors">
                            {p.name}
                          </h3>
                          <ArrowUpRight className="w-4 h-4 text-[#71717A] opacity-0 group-hover:opacity-100 group-hover:text-[#A78BFA] transition-all" />
                        </div>
                        <p className="text-xs text-[#A1A1AA] line-clamp-2 mt-1">
                          {p.description || 'Full-stack source repository'}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-3 text-[10px] font-mono text-[#A1A1AA]">
                          <span className="px-1.5 py-0.5 rounded bg-[#0F0F12] border border-[#27272A]">
                            TypeScript
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#0F0F12] border border-[#27272A]">
                            Next.js
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#0F0F12] border border-[#27272A]">
                            PostgreSQL
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#27272A]/80 flex items-center justify-between text-[11px] font-mono text-[#71717A]">
                        <span>
                          {p.fileCount} files · {p.reviewCount} reviews
                        </span>
                        {p.latestScore !== null &&
                          p.latestScore !== undefined && (
                            <span className="text-[#A78BFA]">
                              {p.latestScore}/100
                            </span>
                          )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. PROJECT PAGE (Section 8 — Lightweight IDE Screen) */}
          {section === 'project-detail' && activeProject && (
            <div className="space-y-4">
              {/* Project Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-[#27272A]">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSection('projects')}
                    className="inline-flex items-center gap-1 text-xs text-[#A1A1AA] hover:text-[#F4F4F5] transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Projects
                  </button>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-lg font-semibold text-[#F4F4F5] tracking-tight">
                      {activeProject.name}
                    </h1>
                    <span className="px-2 py-0.5 rounded bg-[#141418] border border-[#27272A] text-[11px] font-mono text-[#A1A1AA]">
                      {projectFiles.length} files
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1AA] max-w-2xl">
                    {activeProject.description}
                  </p>
                </div>

                {/* Actions: [ Review Code ] [ Upload Code ] [ ⋯ ] */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                    onClick={() => setConfigureReviewModalOpen(true)}
                  >
                    Review Code
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                    onClick={() => setUploadModalOpen(true)}
                  >
                    Upload Code
                  </Button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setProjectMenuOpen((v) => !v)}
                      className="p-2 rounded-md bg-[#18181C] hover:bg-[#222228] border border-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] transition"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {projectMenuOpen && (
                      <div
                        onMouseLeave={() => setProjectMenuOpen(false)}
                        className="absolute right-0 mt-1 w-44 rounded-md bg-[#141418] border border-[#27272A] shadow-cl-modal py-1 z-20 text-xs"
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            setProjectMenuOpen(false);
                            await api.seedSampleProjectFiles(activeProject.id);
                            await loadFilesForProject(activeProject.id);
                            await loadProjects();
                          }}
                          className="w-full px-3 py-1.5 text-left text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181C]"
                        >
                          Reload Sample Files
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setProjectMenuOpen(false);
                            handleDeleteProject(activeProject.id);
                          }}
                          className="w-full px-3 py-1.5 text-left text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Project
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Project Sub-Navigation: Files | Reviews | Chat | Architecture | Documentation | Diff */}
              <div className="flex items-center gap-1 border-b border-[#27272A] overflow-x-auto">
                {[
                  {
                    id: 'files',
                    label: 'Files',
                    count: projectFiles.length,
                    icon: FileCode,
                  },
                  {
                    id: 'reviews',
                    label: 'Reviews',
                    count: projectReviews.length,
                    icon: History,
                  },
                  { id: 'chat', label: 'Chat', icon: MessageSquare },
                  { id: 'architecture', label: 'Architecture', icon: Layers },
                  {
                    id: 'documentation',
                    label: 'Documentation',
                    icon: BookOpen,
                  },
                  { id: 'diff', label: 'Diff Review', icon: GitCompare },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = projectTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setProjectTab(tab.id as ProjectSubTab)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                        active
                          ? 'border-[#8B5CF6] text-[#F4F4F5]'
                          : 'border-transparent text-[#A1A1AA] hover:text-[#F4F4F5]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-[#A78BFA]" />
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span className="font-mono text-[10px] text-[#71717A] ml-0.5">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sub-Tab 1: FILES (Two-Panel Lightweight IDE Layout) */}
              {projectTab === 'files' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[580px]">
                  {/* LEFT: File Tree */}
                  <div className="lg:col-span-3 rounded-lg border border-[#27272A] bg-[#0F0F12] flex flex-col overflow-hidden">
                    <div className="px-3 py-2 border-b border-[#27272A] flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                      <span>Explorer</span>
                      <span className="font-mono">{projectFiles.length} files</span>
                    </div>

                    {filesLoading ? (
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-5/6" />
                        <Skeleton className="h-6 w-4/6" />
                      </div>
                    ) : (
                      <FileTreeExplorer
                        tree={fileTree}
                        files={projectFiles}
                        activeFileId={activeFileId}
                        selectedFileIds={selectedFileIds}
                        onSelectFile={(id) => {
                          setActiveFileId(id);
                          setHighlightLine(null);
                        }}
                        onToggleCheckFile={(fileId) =>
                          setSelectedFileIds((prev) =>
                            prev.includes(fileId)
                              ? prev.filter((x) => x !== fileId)
                              : [...prev, fileId],
                          )
                        }
                      />
                    )}
                  </div>

                  {/* RIGHT: Code Viewer */}
                  <div className="lg:col-span-9">
                    {activeFileContent ? (
                      <SyntaxCodeViewer
                        code={activeFileContent.content || ''}
                        language={activeFileContent.language}
                        filePath={activeFileContent.path}
                        issuesForFile={issuesForActiveFile}
                        highlightLine={highlightLine}
                        onOpenReviewForFile={() => {
                          setReviewScope('file');
                          setConfigureReviewModalOpen(true);
                        }}
                      />
                    ) : (
                      <EmptyState
                        icon={<FileCode className="w-5 h-5" />}
                        title="No file selected"
                        description="Choose a file from the left tree or upload a ZIP archive to inspect your code."
                        actionLabel="Upload Code"
                        onAction={() => setUploadModalOpen(true)}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: PROJECT REVIEWS */}
              {projectTab === 'reviews' && (
                <div>
                  {projectReviews.length === 0 ? (
                    <EmptyState
                      icon={<Sparkles className="w-5 h-5" />}
                      title="No reviews for this project yet"
                      description="Run a Security, Performance, or Code Quality review to inspect risks."
                      actionLabel="Review Code"
                      onAction={() => setConfigureReviewModalOpen(true)}
                    />
                  ) : (
                    <ReviewInspector
                      review={
                        activeReview &&
                        activeReview.projectId === activeProject.id
                          ? activeReview
                          : projectReviews[0]
                      }
                      onJumpToFile={handleJumpToFile}
                      onToggleResolveIssue={handleToggleIssueResolved}
                    />
                  )}
                </div>
              )}

              {/* Sub-Tab 3: PROJECT CHAT */}
              {projectTab === 'chat' && (
                <ChatWithCodePanel
                  projectId={activeProject.id}
                  files={projectFiles}
                  selectedProviderId={selectedProviderId}
                  onJumpToFile={handleJumpToFile}
                />
              )}

              {/* Sub-Tabs 4, 5, 6: ARCHITECTURE, DOCUMENTATION, DIFF */}
              {(projectTab === 'architecture' ||
                projectTab === 'documentation' ||
                projectTab === 'diff') && (
                <BonusStudio
                  projectId={activeProject.id}
                  files={projectFiles}
                  selectedProviderId={selectedProviderId}
                  initialSubTab={
                    projectTab === 'architecture'
                      ? 'architecture'
                      : projectTab === 'documentation'
                        ? 'docs'
                        : 'diff'
                  }
                  onReviewCreated={loadAllReviews}
                />
              )}
            </div>
          )}

          {/* 4. REVIEW HISTORY PAGE (Section 13) */}
          {section === 'reviews' && (
            <div className="max-w-6xl mx-auto">
              <ReviewHistoryView
                reviews={reviews}
                projects={projects}
                onSelectReview={(rev) => {
                  setActiveReview(rev);
                  setActiveProjectId(rev.projectId);
                  setSection('review-detail');
                }}
                onDeleteReview={async (id) => {
                  await api.deleteReview(id);
                  await loadAllReviews();
                }}
                onStartQuickReview={() => setConfigureReviewModalOpen(true)}
              />
            </div>
          )}

          {/* 5. REVIEW RESULTS DETAIL PAGE (Section 12) */}
          {section === 'review-detail' && activeReview && (
            <div className="max-w-6xl mx-auto space-y-4">
              <button
                type="button"
                onClick={() => setSection('reviews')}
                className="inline-flex items-center gap-1 text-xs text-[#A1A1AA] hover:text-[#F4F4F5] transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Review History
              </button>
              <ReviewInspector
                review={activeReview}
                onJumpToFile={handleJumpToFile}
                onToggleResolveIssue={handleToggleIssueResolved}
              />
            </div>
          )}

          {/* 6. GLOBAL AI CHAT PAGE (Section 14) */}
          {section === 'chat' && activeProject && (
            <div className="max-w-6xl mx-auto">
              <ChatWithCodePanel
                projectId={activeProject.id}
                files={projectFiles}
                selectedProviderId={selectedProviderId}
                onJumpToFile={handleJumpToFile}
              />
            </div>
          )}

          {/* 7. AI PROVIDERS PAGE (Section 15) */}
          {section === 'providers' && (
            <AiProvidersView
              providers={providers}
              onRefreshProviders={loadProviders}
            />
          )}

          {/* 8. SETTINGS PAGE (Section 16) */}
          {section === 'settings' && (
            <SettingsView
              user={user}
              providers={providers}
              onUserUpdated={setUser}
              onOpenProvidersTab={() => setSection('providers')}
            />
          )}
          </div>
        </main>
      </div>

      {/* ==================================================
          MODALS & OVERLAYS
         ================================================== */}

      {/* Command Palette (Cmd/Ctrl + K) */}
      <CommandPalette
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
        projects={projects}
        reviews={reviews}
        onCreateProject={() => setCreateProjectModalOpen(true)}
        onUploadCode={() => setUploadModalOpen(true)}
        onStartReview={() => setConfigureReviewModalOpen(true)}
        onNavigate={(target) => setSection(target)}
        onOpenProject={(projectId) => {
          setActiveProjectId(projectId);
          setSection('project-detail');
          setProjectTab('files');
        }}
        onOpenReview={(rev) => {
          setActiveReview(rev);
          setSection('review-detail');
        }}
      />

      {/* Create Project Dialog */}
      <Dialog
        isOpen={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        title="Create Project"
        subtitle="Set up a new repository workspace for AI code reviews."
      >
        <form onSubmit={handleCreateProject} className="space-y-3.5">
          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1">
              Project Name
            </label>
            <input
              type="text"
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Portfolio Website"
              className="w-full px-3 py-2 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="Next.js · TypeScript · PostgreSQL"
              className="w-full p-3 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-[#A1A1AA] cursor-pointer">
            <input
              type="checkbox"
              checked={newProjectSeed}
              onChange={(e) => setNewProjectSeed(e.target.checked)}
              className="rounded border-[#27272A] bg-[#0F0F12] text-[#8B5CF6]"
            />
            Seed with sample TypeScript &amp; React files for immediate review
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateProjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={creatingProject}
            >
              {creatingProject ? 'Creating...' : 'Create Project →'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Configure AI Review Modal (Section 10) */}
      <ConfigureReviewModal
        isOpen={configureReviewModalOpen}
        onClose={() => setConfigureReviewModalOpen(false)}
        scopeType={reviewScope}
        onChangeScopeType={setReviewScope}
        template={reviewTemplate}
        onChangeTemplate={setReviewTemplate}
        providers={providers}
        selectedProviderId={selectedProviderId}
        onChangeProviderId={setSelectedProviderId}
        files={projectFiles}
        activeFile={activeFileContent}
        selectedFileIds={selectedFileIds}
        onStartReview={() => executeAiReview()}
      />

      {/* AI Review Process Screen (Section 11) */}
      <AiReviewProcessModal
        isOpen={reviewRunning}
        activeStepIndex={reviewProcessStep}
      />

      {/* Upload Code Modal (Section 9) */}
      {activeProject && (
        <UploadCodeModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          projectId={activeProject.id}
          onUploaded={async () => {
            await loadFilesForProject(activeProject.id);
            await loadProjects();
          }}
        />
      )}
    </div>
  );
}
