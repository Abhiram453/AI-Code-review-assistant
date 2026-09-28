'use client';

import React, { useEffect, useState } from 'react';
import {
  GitCompare,
  Layers,
  BookOpen,
  Play,
  Loader2,
  Check,
  Copy,
  Download,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  ArchitectureAnalysisResponse,
  DiffReviewResponse,
  DocumentationSuiteResponse,
  ProjectFileItem,
} from '@/types';
import { api } from '@/lib/api';
import { Button, InlineErrorState } from '@/components/ui/Primitives';

interface BonusStudioProps {
  projectId: string;
  files: ProjectFileItem[];
  selectedProviderId?: string;
  initialSubTab?: 'architecture' | 'docs' | 'diff';
  onReviewCreated?: () => Promise<void>;
}

export function BonusStudio({
  projectId,
  files,
  selectedProviderId,
  initialSubTab = 'architecture',
  onReviewCreated,
}: BonusStudioProps) {
  const [activeFeature, setActiveFeature] = useState<
    'architecture' | 'docs' | 'diff'
  >(initialSubTab);

  useEffect(() => {
    setActiveFeature(initialSubTab);
  }, [initialSubTab]);

  // Diff Review State
  const [diffMode, setDiffMode] = useState<'files' | 'custom'>('files');
  const [baseFileId, setBaseFileId] = useState<string>('');
  const [targetFileId, setTargetFileId] = useState<string>('');
  const [customBaseCode, setCustomBaseCode] = useState<string>(
    `export async function getUser(db: any, email: string) {\n  const sql = \`SELECT * FROM users WHERE email = '\${email}'\`;\n  return db.executeRaw(sql);\n}`,
  );
  const [customTargetCode, setCustomTargetCode] = useState<string>(
    `export async function getUser(db: DatabaseClient, email: string) {\n  return db.queryParameterized('SELECT id, email, role FROM users WHERE email = $1', [email]);\n}`,
  );
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffReviewResponse | null>(null);

  // Architecture Analysis State
  const [archLoading, setArchLoading] = useState(false);
  const [archResult, setArchResult] = useState<ArchitectureAnalysisResponse | null>(null);

  // Documentation Generator State
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsResult, setDocsResult] = useState<DocumentationSuiteResponse | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'readme' | 'setupGuide' | 'apiDocs'>('readme');
  const [copiedDoc, setCopiedDoc] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (files.length >= 2) {
      const v1 = files.find((f) => f.name === 'orders.controller.ts');
      const v2 = files.find((f) => f.name === 'orders.controller.v2.ts');
      if (v1 && v2) {
        setBaseFileId(v1.id);
        setTargetFileId(v2.id);
      } else {
        setBaseFileId(files[0].id);
        setTargetFileId(files[1].id);
      }
    } else if (files.length === 1) {
      setBaseFileId(files[0].id);
      setTargetFileId(files[0].id);
    }
  }, [files]);

  const handleRunArchitecture = async () => {
    setArchLoading(true);
    setError(null);
    try {
      const res = await api.runArchitectureAnalysis(projectId, selectedProviderId);
      setArchResult(res);
    } catch (err: any) {
      setError(err?.message || 'Architecture analysis failed');
    } finally {
      setArchLoading(false);
    }
  };

  const handleGenerateDocs = async () => {
    setDocsLoading(true);
    setError(null);
    try {
      const res = await api.generateDocumentation(projectId, {
        docType: 'all',
        providerId: selectedProviderId,
      });
      setDocsResult(res);
    } catch (err: any) {
      setError(err?.message || 'Documentation generation failed');
    } finally {
      setDocsLoading(false);
    }
  };

  const handleRunDiff = async () => {
    setDiffLoading(true);
    setError(null);
    try {
      const res = await api.runDiffReview(
        projectId,
        diffMode === 'files'
          ? {
              baseFileId,
              targetFileId,
              providerId: selectedProviderId,
            }
          : {
              baseLabel: 'Original Snippet',
              targetLabel: 'Refactored Snippet',
              baseContent: customBaseCode,
              targetContent: customTargetCode,
              providerId: selectedProviderId,
            },
      );
      setDiffResult(res);
      await onReviewCreated?.();
    } catch (err: any) {
      setError(err?.message || 'Diff review failed');
    } finally {
      setDiffLoading(false);
    }
  };

  const handleCopyDoc = async () => {
    if (!docsResult) return;
    await navigator.clipboard.writeText(docsResult.documents[activeDocTab]);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 1600);
  };

  const handleDownloadDoc = () => {
    if (!docsResult) return;
    const filename =
      activeDocTab === 'readme'
        ? 'README.md'
        : activeDocTab === 'setupGuide'
          ? 'SETUP_GUIDE.md'
          : 'API_DOCUMENTATION.md';
    const blob = new Blob([docsResult.documents[activeDocTab]], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex items-center gap-1.5 border-b border-[#27272A] pb-3">
        {[
          { id: 'architecture', label: 'Architecture Analysis', icon: Layers },
          { id: 'docs', label: 'Documentation Generator', icon: BookOpen },
          { id: 'diff', label: 'Diff Review', icon: GitCompare },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeFeature === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveFeature(t.id as any)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                active
                  ? 'bg-[#8B5CF6]/15 text-[#F4F4F5] border border-[#8B5CF6]/40'
                  : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181C] border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-[#A78BFA]" />
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <InlineErrorState
          title="Analysis error"
          message={error}
          onRetry={() => setError(null)}
        />
      )}

      {/* --- SECTION 18: BONUS — ARCHITECTURE --- */}
      {activeFeature === 'architecture' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#F4F4F5]">
                Architecture Overview &amp; System Topology
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Inspect technologies, layered components, data flow, module dependencies, risks, and recommendations.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={archLoading}
              leftIcon={
                archLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Layers className="w-3.5 h-3.5" />
                )
              }
              onClick={handleRunArchitecture}
            >
              {archResult
                ? 'Regenerate Architecture'
                : 'Analyze Project Architecture'}
            </Button>
          </div>

          {archResult && (
            <div className="space-y-4">
              {/* Clean Visual Architecture Diagram */}
              <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                    Layered System Diagram
                  </span>
                  <span className="text-[11px] font-mono text-[#71717A]">
                    {archResult.metrics.totalFiles} files ·{' '}
                    {archResult.metrics.totalLines} LOC
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
                  {[
                    {
                      title: 'Presentation Layer',
                      items: archResult.layers.presentation,
                      accent: '#A78BFA',
                    },
                    {
                      title: 'Controller / API Layer',
                      items: archResult.layers.controllers,
                      accent: '#3B82F6',
                    },
                    {
                      title: 'Domain & Services',
                      items: archResult.layers.services,
                      accent: '#22C55E',
                    },
                    {
                      title: 'Data Access Layer',
                      items: archResult.layers.data,
                      accent: '#F59E0B',
                    },
                  ].map((layer) => (
                    <div
                      key={layer.title}
                      className="rounded-md bg-[#0F0F12] border border-[#27272A] p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-[#F4F4F5]">
                        <span>{layer.title}</span>
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: layer.accent }}
                        />
                      </div>
                      <div className="space-y-1">
                        {layer.items.length === 0 ? (
                          <div className="text-[11px] text-[#71717A] font-mono">
                            No modules in layer
                          </div>
                        ) : (
                          layer.items.map((fp) => (
                            <div
                              key={fp}
                              className="px-2 py-1 rounded bg-[#141418] border border-[#27272A] text-[11px] font-mono text-[#A1A1AA] truncate"
                            >
                              {fp}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technologies, Data Flow & Dependencies Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                    Technologies
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {archResult.metrics.languages.map((lang) => (
                      <span
                        key={lang}
                        className="px-2.5 py-1 rounded bg-[#0F0F12] border border-[#27272A] text-xs font-mono uppercase text-[#A78BFA]"
                      >
                        {lang}
                      </span>
                    ))}
                    <span className="px-2.5 py-1 rounded bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#A1A1AA]">
                      SQL / Relational
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 space-y-2.5 lg:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                    Data Flow &amp; Dependencies ({archResult.dependencies.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                    {archResult.dependencies.map((d, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-[11px] font-mono text-[#A1A1AA] flex items-center gap-1.5 truncate"
                      >
                        <span className="text-[#F4F4F5] truncate">
                          {d.from.split('/').pop()}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[#8B5CF6] shrink-0" />
                        <span className="text-[#A78BFA] truncate">{d.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Potential Risks & Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Potential Risks
                  </div>
                  <ul className="space-y-2 text-xs text-[#A1A1AA]">
                    <li>
                      • Direct raw SQL query execution across service boundaries increases injection surface area.
                    </li>
                    <li>
                      • Synchronous file I/O and unbounded in-memory caching inside request handlers risk event-loop contention.
                    </li>
                  </ul>
                </div>

                <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#22C55E]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Recommendations
                  </div>
                  <ul className="space-y-2 text-xs text-[#A1A1AA]">
                    <li>
                      • Standardize all data access through parameterized repository methods (`queryParameterized`).
                    </li>
                    <li>
                      • Enforce DTO validation at the controller layer and decouple audit logging into async streams.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Architecture Overview Narrative */}
              <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  Architecture Overview
                </div>
                <div className="text-xs text-[#F4F4F5] whitespace-pre-wrap leading-relaxed">
                  {archResult.narrative}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SECTION 17: BONUS — DOCUMENTATION --- */}
      {activeFeature === 'docs' && (
        <div className="space-y-4">
          {/* 3 Cards: README, Setup Guide, API Documentation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: 'readme' as const,
                title: 'README',
                desc: 'Project overview, directory structure, and module catalog.',
              },
              {
                id: 'setupGuide' as const,
                title: 'Setup Guide',
                desc: 'Prerequisites, environment configuration, and local run steps.',
              },
              {
                id: 'apiDocs' as const,
                title: 'API Documentation',
                desc: 'Exported classes, service methods, and endpoint signatures.',
              },
            ].map((card) => {
              const active = activeDocTab === card.id;
              return (
                <div
                  key={card.id}
                  onClick={() => setActiveDocTab(card.id)}
                  className={`rounded-lg border p-4 cursor-pointer transition ${
                    active
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                      : 'border-[#27272A] bg-[#141418] hover:border-[#3F3F46]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F4F4F5]">
                      {card.title}
                    </span>
                    <BookOpen className="w-3.5 h-3.5 text-[#A78BFA]" />
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] mt-1">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Action Bar: Generate, Regenerate, Copy, Download */}
          <div className="rounded-lg border border-[#27272A] bg-[#141418] p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="xs"
                disabled={docsLoading}
                leftIcon={
                  docsLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )
                }
                onClick={handleGenerateDocs}
              >
                {docsResult ? 'Regenerate' : 'Generate'}
              </Button>
              {docsResult && (
                <Button
                  variant="secondary"
                  size="xs"
                  leftIcon={<RefreshCw className="w-3 h-3" />}
                  onClick={handleGenerateDocs}
                >
                  Regenerate All
                </Button>
              )}
            </div>

            {docsResult && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  leftIcon={
                    copiedDoc ? (
                      <Check className="w-3 h-3 text-[#22C55E]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )
                  }
                  onClick={handleCopyDoc}
                >
                  {copiedDoc ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  leftIcon={<Download className="w-3 h-3" />}
                  onClick={handleDownloadDoc}
                >
                  Download
                </Button>
              </div>
            )}
          </div>

          {docsResult && (
            <div className="rounded-lg border border-[#27272A] bg-[#09090B] p-5 overflow-x-auto max-h-[540px]">
              <pre className="font-mono text-xs text-[#F4F4F5] whitespace-pre-wrap leading-relaxed">
                {docsResult.documents[activeDocTab]}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* --- DIFF REVIEW --- */}
      {activeFeature === 'diff' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#F4F4F5]">
                  Compare Files &amp; Review Diff
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Evaluate code changes, resolved issues, and health score delta between two files.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-[#0F0F12] p-1 rounded border border-[#27272A] text-xs">
                <button
                  type="button"
                  onClick={() => setDiffMode('files')}
                  className={`px-2.5 py-1 rounded transition ${
                    diffMode === 'files'
                      ? 'bg-[#8B5CF6] text-[#F4F4F5]'
                      : 'text-[#A1A1AA]'
                  }`}
                >
                  Project Files
                </button>
                <button
                  type="button"
                  onClick={() => setDiffMode('custom')}
                  className={`px-2.5 py-1 rounded transition ${
                    diffMode === 'custom'
                      ? 'bg-[#8B5CF6] text-[#F4F4F5]'
                      : 'text-[#A1A1AA]'
                  }`}
                >
                  Custom Snippets
                </button>
              </div>
            </div>

            {diffMode === 'files' ? (
              <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="block text-[11px] text-[#71717A] mb-1">
                    Original File
                  </label>
                  <select
                    value={baseFileId}
                    onChange={(e) => setBaseFileId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5]"
                  >
                    {files.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.path}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1 flex justify-center pb-2 text-[#71717A]">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div className="md:col-span-5">
                  <label className="block text-[11px] text-[#71717A] mb-1">
                    Modified File
                  </label>
                  <select
                    value={targetFileId}
                    onChange={(e) => setTargetFileId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5]"
                  >
                    {files.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.path}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <textarea
                  rows={5}
                  value={customBaseCode}
                  onChange={(e) => setCustomBaseCode(e.target.value)}
                  className="w-full p-3 rounded bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5]"
                />
                <textarea
                  rows={5}
                  value={customTargetCode}
                  onChange={(e) => setCustomTargetCode(e.target.value)}
                  className="w-full p-3 rounded bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5]"
                />
              </div>
            )}

            <Button
              variant="primary"
              size="sm"
              disabled={diffLoading}
              leftIcon={
                diffLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <GitCompare className="w-3.5 h-3.5" />
                )
              }
              onClick={handleRunDiff}
            >
              Run Diff Review →
            </Button>
          </div>

          {diffResult && (
            <div className="space-y-3">
              <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded bg-[#22C55E]/15 text-[#22C55E]">
                    +{diffResult.stats.additions}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444]">
                    -{diffResult.stats.deletions}
                  </span>
                  <span className="text-[#A1A1AA]">
                    {diffResult.baseLabel} → {diffResult.targetLabel}
                  </span>
                </div>
                <div className="text-xs font-mono">
                  Score: {diffResult.baseScore} → {diffResult.targetScore}{' '}
                  <span
                    className={
                      diffResult.scoreDelta >= 0
                        ? 'text-[#22C55E]'
                        : 'text-[#EF4444]'
                    }
                  >
                    ({diffResult.scoreDelta >= 0 ? `+${diffResult.scoreDelta}` : diffResult.scoreDelta})
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-[#27272A] bg-[#09090B] overflow-hidden max-h-[420px] overflow-y-auto font-mono text-xs leading-6">
                <table className="w-full border-collapse">
                  <tbody>
                    {diffResult.diffLines.map((dl, idx) => (
                      <tr
                        key={idx}
                        className={
                          dl.type === 'added'
                            ? 'bg-[#22C55E]/10 text-[#22C55E]'
                            : dl.type === 'removed'
                              ? 'bg-[#EF4444]/10 text-[#EF4444]'
                              : 'text-[#A1A1AA]'
                        }
                      >
                        <td className="w-10 px-2 text-right select-none text-[#71717A] border-r border-[#27272A]/60">
                          {dl.oldLineNumber ?? ''}
                        </td>
                        <td className="w-10 px-2 text-right select-none text-[#71717A] border-r border-[#27272A]/60">
                          {dl.newLineNumber ?? ''}
                        </td>
                        <td className="w-6 text-center select-none">
                          {dl.type === 'added'
                            ? '+'
                            : dl.type === 'removed'
                              ? '-'
                              : ' '}
                        </td>
                        <td className="px-3 whitespace-pre">{dl.content}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
