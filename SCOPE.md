# SCOPE: Database Schema & Anomaly Log

This document details the database schema and tracks all 16 deliberate data problems identified in the customer's `expenses_export.csv` data.

---

## 1. Database Schema (Relational)

### Table: `users`
- `id` (`UUID`, PK): Unique user identifier.
- `username` (`VARCHAR(150)`): User login name (unique).
- `email` (`VARCHAR(254)`): User email address (unique).
- `password` (`VARCHAR(128)`): Salted password hash.

### Table: `groups`
- `id` (`UUID`, PK): Unique group identifier.
- `name` (`VARCHAR(255)`): Group name.
- `created_at` (`TIMESTAMPTZ`): Creation date.
- `created_by_id` (`UUID`, FK -> `users`): User who created the group.

### Table: `group_memberships` (Tracks members over time)
- `id` (`UUID`, PK): Unique membership identifier.
- `group_id` (`UUID`, FK -> `groups`): Associated group.
- `user_id` (`UUID`, FK -> `users`): Group member.
- `joined_at` (`DATE`): Date membership starts.
- `left_at` (`DATE`, Nullable): Date membership ends.

### Table: `csv_imports` (Audit log for CSV parser)
- `id` (`UUID`, PK): Unique import identifier.
- `group_id` (`UUID`, FK -> `groups`): Target group.
- `filename` (`VARCHAR(255)`): Uploaded filename.
- `status` (`VARCHAR(20)`): State of import (`pending_review`, `processed`, `failed`).
- `uploaded_at` (`TIMESTAMPTZ`): Timestamp of upload.
- `uploaded_by_id` (`UUID`, FK -> `users`): Payer.

### Table: `import_anomalies` (Sandbox rows pending review)
- `id` (`UUID`, PK): Unique identifier.
- `csv_import_id` (`UUID`, FK -> `csv_imports`): Associated upload.
- `row_number` (`INTEGER`): Row index in the CSV file.
- `raw_data` (`JSON`): Dict containing both raw text and pre-cleaned fields.
- `anomaly_type` (`VARCHAR(50)`): Anomaly classification.
- `description` (`TEXT`): Error or warning message.
- `severity` (`VARCHAR(10)`): Severity level (`info`, `warning`, `error`).
- `status` (`VARCHAR(20)`): State of approval (`pending`, `resolved`, `ignored`).
- `resolution_action` (`VARCHAR(100)`, Nullable): Action taken (`imported`, `ignored`).

### Table: `expenses`
- `id` (`UUID`, PK): Unique expense identifier.
- `group_id` (`UUID`, FK -> `groups`): Associated group.
- `description` (`VARCHAR(255)`): Transaction description.
- `paid_by_id` (`UUID`, FK -> `users`): Payer.
- `amount` (`DECIMAL(15, 4)`): Transaction amount in local currency.
- `currency` (`VARCHAR(3)`): Three-character currency code (INR, USD).
- `exchange_rate` (`DECIMAL(12, 6)`): Rate relative to base currency (INR).
- `amount_in_inr` (`DECIMAL(15, 2)`): Base amount converted to INR.
- `split_type` (`VARCHAR(20)`): Splitting logic (`equal`, `unequal`, `share`, `percentage`).
- `date` (`DATE`): Date of transaction.
- `notes` (`TEXT`, Nullable): Description detail.
- `import_record_id` (`UUID`, FK -> `csv_imports`, Nullable): Associated import log.

### Table: `expense_splits`
- `id` (`UUID`, PK): Unique split identifier.
- `expense_id` (`UUID`, FK -> `expenses`): Associated expense.
- `user_id` (`UUID`, FK -> `users`): Debtor.
- `split_value` (`DECIMAL(10, 2)`, Nullable): Share value (percentage, weight, etc.).
- `calculated_amount_inr` (`DECIMAL(15, 2)`): Share amount in base currency (INR).

### Table: `settlements` (Logs debt repayments)
- `id` (`UUID`, PK): Unique repayment identifier.
- `group_id` (`UUID`, FK -> `groups`): Associated group.
- `paid_by_id` (`UUID`, FK -> `users`): Repayer.
- `paid_to_id` (`UUID`, FK -> `users`): Recipient.
- `amount` (`DECIMAL(15, 4)`): Paid amount.
- `currency` (`VARCHAR(3)`): Currency code.
- `exchange_rate` (`DECIMAL(12, 6)`): Conversion rate.
- `amount_in_inr` (`DECIMAL(15, 2)`): Repayment value in INR.
- `date` (`DATE`): Payment date.
- `notes` (`TEXT`, Nullable): Detail notes.
- `import_record_id` (`UUID`, FK -> `csv_imports`, Nullable): Associated import log.

