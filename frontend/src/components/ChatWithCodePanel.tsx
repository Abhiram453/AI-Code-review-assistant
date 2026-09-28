'use client';

import React, { useEffect, useState } from 'react';
import {
  Send,
  Plus,
  Trash2,
  FileCode,
  Sparkles,
  Loader2,
  Cpu,
  Paperclip,
  Copy,
  Check,
} from 'lucide-react';
import { ChatMessageItem, ChatSessionItem, ProjectFileItem } from '@/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Primitives';

interface ChatWithCodePanelProps {
  projectId: string;
  files: ProjectFileItem[];
  selectedProviderId?: string;
  onJumpToFile?: (filePath: string) => void;
}

const STARTER_QUESTIONS = [
  'How does authentication work?',
  'Which file handles database connections?',
  'Where are the SQL injection and N+1 query bugs?',
  'How can we refactor UserDashboard.tsx for better performance?',
];

function RenderMarkdownMessage({ content }: { content: string }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Split by fenced code blocks ```lang ... ```
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-xs leading-relaxed">
      {segments.map((seg, idx) => {
        if (seg.startsWith('```') && seg.endsWith('```')) {
          const lines = seg.slice(3, -3).trim().split(/\r?\n/);
          const firstLine = lines[0] || '';
          const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const lang = hasLang ? firstLine : 'code';
          const codeBody = hasLang ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div
              key={idx}
              className="rounded-md bg-[#09090B] border border-[#27272A] overflow-hidden my-2"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#0F0F12] border-b border-[#27272A] text-[10.5px] font-mono text-[#71717A]">
                <span className="uppercase">{lang}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(codeBody);
                    setCopiedIdx(idx);
                    setTimeout(() => setCopiedIdx(null), 1500);
                  }}
                  className="inline-flex items-center gap-1 text-[#A1A1AA] hover:text-[#F4F4F5]"
                >
                  {copiedIdx === idx ? (
                    <>
                      <Check className="w-3 h-3 text-[#22C55E]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 font-mono text-[11.5px] text-[#F4F4F5] overflow-x-auto">
                {codeBody}
              </pre>
            </div>
          );
        }

        return (
          <div key={idx} className="whitespace-pre-wrap text-[#F4F4F5]">
            {seg}
          </div>
        );
      })}
    </div>
  );
}

