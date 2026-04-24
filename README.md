# KreaDock — AI Creative Studio

> Full-stack AI platform for text-to-video, story videos, image generation, 3D assets, iGaming assets, and more.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend   │────▶│   FastAPI    │────▶│    Celery    │
│  (Next.js)  │     │   (API GW)   │     │  (Workers)   │
└─────────────┘     └──────┬───────┘     └──────┬───────┘
                           │                     │
                    ┌──────┴───────┐     ┌──────┴───────┐
                    │  PostgreSQL  │     │  AI Models   │
                    │  (Database)  │     │  Fal/OpenAI  │
                    └──────────────┘     │  Kling/Luma  │
                    ┌──────────────┐     └──────────────┘
                    │    Redis     │
                    │   (Queue)    │     ┌──────────────┐
                    └──────────────┘     │    MinIO     │
                                         │  (Storage)   │
                                         └──────────────┘
```

---

## Tech Stack

| Component  | Technology                        |
|------------|-----------------------------------|
| Backend    | FastAPI + Celery (Python 3.10)    |
| Frontend   | Next.js 14 (App Router, TypeScript) |
| Database   | PostgreSQL 16                     |
| Queue      | Redis 7 + Celery                  |
| Storage    | MinIO (S3-compatible)             |
| Processing | FFmpeg                            |
| Auth       | JWT + Google OAuth                |
| Payments   | Stripe                            |

---

## Prerequisites

- **Docker** & **Docker Compose** (recommended — runs everything)
- OR: Python 3.10+, Node.js 18+, PostgreSQL, Redis, MinIO, FFmpeg

---

## Quick Start (Docker)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd Ai-Ad-Platform-

# 2. Copy the environment file and fill in your keys (see section below)
cp .env .env.local   # or just edit .env directly

# 3. Build and start all services
docker compose up --build -d

# 4. Run database migrations (first time only)
docker compose exec api alembic upgrade head

# 5. Seed AI model definitions (first time only)
docker compose exec api python seed_models.py
```

| Service        | URL                          |
|----------------|------------------------------|
| App (Frontend) | http://localhost:3000        |
| API Docs       | http://localhost:8000/docs   |
| MinIO Console  | http://localhost:9001        |

---

## Environment Variables — What You Must Set

Open `.env` and fill in **every value marked below**. The others have working defaults for local dev.

### 🔑 Required — App Security

```env
SECRET_KEY=<generate a random 64-char string>
JWT_SECRET=<generate a different random 64-char string>
```

Generate them with:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

### 🗄️ Database (PostgreSQL)

```env
POSTGRES_USER=adgen
POSTGRES_PASSWORD=adgen_secret      # change in production
POSTGRES_DB=adgen_db
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5455
DATABASE_URL=postgresql+asyncpg://adgen:adgen_secret@127.0.0.1:5455/adgen_db
```

---

### 📦 Object Storage (MinIO / S3)

```env
STORAGE_ENDPOINT=http://127.0.0.1:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin        # change in production
STORAGE_BUCKET=adgen-media
STORAGE_PUBLIC_URL=http://localhost:9000
```

---

### 🤖 AI APIs — Required for real generation

```env
# OpenAI (used for GPT story scripts + TTS narration)
OPENAI_API_KEY=sk-...

# Fal.ai  (used for Text-to-Video, Image-to-Video, 3D, iGaming assets)
FAL_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Get keys from:
- OpenAI → https://platform.openai.com/api-keys
- Fal.ai  → https://fal.ai/dashboard

---

### 💳 Stripe (Payments)

```env
STRIPE_SECRET_KEY=sk_test_...          # or sk_live_... in production
STRIPE_WEBHOOK_SECRET=whsec_...

# Recurring price IDs — create these in Stripe Dashboard → Products
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_PREMIUM=price_...
```

**How to set up Stripe:**
1. Go to https://dashboard.stripe.com
2. Create 3 products: **Basic ($12/mo)**, **Pro ($29/mo)**, **Studio ($59/mo)**
3. Copy each product's **Price ID** (`price_xxx`) into `.env`
4. Create a webhook endpoint pointing to `https://yourdomain.com/api/v1/billing/webhook`
5. Copy the **Webhook Signing Secret** (`whsec_xxx`) into `.env`

