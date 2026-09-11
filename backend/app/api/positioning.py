import asyncio
from anthropic import APIError

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import ValidationError

from backend.app.dependencies import get_session_store
from backend.app.metrics import measure
from backend.app.sessions import SessionStore
from backend.app import workflow
from src.kartoittaja import run_kartoittaja, run_clarification
from src.prompts import compose_prompt, prompt_checksum
from src.schemas import (AnswerRequest, Assessment, ClarificationAnswer, PositioningUpdate,
                         RevisionRequest, WorkflowState)

router = APIRouter()


async def _assess(session, prompt):
    """Allow one corrective call for a repeated question or a closed topic."""
    for attempt in range(2):
        assessment = Assessment.model_validate(await asyncio.to_thread(run_clarification,
            session.cv_text, session.linkedin_text, session.workflow, prompt))
        if not workflow.question_is_blocked(session.workflow, assessment.next_question):
            return assessment, prompt
        prompt += "\nEhdotit toistettua kysymystä tai ohitettua/luottamuksellista aihetta. Valitse tarpeellinen uusi kysymys. Vastatusta aiheesta saa kysyä eri tarkennuksen, suljetusta aiheesta ei. Valitse null vain jos kaikki olennaiset tiedot riittävät."
    raise RuntimeError("Kartoitus ehdotti toistuvasti estettyä kysymystä")


@router.get("/api/positioning", response_model=WorkflowState)
async def get_positioning(x_session_id: str = Header(..., alias="X-Session-ID"),
                          store: SessionStore = Depends(get_session_store)):
    return store.get(x_session_id).workflow


@router.post("/api/positioning", response_model=WorkflowState)
async def run_positioning(payload: RevisionRequest,
                          x_session_id: str = Header(..., alias="X-Session-ID"),
                          store: SessionStore = Depends(get_session_store)):
    session = store.get(x_session_id)
    workflow.expect_revision(session, payload.revision)
    if session.workflow.status != "uploaded":
        raise HTTPException(409, "Kartoitus on jo aloitettu. Muokkaa nykyisiä tietoja.")
    prompt = compose_prompt("kartoittaja_system")
    try:
        with measure("kartoittaja"):
            positioning = await asyncio.to_thread(run_kartoittaja, cv_text=session.cv_text,
                linkedin_text=session.linkedin_text, system_prompt=prompt)
            session.workflow.positioning = positioning
            assessment, prompt = await _assess(session, prompt)
    except (APIError, RuntimeError, ValidationError) as exc:
        raise HTTPException(502, "Kartoituksen vastaus oli virheellinen. Yritä uudelleen.") from exc
    return store.update(x_session_id, payload.revision,
        lambda s: workflow.apply_assessment(s, assessment, prompt_checksum(prompt))).workflow


@router.patch("/api/positioning", response_model=WorkflowState)
async def update_positioning(payload: PositioningUpdate,
                             x_session_id: str = Header(..., alias="X-Session-ID"),
                             store: SessionStore = Depends(get_session_store)):
    return store.update(x_session_id, payload.revision, lambda s: workflow.update_profile(s, payload)).workflow


@router.post("/api/positioning/answers", response_model=WorkflowState)
async def answer_question(payload: AnswerRequest,
                          x_session_id: str = Header(..., alias="X-Session-ID"),
                          store: SessionStore = Depends(get_session_store)):
    session = store.get(x_session_id)
    workflow.expect_revision(session, payload.revision)
    question = session.workflow.current_question
    if session.workflow.status != "clarifying" or not question or question.id != payload.question_id:
        raise HTTPException(409, "Kysymys ei ole enää aktiivinen.")
    answer = ClarificationAnswer(question_id=question.id, topic=question.topic,
        question=question.text, text=payload.text.strip() if payload.disposition == "answered" else "",
        disposition=payload.disposition)
    session.workflow.answers.append(answer)
    session.workflow.current_question = None
    prompt = compose_prompt("kartoittaja_system")
    try:
        with measure("clarification"):
            assessment, prompt = await _assess(session, prompt)
    except (APIError, RuntimeError, ValidationError) as exc:
        raise HTTPException(502, "Kartoituksen vastaus oli virheellinen. Vastausta ei kirjattu; yritä uudelleen.") from exc

    def change(s):
        s.workflow.answers.append(answer)
        workflow.apply_assessment(s, assessment, prompt_checksum(prompt))
    return store.update(x_session_id, payload.revision, change).workflow


@router.post("/api/positioning/finish", response_model=WorkflowState)
async def finish_positioning(payload: RevisionRequest,
                             x_session_id: str = Header(..., alias="X-Session-ID"),
                             store: SessionStore = Depends(get_session_store)):
    return store.update(x_session_id, payload.revision, workflow.finish).workflow


@router.post("/api/positioning/approve", response_model=WorkflowState)
async def approve_positioning(payload: RevisionRequest,
                              x_session_id: str = Header(..., alias="X-Session-ID"),
                              store: SessionStore = Depends(get_session_store)):
    return store.update(x_session_id, payload.revision, workflow.approve).workflow
