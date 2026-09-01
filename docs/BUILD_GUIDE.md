# Build Guide — Producing the Windows Installer

## Option A — GitHub Actions (no Windows machine needed)

1. Push this project to a GitHub repository.
2. Go to **Actions → Build Windows Installer → Run workflow** (or push a
   tag like `v1.1.0` to trigger it automatically).
3. Download the `IT-Operations-Knowledge-Portal-Windows` artifact once the
   run finishes — it contains the NSIS installer, portable exe, and MSI.

## Option B — Build locally on Windows

Prerequisites: Node.js 20 LTS, Visual Studio Build Tools ("Desktop
development with C++" workload — needed to compile the native
`better-sqlite3` module).

```powershell
npm install
npm run build:renderer
npm run dist:all
```

Output appears in `release\`.

## Development mode

```bash
npm install
npm run dev
```

## Troubleshooting

- **`better-sqlite3` fails to build**: install Visual Studio Build Tools,
  retry `npm install`.
- **Blank window in production build**: confirm `npm run build:renderer`
  completed and `dist/index.html` exists before `electron-builder` runs
  (`npm run dist` already does this in order).
- **better_sqlite3.node ABI mismatch**: run
  `npx electron-builder install-app-deps` to rebuild native modules
  against Electron's Node ABI.
