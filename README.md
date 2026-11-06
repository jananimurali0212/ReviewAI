# ReviewAI – AI-Powered Multi-Language Code Review Assistant

ReviewAI is an enterprise-grade AI-powered code review platform designed to analyze multi-language source code for logic bugs, security vulnerabilities, performance bottlenecks, and adherence to clean code standards.

---

## 🚀 Day 1: Project Foundation & UI Interface

This repository represents the completed **Day 1** foundation:
- Clean modular full-stack architecture (Vite + React + TypeScript frontend, FastAPI Python backend).
- Premium dark navy/charcoal developer UI with glowing purple/blue accents.
- Responsive dashboard with metrics cards, recent reviews, and navigation links.
- Interactive Monaco Code Editor with 13 programming language syntaxes.
- Code submission tools: file upload, paste from clipboard, clear buffer, and submission validation.
- Placeholder review history table with filter and inspection dialog.
- Settings management interface for profile, appearance, and backend-managed AI provider options.
- FastAPI backend with root-level and API-level `/health` endpoints and CORS integration.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI
- **Server**: Uvicorn (ASGI)
- **Validation**: Pydantic v2
- **Language**: Python 3.12+

---

## 📁 Project Structure

```
ReviewAI/
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── layouts/
│   │   │   └── DashboardLayout.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── NewReviewPage.tsx
│   │   │   ├── ReviewHistoryPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── mockData.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config/
│   │   │   ├── __init__.py
│   │   │   └── settings.py
│   │   ├── models/
│   │   │   └── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   └── health.py
│   │   └── services/
│   │       └── __init__.py
│   └── requirements.txt
└── README.md
```

---

## 🏃 Getting Started

### 1. Starting the Backend

```bash
cd backend

# Optional: activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at:
- API Root: `http://localhost:8000`
- Health Endpoint: `http://localhost:8000/health`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

### 2. Starting the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Frontend will be available at:
- `http://localhost:5173`

---

## 🌐 Supported Programming Languages (UI Selector)

1. Python (`.py`)
2. Java (`.java`)
3. C (`.c`)
4. C++ (`.cpp`)
5. JavaScript (`.js`)
6. TypeScript (`.ts`)
7. Go (`.go`)
8. Rust (`.rs`)
9. PHP (`.php`)
10. C# (`.cs`)
11. HTML (`.html`)
12. CSS (`.css`)
13. SQL (`.sql`)

---

## 🗓️ 5-Day Development Roadmap

- [x] **Day 1**: Project Foundation, UI Design System, Monaco Editor, & FastAPI Health API
- [ ] **Day 2**: AI Prompting Pipeline & Automatic Language Detection
- [ ] **Day 3**: Multi-Language AST Static Analysis & Security Rules
- [ ] **Day 4**: Database Persistence, Review History, & Metrics Aggregation
- [ ] **Day 5**: Performance Optimization, Export Reports, & Production Packaging

