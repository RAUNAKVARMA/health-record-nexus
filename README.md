# Health Record Nexus Secure

Secure backend platform for interoperable medical record exchange with role-based access, patient consent workflows, and encrypted data handling.

Built for **Smart India Hackathon (SIH)** — enables hospitals and patients to share medical records safely with explicit consent at every step.

## Features

- **Hospital portal** — register patients, generate 14-digit Health IDs, upload records, request access to patient history
- **Patient portal** — view approved records, approve or reject upload and access consent requests
- **Consent-first design** — no record is visible until the patient explicitly approves
- **Secure auth** — bcrypt password hashing, JWT sessions via Auth.js
- **File storage** — local disk in development, Vercel Blob in production

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript
- [Prisma](https://www.prisma.io) + PostgreSQL
- [Auth.js](https://authjs.dev) (NextAuth v5)
- [Tailwind CSS](https://tailwindcss.com) + shadcn-style UI components
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for production file uploads

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL database (local Docker, [Neon](https://neon.tech), or Vercel Postgres)

### Setup

```bash
git clone https://github.com/RAUNAKVARMA/health-record-nexus-secure.git
cd health-record-nexus-secure
cp .env.example .env
npm install --legacy-peer-deps
npm run db:push
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login)

### Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret for session signing (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | Set to `true` for production |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (production file uploads only) |

## Demo flow

1. Register a **Hospital** on the login page
2. Generate a patient **Health ID** from the hospital dashboard
3. Upload a medical record (PDF, JPG, PNG, etc.)
4. Log in as **Patient** with the Health ID and approve the consent request
5. Hospital can view and download approved records; other hospitals need a separate access request

## Deploy on Vercel

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com)
2. Add a **Neon Postgres** integration (or set `DATABASE_URL` manually)
3. Add **Vercel Blob** storage for file uploads
4. Set `AUTH_SECRET` and `AUTH_TRUST_HOST=true`
5. Deploy — the build runs `prisma db push` automatically when `DATABASE_URL` is set

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/RAUNAKVARMA/health-record-nexus-secure)

## Project structure

```
src/app/
  login/          Auth & registration
  hospital/       Hospital dashboard
  patient/        Patient dashboard
  api/            REST endpoints (auth, records, consent, files)
prisma/           Database schema
uploads/          Local file storage (dev only)
```

## License

MIT
