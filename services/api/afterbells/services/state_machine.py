"""Execution pipeline state machine. Strict DAG transitions, fail-closed."""

from datetime import UTC, datetime

from afterbells.domain.models import ExecState

_ALLOWED: dict[ExecState, set[ExecState]] = {
    # Authoritative lifecycle transitions
    ExecState.OBSERVED: {
        ExecState.EVALUATED,
        ExecState.BLOCKED,
        ExecState.REJECTED,
        ExecState.CANCELLED,
        ExecState.EXPIRED,
    },
    ExecState.EVALUATED: {
        ExecState.SIMULATED,
        ExecState.AWAITING_APPROVAL,
        ExecState.BLOCKED,
        ExecState.REJECTED,
        ExecState.CANCELLED,
        ExecState.EXPIRED,
    },
    ExecState.SIMULATED: {
        ExecState.AWAITING_APPROVAL,
        ExecState.APPROVED,
        ExecState.FAILED,
        ExecState.BLOCKED,
        ExecState.REJECTED,
        ExecState.CANCELLED,
        ExecState.EXPIRED,
    },
    ExecState.AWAITING_APPROVAL: {
        ExecState.APPROVED,
        ExecState.REJECTED,
        ExecState.CANCELLED,
        ExecState.EXPIRED,
    },
    ExecState.APPROVED: {
        ExecState.SUBMITTED,
        ExecState.CANCELLED,
        ExecState.EXPIRED,
    },
    ExecState.SUBMITTED: {
        ExecState.CONFIRMED,
        ExecState.FAILED,
        ExecState.UNKNOWN_SUBMISSION_OUTCOME,
    },
    ExecState.UNKNOWN_SUBMISSION_OUTCOME: {
        ExecState.RECONCILING,
        ExecState.CONFIRMED,
        ExecState.FAILED,
        ExecState.RECONCILIATION_FAILED,
    },
    ExecState.RECONCILING: {
        ExecState.CONFIRMED,
        ExecState.FAILED,
        ExecState.RECONCILIATION_FAILED,
    },
    ExecState.BLOCKED: set(),
    ExecState.REJECTED: set(),
    ExecState.FAILED: set(),
    ExecState.CANCELLED: set(),
    ExecState.EXPIRED: set(),
    ExecState.RECONCILIATION_FAILED: set(),
    # Legacy transitions
    ExecState.INTENT_RECEIVED: {ExecState.INTENT_COMPILED, ExecState.POLICY_REJECTED},
    ExecState.INTENT_COMPILED: {ExecState.AWAITING_POLICY_APPROVAL, ExecState.DISCOVERING},
    ExecState.AWAITING_POLICY_APPROVAL: {ExecState.DISCOVERING, ExecState.POLICY_REJECTED},
    ExecState.DISCOVERING: {ExecState.QUOTING, ExecState.NO_VALID_ROUTE},
    ExecState.QUOTING: {ExecState.POLICY_EVALUATION, ExecState.NO_VALID_ROUTE},
    ExecState.POLICY_EVALUATION: {
        ExecState.SIMULATING,
        ExecState.POLICY_REJECTED,
        ExecState.NO_VALID_ROUTE,
    },
    ExecState.SIMULATING: {ExecState.AWAITING_CONFIRMATION, ExecState.READY, ExecState.SIMULATION_FAILED},
    ExecState.AWAITING_CONFIRMATION: {ExecState.READY, ExecState.POLICY_REJECTED},
    ExecState.READY: {ExecState.EXECUTING, ExecState.POLICY_REJECTED},
    ExecState.EXECUTING: {ExecState.PENDING_CONFIRMATION, ExecState.EXECUTION_FAILED},
    ExecState.PENDING_CONFIRMATION: {ExecState.CONFIRMED, ExecState.EXECUTION_FAILED},
    ExecState.NO_VALID_ROUTE: set(),
    ExecState.SIMULATION_FAILED: set(),
    ExecState.POLICY_REJECTED: set(),
    ExecState.EXECUTION_FAILED: set(),
    ExecState.CONFIRMED: set(),
}

TERMINAL = {s for s, nxt in _ALLOWED.items() if not nxt}


class InvalidStateTransitionError(Exception):
    pass


# Backward compatibility alias
InvalidTransition = InvalidStateTransitionError


class ExecutionStateMachine:
    def __init__(self, initial_state: ExecState = ExecState.INTENT_RECEIVED, actor: str = "system"):
        self.state = initial_state
        self.history: list[dict] = [
            {
                "state": self.state.value,
                "at": datetime.now(UTC).isoformat(),
                "actor": actor,
                "evidence_digest": None,
                "note": "initialized",
            }
        ]

    def transition(
        self,
        to: ExecState,
        note: str = "",
        actor: str = "system",
        evidence_digest: str | None = None,
    ) -> ExecState:
        if to not in _ALLOWED.get(self.state, set()):
            raise InvalidStateTransitionError(f"{self.state.value} -> {to.value} not allowed")
        self.state = to
        self.history.append(
            {
                "state": to.value,
                "at": datetime.now(UTC).isoformat(),
                "actor": actor,
                "evidence_digest": evidence_digest,
                "note": note,
            }
        )
        return to

    @property
    def terminal(self) -> bool:
        return self.state in TERMINAL
