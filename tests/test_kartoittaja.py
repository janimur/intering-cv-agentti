"""
Ajoskripti kartoittajalle. Ei pytest-testi.
Käyttö: uv run python tests/test_kartoittaja.py
"""
import json
from pathlib import Path
from dotenv import load_dotenv

from src.kartoittaja import run_kartoittaja
from src.pdf_reader import extract_text_from_pdf

ROOT = Path(__file__).parent.parent
BASELINE_PATH = ROOT / "tests" / "fixtures" / "jani_baseline.md"
CV_PATH = ROOT / "tmp" / "Interim Manager CV - Jani Muuronen 1_2026.pdf"
OUTPUT_PATH = ROOT / "tests" / "output" / "positioning.json"


def main() -> None:
    load_dotenv()
    print("Luetaan baseline...")
    baseline_text = BASELINE_PATH.read_text(encoding="utf-8")
    print(f"  {len(baseline_text)} merkkiä")

    print("Luetaan CV...")
    cv_text = extract_text_from_pdf(str(CV_PATH))
    print(f"  {len(cv_text)} merkkiä")

    print("Ajetaan kartoittaja (Opus 4.5 + extended thinking)...")
    positioning = run_kartoittaja(baseline_text, cv_text)

    print("\n=== Positioning-dokumentti ===\n")
    print(positioning.model_dump_json(indent=2))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(positioning.model_dump_json(indent=2), encoding="utf-8")
    print(f"\nTallennettu: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
