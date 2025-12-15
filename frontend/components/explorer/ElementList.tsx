'use client';

import Link from 'next/link';
import { Element } from '@/lib/api';

interface ElementListProps {
  elements: Element[];
}

export function ElementList({ elements }: ElementListProps) {
  if (elements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun élément trouvé
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Nom</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Tag</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">GUID</th>
          </tr>
        </thead>
        <tbody>
          {elements.map((element) => (
            <tr
              key={element.id}
              className="border-t border-border hover:bg-muted/50"
            >
              <td className="px-4 py-3 text-sm">{element.ifc_type}</td>
              <td className="px-4 py-3 text-sm">
                <Link
                  href={`/elements/${element.id}`}
                  className="text-primary hover:underline"
                >
                  {element.name || '-'}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm">{element.tag || '-'}</td>
              <td className="px-4 py-3 text-sm font-mono text-xs">
                {element.guid.substring(0, 8)}...
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}





