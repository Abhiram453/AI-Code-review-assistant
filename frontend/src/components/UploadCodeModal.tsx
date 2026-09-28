'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  FileArchive,
  Github,
  FileCode2,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Primitives';

interface UploadCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onUploaded: () => Promise<void>;
}

type UploadStage = 'idle' | 'uploading' | 'extracted' | 'indexed' | 'done';

export function UploadCodeModal({
  isOpen,
  onClose,
  projectId,
  onUploaded,
}: UploadCodeModalProps) {
  const [activeTab, setActiveTab] = useState<'zip' | 'dnd' | 'github' | 'paste'>('zip');
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number>(0);

  // GitHub import
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');

  // Paste code
  const [customPath, setCustomPath] = useState('src/services/token-validator.ts');
  const [customContent, setCustomContent] = useState(
    `export function verifySessionToken(rawToken: string, secret = "hardcoded_jwt_signing_key_001") {\n  const sql = \`SELECT * FROM sessions WHERE token = '\${rawToken}'\`;\n  return { sql, secret };\n}\n`,
  );

  if (!isOpen) return null;

  const runStagedProgress = async (action: () => Promise<{ importedCount: number }>) => {
    setError(null);
    setStage('uploading');
    setProgress(28);

    const t1 = setTimeout(() => {
      setProgress(64);
      setStage('extracted');
    }, 280);

    const t2 = setTimeout(() => {
      setProgress(88);
      setStage('indexed');
    }, 560);

    try {
      const res = await action();
      clearTimeout(t1);
      clearTimeout(t2);
      setImportedCount(res.importedCount);
      setProgress(100);
      setStage('done');
      await onUploaded();
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setStage('idle');
      setProgress(0);
      setError(
        err?.message || 'That archive contains unsupported or unsafe files.',
      );
    }
  };

  const handleZipOrFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    await runStagedProgress(async () => {
      if (
        fileList.length === 1 &&
        fileList[0].name.toLowerCase().endsWith('.zip')
      ) {
        if (fileList[0].size > 50 * 1024 * 1024) {
          throw new Error('ZIP archive exceeds the 50 MB size limit.');
        }
        return api.uploadZipArchive(projectId, fileList[0]);
      }

      const items: Array<{ path: string; content: string }> = [];
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const relPath = (f as any).webkitRelativePath || f.name;
        const text = await f.text();
        items.push({ path: relPath, content: text });
      }
      return api.uploadFilesBatch(projectId, items);
    });
  };

  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runStagedProgress(() =>
      api.importGithubRepo(projectId, {
        repoUrl: repoUrl.trim(),
        branch: branch.trim() || undefined,
      }),
    );
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runStagedProgress(() =>
      api.uploadFilesBatch(projectId, [
        { path: customPath.trim(), content: customContent },
      ]),
    );
  };

  const resetAndClose = () => {
    setStage('idle');
    setProgress(0);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[2px] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 6 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-xl rounded-xl border border-[#27272A] bg-[#141418] shadow-cl-modal overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A] bg-[#0F0F12]">
            <div>
              <h2 className="text-sm font-semibold text-[#F4F4F5]">
                Upload Codebase
              </h2>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Import a project ZIP archive, source files, or a public GitHub repository.
              </p>
            </div>
            <button
              onClick={resetAndClose}
              className="p-1 rounded-md text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#18181C] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-4 border-b border-[#27272A] bg-[#0F0F12]/60 text-xs font-medium">
            {[
              { id: 'zip', label: 'ZIP Archive', icon: FileArchive },
              { id: 'dnd', label: 'Source Files', icon: Upload },
              { id: 'github', label: 'GitHub URL', icon: Github },
              { id: 'paste', label: 'New File', icon: FileCode2 },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(t.id as any);
                    setError(null);
                    setStage('idle');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 border-b-2 transition-colors ${
                    active
                      ? 'border-[#8B5CF6] text-[#F4F4F5] bg-[#8B5CF6]/10'
                      : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {stage !== 'idle' ? (
              <div className="rounded-lg border border-[#27272A] bg-[#0F0F12] p-6 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#F4F4F5]">
                    {stage === 'done'
                      ? `Indexed ${importedCount} source file(s)`
                      : 'Uploading project...'}
                  </span>
                  <span className="font-mono text-[#A78BFA]">{progress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-[#18181C] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.2 }}
                    className="h-full bg-[#8B5CF6]"
                  />
                </div>

                {/* 3-Step Pipeline Status */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                  {[
                    {
                      label: 'Uploaded',
                      done:
                        stage === 'uploading' ||
                        stage === 'extracted' ||
                        stage === 'indexed' ||
                        stage === 'done',
                    },
                    {
                      label: 'Extracted',
                      done:
                        stage === 'extracted' ||
                        stage === 'indexed' ||
                        stage === 'done',
                    },
                    {
                      label: 'Indexed',
                      done: stage === 'indexed' || stage === 'done',
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                        s.done
                          ? 'border-[#22C55E]/30 bg-[#22C55E]/10 text-[#F4F4F5]'
                          : 'border-[#27272A] bg-[#141418] text-[#71717A]'
                      }`}
                    >
                      {s.done ? (
                        <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#71717A]" />
                      )}
                      <span className="font-medium">{s.label}</span>
                    </div>
                  ))}
                </div>

                {stage === 'done' && (
                  <div className="flex justify-end pt-2">
                    <Button variant="primary" size="sm" onClick={resetAndClose}>
                      Open in Code Explorer →
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {(activeTab === 'zip' || activeTab === 'dnd') && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      handleZipOrFiles(e.dataTransfer.files);
                    }}
                    className={`rounded-lg border border-dashed p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                        : 'border-[#27272A] bg-[#0F0F12] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#141418] border border-[#27272A] flex items-center justify-center mx-auto mb-3 text-[#A78BFA]">
                      {activeTab === 'zip' ? (
                        <FileArchive className="w-5 h-5" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#F4F4F5]">
                      {activeTab === 'zip'
                        ? 'Drop your project ZIP here'
                        : 'Drop source files here'}
                    </p>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      or click to browse
                    </p>
                    <p className="text-[11px] font-mono text-[#71717A] mt-1.5 mb-4">
                      {activeTab === 'zip'
                        ? 'ZIP files up to 50 MB · Ignores node_modules & .git'
                        : 'Supports .ts, .tsx, .js, .py, .go, .rs, .sql, .json, .md'}
                    </p>

                    <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-medium text-[#F4F4F5] cursor-pointer transition">
                      <span>
                        {activeTab === 'zip' ? 'Browse ZIP Archive' : 'Browse Files'}
                      </span>
                      <input
                        type="file"
                        multiple={activeTab === 'dnd'}
                        accept={activeTab === 'zip' ? '.zip,application/zip' : undefined}
                        onChange={(e) => handleZipOrFiles(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {activeTab === 'github' && (
                  <form onSubmit={handleGithubSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                        GitHub Repository URL
                      </label>
                      <input
                        type="url"
                        required
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/owner/repository"
                        className="w-full px-3 py-2 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                        Branch (Optional)
                      </label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                        className="w-full px-3 py-2 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button type="submit" variant="primary" size="sm">
                        Import Repository →
                      </Button>
                    </div>
                  </form>
                )}

                {activeTab === 'paste' && (
                  <form onSubmit={handlePasteSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                        Relative File Path
                      </label>
                      <input
                        type="text"
                        required
                        value={customPath}
                        onChange={(e) => setCustomPath(e.target.value)}
                        className="w-full px-3 py-2 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                        Source Code
                      </label>
                      <textarea
                        rows={7}
                        required
                        value={customContent}
                        onChange={(e) => setCustomContent(e.target.value)}
                        className="w-full p-3 rounded-md bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" variant="primary" size="sm">
                        Save File to Project →
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}

            {error && (
              <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[#F4F4F5]">
                    ZIP validation error
                  </div>
                  <div className="text-[#A1A1AA] mt-0.5">{error}</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
