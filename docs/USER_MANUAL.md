# User Manual

## Signing in

Launch the app and sign in with your username and password. The default
administrator account is `admin` / `ChangeMe123!` on a fresh install —
change this password right away from **User Accounts**.

Three roles exist:
- **admin** — full access, including User Accounts and Settings
- **technician** — can create/edit SOPs, tickets, and assets
- **viewer** — read-only access

## Dashboard

Shows at-a-glance counts (open tickets, critical/unresolved tickets,
tickets resolved this week, SOPs in the library, tracked assets, assets in
repair) and a list of the most recently created tickets. Click any ticket
row to jump to Tickets.

## SOPs & Knowledge Base

- **Search and filter** by category using the toolbar.
- **+ New SOP** to add a procedure: title, category, tags, and the
  procedure text itself.
- Click any row to open and edit it — content, category, and tags can all
  be changed. `Ctrl+S` saves while an SOP is open for editing.
- **Attachments**: open an existing SOP and either drag a file onto the
  "Attachment" drop zone or click **Browse…** to attach a supporting
  document (PDF, Word, Excel, text/markdown, or an image). Click the
  attachment chip in the list to open it with the default Windows app for
  that file type.
- **Delete** requires confirmation and also removes the attached file, if
  any.

## Tickets & Incidents

- **+ New Ticket** creates a ticket with an auto-generated number like
  `INC-2026-00001`, tracked in priority order (Critical → High → Medium →
  Low) within each status.
- Filter by status, priority, or free-text search (matches title, ticket
  number, or requester).
- Click a ticket to open its detail view: change status/priority inline,
  edit the description, and add timestamped comments — useful as a running
  log of troubleshooting steps.
- **Delete** requires confirmation.

## Assets

- **+ New Asset** to add hardware/equipment to the inventory: asset tag
  (must be unique), name, type, status, location, assigned owner, purchase
  date, and warranty expiry.
- Filter by status or search by name/tag/owner.
- Click a row to edit or delete (with confirmation) an asset.
- Ticket creation can reference an asset, so incident history stays linked
  to the hardware involved.

## Global search

Press `Ctrl+F` (or click the search box) from anywhere and press Enter to
search across SOPs, tickets, and assets at once; results are grouped by
type on the Search Results page.

## User Accounts (admin only)

- **+ New account** to add a technician or viewer (or another admin).
  Temporary passwords must be at least 8 characters — have the new user
  change it after their first login.
- **Reset password** for any account.
- **Deactivate / Reactivate** — deactivated users can't sign in but their
  history (tickets, SOPs they authored, etc.) is preserved. The original
  default admin account can be deactivated by another admin but never
  deleted outright, so there's always a way back in.

## Settings (admin only)

- **Appearance** — switch between dark and light theme.
- **Storage locations** — relocate the database, SOP attachments, backups,
  or uploads folder (e.g. to a different drive or a mapped network share).
  Changing database/SOPs/backups/uploads requires an app restart, which the
  app will prompt you for.
- **Backups** — configure the daily/weekly/manual schedule, the hour of day
  backups run, and how many backups to retain. **Backup now** triggers an
  immediate backup; **Restore backup…** lets you pick a `.db` file from the
  Backups folder to restore (with a confirmation step, since this replaces
  the live database — a safety copy of the current database is always kept
  automatically before a restore).
- **Logging** — set how many days of logs to keep before old log files are
  cleaned up automatically.
- **Windows integration** — toggle whether closing the window minimizes to
  the system tray (default) or exits the app.
- **Updates** — automatic updates are off by default; see
  `docs/BUILD_GUIDE.md` if you want to wire up a real update feed later.
- **Load sample data…** — replaces your current data with the bundled demo
  dataset, useful for trying the app out. Always confirm-gated and keeps a
  safety copy first.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` | Save (while an SOP editor is open) |
| `Ctrl+F` | Focus the search box |
| `Ctrl+P` | Print the current window |
| `Ctrl+B` | Backup now |

## System tray

Closing the main window minimizes the app to the system tray by default
(configurable in Settings) rather than exiting — the backup scheduler and
notifications keep running in the background. Right-click the tray icon for
**Open Portal**, **Backup Now**, or **Quit**. Double-click the tray icon to
reopen the window.

## Notifications

You'll get a native Windows notification when a scheduled or manual backup
completes or fails.

## Drag-and-drop

Both the SOP attachment drop zone and (where shown) file upload areas
accept drag-and-drop from File Explorer. Dropped files are validated for
type and size before being copied into the app's managed storage folders —
files that don't pass validation are rejected with an explanation rather
than silently failing.
