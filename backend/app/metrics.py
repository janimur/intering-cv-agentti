import os
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Iterator

# DATA_DIR: lokaalisti projektin juuri + data/, tuotannossa /data
DATA_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).parent.parent.parent / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "metrics.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_type TEXT NOT NULL,
    started_at TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    success INTEGER NOT NULL,
    error_type TEXT
);
"""


def init_db() -> None:
    """Alusta tietokanta käynnistyksen yhteydessä."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.executescript(SCHEMA)


@contextmanager
def _connection() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def record_run(run_type: str, duration_ms: int, success: bool, error_type: str | None = None) -> None:
    """Kirjaa yksi ajosuoritus tietokantaan."""
    with _connection() as conn:
        conn.execute(
            "INSERT INTO runs (run_type, started_at, duration_ms, success, error_type) VALUES (?, ?, ?, ?, ?)",
            (run_type, datetime.utcnow().isoformat(), duration_ms, int(success), error_type),
        )


def summary() -> dict:
    """Palauttaa yhteenvedon kaikista ajoista."""
    with _connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM runs").fetchone()[0]
        by_type = dict(
            conn.execute("SELECT run_type, COUNT(*) FROM runs GROUP BY run_type").fetchall()
        )
        avg_ms = conn.execute(
            "SELECT AVG(duration_ms) FROM runs WHERE success = 1"
        ).fetchone()[0] or 0
        errors = conn.execute("SELECT COUNT(*) FROM runs WHERE success = 0").fetchone()[0]
    return {
        "total_runs": total,
        "runs_by_type": by_type,
        "avg_duration_ms": int(avg_ms),
        "error_count": errors,
    }


@contextmanager
def measure(run_type: str) -> Iterator[None]:
    """Context manager joka mittaa suoritusajan ja kirjaa tuloksen."""
    start = time.monotonic()
    error_type: str | None = None
    success = True
    try:
        yield
    except Exception as e:
        success = False
        error_type = type(e).__name__
        raise
    finally:
        duration_ms = int((time.monotonic() - start) * 1000)
        record_run(run_type, duration_ms, success, error_type)
