# Mathy

[![Deploy](https://github.com/navoznov/mathy/actions/workflows/deploy.yml/badge.svg)](https://github.com/navoznov/mathy/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A mental arithmetic trainer for kids. Mathy generates practice problems from rules a parent
configures, times every single answer, and shows exactly which facts the child keeps getting wrong.

**[Try it live →](https://navoznov.github.io/mathy/)**

> [!NOTE]
> The user interface is in Russian.

<p align="center">
  <img src="docs/screenshots/practice.png" alt="A multiplication problem with an on-screen number keypad" width="300">
  &nbsp;&nbsp;
  <img src="docs/screenshots/heatmap.png" alt="Multiplication table heatmap showing the success rate for each pair of factors" width="300">
</p>

## Features

- **Four operations** — addition, subtraction, multiplication and division, each with its own
  operand ranges. Options to require carrying/borrowing, allow negative results, and divide
  with a remainder.
- **Two modes** — *Training* shows right away whether each answer is correct and explains
  mistakes; *Exam* runs silently and reveals everything in the summary at the end.
- **Per-problem timing** — every answer is timed individually, so slow facts stand out
  even when they are answered correctly.
- **Analytics** — session history, success rate and average time per operation, the most
  frequent mistakes, the slowest problems, and a multiplication table heatmap (division
  facts count towards the matching multiplication cell).
- **Parent settings** — difficulty presets, an optional PIN to keep the child out of the
  settings, and JSON export of the history.
- **Private by design** — no backend and no accounts. Everything is stored in the browser's
  `localStorage`; nothing leaves the device.
- **Touch-friendly** — a built-in number keypad, so it works on a phone or tablet without
  the system keyboard popping up. A physical keyboard works too.

## Getting started

Requires **Node.js 20.19+ or 22.12+**. On older versions npm silently skips the bundler's
native binding, and `npm test` fails with a cryptic `Cannot find native binding` error.

```bash
git clone https://github.com/navoznov/mathy.git
cd mathy
npm install
npm run dev
```

Then open the URL printed by Vite (by default <http://localhost:5173/mathy/>).

### Scripts

| Command           | Description                               |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start the development server              |
| `npm test`        | Run the test suite (Vitest)               |
| `npm run lint`    | Lint the code (oxlint)                    |
| `npm run build`   | Type-check and build to `dist/`           |
| `npm run preview` | Serve the production build locally        |

## Usage

The app has three screens, switched by the URL hash:

| Route        | Screen                                                        |
| ------------ | ------------------------------------------------------------- |
| `#/`         | Start screen and practice session                             |
| `#/history`  | Session history and analytics — open to everyone              |
| `#/admin`    | Settings — protected by the PIN, if one is set                |

By default there is no PIN. To set one, fill in the PIN field on the settings screen. The same
PIN is required to clear the history.

> [!IMPORTANT]
> The PIN is stored in plain text in `localStorage` under the `mathy.settings` key. It is a
> speed bump against curiosity, not a security measure. If it is forgotten, it can be read or
> reset through the browser's developer tools.

History is capped at the 200 most recent sessions.

## Tech stack

[React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/),
[Vite](https://vite.dev/), [Vitest](https://vitest.dev/) and [oxlint](https://oxc.rs/).
No router or state management libraries — routing is a small hash-based hook.

The code is split into three layers with one-way dependencies:

```
src/
├── domain/    # pure logic: problem generation, scoring, analytics
├── storage/   # serialization to localStorage
└── ui/        # React components
```

`ui` depends on `storage`, `storage` depends on `domain`, and `domain` depends on nothing.
Tests cover `domain` and `storage`.

## Deployment

Every push to `main` triggers the [Deploy workflow](.github/workflows/deploy.yml), which runs
the tests, builds the app and publishes it to GitHub Pages. Failing tests block the deployment.

To deploy your own fork:

1. Go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
   Without this, the workflow fails at the `configure-pages` step with `Pages is not enabled`.
2. If you rename the repository, update `base` in [`vite.config.ts`](vite.config.ts) to match
   (currently `/mathy/`), otherwise the assets fail to load on Pages.

## License

[MIT](LICENSE) © Ivan Navoznov
