'use client';

import { useParams } from 'next/navigation';
import { useJob } from '@/lib/hooks/useJobs';
import { JobStatus } from '@/components/jobs/JobStatus';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, RefreshCw, FileText, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useMemo } from 'react';

const STATUS_PROGRESS: Record<string, number> = {
  EN_ATTENTE: 0,
  VALIDATION: 20,
  VALIDE: 30,
  PARSING: 50,
  TRANSFORMATION: 80,
  TERMINE: 100,
  ECHOUE: 0,
};

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const { data: job, isLoading, error, refetch } = useJob(jobId);

  const progress = useMemo(() => {
    if (!job) return 0;
    return STATUS_PROGRESS[job.status] || 0;
  }, [job]);

  const isActive = useMemo(() => {
    if (!job) return false;
    return !['TERMINE', 'ECHOUE'].includes(job.status);
  }, [job]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TERMINE':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'ECHOUE':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-blue-600" />;
    }
  };

  if (isLoading && !job) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Erreur lors du chargement de la tâche</p>
        <div className="flex gap-2 justify-center">
          <Link href="/jobs">
            <Button variant="outline">Retour à la liste</Button>
          </Link>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/jobs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* En-tête avec statut */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{job.filename}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                <JobStatus status={job.status} />
                {job.ifc_version && (
                  <span className="text-sm text-muted-foreground">
                    Version IFC: {job.ifc_version}
                  </span>
                )}
                {isActive && (
                  <span className="text-sm text-blue-600 flex items-center gap-1">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    En cours...
                  </span>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Barre de progression */}
          {isActive && (
            <div className="mt-4">
              <Progress value={progress} showLabel={true} />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {job.status === 'VALIDATION' && 'Validation du fichier XSD...'}
                {job.status === 'PARSING' && 'Parsing du fichier XML...'}
                {job.status === 'TRANSFORMATION' && 'Transformation en JSON...'}
              </p>
            </div>
          )}
        </div>

        {/* Informations principales */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border border-border rounded-lg bg-card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Informations
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taille:</span>
                <span className="font-medium">{(job.file_size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créé:</span>
                <span className="font-medium">
                  {format(new Date(job.created_at), 'PPpp', { locale: fr })}
                </span>
              </div>
              {job.started_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Démarré:</span>
                  <span className="font-medium">
                    {format(new Date(job.started_at), 'PPpp', { locale: fr })}
                  </span>
                </div>
              )}
              {job.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Terminé:</span>
                  <span className="font-medium">
                    {format(new Date(job.completed_at), 'PPpp', { locale: fr })}
                  </span>
                </div>
              )}
              {job.started_at && job.completed_at && (
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Durée:</span>
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(job.completed_at), {
                      addSuffix: false,
                      locale: fr,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Métadonnées */}
          {job.metadata && Object.keys(job.metadata).length > 0 && (
            <div className="p-4 border border-border rounded-lg bg-card">
              <h3 className="font-semibold mb-3">Métadonnées</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(job.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="font-medium text-right max-w-[60%] truncate" title={String(value)}>
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Erreurs */}
        {job.error_message && (
          <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
            <h3 className="font-semibold mb-2 text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Erreur
            </h3>
            <div className="text-sm text-red-600 dark:text-red-400">
              <pre className="whitespace-pre-wrap font-sans">{job.error_message}</pre>
            </div>
          </div>
        )}

        {/* Erreurs de validation */}
        {job.validation_errors && job.validation_errors.length > 0 && (
          <div className="p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Erreurs de validation ({job.validation_errors.length})
            </h3>
            <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
              {job.validation_errors.map((error: any, index: number) => (
                <div
                  key={index}
                  className="p-2 bg-white dark:bg-gray-800 rounded border border-yellow-200 dark:border-yellow-700"
                >
                  <div className="font-medium text-yellow-800 dark:text-yellow-300">
                    Ligne {error.line || error.line_number || 'N/A'}
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {error.message || error.error || JSON.stringify(error)}
                  </div>
                  {error.element && (
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      Élément: {error.element}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          {job.status === 'TERMINE' && (
            <Link href="/models">
              <Button>
                <CheckCircle className="w-4 h-4 mr-2" />
                Voir le modèle
              </Button>
            </Link>
          )}
          {job.status === 'ECHOUE' && (
            <Link href="/upload">
              <Button variant="outline">
                Réessayer l'upload
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
