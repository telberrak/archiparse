import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Plateforme SaaS IFCXML
        </h1>
        <p className="text-xl text-muted-foreground">
          Upload, validation, parsing et exploration de fichiers IFCXML
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Link
          href="/upload"
          className="p-6 border border-border rounded-lg hover:border-primary transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">📤 Upload</h2>
          <p className="text-muted-foreground">
            Téléversez vos fichiers IFCXML pour traitement
          </p>
        </Link>

        <Link
          href="/jobs"
          className="p-6 border border-border rounded-lg hover:border-primary transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">📋 Tâches</h2>
          <p className="text-muted-foreground">
            Consultez le statut de vos fichiers en traitement
          </p>
        </Link>

        <Link
          href="/models"
          className="p-6 border border-border rounded-lg hover:border-primary transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">🏗️ Modèles</h2>
          <p className="text-muted-foreground">
            Explorez vos modèles IFC parsés
          </p>
        </Link>
      </div>

      <div className="mt-12 p-6 bg-muted rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Fonctionnalités</h2>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
          <li>Validation XSD automatique (IFC2X3 et IFC4)</li>
          <li>Parsing en streaming pour fichiers volumineux</li>
          <li>Transformation XSLT vers JSON normalisé</li>
          <li>Exploration hiérarchique (Project → Site → Building → Storey → Space)</li>
          <li>Recherche et filtrage des éléments</li>
        </ul>
      </div>
    </div>
  );
}





