from types import SimpleNamespace as NS
from unittest.mock import Mock, patch
import pytest
from src.model_calls import validated_call, ModelResponseError, recent_model_calls
from src.schemas import Assessment, MemberProfile
from src.kartoittaja import run_initial_assessment
from tests._fixtures import sample_positioning


def reply(stop='tool_use', value=None, name='save_assessment'):
    return NS(stop_reason=stop, usage=NS(input_tokens=123, output_tokens=456),
              content=[NS(type='tool_use', name=name, input=value or {})])


def assessment():
    return Assessment(positioning=sample_positioning(), profile=MemberProfile(), next_question=None)


def call(client):
    return validated_call(client, role='test', schema=Assessment, tool_name='save_assessment',
                          retry_max_tokens=16000, model='claude-opus-4-7', max_tokens=8000)


def test_truncation_retries_once_with_larger_budget_and_records_safe_metadata():
    client = Mock()
    client.messages.create.side_effect = [reply('max_tokens', {'secret': 'PRIVATE'}), reply(value=assessment().model_dump())]
    assert call(client) == assessment()
    assert [c.kwargs['max_tokens'] for c in client.messages.create.call_args_list] == [8000,16000]
    events = recent_model_calls()[-2:]
    assert events[0]['stop_reason'] == 'max_tokens'
    assert events[1]['output_tokens'] == 456 and events[1]['model'] == 'claude-opus-4-7'
    assert 'PRIVATE' not in str(events)


@pytest.mark.parametrize('stop,name,value', [('max_tokens','save_assessment',{}), ('end_turn','save_assessment',{}), ('tool_use','wrong',{}), ('tool_use','save_assessment',{'secret':'PRIVATE'})])
def test_errors_are_bounded_and_do_not_expose_model_content(stop,name,value):
    client=Mock();client.messages.create.return_value=reply(stop,value,name)
    with pytest.raises(ModelResponseError) as e: call(client)
    assert 'PRIVATE' not in str(e.value)
    assert client.messages.create.call_count == (2 if stop=='max_tokens' else 1)


def test_initial_assessment_uses_one_call_and_preserves_high_reasoning():
    client=Mock();client.messages.create.return_value=reply(value=assessment().model_dump())
    with patch('src.kartoittaja.Anthropic',return_value=client):
        assert run_initial_assessment('CV').positioning == sample_positioning()
    client.messages.create.assert_called_once()
    kwargs=client.messages.create.call_args.kwargs
    assert kwargs['thinking']=={'type':'adaptive'} and kwargs['output_config']=={'effort':'high'}
    assert kwargs['model']=='claude-opus-4-7'
