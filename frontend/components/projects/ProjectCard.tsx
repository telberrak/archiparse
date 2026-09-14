'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FolderKanban, Boxes } from 'lucide-react';
import { Project } from '@/lib/api';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col p-5 bg-background border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
          <FolderKanban className="h-[18px] w-[18px]" strokeWidth={2} />
        </div>
      </div>

      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
        {project.name}
      </h3>

      {project.description && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
      )}

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: fr })}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Boxes className="h-3.5 w-3.5" />
          {project.model_count} modèle{project.model_count > 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );
}
