'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useClients, useRestoreClient } from '@/lib/hooks/useClients';
import { useProjects, useRestoreProject } from '@/lib/hooks/useProjects';
import { useModels, useRestoreModel } from '@/lib/hooks/useModels';
import { Button } from '@/components/ui/button';
import { Archive, RotateCcw, Users, FolderKanban, Boxes } from 'lucide-react';

export default function ArchivesPage() {
  const { data: clients, isLoading: clientsLoading } = useClients('deleted');
  const { data: projects, isLoading: projectsLoading } = useProjects(undefined, 'deleted');
  const { data: models, isLoading: modelsLoading } = useModels(1, 100, undefined, 'deleted');

  const restoreClient = useRestoreClient();
  const restoreProject = useRestoreProject();
  const restoreModel = useRestoreModel();

  const loading = clientsLoading || projectsLoading || modelsLoading;
  const isEmpty =
    !loading &&
    (clients?.length || 0) === 0 && (projects?.length || 0) === 0 && (models?.length || 0) === 0;

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Archives</h1>
        <p className="mt-2 text-muted-foreground">
          Clients, projets et modèles supprimés. Rien n'est perdu — restaurez ce dont vous avez besoin.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : isEmpty ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <Archive className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Rien dans les archives pour le moment</p>
        </div>
      ) : (
        <div className="space-y-8">
          <ArchiveSection
            title="Clients"
            icon={Users}
            loading={clientsLoading}
            empty={!clients || clients.length === 0}
          >
            {clients && clients.length > 0 && (
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Nom</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Contact</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Supprimé</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-t border-border/60">
                      <td className="px-4 py-3 font-medium">{client.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{client.contact_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {client.updated_at
                          ? formatDistanceToNow(new Date(client.updated_at), { addSuffix: true, locale: fr })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={restoreClient.isPending}
                            onClick={() => restoreClient.mutate(client.id)}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restaurer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ArchiveSection>

          <ArchiveSection
            title="Projets"
            icon={FolderKanban}
            loading={projectsLoading}
            empty={!projects || projects.length === 0}
          >
            {projects && projects.length > 0 && (
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Projet</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Client</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Supprimé</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-t border-border/60">
                      <td className="px-4 py-3 font-medium">{project.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{project.client_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {project.updated_at
                          ? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true, locale: fr })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={restoreProject.isPending}
                            onClick={() => restoreProject.mutate(project.id)}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restaurer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ArchiveSection>

          <ArchiveSection
            title="Modèles"
            icon={Boxes}
            loading={modelsLoading}
            empty={!models || models.length === 0}
          >
            {models && models.length > 0 && (
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Modèle</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Client / Projet</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Supprimé</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr key={model.id} className="border-t border-border/60">
                      <td className="px-4 py-3 font-medium">{model.name || 'Modèle sans nom'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {model.client_name && model.project_name
                          ? `${model.client_name} › ${model.project_name}`
                          : 'Sans projet'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDistanceToNow(new Date(model.created_at), { addSuffix: true, locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={restoreModel.isPending}
                            onClick={() => restoreModel.mutate(model.id)}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restaurer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ArchiveSection>
        </div>
      )}
    </div>
  );
}

function ArchiveSection({
  title,
  icon: Icon,
  loading,
  empty,
  children,
}: {
  title: string;
  icon: typeof Users;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  if (loading || empty) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="overflow-x-auto border border-border rounded-lg bg-card">{children}</div>
    </div>
  );
}
