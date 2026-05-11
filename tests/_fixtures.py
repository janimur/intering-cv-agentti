from src.schemas import (
    PositioningDocument, Positioning, Evidence, FlagshipStory,
    SupportingResult, KeyMessages, Preferences,
    CVDocument, CVHeader, ContactInfo, ExperienceEntry,
    LinkedInOutput, LinkedInExperience,
    InteringOutput,
)


def sample_positioning() -> PositioningDocument:
    return PositioningDocument(
        positioning=Positioning(
            primary_angle="Testaaja",
            target_buyers=["CEO"],
            target_situations=["Skaalausvaihe"],
            differentiators=["Operaattori"],
        ),
        evidence=Evidence(
            flagship_story=FlagshipStory(
                context="Yritys X",
                action="Skaalasin",
                result_quantified="€2M → €20M (10x)",
            ),
            supporting_results=[
                SupportingResult(metric="Kasvu", value="10x", context="2018–2023")
            ],
            expertise_areas=["GTM", "P&L"],
        ),
        key_messages=KeyMessages(
            one_liner="Skaalaan B2B-palveluyrityksiä",
            elevator_pitch="Olen operaattori joka ottaa P&L-vastuun.",
            proof_points=["€2M → €20M", "200 konsulttia", "10x kasvu"],
        ),
        preferences=Preferences(
            tone="Suora, ei jargonia",
            exclusions=["Ei konsultti-framingia"],
        ),
    )


def sample_cv() -> CVDocument:
    return CVDocument(
        header=CVHeader(
            name="Testi Henkilö",
            title="Interim CEO",
            contact=ContactInfo(email="testi@example.com", phone=None, location=None, linkedin=None),
        ),
        positioning_summary="Skaalannut B2B-palveluliiketoiminnan...",
        key_results=["€2M → €20M", "10x kasvu", "200 konsulttia"],
        expertise=["GTM", "P&L", "Skaalaus"],
        experience=[
            ExperienceEntry(
                role="Interim CEO",
                company="Yritys X",
                period="9/2025 – 2/2026",
                context="Skaalausvaihe.",
                results=["10x kasvu", "P&L €25M"],
            ),
            ExperienceEntry(
                role="COO",
                company="Yritys Y",
                period="3/2018 – 3/2024",
                context="Operatiivinen rakentaminen.",
                results=["200 konsulttia", "€2M → €25M"],
            ),
        ],
        education=["Insinööri, AMK 2003"],
        certifications=["HHJ 2023"],
    )


def sample_linkedin() -> LinkedInOutput:
    return LinkedInOutput(
        headline="Interim CEO | Skaalaaja",
        about="Skaalasin €2M → €20M viidessä vuodessa. " * 10,
        experience=[
            LinkedInExperience(
                role="Interim CEO",
                company="Yritys X",
                context="Skaalaus.",
                achievements=["10x kasvu", "P&L €25M", "200 konsulttia"],
            )
        ],
    )


def sample_intering() -> InteringOutput:
    return InteringOutput(
        hook="Skaalaaja | IT | €5–€30M | Operaattori",
        product_cards=["Kortti 1.", "Kortti 2."],
        profile_sections={
            "Kuka minä olen?": "Olen operaattori.",
            "Miksi juuri minä olen timanttinen interim?": "Tehnyt itse.",
            "Tehtävät joihin sovin parhaiten": "Skaalaus, GTM.",
            "Aikaisempi kokemus": "B2B-palveluyritykset.",
            "Aikaisempi Interim-kokemus": "10 vuotta.",
        },
    )
