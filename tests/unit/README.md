# Backend Unit Test Cases Summary

本目錄包含後端核心組件的單元測試，使用 `pytest` 框架進行驗證。所有測試皆採用 Mock 技術隔離外部依賴（如資料庫與 ADK Runtime）。

## 測試案例列表

| 測試群組 | 名稱 | 描述 | 參數 | 驗證 | 結果 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth & Security** | `test_verify_password_correct` | 驗證明文密碼與雜湊密碼相符 | 明文密碼, 雜湊密碼 | 回傳 `True` | Pass |
| | `test_verify_password_incorrect` | 驗證明文密碼與雜湊密碼不相符 | 錯誤明文, 雜湊密碼 | 回傳 `False` | Pass |
| | `test_get_password_hash` | 驗證密碼雜湊功能 | 明文密碼 | 回傳非明文且長度大於 0 的字串 | Pass |
| | `test_create_access_token_default_expiry` | 驗證 JWT 預設過期時間 | 載荷資料, 金鑰, 演算法 | 過期時間約為 15 分鐘後 | Pass |
| | `test_create_access_token_custom_expiry` | 驗證 JWT 自定義過期時間 | 載荷資料, 金鑰, 演算法, 30分鐘 timedelta | 過期時間約為 30 分鐘後 | Pass |
| | `test_decode_access_token_success` | 驗證正確解碼 JWT | 有效 Token, 金鑰, 演算法 | 回傳正確的載荷內容 | Pass |
| | `test_decode_access_token_failure` | 驗證無效 Token 解碼失敗 | 無效 Token, 金鑰, 演算法 | 回傳 `None` | Pass |
| **User Service** | `test_get_user_by_username_exists` | 驗證從資料庫獲取現有使用者 | 使用者名稱 | 回傳正確的 `UserInDB` 物件 | Pass |
| | `test_get_user_by_username_not_found` | 驗證使用者不存在時的處理 | 未知使用者名稱 | 回傳 `None` | Pass |
| | `test_create_user_success` | 驗證成功建立使用者 | 使用者名稱, 雜湊密碼 | 回傳正確的 `user_id` | Pass |
| **Session Tools** | `test_get_user_profile_snapshot` | 驗證從 Session 狀態提取畫像快照 | ToolContext (包含狀態) | 僅包含保險相關的關鍵字欄位 | Pass |
| | `test_save_user_profile_success` | 驗證儲存用戶畫像資訊 | 年齡, 預算, 目標等 | 狀態字典正確更新 | Pass |
| | `test_save_user_profile_no_context` | 驗證缺少上下文時拋出異常 | 僅參數無上下文 | 拋出 `ValueError` | Pass |
| | `test_save_last_recommendation` | 驗證儲存最後一次推薦產品 | 產品名稱, 產品 ID | 狀態字典正確記錄產品資訊 | Pass |
| | `test_clear_last_recommendation` | 驗證清除最後一次推薦紀錄 | ToolContext | 相關狀態欄位設為 `None` | Pass |
| **Agent Run Service** | `test_classify_tool_name` | 驗證工具名稱分類邏輯 | 工具名稱 | 正確分類為 state, query 或 tool | Pass |
| | `test_ensure_session_delegation` | 驗證 Session 確保邏輯的委派 | Session ID, User ID | 呼叫 `SessionService.ensure_session` | Pass |
| | `test_stream_basic_flow` | 驗證基本的 SSE 串流流程 | Prompt, Session ID | 包含 meta 與 done 封包 | Pass |
| **API Routes** | `test_login_for_access_token_success` | 驗證登入成功獲取 Token | 帳號, 密碼 | 回傳 200 及 `access_token` | Pass |
| | `test_login_for_access_token_failure` | 驗證登入失敗 | 錯誤帳號/密碼 | 回傳 401 | Pass |
| | `test_list_sessions_success` | 驗證列出會話列表 | App Name, User ID | 回傳 200 及會話清單 | Pass |
| | `test_create_session_success` | 驗證建立新會話 | Session ID, 初始狀態 | 回傳 200 及 Session ID | Pass |
| | `test_get_session_not_found` | 驗證獲取不存在會話 | 未知 Session ID | 回傳 404 | Pass |
| | `test_delete_session_success` | 驗證刪除會話 | Session ID | 回傳 200 | Pass |

## 執行測試

使用以下指令執行此目錄下的所有單元測試：

```bash
pytest tests/unit/
```
