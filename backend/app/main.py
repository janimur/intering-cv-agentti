from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Lataa .env lokaalikehitystä varten (tuotannossa env muuttujat asetetaan muualla)
load_dotenv(Path(__file__).parent.parent.parent / ".env")

from backend.app.metrics import init_db
from backend.app.sessions import SessionStore
from backend.app.api import admin, gdpr, positioning, upload, writers


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Käynnistys: alusta tietokanta ja sessiovarasto
    init_db()
    app.state.session_store = SessionStore()
    yield
    # Sammutus: in-memory sessiot häviävät automaattisesti


app = FastAPI(title="Intering CV-agentti", lifespan=lifespan)

# CORS lokaalille kehitykselle (Vite dev-server portissa 5173, Caddy 80)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:5173", "http://localhost:80"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Reittien rekisteröinti
app.include_router(upload.router, tags=["upload"])
app.include_router(positioning.router, tags=["positioning"])
app.include_router(writers.router, tags=["writers"])
app.include_router(admin.router, tags=["admin"])
app.include_router(gdpr.router, tags=["gdpr"])
