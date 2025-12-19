'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';

interface FolderNode {
  id: string;
  name: string;
  path: string;
  physicalLocation: string | null;
  children: FolderNode[];
}

interface FolderTreeProps {
  folders: FolderNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  level?: number;
}

export function FolderTree({
  folders,
  selectedId,
  onSelect,
  level = 0,
}: FolderTreeProps) {
  return (
    <ul className="space-y-1">
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          selectedId={selectedId}
          onSelect={onSelect}
          level={level}
        />
      ))}
    </ul>
  );
}

function FolderItem({
  folder,
  selectedId,
  onSelect,
  level,
}: {
  folder: FolderNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  level: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedId === folder.id;

  return (
    <li>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
          isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelect(folder.id)}
      >
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-black/10 rounded"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform',
                isOpen && 'rotate-90'
              )}
            />
          </button>
        ) : (
          <span className="w-5" />
        )}

        {isOpen ? (
          <FolderOpen className="h-4 w-4 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 shrink-0" />
        )}

        <span className="text-sm truncate">{folder.name}</span>
      </div>

      {hasChildren && isOpen && (
        <FolderTree
          folders={folder.children}
          selectedId={selectedId}
          onSelect={onSelect}
          level={level + 1}
        />
      )}
    </li>
  );
}

