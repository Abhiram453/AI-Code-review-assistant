'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FolderPlus,
  Upload,
  Sparkles,
  FolderGit2,
  History,
  Cpu,
  Settings,
  MessageSquare,
  CornerDownLeft,
} from 'lucide-react';
import { ProjectSummary, ReviewRecord } from '@/types';

export interface CommandItem {
  id: string;
  label: string;
  category: 'Actions' | 'Navigation' | 'Projects' | 'Recent Reviews';
  shortcut?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectSummary[];
  reviews: ReviewRecord[];
  onCreateProject: () => void;
  onUploadCode: () => void;
  onStartReview: () => void;
  onNavigate: (
    section: 'overview' | 'projects' | 'reviews' | 'chat' | 'providers' | 'settings',
  ) => void;
  onOpenProject: (projectId: string) => void;
  onOpenReview: (review: ReviewRecord) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  projects,
  reviews,
  onCreateProject,
  onUploadCode,
  onStartReview,
  onNavigate,
  onOpenProject,
  onOpenReview,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const commands: CommandItem[] = [
    {
      id: 'create-project',
      label: 'Create Project',
      category: 'Actions',
      shortcut: 'C P',
      icon: <FolderPlus className="w-4 h-4 text-[#A78BFA]" />,
      onSelect: () => {
        onClose();
        onCreateProject();
      },
    },
    {
      id: 'upload-code',
      label: 'Upload Code',
      category: 'Actions',
      shortcut: 'U C',
      icon: <Upload className="w-4 h-4 text-[#A78BFA]" />,
      onSelect: () => {
        onClose();
        onUploadCode();
      },
    },
    {
      id: 'start-review',
      label: 'Start Review',
      category: 'Actions',
      shortcut: 'R C',
      icon: <Sparkles className="w-4 h-4 text-[#8B5CF6]" />,
      onSelect: () => {
        onClose();
        onStartReview();
      },
    },
    {
      id: 'search-projects',
      label: 'Search Projects',
      category: 'Navigation',
      shortcut: 'G P',
      icon: <FolderGit2 className="w-4 h-4 text-[#A1A1AA]" />,
      onSelect: () => {
        onClose();
        onNavigate('projects');
      },
    },
    {
      id: 'search-reviews',
      label: 'Search Reviews',
      category: 'Navigation',
      shortcut: 'G R',
      icon: <History className="w-4 h-4 text-[#A1A1AA]" />,
      onSelect: () => {
        onClose();
        onNavigate('reviews');
      },
    },
    {
      id: 'open-chat',
      label: 'Open Chat',
      category: 'Navigation',
      shortcut: 'G M',
      icon: <MessageSquare className="w-4 h-4 text-[#A1A1AA]" />,
      onSelect: () => {
        onClose();
        onNavigate('chat');
      },
    },
    {
      id: 'open-providers',
      label: 'Open AI Providers',
      category: 'Navigation',
      shortcut: 'G A',
      icon: <Cpu className="w-4 h-4 text-[#A1A1AA]" />,
      onSelect: () => {
        onClose();
        onNavigate('providers');
      },
    },
    {
      id: 'open-settings',
      label: 'Open Settings',
      category: 'Navigation',
      shortcut: 'G S',
      icon: <Settings className="w-4 h-4 text-[#A1A1AA]" />,
      onSelect: () => {
        onClose();
        onNavigate('settings');
      },
    },
    ...projects.slice(0, 5).map((p) => ({
      id: `proj-${p.id}`,
      label: `Project: ${p.name}`,
      category: 'Projects' as const,
      shortcut: `${p.fileCount} files`,
      icon: <FolderGit2 className="w-4 h-4 text-[#A78BFA]" />,
      onSelect: () => {
        onClose();
        onOpenProject(p.id);
      },
    })),
    ...reviews.slice(0, 4).map((r) => ({
      id: `rev-${r.id}`,
      label: `Review: ${r.title}`,
      category: 'Recent Reviews' as const,
      shortcut: `${r.overallScore}/100`,
      icon: <History className="w-4 h-4 text-[#3B82F6]" />,
      onSelect: () => {
        onClose();
        onOpenReview(r);
      },
    })),
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) =>
          filtered.length > 0 ? (prev + 1) % filtered.length : 0,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          filtered.length > 0
            ? (prev - 1 + filtered.length) % filtered.length
            : 0,
        );
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].onSelect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, activeIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 bg-black/75 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-xl bg-[#141418] border border-[#27272A] shadow-cl-modal overflow-hidden"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#27272A] bg-[#0F0F12]">
              <Search className="w-4 h-4 text-[#A78BFA] shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search projects, reviews..."
                className="flex-1 bg-transparent text-xs text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none"
              />
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#18181C] text-[#71717A] border border-[#27272A]">
                ESC
              </kbd>
            </div>

            {/* Command List */}
            <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#71717A]">
                  No matching commands or resources found.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const isSelected = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={item.onSelect}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors ${
                        isSelected
                          ? 'bg-[#8B5CF6]/15 text-[#F4F4F5] border border-[#8B5CF6]/35'
                          : 'text-[#A1A1AA] hover:bg-[#18181C] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {item.icon}
                        <span className="font-medium truncate">{item.label}</span>
                        <span className="text-[10px] text-[#71717A]">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.shortcut && (
                          <kbd className="px-1.5 py-0.5 rounded bg-[#0F0F12] border border-[#27272A] font-mono text-[10px] text-[#71717A]">
                            {item.shortcut}
                          </kbd>
                        )}
                        {isSelected && (
                          <CornerDownLeft className="w-3 h-3 text-[#A78BFA]" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2 border-t border-[#27272A] bg-[#0F0F12] flex items-center justify-between text-[11px] text-[#71717A]">
              <div className="flex items-center gap-3">
                <span>
                  <strong className="text-[#A1A1AA] font-mono">↑↓</strong> Navigate
                </span>
                <span>
                  <strong className="text-[#A1A1AA] font-mono">↵</strong> Execute
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#A78BFA]">
                CodeLens Command Bar
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
