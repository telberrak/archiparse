'use client';

import { clsx } from 'clsx';

interface JobStatusProps {
  status: string;
}

export function JobStatus({ status }: JobStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TERMINE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ECHOUE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'EN_ATTENTE':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'VALIDATION':
      case 'PARSING':
      case 'TRANSFORMATION':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      EN_ATTENTE: 'En attente',
      VALIDATION: 'Validation',
      VALIDE: 'Validé',
      PARSING: 'Parsing',
      TRANSFORMATION: 'Transformation',
      TERMINE: 'Terminé',
      ECHOUE: 'Échoué',
    };
    return labels[status] || status;
  };

  return (
    <span
      className={clsx(
        'px-2 py-1 text-xs font-medium rounded-full',
        getStatusColor(status)
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}





