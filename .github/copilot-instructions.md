# Copilot Instructions — PWA Attendance System (R&D)

## Project Overview

This is a **mobile-first Progressive Web App** for attendance tracking built purely in the frontend. There is **no backend API**. All data — users, attendance records, geofence zones — is persisted locally using **IndexedDB via Dexie.js**. Authentication state is held in `sessionStorage`. This is an R&D prototype; all business logic lives in Angular services.

## Tech Stack

| Concern | Library/Tool |
|---|---|
| Framework | Angular 21 (standalone, signals) |
| Local DB | Dexie 4 (IndexedDB) |
| Maps | Leaflet 1.9 |
| Styling | Tailwind CSS v4 |
| Biometrics | Web Authentication API (WebAuthn) |
| PWA | `@angular/service-worker` |
| Testing | Vitest |

## Architecture Rules

### No Backend — Ever
- **Never** add `HttpClient`, `HttpClientModule`, or any HTTP calls.
- **Never** suggest REST endpoints, GraphQL, or WebSocket connections.
- All reads and writes go through `DbService` (Dexie), `sessionStorage`, or browser APIs (`navigator.credentials`, `navigator.geolocation`, `crypto.subtle`).

### Angular 21 Standalone Components
- **All components are standalone** (`standalone: true`). Do not create or reference `NgModule`.
- Use `templateUrl` pointing to a separate `.html` file. Never use inline `template` strings (except `app.ts` root shell).
- Component files: `<name>.ts` + `<name>.html`. No `.css` per component — use Tailwind utility classes.
- Register only the imports a component actually uses in its `imports: []` array.

### Dependency Injection — `inject()` Pattern
- Always use `inject()` inside the class body. **Never** use constructor parameter injection.
  ```ts
  // ✅ correct
  private auth = inject(AuthService);

  // ❌ wrong
  constructor(private auth: AuthService) {}
  ```

### State Management — Angular Signals
- Use `signal()` for all local mutable state, `computed()` for derived values, and `effect()` sparingly.
- Expose state as readonly: `readonly myState = this._myState.asReadonly()`.
- Do not introduce `BehaviorSubject`, `Observable` state, or NgRx.

### Services
- All services use `@Injectable({ providedIn: 'root' })`.
- Services that need persistence extend or inject `DbService`.
- `DbService` is the single Dexie instance — add new `Table` definitions and schema versions there; never create a second Dexie database.
- When adding a new table/column, increment `this.version(n)` in `DbService` and list only the changed/new stores to preserve existing data.

### Routing
- All routes use lazy-loaded components (`loadComponent`).
- Protected routes use `authGuard`; public-only routes use `noAuthGuard` (both in `guards/auth.guard.ts`).
- Guards are functional (`() => ...`), not class-based.

### Models
- Data shapes are plain **TypeScript interfaces** in `src/app/models/`. No classes, no decorators.
- Optional `id?: number` for Dexie auto-increment primary keys.

### Authentication & Security
- Passwords are hashed with `crypto.subtle.digest('SHA-256')` before storing in IndexedDB. **Never** store plaintext passwords.
- Session state is persisted to `sessionStorage` as JSON (cleared on tab close). Do not use `localStorage` for auth state.
- Biometric (WebAuthn) registration and assertion use `navigator.credentials` — always guard with `PublicKeyCredential` support check.

### Geolocation & Zones
- Geolocation uses `navigator.geolocation.watchPosition` for continuous tracking on the Punch page.
- Zone membership uses Haversine distance in `ZoneService.haversineDistance()`. Do not add a third-party geo library.
- `Zone` has `{ lat, lng, radius }` (meters). Punch is only valid when `distance <= zone.radius`.

### Styling — Mobile-First Tailwind CSS v4
- All UI is mobile-first. Use Tailwind responsive prefixes (`sm:`, `md:`) only for larger-screen enhancements.
- No per-component CSS files. No CSS-in-JS. No external UI component libraries.
- Touch targets must be at least `44px` tall (`min-h-11` or `py-3`).
- Import order in `styles.css`: Leaflet CSS first, then `@import 'tailwindcss'`.

### PWA / Offline
- The app must remain functional offline; rely only on locally stored data.
- Do not reference external CDN resources at runtime.
- Service worker is configured in `ngsw-config.json` — do not manually register a custom service worker.

## File & Folder Conventions

```
src/app/
  components/<name>/   → <name>.ts + <name>.html
  guards/              → auth.guard.ts (functional guards)
  models/              → *.model.ts (plain interfaces)
  services/            → *.service.ts
```

- Component selector pattern: `app-<name>` (kebab-case).
- File names: no `.component.ts` suffix — just `<name>.ts`.

## Testing

- Test runner is **Vitest**, not Karma or Jasmine.
- Test files: `<name>.spec.ts` alongside the source file.
- Do not configure `TestBed` for pure service logic — test services by constructing them directly with a mocked `DbService`.

## What NOT to Do

- Do not add any server-side code, API routes, or environment-specific base URLs.
- Do not install UI libraries (Angular Material, PrimeNG, Bootstrap, etc.).
- Do not use `NgModule`, `CommonModule`, or class-based guards/resolvers.
- Do not add RxJS Observable-based state; signals are the state primitive here.
- Do not use `localStorage` for security-sensitive data.
- Do not add a second Dexie instance — always extend `DbService`.
