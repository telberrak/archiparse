'use client';

import { useModels } from '@/lib/hooks/useModels';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ModelsPage() {
  const { data: models, isLoading, error } = useModels();

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
      <h1 className="text-3xl font-bold mb-8">Modèles</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <Link
            key={model.id}
            href={`/models/${model.id}`}
            className="p-6 border border-border rounded-lg hover:border-primary transition-colors"
          >
            <h3 className="font-semibold mb-2">
              {model.name || 'Modèle sans nom'}
            </h3>
            {model.statistics && (
              <div className="text-sm text-muted-foreground space-y-1 mb-4">
                <p>Éléments: {model.statistics.elements || 0}</p>
                <p>Espaces: {model.statistics.spaces || 0}</p>
                <p>Niveaux: {model.statistics.storeys || 0}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(model.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}





