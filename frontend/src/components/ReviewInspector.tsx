'use client';

import React, { useMemo, useState } from 'react';
import {
  FileCode,
  Download,
  Cpu,
  Search,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  ArrowUpDown,
} from 'lucide-react';
import { ReviewIssue, ReviewRecord, SeverityLevel } from '@/types';
import { Button, SeverityBadge } from '@/components/ui/Primitives';

interface ReviewInspectorProps {
  review: ReviewRecord;
  onJumpToFile?: (filePath: string, line?: number) => void;
  onToggleResolveIssue?: (reviewId: string, issueId: string) => Promise<void>;
}

const SEVERITY_RANK: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return 'Completed just now';
  if (mins < 60) return `Completed ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Completed ${hrs}h ago`;
  return `Completed on ${new Date(iso).toLocaleDateString()}`;
}

export function ReviewInspector({
  review,
  onJumpToFile,
  onToggleResolveIssue,
}: ReviewInspectorProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'severity' | 'file' | 'line'>('severity');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const counts = review.severityCounts || {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };

  const score = review.riskScore ?? review.overallScore ?? 75;
  const riskLabel =
    score >= 80 ? 'Low Risk' : score >= 60 ? 'Moderate Risk' : 'High Risk';
  const riskColor =
    score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#EF4444';

  const templateDisplay =
    review.template === 'security'
      ? 'Security Review'
      : review.template === 'performance'
        ? 'Performance Review'
        : review.template === 'quality'
          ? 'Code Quality Review'
          : review.template === 'diff'
            ? 'Diff Review'
            : 'Comprehensive Review';

  const filteredAndSortedIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = (review.issues || []).filter((iss) => {
      if (selectedSeverity !== 'all' && iss.severity !== selectedSeverity) {
        return false;
      }
      if (!q) return true;
      return (
        iss.title.toLowerCase().includes(q) ||
        iss.file.toLowerCase().includes(q) ||
        iss.description.toLowerCase().includes(q) ||
        (iss.recommendation || '').toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      if (sortBy === 'severity') {
        return (
          (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0)
        );
      }
      if (sortBy === 'file') {
        return a.file.localeCompare(b.file) || a.line - b.line;
      }
      return a.line - b.line;
    });

    return list;
  }, [review.issues, selectedSeverity, searchQuery, sortBy]);

  const handleCopyIssue = async (iss: ReviewIssue) => {
    const text = `[${iss.severity.toUpperCase()}] ${iss.title}\nFile: ${iss.file}:${iss.line}\nDescription: ${iss.description}\nImpact: ${iss.impact || ''}\nRecommendation: ${iss.recommendation || iss.suggestedFix}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(iss.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleToggleResolve = async (issueId: string) => {
    if (!onToggleResolveIssue) return;
    setResolvingId(issueId);
    try {
      await onToggleResolveIssue(review.id, issueId);
    } finally {
      setResolvingId(null);
    }
  };

  const handleExportMarkdown = () => {
    const md = `# ${templateDisplay} — ${review.projectName || review.title}
- **Completed**: ${new Date(review.createdAt).toLocaleString()}
- **Score**: ${score} / 100 (${riskLabel})
- **Model**: ${review.modelUsed}

## Summary
${review.summary}

## Severity Distribution
- Critical: ${counts.Critical || 0}
- High: ${counts.High || 0}
- Medium: ${counts.Medium || 0}
- Low: ${counts.Low || 0}

## Issues (${review.issues.length})
${review.issues
  .map(
    (iss, idx) => `### ${idx + 1}. [${iss.severity.toUpperCase()}] ${iss.title}
- **Location**: \`${iss.file}:${iss.line}\`
- **Description**: ${iss.description}
- **Impact**: ${iss.impact || 'N/A'}
- **Recommendation**: ${iss.recommendation || iss.suggestedFix}`,
  )
  .join('\n\n')}
`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${review.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Radial SVG math
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="space-y-5">
      {/* Review Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#27272A]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
            <span className="font-semibold text-[#A78BFA]">
              {templateDisplay}
            </span>
            <span>·</span>
            <span>{review.projectName || 'Project Workspace'}</span>
            <span>·</span>
            <span className="text-[#71717A]">
              {formatRelativeTime(review.createdAt)}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-[#F4F4F5] mt-1 tracking-tight">
            {review.title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141418] border border-[#27272A] text-[11px] font-mono text-[#A1A1AA]">
            <Cpu className="w-3.5 h-3.5 text-[#A78BFA]" />
            {review.modelUsed}
          </span>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportMarkdown}
          >
            Export Report
          </Button>
        </div>
      </div>

      {/* Risk Score + Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Radial Risk Score & Severity Distribution */}
        <div className="lg:col-span-5 rounded-lg bg-[#141418] border border-[#27272A] p-4 flex items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="#27272A"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke={riskColor}
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold font-mono text-[#F4F4F5] leading-none">
                  {score}
                </span>
                <span className="text-[9px] font-mono text-[#71717A] mt-0.5">
                  / 100
                </span>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-[#71717A] font-semibold">
                Code Health Score
              </div>
              <div
                className="text-sm font-semibold mt-0.5"
                style={{ color: riskColor }}
              >
                {riskLabel}
              </div>
              <div className="text-[11px] text-[#A1A1AA] mt-1">
                {review.issues?.length || 0} findings across{' '}
                {review.targetFiles?.length || 1} file(s)
              </div>
            </div>
          </div>

          {/* Severity Distribution */}
          <div className="space-y-1.5 border-l border-[#27272A] pl-4 min-w-[115px]">
            {[
              { label: 'Critical', count: counts.Critical || 0, color: '#EF4444' },
              { label: 'High', count: counts.High || 0, color: '#F59E0B' },
              { label: 'Medium', count: counts.Medium || 0, color: '#3B82F6' },
              { label: 'Low', count: counts.Low || 0, color: '#71717A' },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-1.5 text-[#A1A1AA]">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </span>
                <span className="font-mono font-semibold text-[#F4F4F5]">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-7 rounded-lg bg-[#141418] border border-[#27272A] p-4 flex flex-col justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#71717A] font-semibold mb-1.5">
              Executive Summary
            </div>
            <p className="text-xs text-[#F4F4F5] leading-relaxed">
              {review.summary}
            </p>
          </div>

          {review.recommendations && review.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#27272A] flex flex-wrap gap-1.5">
              {review.recommendations.slice(0, 2).map((rec, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-[11px] text-[#A1A1AA] bg-[#0F0F12] border border-[#27272A] px-2.5 py-1 rounded"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#22C55E] shrink-0" />
                  <span className="truncate max-w-md">{rec}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div className="rounded-lg bg-[#141418] border border-[#27272A] p-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 top-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues..."
              className="w-full pl-8 pr-3 py-1 rounded bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'Critical', 'High', 'Medium', 'Low'] as const).map(
              (sev) => {
                const active = selectedSeverity === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSelectedSeverity(sev)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                      active
                        ? 'bg-[#8B5CF6]/20 text-[#F4F4F5] border border-[#8B5CF6]/40'
                        : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181C] border border-transparent'
                    }`}
                  >
                    {sev === 'all' ? 'All' : sev}
                  </button>
                );
              },
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#71717A]" />
          <span>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1 rounded bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
          >
            <option value="severity">Severity</option>
            <option value="file">File</option>
            <option value="line">Line</option>
          </select>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredAndSortedIssues.length === 0 ? (
          <div className="rounded-lg border border-[#27272A] bg-[#141418] p-8 text-center text-xs text-[#71717A]">
            No issues match your current filter criteria.
          </div>
        ) : (
          filteredAndSortedIssues.map((iss) => {
            const isResolved = Boolean(iss.resolved);
            return (
              <div
                key={iss.id}
                className={`rounded-lg border transition-colors p-4 space-y-3 ${
                  isResolved
                    ? 'border-[#27272A]/60 bg-[#0F0F12]/60 opacity-70'
                    : 'border-[#27272A] bg-[#141418] hover:border-[#3F3F46]'
                }`}
              >
                {/* Issue Top Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <SeverityBadge severity={iss.severity} />
                    <h4
                      className={`text-sm font-semibold ${
                        isResolved
                          ? 'line-through text-[#A1A1AA]'
                          : 'text-[#F4F4F5]'
                      }`}
                    >
                      {iss.title}
                    </h4>
                    {isResolved && (
                      <span className="px-2 py-0.5 rounded bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 text-[10px] font-mono uppercase">
                        Resolved
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onJumpToFile?.(iss.file, iss.line)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0F0F12] hover:bg-[#18181C] border border-[#27272A] text-xs font-mono text-[#A78BFA] transition"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    {iss.file}:{iss.line}
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-[#F4F4F5] leading-relaxed">
                  {iss.description}
                </p>

                {/* Offending Code Snippet */}
                {iss.codeSnippet && (
                  <div className="rounded-md bg-[#09090B] border border-[#27272A] px-3 py-2 font-mono text-xs text-[#EF4444] overflow-x-auto">
                    <span className="text-[#71717A] select-none mr-3">
                      {iss.line}
                    </span>
                    {iss.codeSnippet}
                  </div>
                )}

                {/* Impact & Recommendation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-md bg-[#0F0F12] border border-[#27272A] p-3">
                    <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[#A1A1AA] mb-1">
                      Impact
                    </div>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      {iss.impact ||
                        'Attackers or runtime load could exploit this pattern to compromise system integrity or availability.'}
                    </p>
                  </div>

                  <div className="rounded-md bg-[#0F0F12] border border-[#27272A] p-3">
                    <div className="text-[10.5px] uppercase tracking-wider font-semibold text-[#22C55E] mb-1">
                      Recommendation
                    </div>
                    <p className="text-xs text-[#F4F4F5] leading-relaxed font-mono">
                      {iss.recommendation || iss.suggestedFix}
                    </p>
                  </div>
                </div>

                {/* Issue Actions Bar */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]/70">
                  <Button
                    variant="secondary"
                    size="xs"
                    leftIcon={<ExternalLink className="w-3 h-3" />}
                    onClick={() => onJumpToFile?.(iss.file, iss.line)}
                  >
                    Open File
                  </Button>

                  <Button
                    variant="secondary"
                    size="xs"
                    leftIcon={
                      copiedId === iss.id ? (
                        <Check className="w-3 h-3 text-[#22C55E]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )
                    }
                    onClick={() => handleCopyIssue(iss)}
                  >
                    {copiedId === iss.id ? 'Copied' : 'Copy'}
                  </Button>

                  {onToggleResolveIssue && (
                    <Button
                      variant={isResolved ? 'outline' : 'secondary'}
                      size="xs"
                      disabled={resolvingId === iss.id}
                      leftIcon={
                        <CheckCircle2
                          className={`w-3 h-3 ${
                            isResolved ? 'text-[#22C55E]' : 'text-[#A1A1AA]'
                          }`}
                        />
                      }
                      onClick={() => handleToggleResolve(iss.id)}
                    >
                      {isResolved ? 'Resolved' : 'Mark Resolved'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
