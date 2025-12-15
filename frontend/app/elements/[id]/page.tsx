'use client';

import { useParams } from 'next/navigation';
import { useElement } from '@/lib/hooks/useElements';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ElementDetailPage() {
  const params = useParams();
  const elementId = params.id as string;
  const { data: element, isLoading, error } = useElement(elementId);

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  if (error || !element) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Élément non trouvé</p>
        <Link href="/models">
          <Button variant="outline">Retour</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/models">
          <Button variant="ghost" size="sm">← Retour</Button>
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {element.name || element.ifc_type}
          </h1>
          <p className="text-muted-foreground">{element.ifc_type}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-2">Informations</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">GUID:</span>{' '}
                  <code className="text-xs">{element.guid}</code>
                </p>
                {element.description && (
                  <p>
                    <span className="text-muted-foreground">Description:</span>{' '}
                    {element.description}
                  </p>
                )}
                {element.tag && (
                  <p>
                    <span className="text-muted-foreground">Tag:</span> {element.tag}
                  </p>
                )}
              </div>
            </div>

            {element.properties && (
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-semibold mb-2">Propriétés</h3>
                <pre className="text-xs overflow-auto max-h-64 bg-muted p-2 rounded">
                  {JSON.stringify(element.properties, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {element.quantities && (
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-semibold mb-2">Quantités</h3>
                <pre className="text-xs overflow-auto max-h-64 bg-muted p-2 rounded">
                  {JSON.stringify(element.quantities, null, 2)}
                </pre>
              </div>
            )}

            {element.attributes && (
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-semibold mb-2">Attributs</h3>
                <pre className="text-xs overflow-auto max-h-64 bg-muted p-2 rounded">
                  {JSON.stringify(element.attributes, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}





