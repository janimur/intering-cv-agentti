"""
Yksikkötestit src/pdf_reader.py:n extract_text_from_pdf -funktiolle.
"""
import pytest
from unittest.mock import patch, MagicMock

from src.pdf_reader import extract_text_from_pdf

REAL_PDF_PATH = "tests/Interim Manager CV - Jani Muuronen 1_2026.pdf"


def test_extract_text_file_not_found():
    """FileNotFoundError kun tiedostoa ei löydy."""
    with pytest.raises(FileNotFoundError):
        extract_text_from_pdf("/ei/ole/olemassa/cv.pdf")


def test_extract_text_empty_pages_raises_value_error():
    """ValueError kun kaikki sivut tyhjiä (skannaus-PDF tai suojattu)."""
    mock_page = MagicMock()
    mock_page.extract_text.return_value = None

    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page, mock_page]
    mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
    mock_pdf.__exit__ = MagicMock(return_value=False)

    with patch("pdfplumber.open", return_value=mock_pdf):
        with pytest.raises(ValueError, match="PDF ei sisällä parsittavaa tekstiä"):
            extract_text_from_pdf("jokin.pdf")


def test_extract_text_returns_combined_pages():
    """Onnistunut luku: sivujen tekstit yhdistetään."""
    mock_page1 = MagicMock()
    mock_page1.extract_text.return_value = "Sivu yksi"
    mock_page2 = MagicMock()
    mock_page2.extract_text.return_value = "Sivu kaksi"

    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page1, mock_page2]
    mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
    mock_pdf.__exit__ = MagicMock(return_value=False)

    with patch("pdfplumber.open", return_value=mock_pdf):
        result = extract_text_from_pdf("jokin.pdf")

    assert "Sivu yksi" in result
    assert "Sivu kaksi" in result


def test_extract_text_skips_empty_pages():
    """Tyhjät sivut ohitetaan, ei-tyhjät yhdistetään."""
    mock_page_empty = MagicMock()
    mock_page_empty.extract_text.return_value = None
    mock_page_text = MagicMock()
    mock_page_text.extract_text.return_value = "Tekstiä tässä"

    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page_empty, mock_page_text]
    mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
    mock_pdf.__exit__ = MagicMock(return_value=False)

    with patch("pdfplumber.open", return_value=mock_pdf):
        result = extract_text_from_pdf("jokin.pdf")

    assert result == "Tekstiä tässä"


@pytest.mark.skipif(
    not __import__("os").path.exists(REAL_PDF_PATH),
    reason=f"Oikeaa PDF:ää ei löydy polusta {REAL_PDF_PATH}",
)
def test_extract_text_real_pdf():
    """Oikea PDF-tiedosto löytyy ja tuottaa tekstiä."""
    text = extract_text_from_pdf(REAL_PDF_PATH)
    assert isinstance(text, str)
    assert len(text) > 100
