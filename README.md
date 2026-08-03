# IT Operations Knowledge Portal

A standalone, fully offline Windows desktop application for IT operations
teams: SOPs/knowledge base, tickets & incidents, asset inventory, and user
accounts — packaged as an installable Windows `.exe`/`.msi` with an
embedded SQLite database. No Node.js, no server, no internet connection
required to run the finished app.

## What's in this repository

```
it-ops-portal/
├── electron/              Main process: window, tray, menu, IPC, SQLite,
│                           backups, logging, settings, auto-updater stub
├── src/                    React front end (renderer process)
├── build/                  App icon (.ico / .png)
├── scripts/                 seed-demo-data.js — regenerates the sample DB
├── sample-data/             knowledge.sample.db — ready-to-use demo database
├── .github/workflows/       CI workflow that builds the Windows installer
├── docs/                    INSTALL_GUIDE.md, USER_MANUAL.md, BUILD_GUIDE.md
├── package.json             Dependencies + electron-builder configuration
└── vite.config.js           React build config
```

## Quick start

**If you just want the installer** (no Windows machine needed): push this
repo to GitHub and run the included Actions workflow — see
`docs/BUILD_GUIDE.md`, Option B. It produces the `.exe`, portable `.exe`,
and `.msi` as downloadable artifacts.

**If you have a Windows machine with Node.js 20+ installed:**

```powershell
npm install
npm run build:renderer
npm run dist:all
```

Output lands in `release\`. See `docs/BUILD_GUIDE.md` for prerequisites
(Visual Studio Build Tools are needed to compile the native SQLite module)
and troubleshooting.

**For development** (hot-reload UI, any OS):

```bash
npm install
npm run dev
```

## Feature summary

- **SOPs & Knowledge Base** — searchable procedures with categories, tags,
  and file attachments (drag-and-drop or file picker)
- **Tickets & Incidents** — auto-numbered tickets (`INC-2026-00001`) with
  status/priority workflow, comments, and asset linkage
- **Assets** — inventory with type/status/location/owner/warranty tracking
- **User accounts** — admin/technician/viewer roles, password reset,
  deactivate/reactivate, audit-logged
- **Offline SQLite database**, auto-created on first launch at
  `C:\ProgramData\IT Operations Portal\Database\knowledge.db`
- **Automatic daily backups** (configurable schedule/retention) plus manual
  Backup Now / Restore Backup, always with a safety copy before restoring
- **Application logging** to `C:\ProgramData\IT Operations Portal\Logs\`
  with configurable retention
- **Settings page** for all storage locations, backup schedule, theme,
  logging, and tray behavior
- **Windows integration**: system tray, native notifications, native file
  dialogs, drag-and-drop, keyboard shortcuts (`Ctrl+S/F/P/B`), high-DPI
  support
- **Security**: hashed+salted passwords (scrypt), no direct SQL access from
  the UI (all writes go through validated IPC handlers in the main
  process), file-type/size validation on uploads, confirmation required
  before every destructive action, encrypted-at-rest config file
- **Auto-update wiring** included via `electron-updater`, disabled by
  default per spec — see `docs/BUILD_GUIDE.md` to enable it later

## Documentation

- `docs/INSTALL_GUIDE.md` — for end users installing the finished app
- `docs/USER_MANUAL.md` — how to use every part of the app
- `docs/BUILD_GUIDE.md` — how to actually compile the `.exe`/`.msi`

## Default login (sample/first-run)

| Username | Password | Role |
|---|---|---|
| `admin` | `ChangeMe123!` | admin |

Change this immediately after first login. The bundled sample database
(`sample-data/knowledge.sample.db`, loadable from **Settings → Load sample
data…**) additionally includes `jchen` / `Demo1234!` (technician) and
`rsingh` / `Demo1234!` (viewer) for testing role-based access.

## A note on this deliverable

This project was generated in a sandboxed environment without Windows or
network access, so the source code, build configuration, sample database,
and CI workflow are all complete and ready to build — but the actual
`.exe`/`.msi` binaries were not compiled here. Follow `docs/BUILD_GUIDE.md`
(either the GitHub Actions option or a local Windows build) to produce the
final installer; both paths are a single command once dependencies are
installed.
