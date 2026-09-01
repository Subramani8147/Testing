# Bulk Excel Import

Available on the **Assets** and **Tickets** pages — click **Import from Excel**.

1. Click **Download template** to get a correctly-headed `.xlsx` for that module.
2. Fill it in (the first row must stay as column headers).
3. Click **Import from Excel** again, **Choose file...**, select your filled-in file.
4. Review the preview (first 10 rows), then click **Import N rows**.
5. You'll get a summary: how many rows were created, and which rows (by line number) were skipped and why.

## Expected columns

**Assets** — required: `Asset Tag`, `Name`. Optional: `Type`, `Status`
(Active / In Repair / Retired / Storage), `Location`, `Assigned To`,
`Purchase Date`, `Warranty Expiry`, `Notes`.

**Tickets** — required: `Title`. Optional: `Description`, `Status`
(Open / In Progress / Resolved / Closed), `Priority` (Low / Medium / High
/ Critical), `Category`, `Requester`.

Rows missing a required column, or with a duplicate Asset Tag, are skipped
individually — the rest of the import still proceeds. Every import is
recorded in the audit log with row counts.
