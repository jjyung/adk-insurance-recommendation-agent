import json
import asyncpg
import pytest
from httpx import AsyncClient, ASGITransport


@pytest.mark.asyncio
async def test_run_endpoint_writes_redacted_audit_events(app_with_fake_runner):
    async with AsyncClient(
        transport=ASGITransport(app=app_with_fake_runner), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/agent/run",
            headers={
                "x-request-id": "req-test-1",
                "x-trace-id": "trace-test-1",
            },
            json={
                "prompt": "我 35 歲，預算 30000，email chris@example.com，想要醫療保障",
                "sessionId": "session-test-1",
                "userId": "user-test-1",
                "sessionState": {},
            },
        )

        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

        audit_db_url = app_with_fake_runner.state.container.config.audit_db_path
        if "postgresql+asyncpg://" in audit_db_url:
            audit_db_url = audit_db_url.replace(
                "postgresql+asyncpg://", "postgresql://"
            )

        conn = await asyncpg.connect(audit_db_url)
        try:
            rows = await conn.fetch(
                """
                SELECT event_type, input_redacted, output_redacted, pii_findings
                FROM audit_events
                WHERE trace_id = $1
                ORDER BY sequence
                """,
                "trace-test-1",
            )

            assert rows
            # Convert rows to a list of dicts or similar for easy serialization check
            data = [dict(row) for row in rows]
            serialized = json.dumps(data, ensure_ascii=False)
            assert "chris@example.com" not in serialized
            assert "[REDACTED_EMAIL]" in serialized
            assert any(row["event_type"] == "user.prompt.received" for row in rows)
        finally:
            await conn.close()
