# AI USAGE: AI Collaboration & Bug Log

This document records the AI collaboration details for SplitPro, key prompts used, and three concrete debugging cases.

---

## 1. AI Tools & Key Prompts
- **AI Tool**: Gemini 3.5 Flash (Medium) via Antigravity Coding Agent.
- **Key Prompt**:
  > "we have to create a project problem statement is given in assignment_spreetail.pdf and helping data by customer is also given. We will use django to build this project... Tech Stack: Django, Django REST Framework, PostgreSQL, React (Vite)."

---

## 2. Concrete Debugging Cases

### Case 1: Django Admin Startproject Module Loading Failure
* **Problem**: Proposing `backend\.venv\Scripts\django-admin.exe startproject config .` with working directory set to `backend/` failed with error:
  `The module 'backend' could not be loaded. For more information, run 'Import-Module backend'.`
* **How Caught**: Command execution returned exit code 1. The PowerShell engine interpreted the relative path starting with `backend` as trying to load a system module named backend because the current working directory was already inside `backend`.
* **Correction**: Changed the command path to `.\.venv\Scripts\django-admin.exe startproject config .` to execute the local executable relative to the current working directory.

---

### Case 2: TypeScript JSX Resolution Error
* **Problem**: Frontend compilation check `npx tsc` failed with:
  `Cannot use JSX unless the '--jsx' flag is provided.`
* **How Caught**: Running the build command threw 1200+ compiler warnings.
* **Correction**: Vite 6+ templates exclude the default jsx parameter inside the default root `tsconfig.json`. Resolving this required editing `frontend/tsconfig.json` to insert `"jsx": "react-jsx"` and `"noImplicitAny": false` in the compiler options, enabling the compiler to parse React TSX files successfully.

---

### Case 3: Unused and Missing Icon Imports in Vite Build
* **Problem**: Building Vite app using `npm run build` failed with:
  - `GroupDashboard.tsx(3,85): error TS6133: 'Info' is declared but its value is never read.`
  - `GroupDashboard.tsx(3,111): error TS6133: 'LogOut' is declared but its value is never read.`
  - `GroupDashboard.tsx(268,20): error TS2304: Cannot find name 'CheckCircle'.`
  - Unused icons in `ImportWizard.tsx`.
* **How Caught**: Vite's production compiler utilizes strict unused variables analysis (`noUnusedLocals: true`).
* **Correction**: Added the missing import for `CheckCircle` in `GroupDashboard.tsx` and removed the unused icon parameters (`Info`, `LogOut`, `HelpCircle`, `FileText`, `Save`, `RefreshCw`) from the import headers of both files.
