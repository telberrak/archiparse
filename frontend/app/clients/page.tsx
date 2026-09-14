'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients, useCreateClient, useDeleteClient } from '@/lib/hooks/useClients';
import { Client } from '@/lib/api';
import { Trash2, Users } from 'lucide-react';

interface FormState {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
}

const emptyForm: FormState = { name: '', contact_name: '', email: '', phone: '', address: '' };

export default function ClientsPage() {
  const { data: clients, isLoading, error } = useClients();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async () => {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Le nom du client est requis');
      return;
    }
    try {
      await createClient.mutateAsync({
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      setForm(emptyForm);
    } catch (err: any) {
      setFormError(err?.message || "Erreur lors de la création du client");
    }
  };

  const handleDelete = async (client: Client, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const warning =
      client.project_count > 0
        ? `« ${client.name} » a ${client.project_count} projet(s). Les supprimer aussi ?`
        : `Supprimer le client « ${client.name} » ?`;
    if (!window.confirm(warning)) return;
    await deleteClient.mutateAsync(client.id);
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Clients</h1>
        <p className="mt-2 text-muted-foreground">
          Gérez les maîtres d'ouvrage pour lesquels vous menez des projets.
        </p>
      </div>

      <div className="bg-background border border-border rounded-lg p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Ajouter un client</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Nom du client"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            placeholder="Contact"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          />
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            placeholder="Téléphone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            placeholder="Adresse"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
        <div className="mt-4">
          <Button onClick={handleCreate} disabled={createClient.isPending}>
            {createClient.isPending ? 'Création…' : 'Ajouter le client'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <p className="text-red-600">Erreur lors du chargement des clients</p>
      ) : !clients || clients.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Aucun client pour le moment</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold text-muted-foreground">Nom</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Contact</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Email</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Téléphone</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Projets</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`} className="font-medium text-foreground hover:text-primary">
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{client.contact_name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{client.email || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{client.phone || '—'}</td>
                  <td className="px-4 py-3 text-right">{client.project_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" onClick={(e) => handleDelete(client, e)}>
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
