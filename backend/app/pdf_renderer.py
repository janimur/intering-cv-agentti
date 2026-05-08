import re
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from playwright.async_api import Browser, async_playwright

from src.schemas import CVDocument, ExperienceEntry

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
FONTS_DIR = Path(__file__).parent.parent / "static" / "fonts"

_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)

_PRESENT_TOKENS = {"present", "nykyinen", "now", "—", "-", "tällä hetkellä"}


def _end_date_key(entry: ExperienceEntry) -> tuple[int, int, int]:
    """
    Palauttaa lajittelu-avaimen ExperienceEntrylle: (vuosi, kuukausi, alkupäivän_avain).
    Suurempi arvo = uudempi → reverse=True antaa käänteisen kronologian.
    Käynnissä olevat roolit saavat keinotekoisesti ison vuoden (9999).
    Jos period ei parsiudu, palautetaan (0, 0, 0) → menee loppuun.
    """
    period = (entry.period or "").lower()
    parts = re.split(r"[-–—]", period, maxsplit=1)
    end_part = parts[1].strip() if len(parts) > 1 else parts[0].strip()
    start_part = parts[0].strip() if len(parts) > 1 else ""

    if any(token in end_part for token in _PRESENT_TOKENS) or end_part == "":
        end_year, end_month = 9999, 12
    else:
        m = re.search(r"(\d{1,2})\s*[/.\-]\s*(\d{4})", end_part)
        if m:
            end_month, end_year = int(m.group(1)), int(m.group(2))
        else:
            y = re.search(r"(\d{4})", end_part)
            end_year = int(y.group(1)) if y else 0
            end_month = 12

    start_key = 0
    sm = re.search(r"(\d{1,2})\s*[/.\-]\s*(\d{4})", start_part)
    if sm:
        start_key = int(sm.group(2)) * 100 + int(sm.group(1))

    return (end_year, end_month, start_key)


def _sort_experience_reverse_chronological(doc: CVDocument) -> CVDocument:
    """Lajittelee experience-listan loppupäivän mukaan, uusin ensin."""
    sorted_exp = sorted(doc.experience, key=_end_date_key, reverse=True)
    return doc.model_copy(update={"experience": sorted_exp})


def _render_html(doc: CVDocument) -> str:
    sorted_doc = _sort_experience_reverse_chronological(doc)
    template = _jinja_env.get_template("cv.html")
    return template.render(doc=sorted_doc, font_dir=str(FONTS_DIR.resolve()))


async def render_cv_pdf(browser: Browser, doc: CVDocument) -> bytes:
    """
    Renderöi CV-dokumentin PDF:ksi annetulla browserilla.
    Browser-instanssi tulee FastAPIn lifespan-hookista.
    """
    html = _render_html(doc)
    context = await browser.new_context()
    page = await context.new_page()
    try:
        await page.set_content(html, wait_until="networkidle")
        pdf_bytes = await page.pdf(
            format="A4",
            print_background=True,
            margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
        )
        return pdf_bytes
    finally:
        await context.close()


async def start_browser() -> tuple[object, Browser]:
    """Käynnistä Playwright + Chromium. Palauttaa (playwright, browser)-parin."""
    p = await async_playwright().start()
    browser = await p.chromium.launch()
    return p, browser


async def stop_browser(playwright: object, browser: Browser) -> None:
    await browser.close()
    await playwright.stop()
