"""
Yksikkötestit backend/app/metrics.py:lle.
"""
import importlib
import pytest
from pathlib import Path


@pytest.fixture
def metrics_module(tmp_path, monkeypatch):
    """
    Palauttaa metrics-moduulin uudelleenladattuna tmp-hakemiston DB:llä.
    Monkeypatch ympäristömuuttuja ennen uudelleenlatausta jotta DB_PATH päivittyy.
    """
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    import backend.app.metrics as metrics
    importlib.reload(metrics)
    yield metrics
    # Palauta moduuli normaalitilaan
    monkeypatch.delenv("DATA_DIR", raising=False)
    importlib.reload(metrics)


def test_init_db_creates_table(metrics_module):
    """init_db() luo runs-taulun."""
    import sqlite3
    metrics_module.init_db()
    with sqlite3.connect(metrics_module.DB_PATH) as conn:
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='runs'"
        ).fetchall()
    assert len(tables) == 1


def test_record_run_inserts_row(metrics_module):
    """record_run() tallentaa yhden rivin tietokantaan."""
    import sqlite3
    metrics_module.init_db()
    metrics_module.record_run("kartoittaja", duration_ms=1200, success=True)
    with sqlite3.connect(metrics_module.DB_PATH) as conn:
        count = conn.execute("SELECT COUNT(*) FROM runs").fetchone()[0]
    assert count == 1


def test_record_run_stores_fields(metrics_module):
    """record_run() tallentaa oikeat kenttäarvot."""
    import sqlite3
    metrics_module.init_db()
    metrics_module.record_run("linkedin", duration_ms=500, success=False, error_type="ValueError")
    with sqlite3.connect(metrics_module.DB_PATH) as conn:
        row = conn.execute(
            "SELECT run_type, duration_ms, success, error_type FROM runs"
        ).fetchone()
    assert row[0] == "linkedin"
    assert row[1] == 500
    assert row[2] == 0  # success=False → 0
    assert row[3] == "ValueError"


def test_summary_total_runs(metrics_module):
    """summary() palauttaa oikean total_runs."""
    metrics_module.init_db()
    metrics_module.record_run("kartoittaja", 1000, True)
    metrics_module.record_run("linkedin", 800, True)
    result = metrics_module.summary()
    assert result["total_runs"] == 2


def test_summary_runs_by_type(metrics_module):
    """summary() palauttaa oikeat runs_by_type."""
    metrics_module.init_db()
    metrics_module.record_run("kartoittaja", 1000, True)
    metrics_module.record_run("kartoittaja", 900, True)
    metrics_module.record_run("linkedin", 800, True)
    result = metrics_module.summary()
    assert result["runs_by_type"]["kartoittaja"] == 2
    assert result["runs_by_type"]["linkedin"] == 1


def test_summary_avg_duration_ms(metrics_module):
    """summary() palauttaa oikean avg_duration_ms (vain success=True)."""
    metrics_module.init_db()
    metrics_module.record_run("kartoittaja", 1000, True)
    metrics_module.record_run("kartoittaja", 2000, True)
    metrics_module.record_run("kartoittaja", 999, False)  # ei mukaan keskiarvoon
    result = metrics_module.summary()
    assert result["avg_duration_ms"] == 1500


def test_summary_error_count(metrics_module):
    """summary() palauttaa oikean error_count."""
    metrics_module.init_db()
    metrics_module.record_run("kartoittaja", 1000, True)
    metrics_module.record_run("linkedin", 500, False, "RuntimeError")
    metrics_module.record_run("cv", 600, False, "ValueError")
    result = metrics_module.summary()
    assert result["error_count"] == 2


def test_measure_success(metrics_module):
    """measure() kirjaa onnistuneen suorituksen."""
    import sqlite3
    metrics_module.init_db()
    with metrics_module.measure("test"):
        pass
    with sqlite3.connect(metrics_module.DB_PATH) as conn:
        row = conn.execute(
            "SELECT success, error_type FROM runs"
        ).fetchone()
    assert row[0] == 1  # success=True → 1
    assert row[1] is None


def test_measure_success_duration_positive(metrics_module):
    """measure() kirjaa positiivisen duration_ms."""
    import sqlite3
    metrics_module.init_db()
    with metrics_module.measure("test"):
        pass
    with sqlite3.connect(metrics_module.DB_PATH) as conn:
        row = conn.execute("SELECT duration_ms FROM runs").fetchone()
    assert row[0] >= 0


def test_measure_exception_records_failure(metrics_module):
    """measure() poikkeuksen kanssa → record_run(success=False, error_type='ValueError')."""
    import sqlite3
    metrics_module.init_db()
    with pytest.raises(ValueError):
        with metrics_module.measure("test"):
            raise ValueError("testivirhe")
    with sqlite3.connect(metrics_module.DB_PATH) as conn:
        row = conn.execute(
            "SELECT success, error_type FROM runs"
        ).fetchone()
    assert row[0] == 0  # success=False → 0
    assert row[1] == "ValueError"


def test_measure_exception_propagates(metrics_module):
    """measure() nostaa poikkeuksen uudelleen."""
    metrics_module.init_db()
    with pytest.raises(RuntimeError, match="testi"):
        with metrics_module.measure("test"):
            raise RuntimeError("testi")
