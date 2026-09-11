"""
Yksikkötestit backend/app/sessions.py:n SessionStore-luokalle.
"""
import concurrent.futures
import pytest
from fastapi import HTTPException

from backend.app.sessions import SessionStore
from tests._fixtures import sample_positioning


def test_create_returns_session_with_uuid():
    """create() palauttaa Session jossa generoitu uuid session_id."""
    store = SessionStore()
    session = store.create("CV-teksti")
    assert session.session_id
    assert len(session.session_id) == 36  # UUID4-muoto


def test_create_stores_cv_text():
    """create() tallentaa cv_text sessioon."""
    store = SessionStore()
    session = store.create("CV-teksti testille")
    assert session.cv_text == "CV-teksti testille"


def test_create_stores_linkedin_text():
    """create() tallentaa linkedin_text kun annettu."""
    store = SessionStore()
    session = store.create("CV", linkedin_text="LinkedIn-teksti")
    assert session.linkedin_text == "LinkedIn-teksti"


def test_create_linkedin_text_defaults_to_none():
    """linkedin_text on None jos ei annettu."""
    store = SessionStore()
    session = store.create("CV")
    assert session.linkedin_text is None


def test_get_returns_existing_session():
    """get() palauttaa aiemmin luodun session."""
    store = SessionStore()
    session = store.create("CV")
    fetched = store.get(session.session_id)
    assert fetched.session_id == session.session_id


def test_get_missing_id_raises_404():
    """get() puuttuvalla id:llä → HTTPException 404."""
    store = SessionStore()
    with pytest.raises(HTTPException) as exc_info:
        store.get("00000000-0000-0000-0000-000000000000")
    assert exc_info.value.status_code == 404


def test_all_ids_returns_created_ids():
    """all_ids() listaa luotujen sessioiden id:t."""
    store = SessionStore()
    s1 = store.create("CV1")
    s2 = store.create("CV2")
    ids = store.all_ids()
    assert s1.session_id in ids
    assert s2.session_id in ids


def test_unique_ids_sequential():
    """100 peräkkäistä create()-kutsua → kaikilla uniikki id."""
    store = SessionStore()
    ids = [store.create(f"CV-{i}").session_id for i in range(100)]
    assert len(set(ids)) == 100


def test_unique_ids_concurrent():
    """Rinnakkaiset create()-kutsut → kaikilla uniikki id."""
    store = SessionStore()
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(store.create, f"CV-{i}") for i in range(50)]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result().session_id)
    assert len(set(results)) == 50


def test_session_mutation_persists():
    """Luonnin jälkeen session.positioning = X tallentuu storeen."""
    store = SessionStore()
    session = store.create("CV")
    positioning = sample_positioning()
    store.update(session.session_id, 0, lambda s: setattr(s, "positioning", positioning))
    fetched = store.get(session.session_id)
    assert fetched.positioning is not None
    assert fetched.positioning.positioning.primary_angle == "Testaaja"


def test_iteration_history_initialized():
    """iteration_history on alustettu kaikille kirjoittajatyypeille."""
    store = SessionStore()
    session = store.create("CV")
    assert "linkedin" in session.iteration_history
    assert "cv" in session.iteration_history
    assert "intering" in session.iteration_history
    assert session.iteration_history["linkedin"] == []
