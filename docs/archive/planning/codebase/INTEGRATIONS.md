# External Integrations

**Analysis Date:** 2025-05-15

## APIs & External Services

**Market Data:**
- Local Data Only - Historical index data (SPY, QQQ, etc.) is bundled as JSON files in `src/data/indices/`.
  - SDK/Client: Direct JSON imports.
  - Auth: None.

## Data Storage

**Databases:**
- RxDB (Reactive Database)
  - Connection: Local IndexedDB via Dexie storage engine.
  - Client: `rxdb` 17.2.0.
  - Encryption: AES encryption via `crypto-js` (configured in `src/db/database.ts`).

**File Storage:**
- Local filesystem only (public assets and source files).

**Caching:**
- Service Worker (Vite PWA)
  - Strategy: `autoUpdate`.
  - Assets: Icons, manifest, and build chunks (handled in `vite.config.ts`).

## Authentication & Identity

**Auth Provider:**
- Custom / Local-only
  - Implementation: Currently uses a hardcoded local secret key for database encryption (`src/db/database.ts`). No remote identity provider.

## Monitoring & Observability

**Error Tracking:**
- None detected.

**Logs:**
- Browser console logging.

## CI/CD & Deployment

**Hosting:**
- GitHub Pages (implied by `vite.config.ts` base path).

**CI Pipeline:**
- GitHub Actions - `.github/workflows/deploy.yml` manages automated builds and deployment.

## Environment Configuration

**Required env vars:**
- `MODE` - Managed by Vite (development/production).
- (No critical external API keys required as all data is local).

**Secrets location:**
- Not applicable for production (local-first app). Database encryption key is currently internal.

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None.

## PWA Integration

**Manifest:**
- `public/pwa-192x192.svg`, `public/pwa-512x512.svg`.
- Configuration in `vite.config.ts`.

**Icons:**
- `public/apple-touch-icon.svg` for iOS.
- `public/icon.svg` for general use.

---

*Integration audit: 2025-05-15*
