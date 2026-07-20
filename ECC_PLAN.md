# ECC Plan: EDEN Secret Drop — Telegram Mini App

## ECC Declaration
Работаю в ECC pipeline. Plan → Code Review → Syntax Check → Frontend Build → Docker Verify → Integration Test → Push.

## Project Structure
```
/root/eden-secret-drop/
├── frontend/     # Vite + React 18 + TS + Tailwind v4 (Telegram Mini App) — BUILD OK
├── backend/      # Fastify + tRPC + Drizzle ORM + PostgreSQL — TS OK
├── bot/          # grammY webhook bot — TS OK
├── shared/       # Auth (initData validation) + Post template
└── infra/        # Docker, CI/CD, deployment configs
```

## Phases

### ✅ Phase 0: Foundation
- Template clone, TON Connect removed, deps installed
- Tailwind v4 + design tokens + background recipe
- Space Grotesk font, animations, SDK init, routing

### ✅ Phase 1: Design System
- Button (3 variants: primary/secondary/ghost)
- GlassCard, StatusDot (5 states), Chip, Badge (3 variants), Input, Toggle, Modal

### ✅ Phase 2: Backend API + DB
- PostgreSQL schema (drops with status enum, categories tree, subscribers, admins, drop_counter)
- Fastify server + tRPC router
- Endpoints: drops CRUD, categories, health
- Drizzle ORM configuration

### ✅ Phase 3: User Mode Frontend
- Home: Header, Hero, Drop Counter, Category Chips, Featured Drop, Latest Drops, Floating Nav
- Drop Detail: Hero image, Title/Price, Trust Strip, Specs, Seller Note, Drop Info, Delivery, Sticky Buy Now (deeplink)

### ✅ Phase 4: Drop Studio (Admin)
- Header with "+ Drop" button
- Analytics cards (Active/Sold/Revenue/Views)
- Search + Filter pills (All/Active/Draft/Sold/Archived)
- Drops list with edit/share/archive actions
- Bottom navigation (Home/Drops/Add/Analytics/Profile)

### 🔄 Phase 5: Bot + Auth (95%)
- grammY bot with webhook mode
- /start command (subscriber registration template)
- /admin command (admin panel link)
- initData validation (HMAC-SHA256)
- Post template renderer
- TODO: BullMQ broadcast queue, subscriber DB integration

### ❌ Phase 6: Infrastructure
- TODO: Docker compose, Dockerfiles
- TODO: CI/CD (GitHub Actions)
- TODO: Deployment configs (Cloudflare Pages, Fly.io/Railway)

## Build Metrics
| Component | Raw | Gzip | Limit | Status |
|-----------|-----|------|-------|--------|
| JS Bundle | 284KB | 89KB | <150KB | ✅ |
| CSS | 29KB | 6.2KB | — | ✅ |
| TypeScript | 0 errors | — | 0 | ✅ |
