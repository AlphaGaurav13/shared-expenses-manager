# Shared Expenses App - SplitPro

SplitPro is a production-ready web application built to manage shared flatting or travel expenses. It resolves formatting discrepancies, tracks temporal membership timelines, and provides an interactive wizard to log and resolve CSV data anomalies.

## Tech Stack
- **Backend**: Django & Django REST Framework (DRF)
- **Frontend**: React (Vite, TypeScript, Lucide Icons, Vanilla CSS)
- **Database**: PostgreSQL (with automatic SQLite fallback for crash-free local development)
- **Authentication**: JSON Web Tokens (SimpleJWT)

---

## Local Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm
- Git

### 1. Backend Setup (Django)
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   - **macOS/Linux**:
     ```bash
     source .venv/bin/activate
     ```
3. Apply database migrations (this initializes the local SQLite database fallback if PostgreSQL is not active):
   ```bash
   python manage.py migrate
   ```
4. Start the Django development server:
   ```bash
   python manage.py runserver
   ```
   The backend will run at `http://127.0.0.1:8000/`.

---

### 2. Frontend Setup (React + Vite)
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will run locally at `http://localhost:5173/`. Open this link in your browser.

---

## Deliverable Documents
For details on database modeling, anomaly policies, and AI pair-programming details, see:
- [SCOPE.md]: Database Schema and Anomaly Detection Log.
- [DECISIONS.md]: Architectural Design Decisions.
- [AI_USAGE.md]: AI interaction history and bug resolution logs.

---

## Deployment to Vercel

Working Site LINK: https://shared-expenses-manager.vercel.app/

## Deliverable Documents

The following documents are included in the repository:

- [SCOPE.md](./SCOPE.md) — Database Schema and Anomaly Detection Log
- [DECISIONS.md](./DECISIONS.md) — Architectural Design Decisions
- [AI_USAGE.md](./AI_USAGE.md) — AI Collaboration and Debugging Log
- [import_report.md](./import_report.md) — CSV Import Anomaly Report


### Preferred Split Deployment Option
Because Django serverless functions on Vercel have ephemeral local storage and a 50-second timeout, the recommended production approach is:
1. **Frontend**: Deploy `frontend/` folder directly to Vercel using `frontend/vercel.json` (Vercel will manage routing redirects).
2. **Backend**: Deploy `backend/` to a persistent provider (e.g. Render, Railway, or Koyeb) connected to a hosted PostgreSQL instance. Set the environment variable `VITE_API_BASE_URL` on Vercel pointing to this backend.

