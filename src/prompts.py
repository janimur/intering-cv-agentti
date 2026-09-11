"""
Promptin lataus overlay-mekanismilla.

Develop-time-promptit ovat `prompts/`-hakemistossa (gitissä).
Runtime-muokatut promptit asuvat `${DATA_DIR}/prompts/`-hakemistossa
(Docker-volumessa, ei gitissä). Jos overlay-tiedosto on, sitä käytetään —
muuten fallback developmentin promptiin.

Tämä mahdollistaa adminin tekemät prompti-muutokset ilman koodimuutoksia
ja ilman gitin koskemista.
"""
import os
import hashlib
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
DEFAULT_PROMPTS_DIR = REPO_ROOT / "prompts"


def _overlay_dir() -> Path:
    data_dir = Path(os.environ.get("DATA_DIR", REPO_ROOT / "data"))
    return data_dir / "prompts"


# Kaikkien tunnettujen promptien nimet (ilman .md-päätettä)
PROMPT_NAMES = [
    "yhteiset_saannot",
    "kartoituksen_ohje",
    "suomalainen_interim_markkina",
    "tyypilliset_interim_positiointikulmat",
    "kartoittaja_system",
    "kirjoittaja_linkedin_system",
    "kirjoittaja_cv_system",
    "kirjoittaja_intering_system",
]


def load_prompt(name: str) -> str:
    """
    Lataa promptin nimellä (ilman .md-päätettä). Tarkistaa ensin overlay-
    hakemiston ${DATA_DIR}/prompts/, sitten fallbackina prompts/.
    """
    if name not in PROMPT_NAMES:
        raise ValueError(f"Tuntematon prompti: {name}")

    overlay = _overlay_dir() / f"{name}.md"
    if overlay.exists():
        return overlay.read_text(encoding="utf-8")

    default = DEFAULT_PROMPTS_DIR / f"{name}.md"
    return default.read_text(encoding="utf-8")


def save_prompt(name: str, content: str) -> None:
    """Tallenna admin-muokattu prompti overlay-hakemistoon."""
    if name not in PROMPT_NAMES:
        raise ValueError(f"Tuntematon prompti: {name}")
    overlay = _overlay_dir()
    overlay.mkdir(parents=True, exist_ok=True)
    (overlay / f"{name}.md").write_text(content, encoding="utf-8")


def reset_prompt(name: str) -> None:
    """Poista overlay -> seuraava lataus palauttaa develop-time-version."""
    if name not in PROMPT_NAMES:
        raise ValueError(f"Tuntematon prompti: {name}")
    overlay = _overlay_dir() / f"{name}.md"
    if overlay.exists():
        overlay.unlink()


def has_overlay(name: str) -> bool:
    """Onko admin muokannut taman promptin?"""
    return (_overlay_dir() / f"{name}.md").exists()


def compose_prompt(name: str) -> str:
    """Read every module afresh; shared rules precede role-specific instructions."""
    modules = ["yhteiset_saannot", "suomalainen_interim_markkina", "tyypilliset_interim_positiointikulmat", name]
    if name == "kartoittaja_system":
        modules.append("kartoituksen_ohje")
    return "\n\n---\n\n".join(load_prompt(module) for module in modules)


def prompt_checksum(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()
