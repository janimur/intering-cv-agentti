from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from playwright.async_api import Browser, async_playwright

from src.schemas import CVDocument

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
FONTS_DIR = Path(__file__).parent.parent / "static" / "fonts"

_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def _render_html(doc: CVDocument) -> str:
    template = _jinja_env.get_template("cv.html")
    return template.render(doc=doc, font_dir=str(FONTS_DIR.resolve()))


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
