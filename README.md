# Health Record Nexus Secure

Secure platform for interoperable medical record exchange with role-based access and patient consent workflows.

Built for **Smart India Hackathon (SIH)**.

## Architecture

- **Frontend:** Next.js (UI only) on port `3000`
- **Backend:** FastAPI + SQLAlchemy on port `8000`
- **Database:** SQLite locally by default; PostgreSQL via Docker Compose when available

```
Browser → Next.js UI → FastAPI (/api/*) → SQLite or PostgreSQL
                                    └→ uploads/
```

## Features

- Hospital portal — register patients, Health IDs, upload records, request access
- Patient portal — approve/reject consent, view and download approved records
- Consent-first design — records stay private until the patient approves
- JWT auth with bcrypt password hashing

## File storage (Supabase)

Uploads go to **Supabase Storage** when these env vars are set on Render:

```
SUPABASE_URL=https://dwqnpfjaxnkbvjrypdgv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET=health-record-files
```

Create a **private** bucket named `health-record-files` in the Supabase dashboard.
Without these keys, the API falls back to local `backend/uploads/` (dev only).

## Deploy backend on Render

1. Push this repo to GitHub
2. Open [Render Blueprint](https://dashboard.render.com/select-repo?type=blueprint) and select this repository
3. Render reads `render.yaml` and creates:
   - **Web Service** `health-record-nexus-api` (FastAPI)
   - **Postgres** `health-record-nexus-db`
4. After deploy, API URL looks like: `https://health-record-nexus-api.onrender.com`
5. Set frontend `NEXT_PUBLIC_API_URL` to that URL (Vercel env + redeploy)

Health check: `GET /api/health` · Docs: `/docs`

**Note:** Free Render web services sleep after inactivity (cold start ~30–60s). Uploaded files on the free tier are ephemeral unless you add a persistent disk.

## Getting started

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
# from project root
npm install --legacy-peer-deps
# .env.local should contain:
# NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000/login

### Optional: PostgreSQL with Docker

```bash
docker compose up -d
```

Then in `backend/.env`:

```
DATABASE_URL=postgresql+psycopg2://health:health@localhost:5432/health_record
```

## Demo flow

1. Register a **Hospital**
2. Generate a patient **Health ID**
3. Upload a medical record
4. Log in as **Patient** and approve the consent request
5. Hospital can view/download approved records

## API overview

| Method | Path | Role |
|--------|------|------|
| POST | `/api/auth/register/hospital` | public |
| POST | `/api/auth/register/patient` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/patients` | hospital |
| GET | `/api/patients?healthId=` | hospital |
| POST | `/api/records` | hospital (multipart) |
| GET | `/api/records` | patient / hospital |
| GET/POST/PATCH | `/api/consent` | patient / hospital |
| GET | `/api/files/{id}` | authorized |

## License

MIT
