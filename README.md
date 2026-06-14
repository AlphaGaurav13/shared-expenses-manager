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
- [SCOPE.md](file:///c:/Users/shikh/Desktop/DriveAssignment/SCOPE.md): Database Schema and Anomaly Detection Log.
- [DECISIONS.md](file:///c:/Users/shikh/Desktop/DriveAssignment/DECISIONS.md): Architectural Design Decisions.
- [AI_USAGE.md](file:///c:/Users/shikh/Desktop/DriveAssignment/AI_USAGE.md): AI interaction history and bug resolution logs.

---

## Deployment to Vercel

The repository is pre-configured to be deployed directly to Vercel. 

### Monorepo Single Deployment Option
At the project root, a [vercel.json](file:///c:/Users/shikh/Desktop/DriveAssignment/vercel.json) file is provided to deploy both the React frontend and Django backend together:
1. Go to the [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
2. Select your repository.
3. Leave the **Root Directory** as the root (`./`).
4. Vercel will automatically read the root `vercel.json` and build:
   - The React frontend at `/` (routing requests to index.html)
   - The Django serverless functions under `/api/`
5. Configure the environment variables in your Vercel Project settings:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (Point to a persistent hosted database like Supabase or Neon, since local SQLite is ephemeral on Vercel).
   - `VITE_API_BASE_URL` (Set this to your Vercel deployment URL with `/api`, e.g. `https://my-app.vercel.app/api`).

### Preferred Split Deployment Option
Because Django serverless functions on Vercel have ephemeral local storage and a 50-second timeout, the recommended production approach is:
1. **Frontend**: Deploy `frontend/` folder directly to Vercel using `frontend/vercel.json` (Vercel will manage routing redirects).
2. **Backend**: Deploy `backend/` to a persistent provider (e.g. Render, Railway, or Koyeb) connected to a hosted PostgreSQL instance. Set the environment variable `VITE_API_BASE_URL` on Vercel pointing to this backend.

