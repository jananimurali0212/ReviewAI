# ReviewAI – AI-Powered Multi-Language Code Review Assistant

[![ReviewAI License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript%20%2B%20Vite%20%2B%20Tailwind-purple.svg)](frontend/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python%203.12%20%2B%20Uvicorn-009688.svg)](backend/)
[![Editor](https://img.shields.io/badge/Editor-Monaco%20Editor-007ACC.svg)](https://microsoft.github.io/monaco-editor/)
[![Docs](https://img.shields.io/badge/Specification-PDF%20v1.0-red.svg)](docs/ReviewAI_Technical_Documentation.pdf)

ReviewAI is an enterprise-grade, developer-focused code review platform that combines large-language-model reasoning, deterministic static analysis, and GitHub pull-request workflows to produce explainable, actionable code reviews before merging or releasing.

📄 **Full Technical Architecture Specification**: Available in [`docs/ReviewAI_Technical_Documentation.pdf`](docs/ReviewAI_Technical_Documentation.pdf).

---

## 📑 Table of Contents

- [Executive Summary](#-executive-summary)
- [Key Objectives & Value Proposition](#-key-objectives--value-proposition)
- [System Architecture](#-system-architecture)
- [Review Workflow](#-review-workflow)
- [Hybrid Analysis Strategy](#-hybrid-analysis-strategy)
- [Severity & Findings Scoring Model](#-severity--findings-scoring-model)
- [Technology Stack](#-technology-stack)
- [API Design](#-api-design)
- [Data Model](#-data-model)
- [Security, Privacy & Prompt-Injection Defense](#-security-privacy--prompt-injection-defense)
- [Development Roadmap & Milestones](#-development-roadmap--milestones)
- [Getting Started Locally](#-getting-started-locally)

---

## 🎯 Executive Summary

Manual code review is valuable but can be slow, inconsistent, and difficult for teams. Existing linters detect known rule violations but lack contextual explanations, while general-purpose LLMs can reason about code but may hallucinate defects or line numbers.

**ReviewAI solves this through a hybrid architecture:**
1. **Deterministic Static Analysis**: Runs language-specific tools (Ruff, Bandit, Semgrep, ESLint) for repeatable rule enforcement.
2. **Contextual LLM Reasoning**: Uses Google Gemini to assess surrounding logic, edge cases, error-handling defects, and intent.
3. **Structured Validation**: Findings are strictly validated against file paths, line ranges, and concrete evidence before display.
4. **Developer Approval**: Generates minimal, localized patches that developers review and approve before application.

---

## 🏛 System Architecture

The backend is the trust boundary. The frontend never receives model provider secrets or executes arbitrary analysis commands.

```
+-----------------------------------------------------------------------------------+
|                           Developer / GitHub Webhook                              |
|                   (Code Paste / File Upload / Repository / PR)                    |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                            ReviewAI API (FastAPI)                                 |
|                  Authentication • Validation • Review Orchestration               |
+-----------------------------------------------------------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+------------------+             +------------------+             +-----------------+
|  Pre-processing  |             | Static Analysis  |             | Gemini Analysis |
| Language Detect  |             | Linters • SAST   |             | Logic • Context |
| Diff/File Parsing|             | Rule-based Rules |             | Fix Suggestions |
+------------------+             +------------------+             +-----------------+
        \                                 |                                 /
         \                                v                                /
          +---------------------------------------------------------------+
          |               Finding Validation & Report Builder             |
          |       Deduplicate • Validate Line Numbers • Severity • Evidence|
          +---------------------------------------------------------------+
                                          |
                                          v
                     +-----------------------------------------+
                     | Supabase Persistence / GitHub PR Review |
                     +-----------------------------------------+
```

### Architecture Components

| Component | Responsibility |
| :--- | :--- |
| **React Frontend** | Code intake, Monaco editor, review dashboard, finding details, diff viewer, and history. |
| **FastAPI Backend** | Authentication checks, request validation, review orchestration, persistence, and provider integration. |
| **Preprocessor** | Language detection, file normalization, diff parsing, and size limit enforcement. |
| **Static Analyzers** | Invokes Ruff, Bandit, Semgrep, and ESLint in sandboxed workers. |
| **Gemini Service** | Analyzes contextual code logic and returns structured, schema-constrained findings. |
| **Finding Validator**| Checks schema, paths, line ranges, evidence integrity, and deduplicates findings. |
| **Database (Supabase)** | Stores user identities, review metadata, audit trails, and finding records. |

---

## 🔄 Review Workflow

1. **Submit**: Developer pastes code, uploads source files, or triggers via GitHub Pull Request.
2. **Authorize & Preprocess**: Backend verifies permissions, normalizes file paths, and extracts changed line ranges.
3. **Analyze**: Runs deterministic tools (Bandit, Ruff, Semgrep) and prompts Gemini with strict structured output constraints.
4. **Validate & Deduplicate**: Rejects hallucinated line numbers or nonexistent files; merges overlapping static and AI findings.
5. **Review & Approve**: Displays findings grouped by severity (Critical, High, Medium, Low, Info) with explicit evidence and proposed patches.

---

## 🛡 Hybrid Analysis Strategy

| Language / Domain | Tool | Purpose |
| :--- | :--- | :--- |
| **Python Linting** | Ruff | Style, common mistakes, and code-quality rules |
| **Python Security** | Bandit | Common insecure Python coding patterns (e.g. `exec`, shell injection) |
| **Multi-Language SAST** | Semgrep | Pattern-based security, secrets, and correctness rules |
| **JS / TypeScript** | ESLint / `tsc` | Type diagnostics, syntax errors, and lint compliance |
| **Contextual Logic** | Google Gemini API | Logic flaws, missing edge cases, architectural smells, and localized fix generation |

---

## 📊 Severity & Findings Scoring Model

- **Critical**: Potentially severe issue with strong evidence (e.g., exposed credentials, remote code execution).
- **High**: Material security or data-integrity risk (e.g., SQL injection, broken authorization).
- **Medium**: Meaningful defect or reliability concern (e.g., unhandled exception path, race condition).
- **Low**: Limited impact or maintainability concern (e.g., dead code, minor duplication).
- **Info**: Stylistic observation, documentation suggestion, or readability hint.

---

## 💻 Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Code Editor**: Monaco Editor (`@monaco-editor/react`) with syntax support for 13 languages
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI (Python 3.12+)
- **Server**: Uvicorn (ASGI)
- **Validation**: Pydantic v2
- **Database / Auth**: Supabase PostgreSQL & Auth (Integrated in Milestone 2)
- **AI Engine**: Google Gemini API via Google GenAI SDK (Integrated in Milestone 2/5)

---

## 🌐 API Design

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status check |
| `POST` | `/api/reviews` | Create review job from pasted code or uploaded files |
| `GET` | `/api/reviews/{review_id}` | Retrieve review execution status and summary |
| `GET` | `/api/reviews/{review_id}/findings` | List validated findings filtered by severity/category |
| `POST` | `/api/reviews/{review_id}/reanalyze`| Request a fresh analysis run |
| `POST` | `/api/findings/{finding_id}/suggest-fix` | Generate a targeted patch for a finding |
| `POST` | `/api/patches/{patch_id}/approve` | Approve a suggested patch for application |
| `POST` | `/api/github/connect` | Initiate OAuth GitHub authorization |
| `POST` | `/api/github/webhook` | Ingest verified GitHub PR webhook events |
| `GET` | `/api/projects/{project_id}/history` | Retrieve project historical quality audits |

---

## 🔒 Security, Privacy & Prompt-Injection Defense

- **No Secrets in Client**: API keys and service tokens are kept exclusively in server-side environment variables.
- **Prompt-Injection Immunity**: Untrusted code snippets, comments, and PR text are treated strictly as data, never as system instructions.
- **Isolated Execution**: Analyzers run in restricted worker processes with CPU, memory, and timeout bounds.
- **Safe Fixes**: AI suggestions never alter source files automatically; developer approval is mandatory.

---

## 🗺 Development Roadmap & Milestones

- [x] **Milestone 1: Foundation (Current - Day 1)**
  - React + Vite + TypeScript frontend with Monaco Editor
  - Tailwind CSS dark-navy theme
  - FastAPI backend with CORS and `/health` endpoint
  - Comprehensive documentation & PDF specification in `docs/`
- [ ] **Milestone 2: Auth & Data (Supabase)**
- [ ] **Milestone 3: Code Intake & Automatic Language Detection**
- [ ] **Milestone 4: Static Analysis Adapters (Ruff, Bandit, Semgrep)**
- [ ] **Milestone 5: Gemini Structured Reasoning & Prompt Engine**
- [ ] **Milestone 6: Finding Inspection UI & Filterable Diff Viewer**
- [ ] **Milestone 7: Minimal Patch Generation & Approval Flow**
- [ ] **Milestone 8: GitHub PR Integration & Webhook Handler**
- [ ] **Milestone 9: Evaluation Suite, False-Positive Tuning & Benchmarks**
- [ ] **Milestone 10: Production Deployment & Containerization**

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+ & npm
- Python 3.12+

### 1. Start Backend Server
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Health Check: `http://localhost:8000/health`
- Swagger UI Docs: `http://localhost:8000/docs`

### 2. Start Frontend Server
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:5173/`
