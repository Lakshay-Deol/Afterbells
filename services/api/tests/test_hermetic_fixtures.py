from afterbells.config import Settings
from afterbells.providers.binance_public import BinancePublicClient
from afterbells.services.decisions import DecisionRequest, decide


def test_binance_public_serves_recorded_fixtures_offline():
    s = Settings(_env_file=None, demo_mode=True)
    client = BinancePublicClient(s)
    status = client.market_status()
    assert status.get("marketStatus") in ("OPEN", "postmarket", "premarket", "closed")
    assert status.get("openState") in (True, False)

    stocks = client.stock_list("1")
    assert isinstance(stocks, list)
    assert len(stocks) > 0

    nvda = client.token_search(56, "NVDA")
    assert isinstance(nvda, list)
    assert len(nvda) > 0


def test_decision_engine_runs_hermetically_with_recorded_mode():
    req = DecisionRequest(text="Buy $10 of NVDA", mode="recorded")
    res = decide(req)
    assert res["decision"]["state"] in ("ANALYSIS_READY", "NO_VALID_ROUTE")
    assert res["dataLabel"] == "RECORDED"
    assert "RECORDED_DATA" in res["decision"]["execution"]["blockers"]
    assert "receiptHash" in res
    assert res["receiptHash"].startswith("0x") and len(res["receiptHash"]) == 66
