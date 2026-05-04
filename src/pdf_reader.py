import pdfplumber


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Lukee PDF-tiedoston ja palauttaa sivujen tekstin yhdistettynä.
    Nostaa FileNotFoundError jos tiedostoa ei löydy.
    Nostaa ValueError jos teksti on tyhjä (skannaus-PDF tai suojattu).
    """
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    full_text = "\n\n".join(pages)
    if not full_text.strip():
        raise ValueError("PDF ei sisällä parsittavaa tekstiä")
    return full_text
