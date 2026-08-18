#!/usr/bin/env bash
# Restaura um dump de banco (e opcionalmente os uploads) por cima do banco atual.
# ESTE COMANDO SOBRESCREVE OS DADOS ATUAIS. Uso:
#   /srv/rental-app/scripts/restore.sh /srv/rental-data/backups/db-XXXXXXXX-XXXXXX.dump [uploads-XXXXXXXX-XXXXXX.tar.gz]
set -euo pipefail

APP_DIR="/srv/rental-app"
DATA_DIR="/srv/rental-data"
DB_DUMP="${1:-}"
UPLOADS_TAR="${2:-}"

if [ -z "$DB_DUMP" ] || [ ! -f "$DB_DUMP" ]; then
  echo "Uso: $0 <caminho-do-dump.dump> [uploads.tar.gz]"
  exit 1
fi

cd "$APP_DIR"
# shellcheck disable=SC1091
set -a; source "$APP_DIR/.env"; set +a

echo "############################################################"
echo "# ATENÇÃO: isto vai APAGAR o banco '$POSTGRES_DB' atual"
echo "# e substituí-lo pelo conteúdo de: $DB_DUMP"
if [ -n "$UPLOADS_TAR" ]; then
  echo "# Também vai substituir os uploads em $DATA_DIR/uploads"
fi
echo "############################################################"
read -r -p "Digite exatamente RESTAURAR para confirmar: " CONFIRM
if [ "$CONFIRM" != "RESTAURAR" ]; then
  echo "Cancelado — nada foi alterado."
  exit 1
fi

echo "[restore] fazendo um backup de segurança do estado atual antes de restaurar..."
"$APP_DIR/scripts/backup.sh"

echo "[restore] recriando o banco '$POSTGRES_DB'..."
docker compose exec -T db psql -U "$POSTGRES_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB}_restoring\";"
docker compose exec -T db psql -U "$POSTGRES_USER" -d postgres \
  -c "CREATE DATABASE \"${POSTGRES_DB}_restoring\";"

echo "[restore] restaurando o dump numa base temporária (${POSTGRES_DB}_restoring)..."
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "${POSTGRES_DB}_restoring" --no-owner < "$DB_DUMP"

echo "[restore] dump restaurado com sucesso na base temporária."
echo "[restore] troque o banco em produção manualmente após validar os dados:"
echo "  1) pare a API:      docker compose stop api"
echo "  2) renomeie:        docker compose exec -T db psql -U $POSTGRES_USER -d postgres -c 'ALTER DATABASE \"$POSTGRES_DB\" RENAME TO \"${POSTGRES_DB}_old\";'"
echo "  3) promova:         docker compose exec -T db psql -U $POSTGRES_USER -d postgres -c 'ALTER DATABASE \"${POSTGRES_DB}_restoring\" RENAME TO \"$POSTGRES_DB\";'"
echo "  4) suba a API:      docker compose start api"
echo "Esse passo final é manual e de propósito — evita qualquer script trocar o banco de produção sozinho."

if [ -n "$UPLOADS_TAR" ] && [ -f "$UPLOADS_TAR" ]; then
  echo "[restore] restaurando uploads a partir de $UPLOADS_TAR..."
  tar -xzf "$UPLOADS_TAR" -C "$DATA_DIR"
  echo "[restore] uploads restaurados."
fi
