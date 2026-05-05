"""
Ajoskripti kirjoittajille. Lukee kartoittajan outputin ja ajaa kolme
kirjoittajaa sekventiaalisesti.

Käyttö: uv run python tests/test_kirjoittajat.py

Vaatii että tests/output/positioning.json on luotu (aja test_kartoittaja.py ensin).
"""
from pathlib import Path
from dotenv import load_dotenv

from src.kirjoittajat import (
    run_linkedin_writer,
    run_cv_writer,
    run_intering_writer,
)
from src.pdf_reader import extract_text_from_pdf
from src.schemas import PositioningDocument

ROOT = Path(__file__).parent.parent
POSITIONING_PATH = ROOT / "tests" / "output" / "positioning.json"
CV_PATH = ROOT / "tmp" / "Interim Manager CV - Jani Muuronen 1_2026.pdf"
LINKEDIN_OUT = ROOT / "tests" / "output" / "linkedin.json"
CV_OUT = ROOT / "tests" / "output" / "cv.json"
INTERING_OUT = ROOT / "tests" / "output" / "intering.json"


def main() -> None:
    load_dotenv()

    if not POSITIONING_PATH.exists():
        raise FileNotFoundError(
            f"{POSITIONING_PATH} puuttuu. Aja ensin: "
            "uv run python tests/test_kartoittaja.py"
        )

    print("Luetaan positioning ja CV...")
    positioning = PositioningDocument.model_validate_json(
        POSITIONING_PATH.read_text(encoding="utf-8")
    )
    cv_text = extract_text_from_pdf(str(CV_PATH))
    print(f"  CV-teksti: {len(cv_text)} merkkiä")

    results = {}

    # LinkedIn
    print("\n[1/3] Ajetaan LinkedIn-kirjoittaja (Opus 4.7)...")
    try:
        linkedin = run_linkedin_writer(positioning, cv_text)
        LINKEDIN_OUT.write_text(linkedin.model_dump_json(indent=2), encoding="utf-8")
        print(f"  Tallennettu: {LINKEDIN_OUT}")
        print(f"  Headline ({len(linkedin.headline)} merkkiä): {linkedin.headline}")
        print(f"  About: {len(linkedin.about)} merkkiä")
        print(f"  Experience: {len(linkedin.experience)} roolia")
        results["linkedin"] = "OK"
    except Exception as e:
        results["linkedin"] = f"VIRHE: {e}"
        print(f"  VIRHE: {e}")

    # CV
    print("\n[2/3] Ajetaan CV-kirjoittaja (Opus 4.7)...")
    try:
        cv = run_cv_writer(positioning, cv_text)
        CV_OUT.write_text(cv.model_dump_json(indent=2), encoding="utf-8")
        print(f"  Tallennettu: {CV_OUT}")
        print(f"  Title: {cv.header.title}")
        print(f"  Experience: {len(cv.experience)} roolia")
        print(f"  Key results: {len(cv.key_results)}")
        results["cv"] = "OK"
    except Exception as e:
        results["cv"] = f"VIRHE: {e}"
        print(f"  VIRHE: {e}")

    # Intering
    print("\n[3/3] Ajetaan intering-kirjoittaja (Opus 4.7)...")
    try:
        intering = run_intering_writer(positioning, cv_text)
        INTERING_OUT.write_text(intering.model_dump_json(indent=2), encoding="utf-8")
        print(f"  Tallennettu: {INTERING_OUT}")
        print(f"  Hook: {intering.hook}")
        print(f"  Tuotekortit: {len(intering.product_cards)}")
        print(f"  Profile sections: {list(intering.profile_sections.keys())}")
        results["intering"] = "OK"
    except Exception as e:
        results["intering"] = f"VIRHE: {e}"
        print(f"  VIRHE: {e}")

    print("\n=== Yhteenveto ===")
    for k, v in results.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
