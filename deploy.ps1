# Script de déploiement pour Archiparse
# Utilisation: .\deploy.ps1

Write-Host "🚀 Déploiement des microservices Archiparse" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Docker est en cours d'exécution
Write-Host "📋 Vérification de Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker détecté: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker n'est pas disponible. Veuillez démarrer Docker Desktop." -ForegroundColor Red
    exit 1
}

# Arrêter les conteneurs existants
Write-Host "`n🛑 Arrêt des conteneurs existants..." -ForegroundColor Yellow
docker compose -f docker-compose.alt.yml down

# Reconstruire les images
Write-Host "`n🔨 Reconstruction des images Docker..." -ForegroundColor Yellow
docker compose -f docker-compose.alt.yml build

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Erreur lors de la reconstruction. Vérifiez les logs ci-dessus." -ForegroundColor Red
    exit 1
}

# Démarrer les services
Write-Host "`n🚀 Démarrage des services..." -ForegroundColor Yellow
docker compose -f docker-compose.alt.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Erreur lors du démarrage. Vérifiez les logs ci-dessus." -ForegroundColor Red
    exit 1
}

# Attendre que les services soient prêts
Write-Host "`n⏳ Attente du démarrage des services (15 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Afficher l'état des services
Write-Host "`n📊 État des services:" -ForegroundColor Cyan
docker compose -f docker-compose.alt.yml ps

# Afficher les logs récents
Write-Host "`n📋 Logs récents du backend:" -ForegroundColor Cyan
docker compose -f docker-compose.alt.yml logs --tail=20 backend

Write-Host "`n📋 Logs récents du frontend:" -ForegroundColor Cyan
docker compose -f docker-compose.alt.yml logs --tail=20 frontend

Write-Host "`n✅ Déploiement terminé !" -ForegroundColor Green
Write-Host "`n🌐 Services disponibles:" -ForegroundColor Cyan
Write-Host "  - Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:3001" -ForegroundColor White
Write-Host "  - PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "  - Redis: localhost:6379" -ForegroundColor White
Write-Host "`n📝 Commandes utiles:" -ForegroundColor Cyan
Write-Host "  - Voir les logs: docker compose -f docker-compose.alt.yml logs -f" -ForegroundColor White
Write-Host "  - Arrêter: docker compose -f docker-compose.alt.yml down" -ForegroundColor White
Write-Host "  - Redémarrer: docker compose -f docker-compose.alt.yml restart" -ForegroundColor White


