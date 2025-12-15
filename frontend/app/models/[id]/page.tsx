'use client';

import { useParams } from 'next/navigation';
import { useModel } from '@/lib/hooks/useModels';
import { useElements } from '@/lib/hooks/useElements';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ElementList } from '@/components/explorer/ElementList';

export default function ModelDetailPage() {
  const params = useParams();
  const modelId = params.id as string;
  const { data: model, isLoading: modelLoading } = useModel(modelId);
  const { data: elementsData, isLoading: elementsLoading } = useElements(modelId);

  if (modelLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  if (!model) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Modèle non trouvé</p>
        <Link href="/models">
          <Button variant="outline">Retour</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/models">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">
          {model.name || 'Modèle sans nom'}
        </h1>
        {model.statistics && (
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">Éléments</p>
              <p className="text-2xl font-bold">{model.statistics.elements || 0}</p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">Espaces</p>
              <p className="text-2xl font-bold">{model.statistics.spaces || 0}</p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">Niveaux</p>
              <p className="text-2xl font-bold">{model.statistics.storeys || 0}</p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground">Relations</p>
              <p className="text-2xl font-bold">{model.statistics.relationships || 0}</p>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Éléments</h2>
        {elementsLoading ? (
          <div className="text-center py-8">Chargement des éléments...</div>
        ) : (
          <ElementList elements={elementsData?.elements || []} />
        )}
      </div>
    </div>
  );
}





