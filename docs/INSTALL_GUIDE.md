# Installation Guide

## System requirements

- Windows 10 or Windows 11 (64-bit)
- No internet connection required — the app works fully offline
- No separate database server, Node.js, or other software needed
- Administrator rights on the PC for the first install (creates the shared
  `C:\ProgramData\IT Operations Portal\` data folder)

## Installing

1. Copy `IT-Operations-Knowledge-Portal-Setup-<version>.exe` to the target
   PC (or run it directly from wherever it was downloaded/shared).
2. Double-click the installer.
3. Accept the license terms and choose an install location if you want
   something other than the default (Program Files).
4. The installer creates:
   - A **Desktop shortcut**
   - A **Start Menu shortcut** (under "IT Operations")
   - The data folder tree at `C:\ProgramData\IT Operations Portal\` with
     `Database`, `Uploads`, `SOPs`, `Backups`, `Logs`, and `Temp`
     subfolders (created automatically on first launch if the installer
     didn't already create them)
5. Launch the app from the Desktop or Start Menu shortcut.

## First launch

- On first launch, the app creates a fresh, empty SQLite database at
  `C:\ProgramData\IT Operations Portal\Database\knowledge.db`.
- A default administrator account is created automatically:
  - **Username:** `admin`
  - **Password:** `ChangeMe123!`
  - **You should change this password immediately** — go to **User
    Accounts → admin → Reset password** after your first login.
- If you'd rather start from example content instead of an empty portal,
  open **Settings → Load sample data…** to load the bundled demo dataset
  (sample SOPs, tickets, and assets). This can be done at any time and
  always keeps a safety copy of whatever was there before.

## Using the portable version instead

If you can't or don't want to install anything (e.g. locked-down
workstation), use `IT-Operations-Knowledge-Portal-Portable-<version>.exe`
instead. It runs without installation but still uses the same
`C:\ProgramData\IT Operations Portal\` data folder, so multiple portable
copies on the same PC share the same database.

## Uninstalling

Use **Settings → Apps → IT Operations Knowledge Portal → Uninstall**, or run
the uninstaller from the Start Menu folder. Uninstalling removes the
application files but **does not delete** `C:\ProgramData\IT Operations
Portal\` — your database, uploads, SOPs, and backups are preserved in case
you reinstall later. Delete that folder manually if you want a full wipe.

## Where things live

| What | Location |
|---|---|
| Database | `C:\ProgramData\IT Operations Portal\Database\knowledge.db` |
| Uploaded files | `C:\ProgramData\IT Operations Portal\Uploads\` |
| SOP attachments | `C:\ProgramData\IT Operations Portal\SOPs\` |
| Backups | `C:\ProgramData\IT Operations Portal\Backups\` |
| Logs | `C:\ProgramData\IT Operations Portal\Logs\` |
| App config | `C:\ProgramData\IT Operations Portal\config.enc.json` |

All of these can be relocated from **Settings → Storage locations** if you'd
rather keep data on a different drive or a mapped network path (a restart is
required after changing the database, SOPs, backups, or uploads location).

## Getting help

- Check `C:\ProgramData\IT Operations Portal\Logs\` for the day's log file
  if something isn't working — it records startup, logins, uploads, backups,
  and errors in plain JSON lines.
- See `docs/USER_MANUAL.md` for how to use each part of the app.
