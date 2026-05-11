"""
Yksikkötestit pdf_renderer.py:n _end_date_key ja
_sort_experience_reverse_chronological -funktioille.
"""
import pytest

from backend.app.pdf_renderer import _end_date_key, _sort_experience_reverse_chronological
from src.schemas import CVDocument, CVHeader, ContactInfo, ExperienceEntry


def _entry(period: str, role: str = "Rooli", company: str = "Yritys") -> ExperienceEntry:
    return ExperienceEntry(
        role=role,
        company=company,
        period=period,
        context="Konteksti.",
        results=["Tulos 1", "Tulos 2"],
    )


# --- _end_date_key ---

def test_end_date_key_standard_format():
    entry = _entry("5/2024 – 10/2024")
    year, month, _ = _end_date_key(entry)
    assert year == 2024
    assert month == 10


def test_end_date_key_present_english():
    entry = _entry("3/2023 – present")
    year, month, _ = _end_date_key(entry)
    assert year == 9999
    assert month == 12


def test_end_date_key_present_finnish():
    entry = _entry("3/2023 – nykyinen")
    year, month, _ = _end_date_key(entry)
    assert year == 9999
    assert month == 12


def test_end_date_key_present_em_dash():
    entry = _entry("3/2023 — nykyinen")
    year, month, _ = _end_date_key(entry)
    assert year == 9999
    assert month == 12


def test_end_date_key_end_is_lone_dash():
    # loppupäivä on tyhjä tai vain "—"
    entry = _entry("3/2023 – —")
    year, month, _ = _end_date_key(entry)
    assert year == 9999
    assert month == 12


def test_end_date_key_only_start_date():
    """Jos period on vain alkupäivä ilman väliviivaa, käytetään sitä loppupäivänä."""
    entry = _entry("3/2018")
    year, month, _ = _end_date_key(entry)
    assert year == 2018
    assert month == 3


def test_end_date_key_hyphen_separator():
    """Väliviiva (hyphen) toimii erottimena."""
    entry = _entry("5/2022-10/2023")
    year, month, _ = _end_date_key(entry)
    assert year == 2023
    assert month == 10


def test_end_date_key_en_dash_separator():
    """En-dash (–) toimii erottimena."""
    entry = _entry("5/2022 – 10/2023")
    year, month, _ = _end_date_key(entry)
    assert year == 2023
    assert month == 10


def test_end_date_key_year_only_end():
    """Jos loppupäivässä on vain vuosi, kuukausi defaulttaa 12:ksi."""
    entry = _entry("2018 – 2024")
    year, month, _ = _end_date_key(entry)
    assert year == 2024
    assert month == 12


def test_end_date_key_returns_start_key_as_tiebreaker():
    """Kolmas tuple-arvo (start_key) on positiivinen kun alkupäivä löytyy."""
    entry = _entry("5/2024 – 10/2024")
    _, _, start_key = _end_date_key(entry)
    assert start_key > 0


# --- _sort_experience_reverse_chronological ---

def _cv_with_entries(entries: list[ExperienceEntry]) -> CVDocument:
    return CVDocument(
        header=CVHeader(
            name="Testi Henkilö",
            title="Interim CEO",
            contact=ContactInfo(email="testi@example.com"),
        ),
        positioning_summary="Yhteenveto.",
        key_results=["Tulos 1", "Tulos 2", "Tulos 3"],
        expertise=["GTM", "P&L"],
        experience=entries,
        education=["AMK"],
        certifications=[],
    )


def test_sort_experience_reverse_chronological():
    """
    Syötelista: Tekai (5/2025), Qaraton (8/2025), Witted (3/2024),
                Reactron (10/2024), Taskmill (2/2026)
    Odotettu järjestys: Taskmill, Qaraton, Tekai, Reactron, Witted
    """
    entries = [
        _entry("5/2025 – 5/2025", role="Tekai", company="Tekai"),
        _entry("8/2025 – 8/2025", role="Qaraton", company="Qaraton"),
        _entry("3/2024 – 3/2024", role="Witted", company="Witted"),
        _entry("10/2024 – 10/2024", role="Reactron", company="Reactron"),
        _entry("2/2026 – 2/2026", role="Taskmill", company="Taskmill"),
    ]
    doc = _cv_with_entries(entries)
    sorted_doc = _sort_experience_reverse_chronological(doc)
    companies = [e.company for e in sorted_doc.experience]
    assert companies == ["Taskmill", "Qaraton", "Tekai", "Reactron", "Witted"]


def test_sort_does_not_mutate_original():
    """Alkuperäinen doc ei muutu (model_copy)."""
    entries = [
        _entry("3/2024 – 3/2024", role="Vanha", company="Vanha"),
        _entry("3/2026 – 3/2026", role="Uusi", company="Uusi"),
    ]
    doc = _cv_with_entries(entries)
    original_order = [e.company for e in doc.experience]
    _sort_experience_reverse_chronological(doc)
    assert [e.company for e in doc.experience] == original_order


def test_sort_with_present_role_first():
    """Nykyinen rooli (present) tulee aina ensimmäiseksi."""
    entries = [
        _entry("3/2020 – 3/2022", role="Vanha", company="Vanha"),
        _entry("3/2023 – present", role="Nykyinen", company="Nykyinen"),
        _entry("3/2022 – 3/2023", role="Keski", company="Keski"),
    ]
    doc = _cv_with_entries(entries)
    sorted_doc = _sort_experience_reverse_chronological(doc)
    assert sorted_doc.experience[0].company == "Nykyinen"
