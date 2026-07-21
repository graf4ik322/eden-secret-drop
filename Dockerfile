# ============================================
# EDEN Secret Drop — единый образ
# Frontend (nginx) + Backend (Fastify) + Bot (grammY)
# ============================================

# ---- Stage 1: Build frontend ----
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ---- Stage 2: Build backend ----
FROM node:22-alpine AS backend-builder
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ .
RUN npx tsc && npm prune --production

# ---- Stage 3: Build bot ----
FROM node:22-alpine AS bot-builder
WORKDIR /app
COPY bot/package.json bot/package-lock.json ./
RUN npm ci
COPY bot/ .
RUN npx tsc && npm prune --production

# ---- Stage 4: Runtime ----
FROM nginx:alpine
RUN apk add --no-cache nodejs npm supervisor

# Frontend static
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Backend dist
COPY --from=backend-builder /app/dist /app/backend/dist
COPY --from=backend-builder /app/node_modules /app/backend/node_modules
COPY --from=backend-builder /app/package.json /app/backend/package.json

# Bot dist
COPY --from=bot-builder /app/dist /app/bot/dist
COPY --from=bot-builder /app/node_modules /app/bot/node_modules
COPY --from=bot-builder /app/package.json /app/bot/package.json

# Shared modules
COPY shared/ /app/shared/

# nginx config
RUN echo 'server {     listen 80;     root /usr/share/nginx/html;     index index.html;     gzip on;     gzip_types text/plain text/css application/json application/javascript image/svg+xml;     location / {         try_files $uri $uri/ /index.html;         add_header Cache-Control "no-cache, must-revalidate";     }     location /assets/ {         expires 1y;         add_header Cache-Control "public, immutable";     }     location /api/ {         proxy_pass http://127.0.0.1:3001/;         proxy_http_version 1.1;         proxy_set_header Upgrade $http_upgrade;         proxy_set_header Connection "upgrade";         proxy_set_header Host $host;         proxy_set_header X-Real-IP $remote_addr;     }     location /trpc/ {         proxy_pass http://127.0.0.1:3001;         proxy_http_version 1.1;         proxy_set_header Upgrade $http_upgrade;         proxy_set_header Connection "upgrade";         proxy_set_header Host $host;     }     location ~ ^/[0-9]+:.* {         proxy_pass http://127.0.0.1:3002;         proxy_http_version 1.1;         proxy_set_header Host $host;         proxy_set_header X-Real-IP $remote_addr;     }     add_header X-Frame-Options "SAMEORIGIN" always;     add_header X-Content-Type-Options "nosniff" always; }' > /etc/nginx/conf.d/default.conf

# Supervisor config — запускает nginx + backend + bot
RUN mkdir -p /etc/supervisor.d/
RUN echo '[supervisord]' > /etc/supervisor.d/eden.ini &&     echo 'nodaemon=true' >> /etc/supervisor.d/eden.ini &&     echo 'user=root' >> /etc/supervisor.d/eden.ini &&     echo '' >> /etc/supervisor.d/eden.ini &&     echo '[program:nginx]' >> /etc/supervisor.d/eden.ini &&     echo 'command=nginx -g "daemon off;"' >> /etc/supervisor.d/eden.ini &&     echo 'autostart=true' >> /etc/supervisor.d/eden.ini &&     echo 'autorestart=true' >> /etc/supervisor.d/eden.ini &&     echo 'stdout_logfile=/dev/stdout' >> /etc/supervisor.d/eden.ini &&     echo 'stdout_logfile_maxbytes=0' >> /etc/supervisor.d/eden.ini &&     echo '' >> /etc/supervisor.d/eden.ini &&     echo '[program:backend]' >> /etc/supervisor.d/eden.ini &&     echo 'command=sh -c "cd /app/backend && npx drizzle-kit push && node dist/index.js"' >> /etc/supervisor.d/eden.ini &&     echo 'autostart=true' >> /etc/supervisor.d/eden.ini &&     echo 'autorestart=true' >> /etc/supervisor.d/eden.ini &&     echo 'directory=/app/backend' >> /etc/supervisor.d/eden.ini &&     echo 'stdout_logfile=/dev/stdout' >> /etc/supervisor.d/eden.ini &&     echo 'stdout_logfile_maxbytes=0' >> /etc/supervisor.d/eden.ini &&     echo '' >> /etc/supervisor.d/eden.ini &&     echo '[program:bot]' >> /etc/supervisor.d/eden.ini &&     echo 'command=node /app/bot/dist/index.js' >> /etc/supervisor.d/eden.ini &&     echo 'autostart=true' >> /etc/supervisor.d/eden.ini &&     echo 'autorestart=true' >> /etc/supervisor.d/eden.ini &&     echo 'directory=/app/bot' >> /etc/supervisor.d/eden.ini &&     echo 'stdout_logfile=/dev/stdout' >> /etc/supervisor.d/eden.ini &&     echo 'stdout_logfile_maxbytes=0' >> /etc/supervisor.d/eden.ini

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisor.d/eden.ini"]
