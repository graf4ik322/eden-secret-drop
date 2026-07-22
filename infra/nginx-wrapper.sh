#!/bin/sh
# nginx wrapper — проверяет NGINX_VERBOSE, генерирует debug-конфиг если нужно
set -e

VERBOSE_CONF=/etc/nginx/conf.d/verbose-logging.conf

if [ "${NGINX_VERBOSE}" = "true" ]; then
  cat > "$VERBOSE_CONF" << 'EOF'
# === Verbose logging (NGINX_VERBOSE=true) ===
log_format extended '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'auth=$http_authorization '
                    'tg_user_id=$http_x_tg_user_id '
                    'upstream=$upstream_addr $upstream_status';

access_log /proc/self/fd/1 extended;
error_log /proc/self/fd/2 warn;
EOF
  echo "[nginx-wrapper] NGINX_VERBOSE=true — verbose logging enabled"
else
  # Удаляем debug-конфиг если был от предыдущего запуска
  rm -f "$VERBOSE_CONF"
fi

exec nginx -g "daemon off;"
