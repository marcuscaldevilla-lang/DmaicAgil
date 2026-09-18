---
name: window.open print/export popups
description: window.open with 'noopener'/'noreferrer' breaks programmatic print/export flows that need to write into the new tab.
---

When opening a new tab/window via `window.open(url, target, features)` specifically so the caller can then `document.write(...)` HTML into it (e.g. a "print to PDF" export button), do not include `noopener` or `noreferrer` in the features string.

**Why:** `noopener` makes browsers return `null` from `window.open()` for security reasons, even though a real blank tab is still opened. Code that does `const w = window.open(...); if (!w) return; w.document.write(...)` will silently produce a permanently blank tab — no error, no console output — because the null check short-circuits before anything is written. Suspected first (wrongly) as a CSP or timing issue; the actual cause is purely the `noopener` flag.

**How to apply:** For any feature that opens a popup/tab and then writes content into it via the returned handle, omit `noopener`/`noreferrer` from the `window.open` features. Also avoid auto-invoking `window.print()` immediately after writing (e.g. via `setTimeout`) — the native print dialog can block automated/E2E testing tools (Playwright) indefinitely since it isn't a JS `dialog` event they can dismiss. Instead, add a visible in-page "Imprimir / Salvar como PDF" button inside the generated document that calls `window.print()` only on explicit user click.
