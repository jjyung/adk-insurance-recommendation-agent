from app.security.pii import redact_text, redact_value


def test_redact_email():
    text = "我的 email 是 chris@example.com"
    redacted, findings = redact_text(text)

    assert "chris@example.com" not in redacted
    assert "[REDACTED_EMAIL]" in redacted
    assert any(f.kind == "email" and f.count == 1 for f in findings)


def test_redact_taiwan_id():
    text = "我的身分證是 A123456789"
    redacted, findings = redact_text(text)

    assert "A123456789" not in redacted
    assert "[REDACTED_TW_ID]" in redacted
    assert any(f.kind == "taiwan_id" for f in findings)


def test_redact_credit_card():
    text = "信用卡 4111 1111 1111 1111"
    redacted, findings = redact_text(text)

    assert "4111 1111 1111 1111" not in redacted
    assert "[REDACTED_CARD]" in redacted
    assert any(f.kind == "credit_card" for f in findings)


def test_redact_nested_payload():
    payload = {
        "prompt": "email chris@example.com",
        "tool_args": {
            "note": "phone 0912-345-678",
        },
        "items": [
            {"id": "A123456789"},
        ],
    }

    redacted, findings = redact_value(payload)

    assert "chris@example.com" not in str(redacted)
    assert "0912-345-678" not in str(redacted)
    assert "A123456789" not in str(redacted)
    assert len(findings) >= 3
