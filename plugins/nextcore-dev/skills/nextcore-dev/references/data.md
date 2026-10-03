# Data

Schema decisions are the hardest to reverse. These rules exist because an audit of a 201-model
schema found three incompatible money types in one domain, ~140 hand-run SQL files with no
ledger, and `Cascade` deletes that could erase a financial ledger.

## 1. Money and rates

| Kind | Type | Never |
|---|---|---|
| Money | `DECIMAL(18,2)` | `FLOAT`, `DOUBLE`, `INT` mixed with Decimal in one domain |
| Rate / percent | `DECIMAL(5,4)` (0.0700 = 7%) | `FLOAT` |
| Arithmetic | a decimal library | `number` math on money |

Store the per-month price as per-month. One bug stored a 6-month total in a field read as
"monthly" and every report downstream multiplied it again.

## 2. Order codes: one generator

```
<PREFIX><BUSINESS_LINE:1><PRODUCT:2><YYYYMMDD local><SEQ base32:5><CHECK:1>
```

- One module generates and parses codes. Adding a product = adding one table row there.
- `SEQ` comes from an atomic counter row
  (`INSERT … ON DUPLICATE KEY UPDATE seq = LAST_INSERT_ID(seq + 1)` inside a transaction).
  `count() + 1` and `max(id) + 1` collide on a multi-instance cluster.
- The date part uses the business's local date, explicitly. Raw UTC shifts orders made after
  17:00 into "tomorrow" in a UTC+7 market.
- Store `business_line` and `product_type` columns at creation. Classify by column, not by
  `code.startsWith(...)` scattered across files.
- Link invoices and reports by `orderId`. The code is a display identifier; regenerating codes
  must not break links. Keep the old code in `legacy_order_code`.
- Never regenerate a code on a pending order. The customer may be holding a QR code or a bank
  transfer note with it.

## 3. Price snapshot

The order stores `basePrice` and `finalPrice` at creation, read once from the catalog. Catalog
changes never rewrite existing orders. Reports read the order, not the catalog.

## 4. IDs and audit columns

| Table kind | Primary key |
|---|---|
| Log / event / append-only | `BIGINT AUTO_INCREMENT` (random string IDs on logs bloat indexes ~3x) |
| Bounded business entity | `INT AUTO_INCREMENT` |
| Created client-side or exposed in URLs before insert | `cuid` / UUID |

Every mutable table: `created_at`, `updated_at` (auto-updated). Financial or user-facing:
`deleted_at`. All `DATETIME` in UTC; convert at display.

## 5. Relations: `onDelete` is explicit

| Parent kind | `onDelete` |
|---|---|
| Ledger, invoice, payment, booking | `Restrict` |
| Optional lookup / ownership | `SetNull` + nullable FK + snapshot the label if money depends on it |
| Pure child of an aggregate (line items, tokens, notifications) | `Cascade` |
| Self-referencing tree | `Restrict` |

- Every FK column has an index. Do not add a single-column index that is the left prefix of an
  existing composite.
- Relations do not live in JSON. A JSON array of user IDs has no integrity, cannot be joined,
  and was the root of an incident where a cleanup overwrote 12 accounts' slots.
- State machines use enums (or an uppercase string with a validator), not free text.

## 6. Migrations

Auto-generated migrations applied by a deploy script are how a column gets dropped on a Friday.

1. Write DDL by hand: `migrations/manual-<yymmdd>-<slug>/up.sql`, plus `down.sql` when destructive.
2. Guard for idempotency (check `information_schema` before `ADD COLUMN`).
3. Back up affected tables first; keep the backup somewhere other than the server's `/tmp`.
4. Last statement inserts into a ledger: `_manual_migrations(name, applied_at, checksum)`.
5. Declare the lock mode: `ALTER TABLE … , ALGORITHM=INSTANT` (or `INPLACE`). Without it,
   MariaDB/MySQL silently falls back to `COPY` and locks writes on the whole table. With it, the
   server raises an error instead. Measured: `ADD COLUMN NULL` ran instantly;
   `ADD FOREIGN KEY` and `MODIFY` type were refused for INSTANT/INPLACE.
6. CI drift check: diff the schema file against production; non-empty diff fails.
7. Update the schema file after applying to production, in the same commit as the SQL.

## 7. Production data changes

Data cannot be committed, so the **procedure** is committed instead:

```
backup rows ──► idempotent script in git ──► apply ──► re-query to verify ──► commit (why, row ids, backup path)
```

- Never type `UPDATE`/`DELETE` into a production shell. An incident: a manual "slot cleanup"
  overwrote 12 accounts with no backup, no script, no record. Restoring meant digging through
  old dumps.
- A check in a SQL script must **gate** the write, not print next to it. Seven scripts printed
  `SELECT 'CHECK' … AS must_be_0`; the seventh printed 6 and the `UPDATE` ran anyway. Put the
  condition into the `UPDATE … WHERE` or abort with a `SIGNAL`.
- One-off scripts support `DRY=1` and gate **every** side effect on it, including counters.
  A regenerate script that forgot to gate its sequence counter doubled the counter on dry run.
- Raw `UPDATE` on a table with `ON UPDATE CURRENT_TIMESTAMP` writes server-local time (see
  `backend-traps.md`). Add `updated_at = updated_at` or set it with `UTC_TIMESTAMP(3)`.

## 8. New-model checklist

- [ ] Money `DECIMAL(18,2)`, rates `DECIMAL(5,4)`
- [ ] PK type matches table kind
- [ ] `created_at` + auto `updated_at` (+ `deleted_at` if financial/user-facing), UTC
- [ ] Every relation has explicit `onDelete` by category
- [ ] Every FK indexed; no redundant left-prefix index
- [ ] No relations or money inside JSON
- [ ] Hand-written migration with backup, guard, ledger row, declared ALGORITHM
