import { FileUpload } from '@/components/upload/FileUpload';

export default function UploadPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-primary mb-8">Importer un fichier IFCXML</h1>
      <FileUpload />
    </div>
  );
}





