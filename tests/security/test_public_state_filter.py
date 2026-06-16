from app.security.pii import filter_public_state


def test_public_state_allows_only_safe_keys():
    state = {
        "user:age": 35,
        "user:budget": 30000,
        "user:main_goal": "medical",
        "user:email": "chris@example.com",
        "user:phone": "0912-345-678",
        "_ui_selected_session": "abc",
        "random:debug": "should-not-leak",
    }

    public, findings = filter_public_state(state)

    assert public == {
        "user:age": "35",
        "user:budget": "30000",
        "user:main_goal": "medical",
    }
    assert "user:email" not in public
    assert "user:phone" not in public
    assert "_ui_selected_session" not in public
    assert "random:debug" not in public
    assert findings


def test_public_state_redacts_allowed_free_text_value():
    state = {
        "user:existing_coverage": "公司團保，手機 0912-345-678",
    }

    public, findings = filter_public_state(state)

    assert "0912-345-678" not in public["user:existing_coverage"]
    assert "[REDACTED_PHONE]" in public["user:existing_coverage"]
    assert any(f.kind == "phone" for f in findings)
