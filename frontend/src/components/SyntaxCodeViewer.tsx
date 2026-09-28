'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  Sparkles,
  MoreHorizontal,
  AlertTriangle,
  WrapText,
} from 'lucide-react';
import { ReviewIssue } from '@/types';
import { Button, SeverityBadge } from '@/components/ui/Primitives';

interface SyntaxCodeViewerProps {
  code: string;
  language: string;
  filePath?: string;
  issuesForFile?: ReviewIssue[];
  highlightLine?: number | null;
  onOpenReviewForFile?: () => void;
}

function highlightCodeLine(line: string): React.ReactNode {
  if (!line) return ' ';
  const trimmed = line.trim();
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*')
  ) {
    return <span className="text-[#71717A] italic">{line}</span>;
  }

  const parts = line.split(
    /('.*?'|".*?"|`.*?`|\b(?:import|export|from|class|interface|type|function|async|await|return|const|let|var|if|else|for|while|new|try|catch|private|public|readonly|def|SELECT|FROM|WHERE|INNER|JOIN|LEFT|GROUP|BY|ORDER|LIMIT|OFFSET|INSERT|UPDATE|DELETE)\b)/g,
  );

  return parts.map((part, idx) => {
    if (!part) return null;
    if (
      (part.startsWith("'") && part.endsWith("'")) ||
      (part.startsWith('"') && part.endsWith('"')) ||
      (part.startsWith('`') && part.endsWith('`'))
    ) {
      return (
        <span key={idx} className="text-[#22C55E]">
          {part}
        </span>
      );
    }
    if (
      /^(import|export|from|class|interface|type|function|async|await|return|const|let|var|if|else|for|while|new|try|catch|private|public|readonly|def|SELECT|FROM|WHERE|INNER|JOIN|LEFT|GROUP|BY|ORDER|LIMIT|OFFSET|INSERT|UPDATE|DELETE)$/.test(
        part,
      )
    ) {
      return (
        <span key={idx} className="text-[#A78BFA] font-medium">
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function SyntaxCodeViewer({
  code,
  language,
  filePath = 'source.ts',
  issuesForFile = [],
  highlightLine = null,
  onOpenReviewForFile,
}: SyntaxCodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const lines = (code || '').split(/\r?\n/);
  const fileName = filePath.split('/').pop() || filePath;

  const issueByLine = new Map<number, ReviewIssue>();
  for (const iss of issuesForFile) {
    if (iss.line && !issueByLine.has(iss.line)) {
      issueByLine.set(iss.line, iss);
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="rounded-lg border border-[#27272A] bg-[#09090B] overflow-hidden flex flex-col h-full">
      {/* Sticky IDE Editor Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-[#0F0F12] border-b border-[#27272A]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xs font-semibold text-[#F4F4F5] font-mono truncate">
            {fileName}
          </span>
          <span className="text-[11px] text-[#71717A] font-mono truncate hidden sm:inline">
            {filePath}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#18181C] border border-[#27272A] text-[#A1A1AA] font-mono uppercase text-[10px]">
            {language}
          </span>
          <span className="text-[11px] font-mono text-[#71717A] hidden md:inline">
            {lines.length} lines
          </span>
          {issuesForFile.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 text-[10.5px] font-mono">
              <AlertTriangle className="w-3 h-3" />
              {issuesForFile.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="secondary"
            size="xs"
            leftIcon={
              copied ? (
                <Check className="w-3 h-3 text-[#22C55E]" />
              ) : (
                <Copy className="w-3 h-3" />
              )
            }
            onClick={handleCopy}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>

          {onOpenReviewForFile && (
            <Button
              variant="primary"
              size="xs"
              leftIcon={<Sparkles className="w-3 h-3" />}
              onClick={onOpenReviewForFile}
            >
              Open Review
            </Button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-md bg-[#18181C] hover:bg-[#222228] border border-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] transition"
              title="More editor options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div
                onMouseLeave={() => setMenuOpen(false)}
                className="absolute right-0 mt-1 w-40 rounded-md bg-[#141418] border border-[#27272A] shadow-cl-modal py-1 z-20 text-xs"
              >
                <button
                  type="button"
                  onClick={() => {
                    setWordWrap((w) => !w);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181C] flex items-center gap-2"
                >
                  <WrapText className="w-3.5 h-3.5" />
                  {wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Code Lines Table */}
      <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[620px] font-mono text-[12px] leading-[22px]">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const lineNumber = idx + 1;
              const lineIssue = issueByLine.get(lineNumber);
              const isHighlighted = highlightLine === lineNumber;

              let rowBg = 'hover:bg-[#141418]/70';
              if (isHighlighted) {
                rowBg = 'bg-[#8B5CF6]/20';
              } else if (lineIssue) {
                rowBg =
                  lineIssue.severity === 'Critical'
                    ? 'bg-[#EF4444]/10 hover:bg-[#EF4444]/15'
                    : 'bg-[#F59E0B]/10 hover:bg-[#F59E0B]/15';
              }

              return (
                <React.Fragment key={lineNumber}>
                  <tr className={`${rowBg} transition-colors`}>
                    <td className="select-none w-12 px-3 text-right text-[#71717A] bg-[#09090B] border-r border-[#27272A]/60 align-top">
                      {lineNumber}
                    </td>
                    <td
                      className={`px-4 text-[#F4F4F5] ${
                        wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                      }`}
                    >
                      {highlightCodeLine(line)}
                    </td>
                  </tr>
                  {lineIssue && (
                    <tr className="bg-[#141418] border-y border-[#27272A]">
                      <td className="border-r border-[#27272A]/60 text-right pr-2.5 text-[#EF4444] font-bold">
                        ●
                      </td>
                      <td className="px-4 py-1.5 text-[11px] flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={lineIssue.severity} size="xs" />
                        <span className="font-sans font-semibold text-[#F4F4F5]">
                          {lineIssue.title}
                        </span>
                        <span className="font-sans text-[#A1A1AA]">
                          — {lineIssue.description}
                        </span>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
