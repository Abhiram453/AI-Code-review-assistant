'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  Zap,
  Sparkles,
  Check,
  Circle,
  Loader2,
  FileCode,
  Layers,
  CheckSquare,
} from 'lucide-react';
import { AiProviderConfig, ProjectFileItem } from '@/types';
import { Button } from '@/components/ui/Primitives';
import { CodeLensLogo } from '@/components/ui/CodeLensLogo';
import { AnimatedAiReviewOrb } from '@/components/ui/AnimatedIllustrations';

interface ConfigureReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeType: 'file' | 'multiple' | 'project';
  onChangeScopeType: (s: 'file' | 'multiple' | 'project') => void;
  template: 'security' | 'performance' | 'quality' | 'comprehensive';
  onChangeTemplate: (
    t: 'security' | 'performance' | 'quality' | 'comprehensive',
  ) => void;
  providers: AiProviderConfig[];
  selectedProviderId: string;
  onChangeProviderId: (id: string) => void;
  files: ProjectFileItem[];
  activeFile: ProjectFileItem | null;
  selectedFileIds: string[];
  onStartReview: () => void;
}

export function ConfigureReviewModal({
  isOpen,
  onClose,
  scopeType,
  onChangeScopeType,
  template,
  onChangeTemplate,
  providers,
  selectedProviderId,
  onChangeProviderId,
  files,
  activeFile,
  selectedFileIds,
  onStartReview,
}: ConfigureReviewModalProps) {
  const activeProvider =
    providers.find((p) => p.id === selectedProviderId) ||
    providers.find((p) => p.isDefault) ||
    providers[0];

  // Calculate estimated scope (files & lines)
  let scopedFilesCount = files.length;
  let estimatedBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  if (scopeType === 'file') {
    scopedFilesCount = activeFile ? 1 : files.length > 0 ? 1 : 0;
    estimatedBytes = activeFile?.size || files[0]?.size || 0;
  } else if (scopeType === 'multiple') {
    const chosen = files.filter((f) => selectedFileIds.includes(f.id));
    scopedFilesCount = chosen.length || (activeFile ? 1 : 0);
    estimatedBytes =
      chosen.reduce((acc, f) => acc + (f.size || 0), 0) ||
      activeFile?.size ||
      0;
  }

  const estimatedLines = Math.max(
    scopedFilesCount * 12,
    Math.round(estimatedBytes / 34),
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl bg-[#141418] border border-[#27272A] shadow-cl-modal overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A] bg-[#0F0F12]">
              <div>
                <h2 className="text-sm font-semibold text-[#F4F4F5]">
                  Configure AI Review
                </h2>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Select target scope, analysis template, and AI inference model.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#18181C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Review Target */}
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-2">
                  Review Target
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'file',
                      label: 'Current File',
                      sub: activeFile?.name || 'Active file',
                      icon: FileCode,
                    },
                    {
                      id: 'multiple',
                      label: 'Selected Files',
                      sub: `${selectedFileIds.length || 1} selected`,
                      icon: CheckSquare,
                    },
                    {
                      id: 'project',
                      label: 'Entire Project',
                      sub: `${files.length} files`,
                      icon: Layers,
                    },
                  ].map((t) => {
                    const Icon = t.icon;
                    const active = scopeType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onChangeScopeType(t.id as any)}
                        className={`p-3 rounded-lg border text-left transition ${
                          active
                            ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#F4F4F5]'
                            : 'border-[#27272A] bg-[#0F0F12] text-[#A1A1AA] hover:border-[#3F3F46]'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 mb-1.5 ${
                            active ? 'text-[#A78BFA]' : 'text-[#71717A]'
                          }`}
                        />
                        <div className="text-xs font-semibold">{t.label}</div>
                        <div className="text-[10.5px] text-[#71717A] truncate mt-0.5 font-mono">
                          {t.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Review Mode */}
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-2">
                  Review Mode
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: 'security',
                      label: 'Security Review',
                      desc: 'Hardcoded secrets, authentication flaws, input validation, and SQL/XSS injection risks.',
                      icon: Shield,
                      color: 'text-[#EF4444]',
                    },
                    {
                      id: 'performance',
                      label: 'Performance Review',
                      desc: 'Slow operations, N+1 database queries, blocking I/O, and inefficient React rendering.',
                      icon: Zap,
                      color: 'text-[#F59E0B]',
                    },
                    {
                      id: 'quality',
                      label: 'Code Quality Review',
                      desc: 'Naming conventions, modularity, readability, type safety, and maintainability.',
                      icon: Sparkles,
                      color: 'text-[#A78BFA]',
                    },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const active = template === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => onChangeTemplate(mode.id as any)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition ${
                          active
                            ? 'border-[#8B5CF6] bg-[#8B5CF6]/12'
                            : 'border-[#27272A] bg-[#0F0F12] hover:border-[#3F3F46]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${mode.color}`} />
                        <div>
                          <div className="text-xs font-semibold text-[#F4F4F5]">
                            {mode.label}
                          </div>
                          <div className="text-[11px] text-[#A1A1AA] mt-0.5 leading-relaxed">
                            {mode.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI Provider & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                    AI Provider
                  </label>
                  <select
                    value={selectedProviderId}
                    onChange={(e) => onChangeProviderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                    Configured Model
                  </label>
                  <div className="px-3 py-2 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#A78BFA] truncate">
                    {activeProvider?.modelName || 'gpt-4o-mini'}
                  </div>
                </div>
              </div>

              {/* Estimated Scope Footer */}
              <div className="rounded-lg bg-[#0F0F12] border border-[#27272A] px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-[10.5px] uppercase tracking-wider text-[#71717A] font-semibold">
                    Estimated Review Scope
                  </div>
                  <div className="text-xs font-mono text-[#F4F4F5] mt-0.5">
                    {scopedFilesCount} {scopedFilesCount === 1 ? 'file' : 'files'} ·{' '}
                    {estimatedLines.toLocaleString()} lines
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    onClose();
                    onStartReview();
                  }}
                >
                  Run AI Review →
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// --- SECTION 11: AI REVIEW PROCESS SCREEN ---
export function AiReviewProcessModal({
  isOpen,
  activeStepIndex = 2,
}: {
  isOpen: boolean;
  activeStepIndex?: number;
}) {
  const steps = [
    'Reading project files',
    'Building code context',
    'Analyzing patterns',
    'Generating recommendations',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-sm rounded-xl bg-[#141418] border border-[#27272A] shadow-cl-modal p-6 text-center space-y-5"
          >
            <AnimatedAiReviewOrb />

            <div>
              <h3 className="text-sm font-semibold text-[#F4F4F5]">
                AI reviewing your codebase
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Inspecting syntax trees, control flow, and security boundaries...
              </p>
            </div>

            <div className="space-y-2.5 text-left bg-[#0F0F12] border border-[#27272A] rounded-lg p-4">
              {steps.map((label, idx) => {
                const isDone = idx < activeStepIndex;
                const isCurrent = idx === activeStepIndex;
                return (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 text-xs font-mono"
                  >
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#8B5CF6] animate-spin shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                    )}
                    <span
                      className={
                        isDone
                          ? 'text-[#A1A1AA]'
                          : isCurrent
                            ? 'text-[#F4F4F5] font-semibold'
                            : 'text-[#71717A]'
                      }
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
