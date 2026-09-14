'use client';

import { useParams } from 'next/navigation';
import { useModel, useStoreys } from '@/lib/hooks/useModels';
import { useElements } from '@/lib/hooks/useElements';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { IfcExplorer } from '@/components/explorer/IfcExplorer';

export default function ModelDetailPage() {
  const params = useParams();
  const modelId = params.id as string;
  const { data: model, isLoading: modelLoading } = useModel(modelId);
  const { data: storeys } = useStoreys(modelId);
  const { data: elementsData, isLoading: elementsLoading } = useElements(modelId, 1, 2000);

  if (modelLoading || elementsLoading) {
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
    <IfcExplorer
      model={model}
      elements={elementsData?.elements || []}
      storeys={storeys || []}
    />
  );
}
