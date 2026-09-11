from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from src.kirjoittajat import _run_writer, _run_writer_with_history
from src.kartoittaja import run_clarification
from src.schemas import WorkflowState
from tests._fixtures import sample_cv, sample_linkedin, sample_intering


def model_reply(output, name="save_cv_document"):
    return SimpleNamespace(stop_reason="tool_use", content=[SimpleNamespace(type="tool_use", name=name, input=output.model_dump())])


@pytest.mark.parametrize("writer,output", [("cv", sample_cv), ("linkedin", sample_linkedin), ("intering", sample_intering)])
def test_writers_send_approved_context_to_model(writer, output):
    from tests._fixtures import sample_positioning
    client = MagicMock()
    client.messages.create.return_value = model_reply(output(), {"cv": "save_cv_document", "linkedin": "save_linkedin_output", "intering": "save_intering_output"}[writer])
    with patch("src.kirjoittajat.Anthropic", return_value=client):
        _run_writer(writer, sample_positioning(), "CV", "LinkedIn", approved_context="Oma ääni; korjaus vuoteen 2025; ei kriisejä")
    args = client.messages.create.call_args.kwargs
    assert "Oma ääni; korjaus vuoteen 2025; ei kriisejä" in args["messages"][0]["content"]
    assert "Älä keksi" in args["system"]


def test_first_iteration_includes_existing_output_before_feedback():
    from tests._fixtures import sample_positioning
    client = MagicMock()
    client.messages.create.return_value = model_reply(sample_cv())
    current = sample_cv().model_dump_json()
    with patch("src.kirjoittajat.Anthropic", return_value=client):
        _run_writer_with_history("cv", sample_positioning(), "CV", None, [], "Lyhennä",
                                 approved_context="Oma ääni", current_output=current)
    messages = client.messages.create.call_args.kwargs["messages"]
    assert messages[-2] == {"role": "assistant", "content": current}
    assert "Lyhennä" in messages[-1]["content"]
    assert "Oma ääni" in messages[0]["content"]


def test_iteration_history_has_correct_request_response_order():
    from tests._fixtures import sample_positioning
    client = MagicMock()
    client.messages.create.return_value = model_reply(sample_cv())
    with patch("src.kirjoittajat.Anthropic", return_value=client):
        _run_writer_with_history("cv", sample_positioning(), "CV", None,
                                 [("Vanha pyyntö", "Vanha tulos")], "Uusi pyyntö", current_output="Vanha tulos")
    messages = client.messages.create.call_args.kwargs["messages"]
    assert "Vanha pyyntö" in messages[1]["content"]
    assert messages[2] == {"role": "assistant", "content": "Vanha tulos"}
    assert "Uusi pyyntö" in messages[3]["content"]


def test_clarification_rejects_wrong_tool_without_leaking_content():
    client = MagicMock()
    client.messages.create.return_value = SimpleNamespace(stop_reason="end_turn", content=[])
    with patch("src.kartoittaja.Anthropic", return_value=client), pytest.raises(RuntimeError, match="työkalusopimusta"):
        run_clarification("CV", None, WorkflowState())
