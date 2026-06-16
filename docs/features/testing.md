# 測試策略 (Testing)

本文件定義專案的測試規範，確保 AI Agent 系統在邏輯、整合與安全性上的穩定性。

## 1. 測試架構
- **工具**：使用 `pytest` 作為核心測試框架。
- **非同步支援**：透過 `pytest-asyncio` 處理 FastAPI 與資料庫的非同步呼叫。
- **依賴管理**：利用 `tests/conftest.py` 定義共享的 Fixtures（如資料庫連線、Mock Agent）。

## 2. 單元測試 (Unit Testing)
- **目錄**：`tests/unit/`
- **範例指令**：`pytest tests/unit/`
- **涵蓋內容**：
  - `test_session_service.py`：測試會話 CRUD 邏輯。
  - `test_user_service.py`：測試使用者權限與資料檢索。
  - `test_agent.py`：測試 Agent 實例化與基礎配置。

## 3. 整合測試 (Integration Testing)
- **目錄**：`tests/integration/` 與 `tests/api/`
- **範例指令**：`pytest tests/integration/`
- **涵蓋內容**：
  - `test_agent_engine_app.py`：測試 ADK Agent Engine 的完整對話流。
  - `test_fastapi_api.py`：使用 `TestClient` 測試 REST API 端點（/healthz, /readyz, /session）。
  - `test_run_audit_integration.py`：驗證 API 執行後是否正確產生審計日誌。

## 4. 安全性與稽核測試 (Security & Audit)
- **目錄**：`tests/security/`
- **指令**：
  - `make test-security`：執行所有安全性相關測試。
  - `make test-audit`：專門驗證稽核日誌與防竄改雜湊鏈邏輯。
- **涵蓋內容**：
  - `test_audit_log_service.py`：驗證雜湊鏈 (`prev_hash`) 的連續性。
  - `test_pii_redaction.py`：驗證 `redact_jsonable` 是否能正確識別並遮蔽敏感資料。

## 5. 負載測試 (Load Testing)
- **目錄**：`tests/load_test/`
- **工具**：使用 `Locust` 進行壓力測試。
- **執行方式**：`cd tests/load_test && uv run locust -f load_test.py`。

## 6. 自動化測試執行
- **PR 檢查**：在 GitHub PR 階段會自動執行 `make check`，確保代碼符合 Lint 規範並通過所有測試。
- **快取清理**：若遇到測試環境污染，可執行 `make clean` 清除 `__pycache__` 與 `.pytest_cache`。