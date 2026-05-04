"""
Evaluointiskripti intering CV-agentti -projektin tuottamille outputeille.

Käyttö: uv run python evaluate.py
Exit-koodi: 0 jos kaikki kriteerit OK (varoitukset sallitaan), 1 jos vähintään yksi epäonnistuu
"""
import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

from src.schemas import CVDocument, InteringOutput, LinkedInOutput, PositioningDocument

ROOT = Path(__file__).parent
OUTPUT_DIR = ROOT / "tests" / "output"

FORBIDDEN_PATTERNS = [
    r"\bsynergia",
    r"\bstakeholder",
    r"\bleverage",
    r"\bskaalata\b",
    r"\bdrive\b",
]

PASS = "OK"
WARN = "VAROITUS"
FAIL = "EPÄONNISTUI"


def find_forbidden_words(text: str) -> list[str]:
    """Palauttaa kiellettyjen sanojen löydöt tekstistä (lowercased)."""
    found = []
    text_lower = text.lower()
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, text_lower):
            found.append(pattern.strip(r"\b"))
    return found


def has_emoji(text: str) -> bool:
    return any(unicodedata.category(c) == "So" for c in text)


def all_strings_in_dict(d) -> list[str]:
    """Kerää kaikki merkkijonot rekursiivisesti."""
    out = []
    if isinstance(d, dict):
        for v in d.values():
            out.extend(all_strings_in_dict(v))
    elif isinstance(d, list):
        for item in d:
            out.extend(all_strings_in_dict(item))
    elif isinstance(d, str):
        out.append(d)
    return out


