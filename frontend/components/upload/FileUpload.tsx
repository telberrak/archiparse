'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { api } from '@/lib/api';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_EXTENSIONS = ['.ifcxml', '.xml'];

interface ValidationError {
  type: 'extension' | 'size' | 'format';
  message: string;
}

export function FileUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<{ name: string; size: number; type: string } | null>(null);

  const validateFile = useCallback((file: File): ValidationError | null => {
    // Vérifier l'extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      return {
        type: 'extension',
        message: `Extension non supportée. Formats acceptés: ${ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }

    // Vérifier la taille
    if (file.size > MAX_FILE_SIZE) {
      return {
        type: 'size',
        message: `Fichier trop volumineux. Taille maximale: ${formatFileSize(MAX_FILE_SIZE)}`,
      };
    }

    // Vérifier que c'est un fichier XML (lecture basique)
    if (!file.type.includes('xml') && !fileName.endsWith('.xml') && !fileName.endsWith('.ifcxml')) {
      return {
        type: 'format',
        message: 'Le fichier ne semble pas être un fichier XML valide',
      };
    }

    return null;
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0];
        const validation = validateFile(droppedFile);
        
        if (validation) {
          setValidationError(validation);
          setError(validation.message);
          setFile(null);
          setPreview(null);
        } else {
          setFile(droppedFile);
          setPreview({
            name: droppedFile.name,
            size: droppedFile.size,
            type: droppedFile.type || 'application/xml',
          });
          setError(null);
          setValidationError(null);
        }
      }
    },
    [validateFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validation = validateFile(selectedFile);
      
      if (validation) {
        setValidationError(validation);
        setError(validation.message);
        setFile(null);
        setPreview(null);
      } else {
        setFile(selectedFile);
        setPreview({
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type || 'application/xml',
        });
        setError(null);
        setValidationError(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Ensure auth is ready before uploading
      const { waitForAuth } = await import('@/components/TenantInitializer');
      await waitForAuth();
      
      // Verify we have both token and tenant_id
      const token = localStorage.getItem('access_token');
      const tenantId = localStorage.getItem('tenant_id');
      
      if (!token || !tenantId) {
        throw new Error('Authentification non disponible. Veuillez rafraîchir la page.');
      }
      
      // Simuler la progression (l'API réelle ne supporte peut-être pas encore le suivi de progression)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await api.uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Attendre un peu pour voir la progression à 100%
      setTimeout(() => {
        router.push(`/jobs/${response.job_id}`);
      }, 500);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'upload");
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setValidationError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
          dragActive
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload"
          className="hidden"
          accept=".ifcxml,.xml,application/xml,text/xml"
          onChange={handleFileSelect}
          disabled={uploading}
        />

        {!file ? (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-lg font-medium text-foreground hover:text-primary transition-colors"
            >
              Cliquez pour sélectionner un fichier
            </label>
            <p className="mt-2 text-sm text-muted-foreground">
              ou glissez-déposez un fichier IFCXML ici
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Formats acceptés: .ifcxml, .xml (max {formatFileSize(MAX_FILE_SIZE)})
            </p>
          </>
        ) : (
          <div className="space-y-4">
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                <div className="space-y-2">
                  <p className="font-medium">{file.name}</p>
                  <Progress value={uploadProgress} showLabel={true} />
                  <p className="text-sm text-muted-foreground">
                    Upload en cours... {uploadProgress}%
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <File className="w-12 h-12 text-primary" />
                    <CheckCircle className="w-6 h-6 text-green-600 absolute -top-1 -right-1 bg-white rounded-full" />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-lg">{file.name}</p>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p>Taille: {formatFileSize(file.size)}</p>
                    <p>Type: {preview?.type || 'application/xml'}</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleRemove}
                    disabled={uploading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Retirer
                  </Button>
                  <Button onClick={handleUpload} disabled={uploading}>
                    <Upload className="w-4 h-4 mr-2" />
                    Uploader
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {validationError?.type === 'extension' && 'Extension non valide'}
                {validationError?.type === 'size' && 'Fichier trop volumineux'}
                {validationError?.type === 'format' && 'Format non valide'}
                {!validationError && 'Erreur'}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Aide */}
      {!file && !error && (
        <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-2">Conseils :</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Assurez-vous que le fichier est au format IFCXML valide</li>
            <li>La taille maximale est de {formatFileSize(MAX_FILE_SIZE)}</li>
            <li>Le fichier sera validé automatiquement après l'upload</li>
          </ul>
        </div>
      )}
    </div>
  );
}
