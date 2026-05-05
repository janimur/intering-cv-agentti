"""
Ajoskripti kartoittajalle. Ei pytest-testi.
Käyttö: uv run python tests/test_kartoittaja.py

Tuotannossa input on CV (+ LinkedIn-teksti hyvässä tapauksessa).
Tämä testi mallintaa tuotannon tilannetta — baseline.md on optional ja
oletuksena pois käytöstä. Aja `USE_BASELINE=1` ympäristömuuttujalla jos
haluat käyttää myös käsin koottua perustietoa.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

from src.kartoittaja import run_kartoittaja
from src.pdf_reader import extract_text_from_pdf
from tests._inputs import load_linkedin_text

ROOT = Path(__file__).parent.parent
BASELINE_PATH = ROOT / "tests" / "fixtures" / "jani_baseline.md"
CV_PATH = ROOT / "tmp" / "Interim Manager CV - Jani Muuronen 1_2026.pdf"
OUTPUT_PATH = ROOT / "tests" / "output" / "positioning.json"


def main() -> None:
    load_dotenv()

    print("Luetaan CV...")
    cv_text = extract_text_from_pdf(str(CV_PATH))
    print(f"  {len(cv_text)} merkkiä")

    linkedin_text = load_linkedin_text()
    if linkedin_text:
        print(f"Luetaan LinkedIn-teksti: {len(linkedin_text)} merkkiä")
    else:
        print("LinkedIn-tekstiä ei löytynyt — ajetaan vain CV:llä")

    baseline_text: str | None = None
    if os.environ.get("USE_BASELINE") == "1" and BASELINE_PATH.exists():
        baseline_text = BASELINE_PATH.read_text(encoding="utf-8")
        print(f"USE_BASELINE=1: lisätään perustiedot ({len(baseline_text)} merkkiä)")

    print("Ajetaan kartoittaja (Opus 4.7 + adaptive thinking)...")
    positioning = run_kartoittaja(
        cv_text=cv_text,
        linkedin_text=linkedin_text,
        baseline_text=baseline_text,
    )

    print("\n=== Positioning-dokumentti ===\n")
    print(positioning.model_dump_json(indent=2))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(positioning.model_dump_json(indent=2), encoding="utf-8")
    print(f"\nTallennettu: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