---

## 2. CSV Import Anomaly Log

Below is the catalog of the 16 deliberate data problems found in the `expenses_export.csv` file, their detection rules, and our implemented resolution policy.

### 1. Exact Duplicate Row
- *Example*: Row 5 (`Dinner at Marina Bites,Dev,3200`) and Row 6 (`dinner - marina bites,Dev,3200`).
- *Detection*: Same date, payer, amount, currency, and split list.
- *Policy*: Flags as `exact_duplicate`. The wizard prompts the user to keep the first and ignore/discard the second.

### 2. Duplicate Discrepancy
- *Example*: Row 24 (`Dinner at Thalassa,Aisha,2400`) and Row 25 (`Thalassa dinner,Rohan,2450`).
- *Detection*: Same date, overlapping keywords in description, but different amount or paid_by.
- *Policy*: Flags as `duplicate_discrepancy`. The user reviews both and decides whether to keep both or choose one.

### 3. Quoted Amount with Thousand Commas
- *Example*: Row 7 (`"1,200"` amount).
- *Detection*: Quotes or commas in the amount text.
- *Policy*: Flags warning, cleans the string to `1200.00` automatically.

### 4. Username Casing Inconsistencies
- *Example*: Row 9 (`priya` instead of `Priya`).
- *Detection*: Case mismatch against group members.
- *Policy*: Auto-normalizes to correct group member.

### 5. Name Spelling Variants
- *Example*: Row 11 (`Priya S` instead of `Priya`).
- *Detection*: Substring or Levenshtein distance match.
- *Policy*: Prompts mapping to `Priya` or creating a new user.

### 6. Excessive Decimal Places
- *Example*: Row 10 (`899.995` amount).
- *Detection*: Floats with > 2 decimal places.
- *Policy*: Auto-rounds to `900.00` using standard half-up rounding.

### 7. Missing Payer (`paid_by`)
- *Example*: Row 13 (`House cleaning supplies,,780`).
- *Detection*: Empty payer field.
- *Policy*: Marks critical error. Wizard blocks import until user manually maps this field.

### 8. Settlement Logged as Expense
- *Example*: Row 14 (`Rohan paid Aisha back,Rohan,5000,INR,,Aisha`).
- *Detection*: Empty `split_type` and split_with target is a single person.
- *Policy*: Wizard detects as settlement repayment rather than expense.

### 9. Invalid Split Percentages
- *Example*: Row 15 & 32 (Pizza Friday, percentages sum to 110%).
- *Detection*: `split_type` = percentage, and sum of percentages != 100%.
- *Policy*: Flags error. Wizard prompts user to scale values to 100% or edit manually.

### 10. Foreign Currency (USD)
- *Example*: Row 20 (`Goa villa booking,Dev,540,USD`).
- *Detection*: Currency code is USD.
- *Policy*: Converts to INR based on configurable exchange rate input.

### 11. Negative Amount (Refund)
- *Example*: Row 26 (`Parasailing refund,Dev,-30,USD`).
- *Detection*: Amount < 0.
- *Policy*: Deducts splits from the debtors' outstanding balances.

### 12. Non-standard Date format
- *Example*: Row 27 (`Mar-14`).
- *Detection*: Date string fails standard `DD-MM-YYYY` parse checks.
- *Policy*: Parses as `14-03-2026` using alternative format masks.

### 13. Missing Currency
- *Example*: Row 28 (`Groceries DMart,Priya,2105`).
- *Detection*: Currency field is empty.
- *Policy*: Defaults to base currency (INR).

### 14. Zero Amount Expense
- *Example*: Row 31 (`Dinner order Swiggy,Priya,0,INR`).
- *Detection*: Amount is 0.
- *Policy*: Flags warning. User decides to import as zero-value ledger or discard.

### 15. Ambiguous Date Context
- *Example*: Row 34 (`04-05-2026`, note asks: "is this April 5 or May 4?").
- *Detection*: Raw date text matches specific target notes.
- *Policy*: Prompts user to confirm date selection during wizard review.

### 16. Inactive Member split
- *Example*: Row 36 (`Groceries BigBasket,Priya,2640` on April 2, includes Meera who left on March 31).
- *Detection*: Split target left the group before the transaction date.
- *Policy*: Warning. Prompts user to remove Meera from split or adjust group dates.
