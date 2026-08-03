# Build Guide — Producing the Windows Installer

This project ships as complete, ready-to-build source code. Electron's Windows
targets (NSIS installer, portable `.exe`, `.msi`) and the native
`better-sqlite3` module must be **compiled on Windows** — that's a constraint
of Electron/Node native modules, not something specific to this app. You have
two supported ways to produce the final `.exe`/`.msi`:

## Option A — Build on a Windows machine (fastest to try locally)

**Prerequisites** (only needed to *build* the app — end users installing the
finished `.exe` need nothing):
- Windows 10/11
- [Node.js 20 LTS](https://nodejs.org) (includes npm)
- Visual Studio Build Tools ("Desktop development with C++" workload) —
  required to compile the native `better-sqlite3` module. Node's
  `npm install` will prompt for this if it's missing, or install manually:
  ```
  npm install --global windows-build-tools
  ```
  (or install "Build Tools for Visual Studio" from Microsoft directly)

**Steps**, from the project root in PowerShell or cmd:

```powershell
# 1. Install dependencies
npm install

# 2. (Optional) generate the demo/sample database
npm run seed

# 3. Build the React front end
npm run build:renderer

# 4. Build the Windows installer + portable exe + MSI
npm run dist:all

# Or build just one target:
npm run dist        # NSIS installer + portable
npm run dist:msi     # MSI only
```

Output appears in `release\`:
- `IT-Operations-Knowledge-Portal-Setup-1.0.0.exe` — NSIS installer
- `IT-Operations-Knowledge-Portal-Portable-1.0.0.exe` — portable, no install
- `IT-Operations-Knowledge-Portal-Setup-1.0.0.msi` — MSI installer

## Option B — Build via GitHub Actions (no Windows machine needed)

The repo includes `.github/workflows/build-windows.yml`, which runs the exact
same build on a `windows-latest` GitHub-hosted runner and uploads the
installer, portable exe, and MSI as workflow artifacts (and attaches them to
a GitHub Release if you push a `v*` tag).

1. Push this project to a GitHub repository.
2. Go to **Actions → Build Windows Installer → Run workflow** (or push a tag
   like `v1.0.0` to trigger it automatically and create a release).
3. Download the `IT-Operations-Knowledge-Portal-Windows` artifact once the
   run finishes (a few minutes) — it contains the same three files as
   Option A.

This is the recommended path if you don't have a Windows machine handy.

## Development mode (running without building an installer)

To run and test the app locally while developing:

```bash
npm install
npm run dev
```

This starts the Vite dev server and launches Electron pointed at it, with
hot reload for the React UI and DevTools open. On macOS/Linux this runs
fine for UI development, but note the app is designed and tested for
Windows 10/11 in production — file paths under `C:\ProgramData\...` fall
back to a per-user app-data folder automatically when not on Windows (see
`electron/paths.js`), purely so development isn't blocked.

## Customizing the icon / installer branding

- `build/icon.ico` and `build/icon.png` are already generated (a slate
  square with an amber `[ ]` bracket mark and teal status dot, matching the
  app's in-product visual style). Swap these for your organization's own
  branding by replacing the files at the same path/size requirements
  (`.ico` should contain 16/24/32/48/64/128/256px layers).
- `docs/LICENSE.txt` is shown in the NSIS installer's license step — replace
  with your organization's actual terms before distributing.
- Installer text/behavior is configured in the `"build"` section of
  `package.json` (see the `nsis` and `msi` blocks).

## Troubleshooting

- **`better-sqlite3` fails to build**: almost always missing C++ build
  tools. Install Visual Studio Build Tools (see Prerequisites) and retry
  `npm install`.
- **App opens a blank window in production build**: confirm `npm run
  build:renderer` completed and `dist/index.html` exists before running
  `electron-builder` — `npm run dist` already does this in order.
- **"better_sqlite3.node was compiled against a different Node.js version"**:
  run `npx electron-builder install-app-deps` to rebuild native modules
  against Electron's bundled Node ABI (this also runs automatically via the
  `postinstall` script).
