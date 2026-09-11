import asyncio
import time
from unittest.mock import patch
from src.schemas import Assessment, MemberProfile
from tests._fixtures import sample_positioning, sample_linkedin


def wait(client, sid, op):
    for _ in range(200):
        r = client.get('/api/operations/' + op['id'], headers={'X-Session-ID': sid})
        assert r.status_code == 200
        if r.json()['status'] != 'running': return r.json()
        time.sleep(.005)
    raise AssertionError('operation did not complete')


def test_real_protocol_initial_one_call_replay_and_isolation(client, session_with_upload):
    sid = session_with_upload
    headers = {'X-Session-ID': sid, 'Idempotency-Key': 'initial-operation'}
    result = Assessment(positioning=sample_positioning(), profile=MemberProfile(), next_question=None)
    with patch('backend.app.api.positioning.run_initial_assessment', return_value=result) as model:
        first = client.request('POST', '/api/positioning', headers=headers, json={'revision': 0})
        assert first.status_code == 202
        finished = wait(client, sid, first.json())
        assert finished['status'] == 'succeeded'
        replay = client.request('POST', '/api/positioning', headers=headers, json={'revision': 0})
        assert replay.status_code == 202 and replay.json()['id'] == first.json()['id']
        model.assert_called_once()
    other = client.app.state.session_store.create('another CV').session_id
    assert client.get('/api/operations/' + first.json()['id'], headers={'X-Session-ID': other}).status_code == 404
    assert client.get('/api/positioning', headers={'X-Session-ID': sid}).json()['revision'] == 1


def test_writer_duplicate_while_running_saves_once(client, session_with_positioning, monkeypatch):
    sid = session_with_positioning
    rev = client.app.state.session_store.get(sid).workflow.revision
    original = asyncio.to_thread
    async def delayed(func, *args, **kwargs):
        await asyncio.sleep(.05)
        return await original(func, *args, **kwargs)
    monkeypatch.setattr(asyncio, 'to_thread', delayed)
    with patch('backend.app.api.writers.run_linkedin_writer', return_value=sample_linkedin()) as model:
        headers = {'X-Session-ID': sid, 'Idempotency-Key': 'writer-operation'}
        first = client.request('POST', '/api/writers/linkedin', headers=headers, json={'revision': rev})
        second = client.request('POST', '/api/writers/linkedin', headers={**headers, 'Idempotency-Key': 'another-key'}, json={'revision': rev})
        assert first.status_code == second.status_code == 202
        assert first.json()['id'] == second.json()['id']
        assert wait(client, sid, first.json())['status'] == 'succeeded'
        model.assert_called_once()
    assert client.app.state.session_store.get(sid).writer_generations['linkedin'] == 1


def test_model_endpoints_require_idempotency_key(client, session_with_upload):
    r = client.request('POST', '/api/positioning', headers={'X-Session-ID': session_with_upload}, json={'revision': 0})
    assert r.status_code == 422
