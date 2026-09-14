#!/bin/bash
# Démarre (ou arrête) la plateforme ArchiParse via Docker Compose.
#
# Usage:
#   ./run.sh                 # démarre en mode "prod-like" (docker-compose.yml)
#   ./run.sh dev              # démarre en mode développement (hot-reload, docker-compose.dev.yml)
#   ./run.sh alt              # démarre en mode alternatif (frontend sur le port 3001, docker-compose.alt.yml)
#   ./run.sh --build          # force la reconstruction des images avant de démarrer
#   ./run.sh dev --build      # combine un mode et une reconstruction
#   ./run.sh down             # arrête les services du mode par défaut (docker-compose.yml)
#   ./run.sh dev down         # arrête les services du mode dev
#   ./run.sh logs [service]   # suit les logs (tous les services, ou un seul: backend/frontend/postgres/redis)
#   ./run.sh -h | --help      # affiche cette aide

set -e

cd "$(dirname "$0")"

MODE="prod"
ACTION="up"
BUILD_FLAG=""
LOG_SERVICE=""

for arg in "$@"; do
  case "$arg" in
    dev) MODE="dev" ;;
    alt) MODE="alt" ;;
    prod) MODE="prod" ;;
    down|stop) ACTION="down" ;;
    logs) ACTION="logs" ;;
    --build) BUILD_FLAG="--build" ;;
    -h|--help)
      sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      if [ "$ACTION" = "logs" ] && [ -z "$LOG_SERVICE" ]; then
        LOG_SERVICE="$arg"
      fi
      ;;
  esac
done

case "$MODE" in
  dev)  COMPOSE_FILE="docker-compose.dev.yml" ;;
  alt)  COMPOSE_FILE="docker-compose.alt.yml" ;;
  prod) COMPOSE_FILE="docker-compose.yml" ;;
esac

if ! command -v docker &> /dev/null; then
  echo "❌ Docker n'est pas installé ou n'est pas dans le PATH."
  exit 1
fi

if docker compose version &> /dev/null; then
  DC="docker compose"
elif command -v docker-compose &> /dev/null; then
  DC="docker-compose"
else
  echo "❌ Ni 'docker compose' ni 'docker-compose' ne sont disponibles."
  exit 1
fi

echo "📄 Fichier Compose : $COMPOSE_FILE (mode: $MODE)"

if [ "$ACTION" = "down" ]; then
  echo "🛑 Arrêt des services..."
  $DC -f "$COMPOSE_FILE" down
  exit 0
fi

if [ "$ACTION" = "logs" ]; then
  $DC -f "$COMPOSE_FILE" logs -f $LOG_SERVICE
  exit 0
fi

echo "🚀 Démarrage d'ArchiParse..."
$DC -f "$COMPOSE_FILE" up -d $BUILD_FLAG

FRONTEND_PORT=3000
[ "$MODE" = "alt" ] && FRONTEND_PORT=3001

echo "⏳ Attente que le backend soit prêt..."
BACKEND_READY=false
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "" "http://localhost:8000/docs" 2>/dev/null; then
    BACKEND_READY=true
    break
  fi
  sleep 2
done

echo ""
if [ "$BACKEND_READY" = true ]; then
  echo "✅ Backend prêt."
else
  echo "⚠️  Le backend ne répond pas encore après 60s. Vérifiez les logs :"
  echo "    ./run.sh $MODE logs backend"
fi

echo ""
echo "📍 Frontend      : http://localhost:$FRONTEND_PORT"
echo "📍 API           : http://localhost:8000"
echo "📚 Documentation : http://localhost:8000/docs"
echo ""
echo "Identifiants par défaut (dev) : admin@example.com / admin123"
echo "(si absents, créez-les avec: $DC -f $COMPOSE_FILE exec backend python scripts/create_tenant_auto.py)"
echo ""
echo "Voir les logs  : ./run.sh $MODE logs [service]"
echo "Tout arrêter   : ./run.sh $MODE down"
