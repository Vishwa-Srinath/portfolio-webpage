from unittest.mock import MagicMock, patch

import pytest

from app.services.radar_service import get_radar_entries


@pytest.mark.asyncio
async def test_get_radar_entries_normalizes_null_tags():
    response = MagicMock()
    response.data = [
        {"id": "entry-with-null-tags", "tags": None},
        {"id": "entry-with-tags", "tags": ["Postgres", "GIS"]},
    ]

    query = MagicMock()
    query.order.return_value.execute.return_value = response
    client = MagicMock()
    client.table.return_value.select.return_value = query

    with patch(
        "app.services.radar_service.get_supabase_client",
        return_value=client,
    ):
        entries = await get_radar_entries()

    assert entries[0]["tags"] == []
    assert entries[1]["tags"] == ["Postgres", "GIS"]
