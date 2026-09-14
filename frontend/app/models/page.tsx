'use client';

import { useModels, useDeleteModel } from '@/lib/hooks/useModels';
import { ModelCard } from '@/components/models/ModelCard';
import { Model } from '@/lib/api';
import Link from 'next/link';

export default function ModelsPage() {
  const { data: models, isLoading, error } = useModels();
  const deleteModel = useDeleteModel();

  const handleDelete = (model: Model) => {
    if (!window.confirm(`Supprimer le modèle « ${model.name || 'sans nom'} » ?`)) return;
    deleteModel.mutate(model.id);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Erreur lors du chargement des modèles
      </div>
    );
  }

  if (!models || models.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">Aucun modèle trouvé</p>
        <Link href="/upload">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Uploader un fichier
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-primary mb-8">Modèles</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <ModelCard key={model.id} model={model} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
