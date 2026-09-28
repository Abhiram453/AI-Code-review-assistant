'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  Search,
  CheckSquare,
  Square,
} from 'lucide-react';
import { FileTreeNode, ProjectFileItem } from '@/types';

interface FileTreeExplorerProps {
  tree: FileTreeNode[];
  files?: ProjectFileItem[];
  activeFileId: string | null;
  selectedFileIds: string[];
  onSelectFile: (fileId: string) => void;
  onToggleCheckFile: (fileId: string) => void;
}

function getFileIcon(name: string, active: boolean) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.json')) {
    return (
      <FileJson
        className={`w-3.5 h-3.5 shrink-0 ${
          active ? 'text-[#A78BFA]' : 'text-[#F59E0B]/80'
        }`}
      />
    );
  }
  if (lower.endsWith('.md')) {
    return (
      <FileText
        className={`w-3.5 h-3.5 shrink-0 ${
          active ? 'text-[#A78BFA]' : 'text-[#A1A1AA]'
        }`}
      />
    );
  }
  return (
    <FileCode
      className={`w-3.5 h-3.5 shrink-0 ${
        active ? 'text-[#A78BFA]' : 'text-[#3B82F6]/85'
      }`}
    />
  );
}

export function FileTreeExplorer({
  tree,
  files = [],
  activeFileId,
  selectedFileIds,
  onSelectFile,
  onToggleCheckFile,
}: FileTreeExplorerProps) {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const filteredFlatFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q),
    );
  }, [files, searchQuery]);

  const renderNode = (node: FileTreeNode, depth = 0): React.ReactNode => {
    if (node.type === 'folder') {
      const isCollapsed = Boolean(collapsedFolders[node.path]);
      return (
        <div key={node.path}>
          <button
            type="button"
            onClick={() => toggleFolder(node.path)}
            className="w-full flex items-center gap-1.5 py-1 px-2 rounded text-xs text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181C] transition-colors text-left"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
            )}
            {isCollapsed ? (
              <Folder className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
            )}
            <span className="font-medium truncate">{node.name}</span>
          </button>
          {!isCollapsed && node.children && (
            <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
          )}
        </div>
      );
    }

    const fileId = node.fileId || '';
    const isActive = activeFileId === fileId;
    const isChecked = selectedFileIds.includes(fileId);

    return (
      <div
        key={node.path}
        className={`group flex items-center justify-between py-1 px-2 rounded text-xs transition-colors ${
          isActive
            ? 'bg-[#8B5CF6]/15 text-[#F4F4F5] border-l-2 border-[#8B5CF6]'
            : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#18181C]'
        }`}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        <button
          type="button"
          onClick={() => onSelectFile(fileId)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {getFileIcon(node.name, isActive)}
          <span className="truncate font-mono text-[11.5px]">{node.name}</span>
        </button>

        <button
          type="button"
          title="Include in multi-file review"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCheckFile(fileId);
          }}
          className="text-[#71717A] hover:text-[#A78BFA] transition p-0.5 ml-1.5 shrink-0"
        >
          {isChecked ? (
            <CheckSquare className="w-3.5 h-3.5 text-[#8B5CF6]" />
          ) : (
            <Square className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search files input inside explorer */}
      <div className="px-2.5 py-2 border-b border-[#27272A]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-7 pr-2.5 py-1 rounded bg-[#09090B] border border-[#27272A] text-[11.5px] text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>
      </div>

      {/* Tree / Search Results */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {!tree || tree.length === 0 ? (
          <div className="p-6 text-xs text-[#71717A] text-center">
            No files indexed yet.
          </div>
        ) : filteredFlatFiles ? (
          filteredFlatFiles.length === 0 ? (
            <div className="p-4 text-xs text-[#71717A] text-center">
              No files match &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredFlatFiles.map((f) => {
              const isActive = activeFileId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onSelectFile(f.id)}
                  className={`w-full flex flex-col px-2.5 py-1.5 rounded text-left transition ${
                    isActive
                      ? 'bg-[#8B5CF6]/15 text-[#F4F4F5]'
                      : 'text-[#A1A1AA] hover:bg-[#18181C]'
                  }`}
                >
                  <span className="text-xs font-mono font-medium truncate">
                    {f.name}
                  </span>
                  <span className="text-[10px] font-mono text-[#71717A] truncate">
                    {f.path}
                  </span>
                </button>
              );
            })
          )
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </div>
    </div>
  );
}
