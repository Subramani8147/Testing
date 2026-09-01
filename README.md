# IT Operations Knowledge Portal

Offline Windows desktop app for IT SOPs, tickets/incidents, assets and
user accounts — Electron + React + SQLite.

## What's new in this version

- **Bulk Excel import** on the Assets and Tickets pages — see
  `docs/IMPORT_GUIDE.md`. Download a template, fill it in, upload it back.

## Quick start

**Get the installer without a Windows machine:** push this repo to GitHub,
then **Actions → Build Windows Installer → Run workflow**. See
`docs/BUILD_GUIDE.md`.

**Build locally on Windows:**
```powershell
npm install
npm run build:renderer
npm run dist:all
```

**Development:**
```bash
npm install
npm run dev
```

## Default login

`admin` / `ChangeMe123!` — change this immediately after first login.

## Documentation

- `docs/INSTALL_GUIDE.md` — for end users installing the app
- `docs/USER_MANUAL.md` — how to use every part of the app
- `docs/BUILD_GUIDE.md` — how to build the installer
- `docs/IMPORT_GUIDE.md` — bulk Excel import for Assets/Tickets
