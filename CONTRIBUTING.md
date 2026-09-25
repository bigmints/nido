# Contributing to Nido

Thanks for your interest! Nido is a small, local-first project and contributions of all sizes are welcome:
recipes, translations, bug fixes, accessibility improvements, ideas.

## Setup

```bash
npm install
npm run dev
```

Node.js 20 or newer is required.

## Before you open a pull request

```bash
npm run lint    # ESLint + TypeScript (strict)
npm test        # Vitest
npm run build   # static export must succeed
```

CI runs the same three commands on Node 20 and 22. If you changed UI behavior, please also run the
Playwright smoke test (`npx playwright install chromium` once, then `npm run build && npm run e2e`).

## Guidelines

- **Keep logic pure.** Anything that is not rendering belongs in `src/lib/*` with unit tests in `tests/`.
- **Local-first and private.** No analytics, no telemetry, no third-party runtime requests other than
  Open-Meteo. Photos must never be uploaded anywhere.
- **AI stays optional.** Every feature must be fully useful with AI turned off.
- **i18n.** Add every new string to both `src/lib/i18n/es.ts` and `en.ts` (a test enforces identical keys).
- **Accessibility.** Keyboard access, visible focus, labels for icon-only buttons, and a non-drag alternative
  for every drag-and-drop interaction. Respect `prefers-reduced-motion`.
- **Recipes and images.** Write recipes yourself (no copying from other sites) and do not add copyrighted
  images. See "Adding recipes" in the README.
- **Formatting.** `npm run format` (Prettier).

## Commit and PR style

Small, focused pull requests with a clear description of the why. Include screenshots for visual changes.

## Reporting bugs

Open an issue with steps to reproduce, browser and device. Please do not attach personal photos or backups.
For security issues see [SECURITY.md](SECURITY.md).
