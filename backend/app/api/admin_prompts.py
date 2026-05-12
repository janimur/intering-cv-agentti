"""
Admin-endpointit promptien muokkaukseen. Suojattu X-Admin-Token-headerilla.
"""
import os
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from src.prompts import PROMPT_NAMES, has_overlay, load_prompt, reset_prompt, save_prompt

router = APIRouter()


class PromptItem(BaseModel):
    name: str
    content: str
    is_overlay: bool  # True = admin on muokannut, False = oletus prompts/-hakemistosta


class PromptUpdate(BaseModel):
    content: str


def _verify_token(token: str | None) -> None:
    expected = os.environ.get("ADMIN_TOKEN")
    if not expected:
        # Ei ADMIN_TOKEN-asetusta -> admin-endpointit suljettu kokonaan
        raise HTTPException(503, "Admin-toiminnot eivat ole kaytossa")
    if not token or token != expected:
        raise HTTPException(401, "Virheellinen admin-token")


@router.get("/api/admin/prompts", response_model=list[PromptItem])
async def list_prompts(
    x_admin_token: str | None = Header(None, alias="X-Admin-Token"),
) -> list[PromptItem]:
    _verify_token(x_admin_token)
    return [
        PromptItem(
            name=name,
            content=load_prompt(name),
            is_overlay=has_overlay(name),
        )
        for name in PROMPT_NAMES
    ]


@router.put("/api/admin/prompts/{name}", response_model=PromptItem)
async def update_prompt(
    name: str,
    payload: PromptUpdate,
    x_admin_token: str | None = Header(None, alias="X-Admin-Token"),
) -> PromptItem:
    _verify_token(x_admin_token)
    if name not in PROMPT_NAMES:
        raise HTTPException(404, "Tuntematon prompti")
    save_prompt(name, payload.content)
    return PromptItem(name=name, content=load_prompt(name), is_overlay=True)


@router.delete("/api/admin/prompts/{name}", response_model=PromptItem)
async def reset_prompt_endpoint(
    name: str,
    x_admin_token: str | None = Header(None, alias="X-Admin-Token"),
) -> PromptItem:
    _verify_token(x_admin_token)
    if name not in PROMPT_NAMES:
        raise HTTPException(404, "Tuntematon prompti")
    reset_prompt(name)
    return PromptItem(name=name, content=load_prompt(name), is_overlay=False)
