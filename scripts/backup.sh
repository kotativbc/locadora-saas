#!/usr/bin/env bash
# Backup do banco (pg_dump) e dos uploads privados, com rotação simples.
# Chamado pelo systemd timer rental-backup.timer, ou manualmente:
#   /srv/rental-app/scripts/backup.sh
set -euo pipefail

APP_DIR="/srv/rental-app"
DATA_DIR="/srv/rental-data"
BACKUP_DIR="$DATA_DIR/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RETENTION_DAYS=14

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"

# shellcheck disable=SC1091
set -a; source "$APP_DIR/.env"; set +a

echo "[backup] iniciando backup $TIMESTAMP"

# --- Dump do Postgres (dentro do container, sem expor porta nenhuma) ---
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  > "$BACKUP_DIR/db-$TIMESTAMP.dump"

# --- Uploads privados ---
tar -czf "$BACKUP_DIR/uploads-$TIMESTAMP.tar.gz" -C "$DATA_DIR" uploads

echo "[backup] removendo backups com mais de $RETENTION_DAYS dias"
find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.dump' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -maxdepth 1 -name 'uploads-*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

echo "[backup] concluído: db-$TIMESTAMP.dump, uploads-$TIMESTAMP.tar.gz"
