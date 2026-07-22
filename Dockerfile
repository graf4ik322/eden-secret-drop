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
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ .
RUN npx tsc && npx drizzle-kit generate --config=drizzle.config.ts && npm prune --production

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
# Migrations (generated at build time)
COPY --from=backend-builder /app/drizzle /app/backend/drizzle

# Bot dist
COPY --from=bot-builder /app/dist /app/bot/dist
COPY --from=bot-builder /app/node_modules /app/bot/node_modules
COPY --from=bot-builder /app/package.json /app/bot/package.json

# Shared modules
COPY shared/ /app/shared/

# nginx config + wrapper script
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY infra/nginx-wrapper.sh /app/infra/nginx-wrapper.sh
RUN chmod +x /app/infra/nginx-wrapper.sh

# Supervisor config
COPY infra/supervisord.conf /etc/supervisor.d/eden.ini

# Uploads directory (FR-10/11)
RUN mkdir -p /app/uploads && chmod 755 /app/uploads

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisor.d/eden.ini"]
