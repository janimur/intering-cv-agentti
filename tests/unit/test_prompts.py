"""
Yksikkotestit src/prompts.py:lle.
"""
import pytest
from pathlib import Path


@pytest.fixture
def prompts_module(tmp_path, monkeypatch):
    """
    Palauttaa prompts-moduulin jossa DATA_DIR osoittaa tmp_path:iin.
    """
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    import importlib
    import src.prompts as prompts
    importlib.reload(prompts)
    yield prompts
    monkeypatch.delenv("DATA_DIR", raising=False)
    importlib.reload(prompts)


def test_load_prompt_returns_default_when_no_overlay(prompts_module):
    """load_prompt lataa oletusprompting kun overlayta ei ole."""
    name = "kartoittaja_system"
    content = prompts_module.load_prompt(name)
    assert isinstance(content, str)
    assert len(content) > 0


def test_load_prompt_returns_overlay_when_exists(prompts_module, tmp_path):
    """load_prompt lataa overlayn kun se on olemassa."""
    name = "kartoittaja_system"
    overlay_dir = tmp_path / "prompts"
    overlay_dir.mkdir(parents=True, exist_ok=True)
    (overlay_dir / f"{name}.md").write_text("Muokattu prompti", encoding="utf-8")

    content = prompts_module.load_prompt(name)
    assert content == "Muokattu prompti"


def test_save_prompt_creates_overlay_file(prompts_module, tmp_path):
    """save_prompt luo overlay-tiedoston."""
    name = "kirjoittaja_cv_system"
    prompts_module.save_prompt(name, "Uusi sisalto")

    overlay = tmp_path / "prompts" / f"{name}.md"
    assert overlay.exists()
    assert overlay.read_text(encoding="utf-8") == "Uusi sisalto"


def test_reset_prompt_removes_overlay(prompts_module, tmp_path):
    """reset_prompt poistaa overlay-tiedoston."""
    name = "kirjoittaja_linkedin_system"
    overlay_dir = tmp_path / "prompts"
    overlay_dir.mkdir(parents=True, exist_ok=True)
    (overlay_dir / f"{name}.md").write_text("Jotain", encoding="utf-8")

    prompts_module.reset_prompt(name)

    assert not (overlay_dir / f"{name}.md").exists()


def test_reset_prompt_is_noop_when_no_overlay(prompts_module):
    """reset_prompt ei kaadu kun overlayta ei ole."""
    prompts_module.reset_prompt("kirjoittaja_intering_system")  # ei nosta


def test_has_overlay_false_when_no_overlay(prompts_module):
    """has_overlay palauttaa False kun overlayta ei ole."""
    assert prompts_module.has_overlay("kartoittaja_system") is False


def test_has_overlay_true_when_overlay_exists(prompts_module, tmp_path):
    """has_overlay palauttaa True kun overlay on olemassa."""
    name = "kirjoittaja_cv_system"
    overlay_dir = tmp_path / "prompts"
    overlay_dir.mkdir(parents=True, exist_ok=True)
    (overlay_dir / f"{name}.md").write_text("Jotain", encoding="utf-8")

    assert prompts_module.has_overlay(name) is True


def test_load_prompt_raises_for_unknown_name(prompts_module):
    """load_prompt nostaa ValueError tuntemattomalle nimelle."""
    with pytest.raises(ValueError, match="Tuntematon prompti"):
        prompts_module.load_prompt("ei_olemassa_oleva_prompti")


def test_save_prompt_raises_for_unknown_name(prompts_module):
    """save_prompt nostaa ValueError tuntemattomalle nimelle."""
    with pytest.raises(ValueError, match="Tuntematon prompti"):
        prompts_module.save_prompt("virheellinen_nimi", "sisalto")


def test_reset_prompt_raises_for_unknown_name(prompts_module):
    """reset_prompt nostaa ValueError tuntemattomalle nimelle."""
    with pytest.raises(ValueError, match="Tuntematon prompti"):
        prompts_module.reset_prompt("virheellinen_nimi")
