#!/usr/bin/env bash
# Monitoramento leve: checa disco, RAM/swap, load e certificado HTTPS, e manda
# alerta por e-mail (reaproveita o SMTP já configurado no .env) se algo passar
# do limite. Chamado pelo systemd timer rental-monitor.timer, ou manualmente:
#   /srv/rental-app/scripts/monitor.sh
set -euo pipefail

APP_DIR="/srv/rental-app"
DATA_DIR="/srv/rental-data"
STATE_FILE="$DATA_DIR/monitor-last-alert"
DEBOUNCE_SECONDS=14400 # 4h — não manda e-mail de novo se já alertou recentemente
DOMAIN="rentovix.kotati.com.br"

# Limites — ajuste aqui se quiser mais/menos sensível
DISK_THRESHOLD_PCT=80
MEM_AVAILABLE_MIN_MB=300
SWAP_USED_MAX_PCT=50
LOAD_THRESHOLD=1.5      # com 1 vCPU, acima disso já indica fila
CERT_MIN_DAYS=14

cd "$APP_DIR"
# shellcheck disable=SC1091
set -a; source "$APP_DIR/.env"; set +a

ISSUES=()

# --- Disco ---
DISK_PCT=$(df --output=pcent / | tail -1 | tr -d ' %')
if [ "$DISK_PCT" -ge "$DISK_THRESHOLD_PCT" ]; then
  ISSUES+=("Disco em ${DISK_PCT}% de uso (limite: ${DISK_THRESHOLD_PCT}%)")
fi

# --- RAM disponível ---
MEM_AVAILABLE_MB=$(free -m | awk '/^Mem:/{print $7}')
if [ "$MEM_AVAILABLE_MB" -lt "$MEM_AVAILABLE_MIN_MB" ]; then
  ISSUES+=("Memória disponível em ${MEM_AVAILABLE_MB}MB (mínimo esperado: ${MEM_AVAILABLE_MIN_MB}MB)")
fi

# --- Swap ---
SWAP_TOTAL=$(free -m | awk '/^Swap:/{print $2}')
SWAP_USED=$(free -m | awk '/^Swap:/{print $3}')
if [ "$SWAP_TOTAL" -gt 0 ]; then
  SWAP_PCT=$(( SWAP_USED * 100 / SWAP_TOTAL ))
  if [ "$SWAP_PCT" -ge "$SWAP_USED_MAX_PCT" ]; then
    ISSUES+=("Swap em ${SWAP_PCT}% de uso (${SWAP_USED}MB de ${SWAP_TOTAL}MB) — RAM real está apertada")
  fi
fi

# --- Load average (1 min) ---
LOAD_1MIN=$(awk '{print $1}' /proc/loadavg)
OVER_LOAD=$(awk -v l="$LOAD_1MIN" -v t="$LOAD_THRESHOLD" 'BEGIN{print (l > t) ? 1 : 0}')
if [ "$OVER_LOAD" -eq 1 ]; then
  ISSUES+=("Load average em ${LOAD_1MIN} (limite: ${LOAD_THRESHOLD}, servidor tem 1 vCPU) — requisições podem estar enfileirando")
fi

# --- Certificado HTTPS ---
CERT_END=$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || true)
if [ -n "$CERT_END" ]; then
  CERT_END_EPOCH=$(date -d "$CERT_END" +%s 2>/dev/null || echo 0)
  NOW_EPOCH_TMP=$(date +%s)
  DAYS_LEFT=$(( (CERT_END_EPOCH - NOW_EPOCH_TMP) / 86400 ))
  if [ "$DAYS_LEFT" -lt "$CERT_MIN_DAYS" ]; then
    ISSUES+=("Certificado HTTPS expira em ${DAYS_LEFT} dias — confirme se o Caddy está renovando sozinho")
  fi
else
  ISSUES+=("Não consegui checar o certificado HTTPS de $DOMAIN — confirme manualmente")
fi

# --- Nada de errado? Termina aqui. ---
if [ ${#ISSUES[@]} -eq 0 ]; then
  echo "[monitor] tudo dentro do esperado"
  exit 0
fi

echo "[monitor] ${#ISSUES[@]} problema(s) encontrado(s):"
printf '%s\n' "${ISSUES[@]}"

# --- Debounce: não manda e-mail de novo se já alertou nas últimas N horas ---
NOW_EPOCH=$(date +%s)
if [ -f "$STATE_FILE" ]; then
  LAST_ALERT=$(cat "$STATE_FILE")
  ELAPSED=$(( NOW_EPOCH - LAST_ALERT ))
  if [ "$ELAPSED" -lt "$DEBOUNCE_SECONDS" ]; then
    echo "[monitor] já alertou há $((ELAPSED/60))min — não manda de novo agora (debounce de $((DEBOUNCE_SECONDS/3600))h)"
    exit 0
  fi
fi

# --- Manda e-mail via SMTP, reaproveitando as credenciais do .env ---
if [ -z "${SMTP_HOST:-}" ]; then
  echo "[monitor] SMTP não configurado no .env — alerta só registrado aqui no log, e-mail não enviado"
  exit 0
fi

BODY=$(printf '%s\n' "${ISSUES[@]}")
ALERT_TO="${MONITOR_ALERT_EMAIL:-$SMTP_USER}"

curl --silent --show-error --ssl-reqd \
  --url "smtp://${SMTP_HOST}:${SMTP_PORT:-587}" \
  --mail-from "${SMTP_FROM:-$SMTP_USER}" \
  --mail-rcpt "$ALERT_TO" \
  --user "${SMTP_USER}:${SMTP_PASS}" \
  --upload-file - <<EOF
From: Rentovix Monitor <${SMTP_FROM:-$SMTP_USER}>
To: ${ALERT_TO}
Subject: [Rentovix] Alerta do servidor — ${#ISSUES[@]} ponto(s) de atencao

Encontrado(s) ${#ISSUES[@]} ponto(s) de atencao no servidor:

${BODY}

Verificado em: $(date '+%d/%m/%Y %H:%M:%S')
EOF

echo "$NOW_EPOCH" > "$STATE_FILE"
echo "[monitor] alerta enviado para $ALERT_TO"
