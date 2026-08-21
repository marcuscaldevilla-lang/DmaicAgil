---
name: Neon persistence
description: Project Charter persistence uses Neon through a dedicated secret rather than the runtime-managed database variable.
---

Use `NEON_DATABASE_URL` for the application's Neon connection; keep `DATABASE_URL` untouched.

**Why:** `DATABASE_URL` is managed by the Replit runtime and cannot be manually set as a secret. A dedicated Neon secret allows the app to use the requested external database without changing runtime-managed environment configuration.

**How to apply:** Database access should prefer `NEON_DATABASE_URL` and fall back to `DATABASE_URL` only when Neon has not been configured. Treat both as secrets and never log or expose their values.