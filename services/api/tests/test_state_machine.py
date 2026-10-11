import pytest

from afterbells.domain.models import ExecState
from afterbells.services.state_machine import ExecutionStateMachine, InvalidTransition


def test_happy_path():
    sm = ExecutionStateMachine()
    for s in (
        ExecState.INTENT_COMPILED,
        ExecState.DISCOVERING,
        ExecState.QUOTING,
        ExecState.POLICY_EVALUATION,
        ExecState.SIMULATING,
        ExecState.AWAITING_CONFIRMATION,
        ExecState.READY,
        ExecState.EXECUTING,
        ExecState.PENDING_CONFIRMATION,
        ExecState.CONFIRMED,
    ):
        sm.transition(s)
    assert sm.terminal and len(sm.history) == 11


def test_invalid_transition_rejected():
    sm = ExecutionStateMachine()
    with pytest.raises(InvalidTransition):
        sm.transition(ExecState.CONFIRMED)


def test_terminal_states_have_no_exits():
    sm = ExecutionStateMachine()
    sm.transition(ExecState.INTENT_COMPILED)
    sm.transition(ExecState.DISCOVERING)
    sm.transition(ExecState.NO_VALID_ROUTE)
    with pytest.raises(InvalidTransition):
        sm.transition(ExecState.QUOTING)


def test_history_persisted_shape():
    sm = ExecutionStateMachine()
    sm.transition(ExecState.INTENT_COMPILED, note="x")
    assert sm.history[-1]["note"] == "x" and "at" in sm.history[-1]


def test_lifecycle_states_serialization_and_representation():
    from afterbells.domain.models import TERMINAL_LIFECYCLE_STATES, normalize_lifecycle_state

    expected_states = [
        "OBSERVED",
        "EVALUATED",
        "SIMULATED",
        "AWAITING_APPROVAL",
        "APPROVED",
        "SUBMITTED",
        "CONFIRMED",
        "BLOCKED",
        "REJECTED",
        "FAILED",
        "CANCELLED",
        "EXPIRED",
        "UNKNOWN_SUBMISSION_OUTCOME",
        "RECONCILING",
        "RECONCILIATION_FAILED",
    ]
    for s_name in expected_states:
        state = ExecState(s_name)
        assert state.value == s_name
        assert str(state) == f"ExecState.{s_name}" or str(state) == s_name

    assert normalize_lifecycle_state("INTENT_RECEIVED") == ExecState.OBSERVED
    assert normalize_lifecycle_state("POLICY_EVALUATION") == ExecState.EVALUATED
    assert normalize_lifecycle_state("AWAITING_CONFIRMATION") == ExecState.AWAITING_APPROVAL
    assert normalize_lifecycle_state(ExecState.CONFIRMED) == ExecState.CONFIRMED
    assert normalize_lifecycle_state("RANDOM_UNKNOWN") == ExecState.UNKNOWN_SUBMISSION_OUTCOME

    assert ExecState.CONFIRMED in TERMINAL_LIFECYCLE_STATES
    assert ExecState.BLOCKED in TERMINAL_LIFECYCLE_STATES
    assert ExecState.REJECTED in TERMINAL_LIFECYCLE_STATES
    assert ExecState.FAILED in TERMINAL_LIFECYCLE_STATES
    assert ExecState.CANCELLED in TERMINAL_LIFECYCLE_STATES
    assert ExecState.EXPIRED in TERMINAL_LIFECYCLE_STATES
    assert ExecState.RECONCILIATION_FAILED in TERMINAL_LIFECYCLE_STATES