def main() -> int:
    print(f"Evaluointiraportti — {date.today().isoformat()}\n")
    failures = 0
    warnings = 0

    # --- Kartoittaja ---
    print("Kartoittaja")
    pos_path = OUTPUT_DIR / "positioning.json"
    try:
        pos_raw = json.loads(pos_path.read_text(encoding="utf-8"))
        pos = PositioningDocument.model_validate(pos_raw)
        print(f"  [{PASS}] JSON validi ja parsittavissa")
    except Exception as e:
        print(f"  [{FAIL}] JSON validointi: {e}")
        failures += 1
        return 1  # Ilman positioningia ei voi jatkaa

    # 2. Kaikki kentät täytetty
    pos_dict = pos.model_dump()
    empty_fields: list[str] = []

    def check_filled(obj, prefix=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                check_filled(v, f"{prefix}{k}.")
        elif isinstance(obj, list):
            if len(obj) == 0:
                empty_fields.append(prefix.rstrip("."))
            for i, item in enumerate(obj):
                check_filled(item, f"{prefix}[{i}].")
        elif obj is None or obj == "":
            empty_fields.append(prefix.rstrip("."))

    check_filled(pos_dict)
    if empty_fields:
        print(f"  [{FAIL}] Tyhjiä kenttiä: {empty_fields}")
        failures += 1
    else:
        print(f"  [{PASS}] Kaikki kentät täytetty")

    # 3. flagship_story sisältää numeron
    if re.search(r"\d", pos.evidence.flagship_story.result_quantified):
        print(f"  [{PASS}] Flagship story sisältää mitattavan tuloksen")
    else:
        print(f"  [{FAIL}] Flagship story ei sisällä numeroa")
        failures += 1

    # --- LinkedIn ---
    print("\nLinkedIn")
    li_path = OUTPUT_DIR / "linkedin.json"
    li = None
    try:
        li_raw = json.loads(li_path.read_text(encoding="utf-8"))
        li = LinkedInOutput.model_validate(li_raw)
        print(f"  [{PASS}] JSON validi ja parsittavissa")
    except Exception as e:
        print(f"  [{FAIL}] JSON validointi: {e}")
        failures += 1
        li_raw = None

    if li and li_raw:
        # 4. headline ≤ 220
        if len(li.headline) <= 220:
            print(f"  [{PASS}] Headline: {len(li.headline)} merkkiä (max 220)")
        else:
            print(f"  [{FAIL}] Headline: {len(li.headline)} merkkiä (yli 220)")
            failures += 1

        # 5. about 1500–2000
        about_len = len(li.about)
        if 1500 <= about_len <= 2000:
            print(f"  [{PASS}] About: {about_len} merkkiä (tavoite 1500–2000)")
        else:
            print(f"  [{WARN}] About: {about_len} merkkiä (tavoite 1500–2000) — tarkista manuaalisesti")
            warnings += 1

        # 6. ei kiellettyjä sanoja
        all_text = "\n".join(all_strings_in_dict(li_raw))
        forbidden = find_forbidden_words(all_text)
        if not forbidden:
            print(f"  [{PASS}] Ei kiellettyjä sanoja")
        else:
            print(f"  [{FAIL}] Kiellettyjä sanoja: {forbidden}")
            failures += 1

    # --- CV ---
    print("\nCV")
    cv_path = OUTPUT_DIR / "cv.json"
    cv = None
    try:
        cv_raw = json.loads(cv_path.read_text(encoding="utf-8"))
        cv = CVDocument.model_validate(cv_raw)
        print(f"  [{PASS}] JSON validi ja parsittavissa")
    except Exception as e:
        print(f"  [{FAIL}] JSON validointi: {e}")
        failures += 1
        cv_raw = None

    if cv and cv_raw:
        # 8. jokaisella roolilla >=2 results
        bad_roles = [
            f"{e.role} @ {e.company}" for e in cv.experience if len(e.results) < 2
        ]
        if not bad_roles:
            print(f"  [{PASS}] Kaikilla rooleilla väh. 2 mitattavaa tulosta")
        else:
            print(f"  [{FAIL}] Roolit alle 2 tuloksella: {bad_roles}")
            failures += 1

        # 9. ei kiellettyjä sanoja
        all_text = "\n".join(all_strings_in_dict(cv_raw))
        forbidden = find_forbidden_words(all_text)
        if not forbidden:
            print(f"  [{PASS}] Ei kiellettyjä sanoja")
        else:
            print(f"  [{FAIL}] Kiellettyjä sanoja: {forbidden}")
            failures += 1

    # --- Intering ---
    print("\nIntering")
    int_path = OUTPUT_DIR / "intering.json"
    intering = None
    try:
        int_raw = json.loads(int_path.read_text(encoding="utf-8"))
        intering = InteringOutput.model_validate(int_raw)
        print(f"  [{PASS}] JSON validi ja parsittavissa")
    except Exception as e:
        print(f"  [{FAIL}] JSON validointi: {e}")
        failures += 1
        int_raw = None

    if intering and int_raw:
        # 10. hook 4 osaa
        parts = intering.hook.split("|")
        if len(parts) == 4:
            print(f"  [{PASS}] Hook: 4 osaa pipe-formaatissa")
        else:
            print(f"  [{FAIL}] Hook: {len(parts)} osaa, vaaditaan 4")
            failures += 1

        # 11. ei kiellettyjä sanoja
        all_text = "\n".join(all_strings_in_dict(int_raw))
        forbidden = find_forbidden_words(all_text)
        if not forbidden:
            print(f"  [{PASS}] Ei kiellettyjä sanoja")
        else:
            print(f"  [{FAIL}] Kiellettyjä sanoja: {forbidden}")
            failures += 1

    # --- 12. Emoji-tarkistus ---
    print("\nEmoji-tarkistus")
    emoji_files = []
    for path in [pos_path, li_path, cv_path, int_path]:
        if path.exists():
            text = path.read_text(encoding="utf-8")
            if has_emoji(text):
                emoji_files.append(path.name)
    if not emoji_files:
        print(f"  [{PASS}] Ei emoji-merkkejä")
    else:
        print(f"  [{FAIL}] Emoji-merkkejä tiedostoissa: {emoji_files}")
        failures += 1

    # --- Yhteenveto ---
    print(f"\nYhteenveto: {failures} epäonnistunutta, {warnings} varoitusta")
    return 1 if failures > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
