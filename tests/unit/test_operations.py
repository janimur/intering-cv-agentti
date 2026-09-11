import asyncio
from unittest.mock import Mock
import pytest
from fastapi import HTTPException
from backend.app.operations import OperationStore


def submit(store, job, key='first-key', **overrides):
    args = dict(session_id='sid', key=key, kind='writer:linkedin', scope='writer:linkedin',
                revision=2, payload={'revision': 2}, prepare=lambda: job)
    args.update(overrides)
    return store.submit(**args)


async def settle(store, op):
    for _ in range(30):
        state = store.get('sid', op.id)
        if state.status != 'running': return state
        await asyncio.sleep(0)
    raise AssertionError('operation still running')


async def test_duplicate_replay_precedes_validation_and_only_runs_once():
    store = OperationStore()
    gate = asyncio.Event()
    calls = []
    async def job():
        calls.append(1)
        await gate.wait()
        return {'headline': 'Test'}
    first = submit(store, job)
    assert submit(store, job).id == first.id
    assert submit(store, job, key='alias-key').id == first.id
    gate.set()
    assert (await settle(store, first)).result == {'headline': 'Test'}
    prepare = Mock(side_effect=HTTPException(409, 'stale revision'))
    assert submit(store, job, prepare=prepare).id == first.id
    prepare.assert_not_called()
    assert calls == [1]
    await store.close()


async def test_different_payload_key_scope_and_session_isolation():
    store = OperationStore()
    gate = asyncio.Event()
    async def job():
        await gate.wait()
        return {}
    first = submit(store, job)
    with pytest.raises(HTTPException) as e:
        submit(store, job, payload={'revision': 3})
    assert e.value.status_code == 409
    with pytest.raises(HTTPException) as e:
        submit(store, job, key='new-key', payload={'revision': 3})
    assert e.value.headers['X-Active-Operation-ID'] == first.id
    other = submit(store, job, key='other-key', kind='writer:cv', scope='writer:cv')
    assert other.id != first.id
    with pytest.raises(HTTPException) as e:
        store.get('other-session', first.id)
    assert e.value.status_code == 404
    await store.close()


async def test_limits_do_not_evict_running_operations():
    store = OperationStore(max_running=1)
    async def job(): await asyncio.Event().wait()
    first = submit(store, job)
    with pytest.raises(HTTPException) as e:
        submit(store, job, key='other-key', scope='writer:cv')
    assert e.value.status_code == 503
    assert store.get('sid', first.id).status == 'running'
    await store.close()
    assert not store._tasks and not store._operations and not store._keys


async def test_failure_is_safe_and_new_key_allows_retry():
    store = OperationStore()
    async def bad(): raise ValueError('PERSONAL SECRET')
    first = submit(store, bad)
    failure = await settle(store, first)
    assert failure.status == 'failed'
    assert 'PERSONAL SECRET' not in failure.model_dump_json()
    assert submit(store, bad).id == first.id
    async def good(): return {'ok': True}
    second = submit(store, good, key='retry-key')
    assert (await settle(store, second)).result == {'ok': True}
    await store.close()


async def test_timeout_cancels_before_save():
    store = OperationStore(timeout=0.01)
    writes = []
    async def job():
        await asyncio.sleep(0.1)
        writes.append(1)
        return {}
    op = submit(store, job)
    await asyncio.sleep(0.03)
    assert store.get('sid', op.id).error.status == 504
    assert writes == []
    await store.close()


async def test_expired_result_and_alias_are_removed():
    store = OperationStore(ttl=0)
    async def job(): return {'ok': True}
    op = submit(store, job)
    await asyncio.sleep(0.01)
    with pytest.raises(HTTPException): store.get('sid', op.id)
    assert not store._keys
    await store.close()
