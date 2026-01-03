# MatchMyCV — Déploiement (Vercel + Render)

## Variables d’environnement

### Backend (Render)

Copie `backend/env.example` et configure dans Render :

- `OPENAI_API_KEY`: requis
- `ALLOWED_ORIGINS`: ton domaine Vercel (prod) + localhost si besoin  
  Exemple : `https://matchmycv.vercel.app,http://localhost:3000`
- `ALLOWED_ORIGIN_REGEX` (optionnel): pour autoriser les previews Vercel  
  Exemple : `^https://.*\.vercel\.app$`
- `SUPABASE_URL`, `SUPABASE_KEY` (optionnel)

### Frontend (Vercel)

Copie `frontend/env.example` et configure dans Vercel :

- `BACKEND_URL`: URL Render (ex: `https://matchmycv-api.onrender.com`)
- `NEXT_PUBLIC_API_BASE` (optionnel): si tu ne veux pas utiliser les rewrites

## Notes de démo

- Le flow est fonctionnel (upload → analyse → interview → génération → download).
- Les textes “privacy” ont été rendus **neutres** pour la démo (“Secure processing”, “Delete anytime”) tant que la purge 24h / chiffrement bout‑à‑bout ne sont pas implémentés end‑to‑end.

# CV Optimizer

AI-powered CV optimization tool that analyzes your resume against job descriptions and helps you create ATS-friendly CVs.

## Features

- Upload CV (PDF) and paste job description
- AI-powered gap analysis (skills, experience, keywords)
- Interactive Q&A to collect missing information
- Voice input support with Whisper transcription
- Generate optimized CV (PDF + DOCX)
- GDPR-compliant data handling

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000 in your browser.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/session/create` | POST | Create new session |
| `/api/v1/cv/upload` | POST | Upload and parse CV |
| `/api/v1/analyze` | POST | Analyze CV vs job description |
| `/api/v1/interview/questions` | GET | Get interview questions |
| `/api/v1/interview/answer` | POST | Submit text answer |
| `/api/v1/interview/voice` | POST | Submit voice answer |
| `/api/v1/cv/generate` | POST | Generate optimized CV |
| `/api/v1/cv/download/{type}` | GET | Download PDF/DOCX |
| `/api/v1/session/{id}` | DELETE | Delete all user data |

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python
- **AI**: OpenAI GPT-4o-mini, Whisper
- **PDF**: PyMuPDF, python-docx, WeasyPrint

## Environment Variables

```
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=     # Optional: for S3/R2 storage
AWS_SECRET_ACCESS_KEY= # Optional
AWS_BUCKET_NAME=cv-optimizer
AWS_ENDPOINT_URL=      # Optional: R2 endpoint
```

## License

MIT
