"""Validated model calls with safe metadata and one truncation-only retry."""
import logging
import time
from collections import deque
from threading import Lock

from pydantic import BaseModel, ValidationError

logger = logging.getLogger("uvicorn.error.model_calls")
_recent_calls: deque[dict] = deque(maxlen=256)
_lock = Lock()


class ModelResponseError(RuntimeError):
    pass


def recent_model_calls() -> list[dict]:
    with _lock:
        return [dict(item) for item in _recent_calls]


def _record(role, model, response, duration_ms, attempt, error_type=None):
    usage = getattr(response, "usage", None)
    stop_reason = getattr(response, "stop_reason", None)
    allowed_stops = {"end_turn", "max_tokens", "stop_sequence", "tool_use", "pause_turn", "refusal"}
    event = {"role": role, "model": model, "duration_ms": duration_ms, "attempt": attempt,
             "stop_reason": stop_reason if stop_reason in allowed_stops else "unknown",
             "input_tokens": getattr(usage, "input_tokens", None),
             "output_tokens": getattr(usage, "output_tokens", None), "error_type": error_type}
    for key in ("input_tokens", "output_tokens"):
        if not isinstance(event[key], int):
            event[key] = None
    with _lock:
        _recent_calls.append(event)
    logger.info("model_call role=%s model=%s duration_ms=%s attempt=%s stop_reason=%s input_tokens=%s output_tokens=%s error_type=%s",
                *event.values())


def validated_call(client, *, role: str, schema: type[BaseModel], tool_name: str,
                   retry_max_tokens: int, **kwargs):
    for attempt in range(1, 3):
        started = time.monotonic()
        try:
            response = client.messages.create(**kwargs)
        except Exception:
            _record(role, kwargs["model"], None, round((time.monotonic() - started) * 1000), attempt, "provider_error")
            raise
        duration = round((time.monotonic() - started) * 1000)
        if response.stop_reason == "max_tokens":
            _record(role, kwargs["model"], response, duration, attempt, "max_tokens")
            if attempt == 1:
                kwargs = {**kwargs, "max_tokens": retry_max_tokens}
                continue
            raise ModelResponseError("Mallin vastaus katkaistiin myös uusintayrityksessä")
        blocks = [b for b in response.content if b.type == "tool_use" and b.name == tool_name]
        if response.stop_reason != "tool_use" or len(blocks) != 1:
            _record(role, kwargs["model"], response, duration, attempt, "invalid_tool")
            raise ModelResponseError("Mallin vastaus ei vastannut työkalusopimusta")
        try:
            result = schema.model_validate(blocks[0].input)
        except ValidationError:
            _record(role, kwargs["model"], response, duration, attempt, "invalid_schema")
            raise ModelResponseError("Mallin vastausrakenne oli virheellinen") from None
        _record(role, kwargs["model"], response, duration, attempt)
        return result
