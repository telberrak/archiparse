'use client';

import { useState, useMemo } from 'react';
import { useJobs } from '@/lib/hooks/useJobs';
import { JobStatus } from './JobStatus';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'VALIDATION', label: 'Validation' },
  { value: 'PARSING', label: 'Parsing' },
  { value: 'TRANSFORMATION', label: 'Transformation' },
  { value: 'TERMINE', label: 'Terminé' },
  { value: 'ECHOUE', label: 'Échoué' },
];

export function JobList() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'filename' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pour l'instant, on récupère toutes les données et on fait le tri/recherche côté client
  // car le backend ne supporte pas encore ces fonctionnalités
  const { data, isLoading, error } = useJobs(1, 1000, { status: statusFilter || undefined });

  // Filtrage et tri côté client
  const filteredAndSortedJobs = useMemo(() => {
    if (!data?.jobs) return [];
    
    let jobs = [...data.jobs];
    
    // Recherche par nom de fichier
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      jobs = jobs.filter((job) => job.filename.toLowerCase().includes(query));
    }
    
    // Tri
    jobs.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'filename':
          comparison = a.filename.localeCompare(b.filename);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'created_at':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return jobs;
  }, [data?.jobs, searchQuery, sortBy, sortOrder]);

  // Pagination côté client
  const paginatedJobs = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredAndSortedJobs.slice(start, end);
  }, [filteredAndSortedJobs, page, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedJobs.length / pageSize);

  const formatDateTime = (value: string | null, fallback: string = '-') => {
    if (!value) return fallback;
    return new Date(value).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const formatFileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

  if (isLoading && !data) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Erreur lors du chargement des tâches</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Rechercher par nom de fichier..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-48"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          value={`${sortBy}_${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('_');
            setSortBy(field as 'created_at' | 'filename' | 'status');
            setSortOrder(order as 'asc' | 'desc');
            setPage(1);
          }}
          className="w-full sm:w-48"
        >
          <option value="created_at_desc">Plus récent</option>
          <option value="created_at_asc">Plus ancien</option>
          <option value="filename_asc">Nom (A-Z)</option>
          <option value="filename_desc">Nom (Z-A)</option>
          <option value="status_asc">Statut (A-Z)</option>
          <option value="status_desc">Statut (Z-A)</option>
        </Select>
      </div>

      {/* Liste des jobs */}
      {!data || filteredAndSortedJobs.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <p className="text-muted-foreground mb-2">
            {searchQuery || statusFilter
              ? 'Aucune tâche ne correspond aux filtres'
              : 'Aucune tâche trouvée'}
          </p>
          {!searchQuery && !statusFilter && (
            <Link href="/upload">
              <Button variant="outline" className="mt-4">
                Uploader un fichier
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground mb-4">
            {filteredAndSortedJobs.length} tâche{filteredAndSortedJobs.length > 1 ? 's' : ''} trouvée{filteredAndSortedJobs.length > 1 ? 's' : ''}
            {data.total > filteredAndSortedJobs.length && ` (${data.total} au total)`}
          </div>
          <div className="overflow-x-auto border border-border rounded-lg bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Nom de fichier</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Version</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Taille</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Date d'exécution</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Date de fin</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Description d'erreur</th>
                </tr>
              </thead>
              <tbody>
                {paginatedJobs.map((job) => (
                  <tr key={job.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${job.id}`} className="font-medium hover:underline" title={job.filename}>
                        {job.filename}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{job.ifc_version || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatFileSize(job.file_size)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(job.started_at || job.created_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(job.completed_at, job.status === 'TERMINE' || job.status === 'ECHOUE' ? '-' : 'En cours')}
                    </td>
                    <td className="px-4 py-3">
                      <JobStatus status={job.status} />
                    </td>
                    <td className="px-4 py-3">
                      {job.error_message ? (
                        <span className="text-red-600 line-clamp-2" title={job.error_message}>
                          {job.error_message}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} sur {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
