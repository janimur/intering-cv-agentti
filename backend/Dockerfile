FROM python:3.11-slim

# Asenna uv
RUN pip install --no-cache-dir uv

WORKDIR /app

# Kopioi riippuvuusmäärittely ja lukko ensin (cache-ystävällisempi)
COPY pyproject.toml uv.lock ./

# Asenna riippuvuudet (ei dev-ryhmää tuotantoon)
RUN uv sync --frozen --no-dev

# Asenna Playwright Chromium ja sen järjestelmäriippuvuudet
RUN uv run playwright install chromium --with-deps

# Kopioi koodi
COPY src/ ./src/
COPY backend/ ./backend/
COPY prompts/ ./prompts/

# Backend ajetaan repon juuresta jotta src/ on PYTHONPATHissa
ENV PYTHONPATH=/app
ENV DATA_DIR=/data

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
