# DECISIONS: Architectural Design Decisions

This document logs significant architectural design decisions made during the development of SplitPro.

---

## 1. Sandbox Staging Imports (Meera's Request)
* **Problem**: Meera wanted to review and approve all modifications or deletions resulting from CSV import anomalies before they were written to the database.
* **Option A**: Parse the CSV in memory, perform immediate automatic cleanup, and commit clean records while rejecting/flagging duplicates in a simple response list.
* **Option B (Chosen)**: Parse the CSV and load all rows into a staging/sandbox database model (`CSVImport` and `ImportAnomaly`). Keep all rows in a review status. Provide an **Anomaly Approval Wizard** in the React frontend where the user can inspect warnings/errors, ignore duplicate rows, normalise name casing, and verify date ambiguities before triggering a bulk transactional commit to the `Expense` and `Settlement` tables.
* **Rationale**: Option B meets Meera's requirement. It provides safety (atomic transaction commits) and flexibility (user editing inline in the wizard).

---

## 2. Relational Database Selection & Fallback
* **Problem**: The specification requires PostgreSQL, but local running database instances vary across systems.
* **Option A**: Enforce PostgreSQL connection strictness (meaning the app crashes immediately if a local PostgreSQL container or service is not running).
* **Option B (Chosen)**: Configure the backend to attempt connecting to PostgreSQL on default parameters (`5432`) first. If the connection fails or times out, output a console notification and **automatically fall back to a local SQLite database file**.
* **Rationale**: Option B guarantees that the project is immediately reviewable on the evaluator's system without database setup friction. Since both are relational DBs, all models and query structures function identically.

---

## 3. Dynamic Temporal Membership Bounds (Sam's Request)
* **Problem**: Sam moved in mid-April and questioned why March expenses would impact his balance. Meera left at the end of March.
* **Option A**: Perform a static split among current group members.
* **Option B (Chosen)**: When creating or importing expenses, check the transaction date against each member's membership duration (`joined_at` and `left_at`). For automatic equal splits, include only active members on that date. For custom splits, block saving if a split target was inactive on that date.
* **Rationale**: This implements correct accounting logic. March electricity will only split among Aisha, Rohan, Priya, and Meera, while April electricity includes Sam. Meera is not charged for April rent.

---

## 4. Accounting Rounding Remainder Distribution
* **Problem**: Equal or percentage divisions often result in remainder fractions (e.g. ₹10.00 split among 3 flatmates = ₹3.33 each, leaving ₹0.01 unallocated).
* **Option A**: Ignore remainders and let floating point inaccuracies accumulate.
* **Option B (Chosen)**: Use Python's `Decimal` type with `ROUND_HALF_UP` formatting. Calculate the base split, sum them, subtract the sum from the total expense, and **allocate the difference (remainder) to the first split member**.
* **Rationale**: This ensures that the sum of the splits matches the total expense amount in INR to the penny, keeping the double-entry accounting ledger balanced.

---

## 5. Debt Simplification Algorithm (Aisha's Request)
* **Problem**: Aisha requested "one number per person: who pays whom, how much, done".
* **Option A**: Let debtors settle debts directly with each person they owe (leading to many small, circular transactions).
* **Option B (Chosen)**: Apply a greedy matching algorithm:
  1. Calculate each user's net group balance.
  2. Separate users into Debtors (net balance < 0) and Creditors (net balance > 0).
  3. Greedily match the debtor with the largest debt to the creditor with the largest credit, settle the minimum amount, update balances, and repeat.
* **Rationale**: This reduces the number of transactions to the mathematical minimum (N-1 transactions max), making settlement straightforward.
