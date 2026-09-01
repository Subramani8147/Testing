# Installation Guide

## Requirements
- Windows 10 or 11 (64-bit)
- No internet connection required — works fully offline
- Admin rights for the first install (creates the shared ProgramData folder)

## Installing
1. Run `IT-Operations-Knowledge-Portal-Setup-<version>.exe`
2. Accept the license, choose install location if desired
3. Launch from the Desktop or Start Menu shortcut

## First launch
- A fresh SQLite database is created automatically at
  `C:\ProgramData\IT Operations Portal\Database\knowledge.db`
- Default admin: `admin` / `ChangeMe123!` — change immediately in User Accounts

## Portable version
`IT-Operations-Knowledge-Portal-Portable-<version>.exe` needs no
installation but still uses the same `C:\ProgramData\IT Operations
Portal\` data folder.

## Where things live
| What | Location |
|---|---|
| Database | `C:\ProgramData\IT Operations Portal\Database\knowledge.db` |
| Uploaded files | `...\Uploads\` |
| SOP attachments | `...\SOPs\` |
| Backups | `...\Backups\` |
| Logs | `...\Logs\` |

All relocatable from Settings > Storage locations.
