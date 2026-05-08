from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Lataa .env lokaalikehitystä varten (tuotannossa env muuttujat asetetaan muualla)
load_dotenv(Path(__file__).parent.parent.parent / ".env")

from backend.app.metrics import init_db
from backend.app.pdf_renderer import start_browser, stop_browser
from backend.app.sessions import SessionStore
from backend.app.api import admin, cv_pdf, gdpr, positioning, upload, writers


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Käynnistys: alusta tietokanta, sessiovarasto ja Playwright-selain
    init_db()
    app.state.session_store = SessionStore()
    playwright, browser = await start_browser()
    app.state.playwright = playwright
    app.state.browser = browser
    yield
    # Sammutus: sulje selain ja Playwright
    await stop_browser(app.state.playwright, app.state.browser)


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
app.include_router(cv_pdf.router, tags=["pdf"])
app.include_router(admin.router, tags=["admin"])
app.include_router(gdpr.router, tags=["gdpr"])