export function ChatWithCodePanel({
  projectId,
  files,
  selectedProviderId,
  onJumpToFile,
}: ChatWithCodePanelProps) {
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [question, setQuestion] = useState('');
  const [pinnedFileIds, setPinnedFileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    try {
      const list = await api.listChatSessions(projectId);
      setSessions(list);
      if (list.length > 0 && !activeSessionId) {
        setActiveSessionId(list[0].id);
      } else if (list.length === 0) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setActiveSessionId(null);
    setMessages([]);
    loadSessions();
  }, [projectId]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    api
      .getChatMessages(activeSessionId)
      .then((res) => setMessages(res.messages))
      .catch(() => setMessages([]));
  }, [activeSessionId]);

  const handleAsk = async (customPrompt?: string) => {
    const q = (customPrompt ?? question).trim();
    if (!q || loading) return;
    setLoading(true);
    if (!customPrompt) setQuestion('');

    try {
      const res = await api.askCodeQuestion(projectId, {
        sessionId: activeSessionId || undefined,
        question: q,
        pinnedFileIds,
        providerId: selectedProviderId,
      });
      setActiveSessionId(res.session.id);
      setMessages(res.messages);
      await loadSessions();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleClearConversation = async () => {
    if (activeSessionId) {
      try {
        await api.deleteChatSession(activeSessionId);
      } catch {
        // ignore
      }
    }
    setActiveSessionId(null);
    setMessages([]);
    await loadSessions();
  };

  const togglePinFile = (id: string) => {
    setPinnedFileIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#F4F4F5] tracking-tight">
            Ask your codebase
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Understand your project without digging through every file.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="secondary"
              size="xs"
              leftIcon={<Trash2 className="w-3 h-3" />}
              onClick={handleClearConversation}
            >
              Clear Conversation
            </Button>
          )}
          <Button
            variant="secondary"
            size="xs"
            leftIcon={<Plus className="w-3 h-3" />}
            onClick={() => {
              setActiveSessionId(null);
              setMessages([]);
            }}
          >
            New Thread
          </Button>
        </div>
      </div>

      {/* Two-Panel Layout: Left Project Context (4 cols) + Right Conversation (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Project Context */}
        <div className="lg:col-span-4 space-y-3">
          <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Project Context
              </span>
              <span className="text-[11px] font-mono text-[#A78BFA]">
                {pinnedFileIds.length > 0
                  ? `${pinnedFileIds.length} pinned`
                  : `${files.length} files active`}
              </span>
            </div>

            <div className="text-[11px] text-[#71717A]">
              Files used in context retrieval:
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto">
              {files.map((f) => {
                const isPinned = pinnedFileIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => togglePinFile(f.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono transition ${
                      isPinned
                        ? 'bg-[#8B5CF6]/15 text-[#F4F4F5] border border-[#8B5CF6]/35'
                        : 'bg-[#0F0F12] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#27272A]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 text-[#A78BFA] shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <span className="text-[10px] text-[#71717A] ml-2">
                      {isPinned ? 'Pinned' : 'Auto'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Previous Threads */}
          {sessions.length > 0 && (
            <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Recent Threads
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSessionId(s.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs truncate transition ${
                      activeSessionId === s.id
                        ? 'bg-[#8B5CF6]/15 text-[#F4F4F5]'
                        : 'text-[#A1A1AA] hover:bg-[#18181C]'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Conversation */}
        <div className="lg:col-span-8 rounded-lg border border-[#27272A] bg-[#141418] flex flex-col min-h-[520px] max-h-[660px]">
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-10 h-10 rounded-lg bg-[#0F0F12] border border-[#27272A] flex items-center justify-center mx-auto text-[#A78BFA]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[#F4F4F5]">
                    Ask anything about this project
                  </h3>
                  <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                    CodeLens AI inspects your project files and answers with exact file paths, line numbers, and refactored snippets.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto pt-2">
                  {STARTER_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleAsk(q)}
                      className="p-3 rounded-lg border border-[#27272A] bg-[#0F0F12] hover:border-[#8B5CF6]/50 text-left text-xs text-[#A1A1AA] hover:text-[#F4F4F5] transition"
                    >
                      &ldquo;{q}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-lg p-3.5 ${
                      m.role === 'user'
                        ? 'bg-[#8B5CF6] text-[#F4F4F5]'
                        : 'bg-[#0F0F12] border border-[#27272A] text-[#F4F4F5]'
                    }`}
                  >
                    <RenderMarkdownMessage content={m.content} />

                    {m.role === 'assistant' &&
                      m.referencedFiles &&
                      m.referencedFiles.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#27272A] flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono uppercase text-[#71717A] mr-1">
                            Files used:
                          </span>
                          {m.referencedFiles.map((fp) => (
                            <button
                              key={fp}
                              type="button"
                              onClick={() => onJumpToFile?.(fp)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#141418] hover:bg-[#18181C] border border-[#27272A] text-[10.5px] font-mono text-[#A78BFA]"
                            >
                              <FileCode className="w-3 h-3" />
                              {fp.split('/').pop()}
                            </button>
                          ))}
                          {m.modelUsed && (
                            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-[#71717A]">
                              <Cpu className="w-3 h-3" />
                              {m.modelUsed}
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#A78BFA] font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Synthesizing answer from codebase context...
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="p-3 border-t border-[#27272A] bg-[#0F0F12] flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => {
                if (files[0]) togglePinFile(files[0].id);
              }}
              title="Attach / pin context files"
              className="p-2 rounded-md bg-[#141418] hover:bg-[#18181C] border border-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] transition"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>

            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about this project..."
              className="flex-1 px-3 py-2 rounded-md bg-[#141418] border border-[#27272A] text-xs text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
            />

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading || !question.trim()}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
