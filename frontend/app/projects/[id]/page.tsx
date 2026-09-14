'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProject, useUpdateProject, useDeleteProject } from '@/lib/hooks/useProjects';
import { useModels } from '@/lib/hooks/useModels';
import { ModelCard } from '@/components/models/ModelCard';
import { ArrowLeft, Boxes, Pencil, Trash2 } from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { data: project, isLoading, error } = useProject(projectId);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { data: models, isLoading: modelsLoading } = useModels(1, 100, projectId);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (project && !editing) {
      setName(project.name);
      setDescription(project.description || '');
    }
  }, [project, editing]);

  const handleSave = async () => {
    if (!name.trim()) {
      setFormError('Le nom du projet est requis');
      return;
    }
    setFormError(null);
    try {
      await updateProject.mutateAsync({
        projectId,
        project: { name: name.trim(), description: description.trim() || undefined },
      });
      setEditing(false);
    } catch (err: any) {
      setFormError(err?.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    const warning =
      project.model_count > 0
        ? `« ${project.name} » a ${project.model_count} modèle(s). Ils resteront mais ne seront plus rattachés à ce projet. Continuer ?`
        : `Supprimer le projet « ${project.name} » ?`;
    if (!window.confirm(warning)) return;
    await deleteProject.mutateAsync(projectId);
    router.push('/projects');
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !project) {
    return <p className="text-red-600">Erreur lors du chargement du projet</p>;
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-4 h-4" />
          Retour aux projets
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{project.name}</h1>
        {project.client_name && (
          <p className="mt-2 text-muted-foreground">
            Client :{' '}
            <Link href={`/clients/${project.client_id}`} className="text-primary hover:underline">
              {project.client_name}
            </Link>
          </p>
        )}
      </div>

      <div className="bg-background border border-border rounded-lg p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Informations</h2>
          {!editing && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Modifier
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="Nom du projet" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={updateProject.isPending}>
                {updateProject.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setName(project.name);
                  setDescription(project.description || '');
                  setFormError(null);
                  setEditing(false);
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground">{project.description || <span className="text-muted-foreground">Aucune description</span>}</p>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Modèles ({project.model_count})</h2>
        <Link href="/upload">
          <Button size="sm" variant="outline">
            Importer un modèle
          </Button>
        </Link>
      </div>

      {modelsLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : !models || models.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <Boxes className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Aucun modèle dans ce projet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      )}
    </div>
  );
}
