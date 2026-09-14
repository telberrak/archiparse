'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClient, useUpdateClient, useDeleteClient } from '@/lib/hooks/useClients';
import { useProjects, useCreateProject } from '@/lib/hooks/useProjects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ArrowLeft, FolderKanban, Pencil, Trash2 } from 'lucide-react';

interface FormState {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

const toForm = (c: { name: string; contact_name: string | null; email: string | null; phone: string | null; address: string | null; notes: string | null }): FormState => ({
  name: c.name,
  contact_name: c.contact_name || '',
  email: c.email || '',
  phone: c.phone || '',
  address: c.address || '',
  notes: c.notes || '',
});

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const { data: client, isLoading, error } = useClient(clientId);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { data: projects, isLoading: projectsLoading } = useProjects(clientId);
  const createProject = useCreateProject();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [projectFormError, setProjectFormError] = useState<string | null>(null);

  useEffect(() => {
    if (client && !editing) setForm(toForm(client));
  }, [client, editing]);

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim()) {
      setFormError('Le nom du client est requis');
      return;
    }
    setFormError(null);
    try {
      await updateClient.mutateAsync({
        clientId,
        client: {
          name: form.name.trim(),
          contact_name: form.contact_name.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          notes: form.notes.trim() || undefined,
        },
      });
      setEditing(false);
    } catch (err: any) {
      setFormError(err?.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    const warning =
      client.project_count > 0
        ? `« ${client.name} » a ${client.project_count} projet(s). Les supprimer aussi ?`
        : `Supprimer le client « ${client.name} » ?`;
    if (!window.confirm(warning)) return;
    await deleteClient.mutateAsync(clientId);
    router.push('/clients');
  };

  const handleCreateProject = async () => {
    setProjectFormError(null);
    if (!newProjectName.trim()) {
      setProjectFormError('Le nom du projet est requis');
      return;
    }
    try {
      await createProject.mutateAsync({
        client_id: clientId,
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      });
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (err: any) {
      setProjectFormError(err?.message || "Erreur lors de la création du projet");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !client || !form) {
    return <p className="text-red-600">Erreur lors du chargement du client</p>;
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-4 h-4" />
          Retour aux clients
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{client.name}</h1>
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
              <Input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Contact" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input placeholder="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" />
              <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="sm:col-span-2" />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={updateClient.isPending}>
                {updateClient.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setForm(toForm(client));
                  setFormError(null);
                  setEditing(false);
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <InfoRow label="Contact" value={client.contact_name} />
            <InfoRow label="Email" value={client.email} />
            <InfoRow label="Téléphone" value={client.phone} />
            <InfoRow label="Adresse" value={client.address} />
            {client.notes && <InfoRow label="Notes" value={client.notes} className="sm:col-span-2" />}
          </div>
        )}
      </div>

      <div className="bg-background border border-border rounded-lg p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Nouveau projet</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Nom du projet" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
          <Input placeholder="Description (optionnel)" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} />
        </div>
        {projectFormError && <p className="mt-3 text-sm text-red-600">{projectFormError}</p>}
        <div className="mt-4">
          <Button onClick={handleCreateProject} disabled={createProject.isPending}>
            {createProject.isPending ? 'Création…' : 'Ajouter le projet'}
          </Button>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-foreground mb-4">Projets ({client.project_count})</h2>
      {projectsLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <FolderKanban className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Aucun projet pour ce client</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, className }: { label: string; value: string | null; className?: string }) {
  return (
    <div className={className}>
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground">{value || '—'}</span>
    </div>
  );
}
