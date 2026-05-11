"""
Yksikkötestit src/schemas.py:n Pydantic-validoinneille.
"""
import pytest
from pydantic import ValidationError

from src.schemas import (
    LinkedInOutput, LinkedInExperience,
    ExperienceEntry,
    Positioning,
    KeyMessages,
    InteringOutput,
)
from tests._fixtures import sample_positioning, sample_cv, sample_linkedin, sample_intering


def test_linkedin_headline_too_long():
    """LinkedInOutput.headline yli 220 merkkiä → ValidationError."""
    with pytest.raises(ValidationError):
        LinkedInOutput(
            headline="x" * 221,
            about="Lyhyt about-teksti.",
            experience=[
                LinkedInExperience(
                    role="CEO",
                    company="Yritys",
                    context="Konteksti.",
                    achievements=["Tulos 1", "Tulos 2", "Tulos 3"],
                )
            ],
        )


def test_linkedin_headline_max_length_ok():
    """LinkedInOutput.headline tasan 220 merkkiä on ok."""
    output = LinkedInOutput(
        headline="x" * 220,
        about="About.",
        experience=[
            LinkedInExperience(
                role="CEO",
                company="Yritys",
                context="Konteksti.",
                achievements=["Tulos 1", "Tulos 2", "Tulos 3"],
            )
        ],
    )
    assert len(output.headline) == 220


def test_experience_entry_results_min_length():
    """ExperienceEntry.results 1 alkio → ValidationError (min_length=2)."""
    with pytest.raises(ValidationError):
        ExperienceEntry(
            role="CEO",
            company="Yritys",
            period="1/2020 – 1/2021",
            context="Konteksti.",
            results=["Vain yksi tulos"],
        )


def test_positioning_target_buyers_empty():
    """Positioning.target_buyers tyhjä → ValidationError."""
    with pytest.raises(ValidationError):
        Positioning(
            primary_angle="Testaaja",
            target_buyers=[],
            target_situations=["Skaalausvaihe"],
            differentiators=["Operaattori"],
        )


def test_key_messages_proof_points_too_few():
    """KeyMessages.proof_points 2 alkiota → ValidationError (min 3)."""
    with pytest.raises(ValidationError):
        KeyMessages(
            one_liner="Lyhyt.",
            elevator_pitch="Pidempi.",
            proof_points=["Yksi", "Kaksi"],
        )


def test_key_messages_proof_points_too_many():
    """KeyMessages.proof_points 6 alkiota → ValidationError (max 5)."""
    with pytest.raises(ValidationError):
        KeyMessages(
            one_liner="Lyhyt.",
            elevator_pitch="Pidempi.",
            proof_points=["1", "2", "3", "4", "5", "6"],
        )


def test_key_messages_proof_points_exactly_3_ok():
    """3 proof_points on ok."""
    km = KeyMessages(
        one_liner="Lyhyt.",
        elevator_pitch="Pidempi.",
        proof_points=["1", "2", "3"],
    )
    assert len(km.proof_points) == 3


def test_key_messages_proof_points_exactly_5_ok():
    """5 proof_points on ok."""
    km = KeyMessages(
        one_liner="Lyhyt.",
        elevator_pitch="Pidempi.",
        proof_points=["1", "2", "3", "4", "5"],
    )
    assert len(km.proof_points) == 5


def test_intering_output_product_cards_too_few():
    """InteringOutput.product_cards 1 alkio → ValidationError."""
    with pytest.raises(ValidationError):
        InteringOutput(
            hook="Skaalaaja | IT | €5–€30M | Operaattori",
            product_cards=["Vain yksi kortti."],
            profile_sections={"Kuka?": "Olen."},
        )


def test_sample_positioning_validates():
    """sample_positioning() validoituu oikein."""
    doc = sample_positioning()
    assert doc.positioning.primary_angle == "Testaaja"
    assert len(doc.key_messages.proof_points) >= 3


def test_sample_cv_validates():
    """sample_cv() validoituu oikein."""
    doc = sample_cv()
    assert doc.header.name == "Testi Henkilö"
    assert len(doc.experience) >= 1


def test_sample_linkedin_validates():
    """sample_linkedin() validoituu oikein."""
    doc = sample_linkedin()
    assert len(doc.headline) <= 220
    assert len(doc.experience) >= 1


def test_sample_intering_validates():
    """sample_intering() validoituu oikein."""
    doc = sample_intering()
    assert len(doc.product_cards) >= 2
    assert "|" in doc.hook
