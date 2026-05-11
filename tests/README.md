# Testit

## Rakenne

```
tests/
├── unit/                        # pytest-yksikkötestit (nopeat, ei API-kutsuja)
│   ├── test_pdf_renderer_sort.py  # _end_date_key ja lajittelu
│   ├── test_pdf_reader.py         # PDF-tekstinluku
│   ├── test_schemas.py            # Pydantic-validoinnit
│   ├── test_sessions.py           # SessionStore
│   └── test_metrics.py            # SQLite-metriikat ja context manager
├── api/                         # pytest TestClient -testit (nopeat, Anthropic + Playwright mockattu)
│   ├── conftest.py                # Jaetut fixturet ja TestClient
│   ├── test_upload.py             # POST /api/upload
│   ├── test_positioning.py        # POST/PATCH /api/positioning
│   ├── test_writers.py            # POST /api/writers/*
│   └── test_misc.py               # GET /api/gdpr, GET /api/metrics
├── _fixtures.py                 # Jaetut Pydantic-objektit testeille
├── test_kartoittaja.py          # MANUAALINEN ajoskripti (ks. alla)
└── test_kirjoittajat.py         # MANUAALINEN ajoskripti (ks. alla)
```

## Pytest-testien ajaminen

```bash
# Kaikki yksikkö- ja API-testit
uv run pytest tests/unit tests/api

# Vain yksikkötestit (erittäin nopeat, ~0.3s)
uv run pytest tests/unit -v

# Vain API-testit (nopeat, ~3min johtuen asyncio.to_thread-overhead)
uv run pytest tests/api -v
```

## Manuaaliset integraatio-ajoskriptit

`tests/test_kartoittaja.py` ja `tests/test_kirjoittajat.py` ovat **manuaalisia integraatio-ajoskriptejä** jotka tekevät oikeita Anthropic API -kutsuja. Ne:

- Vaativat `ANTHROPIC_API_KEY`-ympäristömuuttujan
- Käyttävät oikeaa CV-PDF:ää `tmp/`-hakemistosta
- Kirjoittavat tulokset `tests/output/`-hakemistoon
- Ajetaan kun halutaan päivittää testidata tai validoida prompt-muutokset
- **EIVÄT ole osa pytest-suiteta** (pytest ei löydä niitä `testpaths`-konfiguraation vuoksi)

```bash
# Päivitä positioning.json
uv run python tests/test_kartoittaja.py

# Päivitä linkedin.json, cv.json, intering.json
uv run python tests/test_kirjoittajat.py

# Evaluoi tulokset (12 kriteeriä)
uv run python evaluate.py
```
