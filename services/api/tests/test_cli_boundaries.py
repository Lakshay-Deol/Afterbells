import sys
from unittest.mock import patch

import pytest

from afterbells.cli import main as cli_main
from afterbells.verify_execution import main as verify_execution_main


def test_cli_rejects_unknown_command_or_execution(capsys):
    with patch.object(sys, "argv", ["afterbells", "execute"]), pytest.raises(SystemExit) as exc:
        cli_main()
    assert exc.value.code == 2


def test_cli_plan_runs_in_recorded_mode(capsys):
    with patch.object(sys, "argv", ["afterbells", "plan", "Buy $10 of NVDA"]):
        cli_main()
    captured = capsys.readouterr()
    assert '"ticker": "NVDA"' in captured.out


def test_verify_execution_refuses_without_human_safety_flag(capsys):
    with patch.object(sys, "argv", ["verify_execution"]):
        code = verify_execution_main()
    assert code == 2
    captured = capsys.readouterr()
    assert "Refusing: pass --i-understand-mainnet" in captured.out


def test_verify_execution_refuses_when_execution_disabled(capsys, monkeypatch):
    monkeypatch.setenv("EXECUTION_ENABLED", "false")
    with patch.object(sys, "argv", ["verify_execution", "--i-understand-mainnet"]):
        code = verify_execution_main()
    assert code == 2
    captured = capsys.readouterr()
    assert "EXECUTION_ENABLED=false" in captured.out
