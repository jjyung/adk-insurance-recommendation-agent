import pytest
from unittest.mock import MagicMock
from google.adk.tools import ToolContext
from app.tools.session_tools import (
    get_user_profile_snapshot,
    save_user_profile,
    save_last_recommendation,
    clear_last_recommendation,
)


@pytest.fixture
def mock_tool_context():
    context = MagicMock(spec=ToolContext)
    context.state = {}
    return context


def test_get_user_profile_snapshot(mock_tool_context):
    mock_tool_context.state = {
        "user:age": 30,
        "user:budget": 10000,
        "other:key": "ignore",
    }
    snapshot = get_user_profile_snapshot(mock_tool_context)
    assert snapshot == {"user:age": 30, "user:budget": 10000}
    assert "other:key" not in snapshot


def test_save_user_profile_success(mock_tool_context):
    result = save_user_profile(
        age=25, budget=5000, main_goal="Medical", tool_context=mock_tool_context
    )

    assert result["status"] == "ok"
    assert mock_tool_context.state["user:age"] == 25
    assert mock_tool_context.state["user:budget"] == 5000
    assert mock_tool_context.state["user:main_goal"] == "medical"


def test_save_user_profile_no_context():
    with pytest.raises(ValueError, match="tool_context is required"):
        save_user_profile(age=25)


def test_save_last_recommendation(mock_tool_context):
    result = save_last_recommendation(
        product_name="Super Plan", product_id=123, tool_context=mock_tool_context
    )

    assert result["status"] == "ok"
    assert mock_tool_context.state["user:last_recommended_product_name"] == "Super Plan"
    assert mock_tool_context.state["user:last_recommended_product_id"] == 123


def test_clear_last_recommendation(mock_tool_context):
    mock_tool_context.state = {
        "user:last_recommended_product_name": "Old Plan",
        "user:last_recommended_product_id": 456,
    }

    result = clear_last_recommendation(mock_tool_context)

    assert result["status"] == "ok"
    assert mock_tool_context.state["user:last_recommended_product_name"] is None
    assert mock_tool_context.state["user:last_recommended_product_id"] is None
