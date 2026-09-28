'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderGit2,
  History,
  AlertTriangle,
  Cpu,
  Plus,
  Sparkles,
  ArrowUpRight,
  Upload,
  Shield,
  Zap,
} from 'lucide-react';
import { AiProviderConfig, ProjectSummary, ReviewRecord, UserProfile } from '@/types';
import { Button, EmptyState, SeverityBadge, StatCard } from '@/components/ui/Primitives';

import { Palette } from 'lucide-react';
import {
  BACKGROUND_COLLECTION,
  BackgroundThemeOption,
  FONT_PAIRINGS,
  FontPairingId,
} from '@/components/ui/ThemeStudioModal';

interface OverviewViewProps {
  user: UserProfile;
  projects: ProjectSummary[];
  reviews: ReviewRecord[];
  activeProvider?: AiProviderConfig;
  activeThemeId?: BackgroundThemeOption['id'];
  activeFontId?: FontPairingId;
  onOpenThemeStudio?: () => void;
  onCreateProjectClick: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenReview: (review: ReviewRecord) => void;
  onStartQuickReview: (
    projectId: string,
    template: 'security' | 'performance' | 'quality',
  ) => void;
  onOpenUploadModal: (projectId: string) => void;
}

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function OverviewView({
  user,
  projects,
  reviews,
  activeProvider,
  activeThemeId = 'aurora-wave',
  activeFontId = 'technical',
  onOpenThemeStudio,
  onCreateProjectClick,
  onOpenProject,
  onOpenReview,
  onStartQuickReview,
  onOpenUploadModal,
}: OverviewViewProps) {
  const [quickProjectId, setQuickProjectId] = useState<string>(
    projects[0]?.id || '',
  );
  const [quickType, setQuickType] = useState<
    'security' | 'performance' | 'quality'
  >('security');

  const firstName = (user.name || 'Developer').split(' ')[0];
  const totalIssues = reviews.reduce(
    (sum, r) => sum + (r.issues?.length || 0),
    0,
  );
  const criticalIssues = reviews.reduce(
    (sum, r) => sum + Number(r.severityCounts?.Critical || 0),
    0,
  );

  const currentBg =
    BACKGROUND_COLLECTION.find((b) => b.id === activeThemeId) ||
    BACKGROUND_COLLECTION[0];
  const currentFont =
    FONT_PAIRINGS.find((f) => f.id === activeFontId) || FONT_PAIRINGS[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Greeting Hero Card with High-Res Background Showcase & CTAs */}
      <div className="relative rounded-xl border border-[#27272A] overflow-hidden p-5 shadow-cl-card">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-45 transition-all duration-500"
          style={{ backgroundImage: `url('${currentBg.imageUrl}')` }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(9,9,11,0.90) 0%, rgba(9,9,11,0.68) 55%, rgba(9,9,11,0.85) 100%)',
          }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#141418]/90 border border-[#27272A] text-[10.5px] font-mono text-[#A78BFA]">
              <Palette className="w-3 h-3" />
              <span>Theme: {currentBg.name}</span>
              <span className="text-[#71717A]">·</span>
              <span>{currentFont.headingFont.split('(')[0].trim()}</span>
            </div>
            <h1 className="font-display text-2xl font-semibold text-[#F4F4F5] tracking-tight">
              Good morning, {firstName}
            </h1>
            <p className="text-xs text-[#A1A1AA] max-w-xl">
              Review your codebase, identify critical security and performance
              risks, and ship with confidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenThemeStudio && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Palette className="w-3.5 h-3.5 text-[#A78BFA]" />}
                onClick={onOpenThemeStudio}
              >
                Background &amp; Fonts
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />}
              onClick={() => {
                const targetId = quickProjectId || projects[0]?.id;
                if (targetId) onStartQuickReview(targetId, quickType);
              }}
            >
              Quick Review
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={onCreateProjectClick}
            >
              New Project
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Compact Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Projects"
          value={projects.length}
          trend="Active"
          supportingText={`${projects.reduce((s, p) => s + p.fileCount, 0)} indexed source files`}
          icon={<FolderGit2 className="w-4 h-4" />}
          accentColor="#A78BFA"
        />
        <StatCard
          label="Total Reviews"
          value={reviews.length}
          trend={reviews[0] ? `${reviews[0].overallScore}/100 avg` : 'Ready'}
          supportingText={
            reviews[0]
              ? `Last run ${formatTimeAgo(reviews[0].createdAt)}`
              : 'No reviews run yet'
          }
          icon={<History className="w-4 h-4" />}
          accentColor="#22C55E"
        />
        <StatCard
          label="Issues Found"
          value={totalIssues}
          trend={criticalIssues > 0 ? `${criticalIssues} critical` : '0 critical'}
          supportingText="Across security, performance & quality"
          icon={<AlertTriangle className="w-4 h-4" />}
          accentColor={criticalIssues > 0 ? '#EF4444' : '#F59E0B'}
        />
        <StatCard
          label="AI Provider"
          value={activeProvider ? activeProvider.modelName.split('/').pop() || activeProvider.modelName : 'Local'}
          trend="● Connected"
          supportingText={
            activeProvider
              ? `${activeProvider.name} (${activeProvider.baseUrl})`
              : 'OpenAI-Compatible Endpoint'
          }
          icon={<Cpu className="w-4 h-4" />}
          accentColor="#22C55E"
        />
      </div>

      {/* Main Two-Column Grid: Recent Projects + Quick Review Action Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Projects (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
              Recent Projects
            </h2>
            <span className="text-[11px] font-mono text-[#71717A]">
              {projects.length} total
            </span>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              icon={<FolderGit2 className="w-5 h-5" />}
              title="No projects yet."
              description="Your codebase deserves a second pair of eyes."
              actionLabel="Create Your First Project"
              onAction={onCreateProjectClick}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projects.map((p) => (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.16 }}
                  onClick={() => onOpenProject(p.id)}
                  className="group rounded-lg bg-[#141418] border border-[#27272A] hover:border-[#8B5CF6]/50 hover:shadow-cl-glow p-4 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#F4F4F5] group-hover:text-[#A78BFA] transition-colors">
                        {p.name}
                      </h3>
                      <ArrowUpRight className="w-4 h-4 text-[#71717A] opacity-0 group-hover:opacity-100 group-hover:text-[#A78BFA] transition-all shrink-0" />
                    </div>
                    <p className="text-xs text-[#A1A1AA] line-clamp-2 mt-1">
                      {p.description || 'TypeScript · Node.js · PostgreSQL'}
                    </p>

                    {/* Technology Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3 text-[10.5px] font-mono text-[#A1A1AA]">
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
                    <div className="flex items-center gap-3">
                      <span>{p.fileCount} files</span>
                      <span>·</span>
                      <span>{p.reviewCount} reviews</span>
                    </div>
                    <span>
                      Last reviewed {formatTimeAgo(p.updatedAt || p.createdAt)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Visually Distinct Quick Review Area (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
            Quick Review
          </h2>

          <div className="rounded-lg bg-[#141418] border border-[#8B5CF6]/35 shadow-cl-glow p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#F4F4F5] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#A78BFA]" />
                  Review a codebase
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Drop a ZIP file here or choose a project.
                </p>
              </div>
            </div>

            {/* Project Picker + Drop Trigger */}
            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-[#A1A1AA]">
                Target Project
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={quickProjectId || projects[0]?.id || ''}
                  onChange={(e) => setQuickProjectId(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.fileCount} files)
                    </option>
                  ))}
                </select>
                {projects[0] && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenUploadModal(quickProjectId || projects[0].id)
                    }
                    className="px-2.5 py-1.5 rounded-md bg-[#18181C] hover:bg-[#222228] border border-[#27272A] text-xs text-[#A1A1AA] hover:text-[#F4F4F5] inline-flex items-center gap-1 transition"
                    title="Upload ZIP to project"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    ZIP
                  </button>
                )}
              </div>
            </div>

            {/* Review Type Pills */}
            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-[#A1A1AA]">
                Review Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'security', label: 'Security', icon: Shield },
                  { id: 'performance', label: 'Performance', icon: Zap },
                  { id: 'quality', label: 'Code Quality', icon: Sparkles },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = quickType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setQuickType(item.id as any)}
                      className={`py-2 px-2 rounded-md border text-[11px] font-medium flex flex-col items-center gap-1 transition ${
                        active
                          ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#F4F4F5]'
                          : 'border-[#27272A] bg-[#0F0F12] text-[#A1A1AA] hover:text-[#F4F4F5]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-[#A78BFA]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full"
              disabled={projects.length === 0}
              onClick={() => {
                const targetId = quickProjectId || projects[0]?.id;
                if (targetId) onStartQuickReview(targetId, quickType);
              }}
            >
              Start AI Review →
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Reviews Compact Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
            Recent Reviews
          </h2>
        </div>

        <div className="rounded-lg border border-[#27272A] bg-[#141418] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#0F0F12] text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                  <th className="py-2.5 px-4">Review</th>
                  <th className="py-2.5 px-4">Project</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Issues</th>
                  <th className="py-2.5 px-4">Risk</th>
                  <th className="py-2.5 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-xs">
                {reviews.slice(0, 6).map((r) => {
                  const score = r.riskScore ?? r.overallScore ?? 75;
                  const counts = r.severityCounts || {
                    Critical: 0,
                    High: 0,
                    Medium: 0,
                    Low: 0,
                  };
                  const topSev =
                    counts.Critical > 0
                      ? 'Critical'
                      : counts.High > 0
                        ? 'High'
                        : counts.Medium > 0
                          ? 'Medium'
                          : 'Low';

                  return (
                    <tr
                      key={r.id}
                      onClick={() => onOpenReview(r)}
                      className="hover:bg-[#18181C] cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 font-medium text-[#F4F4F5]">
                        {r.title}
                      </td>
                      <td className="py-2.5 px-4 text-[#A1A1AA]">
                        {r.projectName ||
                          projects.find((p) => p.id === r.projectId)?.name ||
                          'Project'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#0F0F12] border border-[#27272A] font-mono text-[10.5px] uppercase text-[#A1A1AA]">
                          {r.template}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={topSev} size="xs" />
                          <span className="font-mono text-[#A1A1AA]">
                            {r.issues?.length || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold">
                        <span
                          className={
                            score >= 80
                              ? 'text-[#22C55E]'
                              : score >= 60
                                ? 'text-[#F59E0B]'
                                : 'text-[#EF4444]'
                          }
                        >
                          {score}/100
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[11px] text-[#71717A]">
                        {formatTimeAgo(r.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
