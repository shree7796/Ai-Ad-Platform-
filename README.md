# 🚀 AdGen AI — AI-Powered Video Ad Generator

> Transform product images into stunning cinematic marketing videos in seconds.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend   │────▶│   FastAPI     │────▶│   Celery     │
│  (Next.js)   │     │   (API GW)   │     │  (Workers)   │
└─────────────┘     └──────┬───────┘     └──────┬──────┘
                           │                     │
                    ┌──────┴───────┐     ┌──────┴──────┐
                    │  PostgreSQL   │     │  AI Models   │
                    │  (Database)   │     │ (Mock/Pika/  │
                    └──────────────┘     │  Runway)     │
                    ┌──────────────┐     └─────────────┘
                    │    Redis      │
                    │   (Queue)     │     ┌─────────────┐
                    └──────────────┘     │    MinIO      │
                                         │  (Storage)   │
                                         └─────────────┘
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### 1. Clone & Configure

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your settings (optional - works with defaults)
```

### 2. Start All Services

```bash
docker-compose up --build
```

### 3. Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API Docs | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

### 4. Default Flow
1. Register at http://localhost:3000/register
2. Upload a product image
3. Enter a prompt describing your desired ad
4. Watch AI generate your video!

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | FastAPI (Python 3.11) |
| Frontend | Next.js 14 + Tailwind v3 |
| Database | PostgreSQL 16 |
| Queue | Redis 7 + Celery |
| Storage | MinIO (S3-compatible) |
| Processing | FFmpeg |
| Auth | JWT |

## AI Models (Pluggable)

Models are configured in `config/models.yaml`:

| Model | Status | Tier |
|-------|--------|------|
| Mock | ✅ Active | Basic |
| Pika | 🔌 Ready | Basic |
| Runway | 🔌 Stubbed | Premium |

To enable a real model:
1. Set `enabled: true` in `config/models.yaml`
2. Add your API key to `.env`
3. Set `VIDEO_MODEL_PROVIDER=pika` in `.env`

## Project Structure

```
├── backend/           # FastAPI + Celery
│   ├── app/
│   │   ├── ai_models/    # Pluggable model adapters
│   │   ├── api/routes/    # REST endpoints
│   │   ├── models/        # SQLAlchemy ORM
│   │   ├── schemas/       # Pydantic validation
│   │   ├── services/      # Business logic
│   │   └── workers/       # Celery tasks
│   └── Dockerfile
├── frontend/          # Next.js
│   ├── src/app/           # Pages (App Router)
│   ├── src/lib/           # API client, auth
│   └── Dockerfile
├── config/            # YAML configs
│   ├── models.yaml        # AI model definitions
│   └── plans.yaml         # Subscription plans
├── docker-compose.yml
└── .env.example
```

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `VIDEO_MODEL_PROVIDER` — `mock` | `pika` | `runway`
- `LLM_PROVIDER` — `openai` | `mock`
- `LLM_MODEL` — `gpt-4o` | `gpt-4`
- `OPENAI_API_KEY` — Your OpenAI key (for prompt enhancement)

## Development

```bash
# Backend only
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend only
cd frontend && npm install && npm run dev

# Full stack
docker-compose up --build
```

## License

Private — All rights reserved.



## To start all the containers, you should run the following command from your project's root folder (e:\Shivam Project Work\ai video agent):

```bash
docker compose up -d
```

## Additional helpful commands:
# To start and force a rebuild of the images (useful if you install new npm packages or change a Dockerfile):
```bash
docker compose up --build -d
```

# To stop all running containers:
```bash
docker compose down
```

# To view the live logs of all containers:
```bash
docker compose logs -f
```

# To view logs of a specific container (e.g., the NextJS frontend):
```bash
docker compose logs -f frontend
```