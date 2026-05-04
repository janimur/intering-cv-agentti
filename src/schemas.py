from pydantic import BaseModel, Field


class FlagshipStory(BaseModel):
    context: str = Field(..., description="Tilanne/konteksti")
    action: str = Field(..., description="Mitä tehtiin")
    result_quantified: str = Field(..., description="Mitattava tulos, esim. '€2.5M → €25M'")


class SupportingResult(BaseModel):
    metric: str
    value: str
    context: str


class Positioning(BaseModel):
    primary_angle: str
    target_buyers: list[str] = Field(..., min_length=1)
    target_situations: list[str] = Field(..., min_length=1)
    differentiators: list[str] = Field(..., min_length=1)


class Evidence(BaseModel):
    flagship_story: FlagshipStory
    supporting_results: list[SupportingResult]
    expertise_areas: list[str]


class KeyMessages(BaseModel):
    one_liner: str
    elevator_pitch: str
    proof_points: list[str] = Field(..., min_length=3, max_length=5)


class Preferences(BaseModel):
    tone: str
    exclusions: list[str]


class PositioningDocument(BaseModel):
    positioning: Positioning
    evidence: Evidence
    key_messages: KeyMessages
    preferences: Preferences


class ContactInfo(BaseModel):
    email: str
    phone: str | None = None
    location: str | None = None
    linkedin: str | None = None


class CVHeader(BaseModel):
    name: str
    title: str
    contact: ContactInfo


class ExperienceEntry(BaseModel):
    role: str
    company: str
    period: str
    context: str = Field(..., description="1 lause")
    results: list[str] = Field(..., min_length=2, description="Mitattavat tulokset")


class CVDocument(BaseModel):
    header: CVHeader
    positioning_summary: str
    key_results: list[str] = Field(..., min_length=3, max_length=5)
    expertise: list[str]
    experience: list[ExperienceEntry]
    education: list[str]
    certifications: list[str]


class LinkedInExperience(BaseModel):
    company: str
    role: str
    context: str
    achievements: list[str] = Field(..., min_length=3, max_length=5)


class LinkedInOutput(BaseModel):
    headline: str = Field(..., max_length=220)
    about: str
    experience: list[LinkedInExperience]


class InteringOutput(BaseModel):
    hook: str = Field(..., description="Pipe-formaatti, 4 osaa")
    product_cards: list[str] = Field(..., min_length=2, max_length=3)
    profile_sections: dict[str, str]


def to_tool_input_schema(model: type[BaseModel]) -> dict:
    """Konvertoi Pydantic v2 -malli Anthropic tool input_schema -muotoon."""
    return model.model_json_schema()
