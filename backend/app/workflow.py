"""Frontend-independent, in-memory positioning workflow transitions."""
import json
from uuid import uuid4

from fastapi import HTTPException

from backend.app.sessions import Session
from src.schemas import AssessmentUpdate, MemberProfile, PositioningDocument, Assessment, ClarificationQuestion, PositioningUpdate, QuestionProposal, WorkflowState


def expect_revision(session: Session, revision: int) -> None:
    if session.workflow.revision != revision:
        raise HTTPException(409, "Tiedot ovat muuttuneet. Päivitä kartoitus ja yritä uudelleen.")


def require_positioning(session: Session) -> None:
    if session.positioning is None:
        raise HTTPException(409, "Positioning has not been generated yet")


def require_approved(session: Session) -> None:
    state = session.workflow
    if state.status != "approved" or state.approved_revision != state.revision:
        raise HTTPException(409, "Hyväksy nykyinen kartoitus ennen kirjoittamista.")


def invalidate(session: Session) -> None:
    session.workflow.revision += 1
    session.workflow.approved_revision = None


def question_is_blocked(state: WorkflowState, question: QuestionProposal | None) -> bool:
    if question is None:
        return False
    normalized = " ".join(question.text.casefold().split())
    return any(
        (answer.disposition != "answered" and answer.topic == question.topic)
        or " ".join(answer.question.casefold().split()) == normalized
        for answer in state.answers
    )


def apply_assessment(session: Session, assessment: Assessment, checksum: str) -> None:
    state = session.workflow
    session.positioning = assessment.positioning
    state.positioning = assessment.positioning
    state.profile = assessment.profile
    question = assessment.next_question
    if question_is_blocked(state, question):
        raise RuntimeError("Kartoitus ehdotti toistettua kysymystä tai suljettua aihetta")
    state.current_question = ClarificationQuestion(id=str(uuid4()), **question.model_dump()) if question else None
    state.status = "clarifying" if question else "review"
    state.prompt_checksums["kartoitus"] = checksum
    invalidate(session)


def update_profile(session: Session, payload: PositioningUpdate) -> None:
    require_positioning(session)
    session.positioning = payload.positioning
    session.workflow.positioning = payload.positioning
    session.workflow.profile = payload.profile
    session.workflow.current_question = None
    session.workflow.status = "review"
    invalidate(session)


def finish(session: Session) -> None:
    require_positioning(session)
    session.workflow.current_question = None
    session.workflow.status = "review"
    invalidate(session)


def approve(session: Session) -> None:
    require_positioning(session)
    if session.workflow.status not in {"review", "approved"}:
        raise HTTPException(409, "Viimeistele kartoitus ennen hyväksyntää.")
    session.workflow.status = "approved"
    # Approval changes state as well, preventing late analysis calls from overwriting it.
    session.workflow.revision += 1
    session.workflow.approved_revision = session.workflow.revision


def approved_context(session: Session) -> str:
    require_approved(session)
    return json.dumps({
        "profile": session.workflow.profile.model_dump(),
        "answers": [a.model_dump() for a in session.workflow.answers if a.disposition == "answered"],
        "withheld_topics": [{"topic": a.topic, "question": a.question, "disposition": a.disposition}
                            for a in session.workflow.answers if a.disposition != "answered"],
    }, ensure_ascii=False)


def merge_assessment_update(session: Session, update: AssessmentUpdate) -> Assessment:
    require_positioning(session)
    document = session.positioning.model_dump()
    document.update(update.positioning_updates.model_dump(exclude_none=True))
    profile = session.workflow.profile.model_dump()
    profile.update(update.profile_updates.model_dump(exclude_none=True))
    return Assessment(positioning=PositioningDocument.model_validate(document),
                      profile=MemberProfile.model_validate(profile), next_question=update.next_question)
