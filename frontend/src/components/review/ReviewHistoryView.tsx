'use client';

import React, { useMemo, useState } from 'react';
import { Search, History, ArrowRight, Trash2 } from 'lucide-react';
import { ProjectSummary, ReviewRecord } from '@/types';
import { EmptyState, SeverityBadge } from '@/components/ui/Primitives';

interface ReviewHistoryViewProps {
  reviews: ReviewRecord[];
  projects: ProjectSummary[];
  onSelectReview: (review: ReviewRecord) => void;
  onDeleteReview?: (reviewId: string) => Promise<void>;
  onStartQuickReview?: () => void;
}

export function ReviewHistoryView({
  reviews,
  projects,
  onSelectReview,
  onDeleteReview,
  onStartQuickReview,
}: ReviewHistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();

    return reviews.filter((r) => {
      if (projectFilter !== 'all' && r.projectId !== projectFilter) {
        return false;
      }
      if (typeFilter !== 'all' && r.template !== typeFilter) {
        return false;
      }
      if (severityFilter !== 'all') {
        const hasSev =
          Number(r.severityCounts?.[severityFilter as keyof typeof r.severityCounts] || 0) > 0 ||
          (r.issues || []).some((i) => i.severity === severityFilter);
        if (!hasSev) return false;
      }
      if (dateFilter !== 'all') {
        const ageMs = now - new Date(r.createdAt).getTime();
        if (dateFilter === '24h' && ageMs > 24 * 3600 * 1000) return false;
        if (dateFilter === '7d' && ageMs > 7 * 24 * 3600 * 1000) return false;
      }
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        (r.projectName || '').toLowerCase().includes(q) ||
        (r.targetFiles || []).some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [
    reviews,
    searchQuery,
    projectFilter,
    typeFilter,
    severityFilter,
    dateFilter,
  ]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#F4F4F5] tracking-tight">
            Review History
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Inspect historical security, performance, and code quality audits across your repositories.
          </p>
        </div>
        <span className="text-xs font-mono text-[#71717A]">
          {filtered.length} of {reviews.length} reviews
        </span>
      </div>

      {/* Filter Bar */}
      <div className="rounded-lg bg-[#141418] border border-[#27272A] p-3 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews by title, file, or finding..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#A1A1AA] focus:outline-none focus:border-[#8B5CF6]"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#A1A1AA] focus:outline-none focus:border-[#8B5CF6]"
        >
          <option value="all">All Review Types</option>
          <option value="security">Security</option>
          <option value="performance">Performance</option>
          <option value="quality">Code Quality</option>
          <option value="comprehensive">Comprehensive</option>
          <option value="diff">Diff Review</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#A1A1AA] focus:outline-none focus:border-[#8B5CF6]"
        >
          <option value="all">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#A1A1AA] focus:outline-none focus:border-[#8B5CF6]"
        >
          <option value="all">Any Date</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
        </select>
      </div>

      {/* Compact Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<History className="w-5 h-5" />}
          title="No reviews match your filters"
          description="Run an AI review on a file or project to populate your audit history."
          actionLabel={onStartQuickReview ? 'Start AI Review' : undefined}
          onAction={onStartQuickReview}
        />
      ) : (
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
                  <th className="py-2.5 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-xs">
                {filtered.map((r) => {
                  const score = r.riskScore ?? r.overallScore ?? 75;
                  const counts = r.severityCounts || {
                    Critical: 0,
                    High: 0,
                    Medium: 0,
                    Low: 0,
                  };
                  const highestSeverity =
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
                      onClick={() => onSelectReview(r)}
                      className="group hover:bg-[#18181C] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#F4F4F5] group-hover:text-[#A78BFA] transition-colors">
                          {r.title}
                        </div>
                        <div className="text-[11px] text-[#71717A] truncate max-w-md mt-0.5">
                          {r.summary}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[#A1A1AA] font-medium whitespace-nowrap">
                        {r.projectName ||
                          projects.find((p) => p.id === r.projectId)?.name ||
                          'Workspace'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#0F0F12] border border-[#27272A] font-mono text-[11px] uppercase text-[#A1A1AA]">
                          {r.template}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={highestSeverity} size="xs" />
                          <span className="font-mono text-[#A1A1AA]">
                            {r.issues?.length || 0} total
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-mono font-semibold ${
                            score >= 80
                              ? 'text-[#22C55E]'
                              : score >= 60
                                ? 'text-[#F59E0B]'
                                : 'text-[#EF4444]'
                          }`}
                        >
                          {score} / 100
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap text-[#71717A] font-mono text-[11px]">
                        <div className="flex items-center justify-end gap-2">
                          <span>
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                          {onDeleteReview && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteReview(r.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#EF4444]/15 text-[#71717A] hover:text-[#EF4444] transition"
                              title="Delete review"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ArrowRight className="w-3.5 h-3.5 text-[#71717A] group-hover:text-[#F4F4F5] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
