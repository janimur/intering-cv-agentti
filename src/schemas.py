from typing import Literal

from pydantic import BaseModel, Field, model_validator


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
    target_buyers: list[str] = Field(...)
    target_situations: list[str] = Field(...)
    differentiators: list[str] = Field(...)


class Evidence(BaseModel):
    flagship_story: FlagshipStory | None = None
    supporting_results: list[SupportingResult]
    expertise_areas: list[str]


class KeyMessages(BaseModel):
    one_liner: str
    elevator_pitch: str
    proof_points: list[str] = Field(..., max_length=5)


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
    results: list[str] = Field(..., description="Todennetut tulokset, myös laadulliset; tyhjä sallittu")


class CVDocument(BaseModel):
    header: CVHeader
    positioning_summary: str
    key_results: list[str] = Field(..., max_length=5)
    expertise: list[str]
    experience: list[ExperienceEntry]
    education: list[str]
    certifications: list[str]


class LinkedInExperience(BaseModel):
    company: str
    role: str
    context: str
    achievements: list[str] = Field(..., max_length=5)


class LinkedInOutput(BaseModel):
    headline: str = Field(..., max_length=220)
    about: str
    experience: list[LinkedInExperience]


class InteringOutput(BaseModel):
    hook: str = Field(..., description="Pipe-formaatti, 4 osaa")
    product_cards: list[str] = Field(..., max_length=3)
    profile_sections: dict[str, str]


def to_tool_input_schema(model: type[BaseModel]) -> dict:
    """Konvertoi Pydantic v2 -malli Anthropic tool input_schema -muotoon."""
    return model.model_json_schema()


class MemberProfile(BaseModel):
    additional_facts: list[str] = Field(default_factory=list)
    corrections: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    working_style: list[str] = Field(default_factory=list)
    voice_examples: list[str] = Field(default_factory=list)
    exclusions: list[str] = Field(default_factory=list)


QuestionTopic = Literal["evidence", "goals", "exclusions", "voice", "first_weeks", "leadership", "handover", "hidden_strengths"]


class QuestionProposal(BaseModel):
    topic: QuestionTopic
    text: str = Field(min_length=1, max_length=2000)


class ClarificationQuestion(QuestionProposal):
    id: str


class ClarificationAnswer(BaseModel):
    question_id: str
    topic: QuestionTopic
    question: str
    text: str
    disposition: Literal["answered", "skipped", "confidential"]


class Assessment(BaseModel):
    positioning: PositioningDocument
    profile: MemberProfile
    next_question: QuestionProposal | None


class WorkflowState(BaseModel):
    status: Literal["uploaded", "clarifying", "review", "approved"] = "uploaded"
    revision: int = 0
    approved_revision: int | None = None
    positioning: PositioningDocument | None = None
    profile: MemberProfile = Field(default_factory=MemberProfile)
    current_question: ClarificationQuestion | None = None
    answers: list[ClarificationAnswer] = Field(default_factory=list)
    output_revisions: dict[str, int] = Field(default_factory=dict)
    prompt_checksums: dict[str, str] = Field(default_factory=dict)


class RevisionRequest(BaseModel):
    revision: int = Field(ge=0)


class PositioningUpdate(RevisionRequest):
    positioning: PositioningDocument
    profile: MemberProfile


class AnswerRequest(RevisionRequest):
    question_id: str
    text: str = Field(default="", max_length=10000)
    disposition: Literal["answered", "skipped", "confidential"] = "answered"

    @model_validator(mode="after")
    def require_answer(self):
        if self.disposition == "answered" and not self.text.strip():
            raise ValueError("Vastaus ei saa olla tyhjä")
        return self