For local testing use [Stripe CLI](https://stripe.com/docs/stripe-cli):
```bash
stripe listen --forward-to localhost:8000/api/v1/billing/webhook
```

---

### 📧 SendGrid (Email Verification)

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@yourdomain.com   # must be a verified sender in SendGrid
EMAIL_FROM_NAME=KreaDock
EMAIL_VERIFICATION_REQUIRED=false           # set to true to enforce email verification
```

**How to set up SendGrid:**
1. Sign up at https://sendgrid.com (free — 100 emails/day forever)
2. Go to **Settings → API Keys → Create API Key**
   - Permission: **Restricted Access → Mail Send** (Full Access)
   - Copy the key into `.env` as `SENDGRID_API_KEY`
3. Go to **Settings → Sender Authentication**
   - Either verify a **Single Sender** (quick, good for testing) or set up **Domain Authentication** (production recommended)
   - Set the verified address as `EMAIL_FROM_ADDRESS`
4. Set `EMAIL_VERIFICATION_REQUIRED=true` when you want to enforce it

> **Local dev tip:** Leave `SENDGRID_API_KEY` empty and `EMAIL_VERIFICATION_REQUIRED=false`. The backend will print the verification link to the console logs so you can click it without any email setup.

---

### 🔐 Google OAuth (Sign in with Google)

```env
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
# Production: https://api.yourdomain.com/api/v1/auth/google/callback
```

**How to create Google OAuth credentials:**
1. Go to https://console.cloud.google.com
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services → OAuth consent screen**
   - Choose **External**
   - Fill in App name, support email, developer email → Save
4. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs — add:
     - `http://localhost:8000/api/v1/auth/google/callback` (local dev)
     - `https://api.yourdomain.com/api/v1/auth/google/callback` (production)
5. Copy the **Client ID** and **Client Secret** into `.env`
6. Under **OAuth consent screen → Test users**, add your email while the app is in testing mode

---

### 🌐 Public URLs

```env
PUBLIC_APP_URL=http://localhost:3000      # where users access the frontend
NEXT_PUBLIC_API_URL=/api/v1               # keep this as-is for Docker
BACKEND_INTERNAL_URL=http://localhost:8000
```

In production change `PUBLIC_APP_URL` to your real domain, e.g. `https://kreadock.ai`.

---

## Running Database Migrations

```bash
# Apply all pending migrations
docker compose exec api alembic upgrade head

# Create a new migration after changing a model
docker compose exec api alembic revision --autogenerate -m "describe_change"
```

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── ai_models/       # Pluggable model adapters (Fal, Kling, Luma…)
│   │   ├── api/routes/      # REST endpoints (auth, generation, billing…)
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic (orchestrator, billing, storage…)
│   │   └── workers/         # Celery tasks (video, story, 3D, iGaming…)
│   ├── alembic/             # DB migration scripts
│   └── Dockerfile
├── frontend/
│   ├── src/app/             # Next.js pages (App Router)
│   ├── src/components/      # UI components (Studio, Landing…)
│   └── src/lib/             # API client, auth helpers
├── config/
│   ├── models.yaml          # AI model definitions
│   ├── plans.yaml           # Subscription plan limits
│   └── credits.yaml         # Credit costs per generation type
├── docker-compose.yml
└── .env
```

---

## Useful Docker Commands

```bash
# Start everything (detached)
docker compose up -d

# Rebuild after code changes
docker compose up --build -d

# Stop all containers
docker compose down

# Live logs (all services)
docker compose logs -f

# Logs for a single service
docker compose logs -f frontend
docker compose logs -f api
docker compose logs -f worker

# Open a shell inside the API container
docker compose exec api bash
```

---

## Development (without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Celery worker (separate terminal)
cd backend
celery -A app.celery_app worker --loglevel=info

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Subscription Plans

Plans are defined in `config/plans.yaml`. Credit costs per generation are in `config/credits.yaml`.

| Plan   | Price   | Monthly Credits | Features                          |
|--------|---------|-----------------|-----------------------------------|
| Free   | $0      | 500             | Basic generations                 |
| Basic  | $12/mo  | 5,000           | + Story Studio, higher limits     |
| Pro    | $29/mo  | 15,000          | + Priority queue, all models      |
| Studio | $59/mo  | 50,000          | + All features, max scene counts  |

---

## License

Private — All rights reserved.
