'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useProjects, useCreateProject, useDeleteProject } from '@/lib/hooks/useProjects';
import { useClients } from '@/lib/hooks/useClients';
import { Project } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trash2, FolderKanban } from 'lucide-react';

export default function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects();
  const { data: clients } = useClients();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Le nom du projet est requis');
      return;
    }
    if (!clientId) {
      setFormError('Choisissez un client');
      return;
    }
    try {
      await createProject.mutateAsync({
        client_id: clientId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
    } catch (err: any) {
      setFormError(err?.message || "Erreur lors de la création du projet");
    }
  };

  const handleDelete = async (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const warning =
      project.model_count > 0
        ? `« ${project.name} » a ${project.model_count} modèle(s). Ils resteront mais ne seront plus rattachés à ce projet. Continuer ?`
        : `Supprimer le projet « ${project.name} » ?`;
    if (!window.confirm(warning)) return;
    await deleteProject.mutateAsync(project.id);
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Projets</h1>
        <p className="mt-2 text-muted-foreground">
          Tous les projets, tous clients confondus.
        </p>
      </div>

      <div className="bg-background border border-border rounded-lg p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Nouveau projet</h2>
        {!clients || clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Créez d'abord un{' '}
            <Link href="/clients" className="text-primary hover:underline">
              client
            </Link>{' '}
            avant de pouvoir créer un projet.
          </p>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Choisir un client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Input placeholder="Nom du projet" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Description (optionnel)" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
            <div className="mt-4">
              <Button onClick={handleCreate} disabled={createProject.isPending}>
                {createProject.isPending ? 'Création…' : 'Ajouter le projet'}
              </Button>
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <p className="text-red-600">Erreur lors du chargement des projets</p>
      ) : !projects || projects.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <FolderKanban className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Aucun projet pour le moment</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold text-muted-foreground">Projet</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Client</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Modèles</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Créé</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${project.id}`} className="font-medium text-foreground hover:text-primary">
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {project.client_name ? (
                      <Link href={`/clients/${project.client_id}`} className="hover:text-primary hover:underline">
                        {project.client_name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{project.model_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: fr })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" onClick={(e) => handleDelete(project, e)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
