import pytest
from pydantic import ValidationError

from afterbells.config import Settings


def test_default_settings_are_analysis_only():
    settings = Settings(_env_file=None)
    assert settings.runtime_environment == "local"
    assert settings.execution_enabled is False
    assert settings.require_simulation is True
    assert settings.require_confirmation is True


def test_recorded_mode_cannot_enable_execution():
    with pytest.raises(ValidationError, match="recorded demo data"):
        Settings(_env_file=None, demo_mode=True, execution_enabled=True)


@pytest.mark.parametrize("guard", ["require_simulation", "require_confirmation"])
def test_execution_cannot_disable_required_guards(guard):
    with pytest.raises(ValidationError, match="execution requires"):
        Settings(_env_file=None, execution_enabled=True, **{guard: False})


@pytest.mark.parametrize("value", ["0", "-1", "NaN", "Infinity", "not-a-number"])
def test_notional_ceiling_must_be_positive_and_finite(value):
    with pytest.raises(ValidationError, match="MAX_MAINNET_NOTIONAL_USD"):
        Settings(_env_file=None, max_mainnet_notional_usd=value)


def test_production_cannot_be_recorded_mode():
    with pytest.raises(ValidationError, match="production cannot serve recorded"):
        Settings(_env_file=None, runtime_environment="production", demo_mode=True)


def test_staging_analysis_configuration_is_valid():
    settings = Settings(_env_file=None, runtime_environment="staging", execution_enabled=False)
    assert settings.runtime_environment == "staging"


@pytest.mark.parametrize("value", [0, -5, 6000])
def test_slippage_and_premium_hard_bounds(value):
    with pytest.raises(ValidationError, match="MAX_SLIPPAGE_BPS_HARD"):
        Settings(_env_file=None, max_slippage_bps_hard=value)
    with pytest.raises(ValidationError, match="MAX_PREMIUM_BPS_HARD"):
        Settings(_env_file=None, max_premium_bps_hard=value)


@pytest.mark.parametrize("bad_origin", ["*", "http://localhost:3000", "http://127.0.0.1:8000"])
def test_production_rejects_insecure_cors_origins(bad_origin):
    with pytest.raises(ValidationError, match="insecure production CORS origin"):
        Settings(
            _env_file=None,
            runtime_environment="production",
            demo_mode=False,
            cors_origins=bad_origin,
        )


def test_production_accepts_valid_cors_origins():
    settings = Settings(
        _env_file=None,
        runtime_environment="production",
        demo_mode=False,
        cors_origins="https://afterbells.app,https://api.afterbells.app",
    )
    assert settings.runtime_environment == "production"
    assert settings.cors_origin_list == ["https://afterbells.app", "https://api.afterbells.app"]
