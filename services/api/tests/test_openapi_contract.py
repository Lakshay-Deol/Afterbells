import json

from afterbells.api.main import app
from afterbells.config import REPO_ROOT


def test_openapi_schema_matches_snapshot():
    snapshot_path = REPO_ROOT / "docs" / "api-contract.json"
    assert snapshot_path.is_file(), "docs/api-contract.json must exist"

    expected_spec = json.loads(snapshot_path.read_text(encoding="utf-8"))
    live_spec = app.openapi()

    assert live_spec == expected_spec, (
        "Live OpenAPI schema has drifted from docs/api-contract.json. "
        "Review API changes and update docs/api-contract.json intentionally if approved."
    )
