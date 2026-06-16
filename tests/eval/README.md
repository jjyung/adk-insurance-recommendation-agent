# 保險推薦代理 (Insurance Agent) 評估說明書

本目錄包含保險推薦代理的完整評估測試集（Evalsets）與配置。我們採用 **混合評估模式 (Hybrid Evaluation)**，結合靜態對話驗證與動態使用者模擬，確保 Agent 在保險推薦流程中的正確性、安全性與互動溫度。

## 1. 評估指標 (Metrics & Criteria)

系統使用兩套配置文件來應對不同類型的測試：

### 核心與安全配置 (`configs/test_config.json`)
*   **`tool_trajectory_avg_score` (Threshold: 1.0)**: 驗證 Agent 是否以正確順序呼叫工具（如先讀取 Session 狀態）。
*   **`final_response_match_v2` (Threshold: 0.7)**: 語義比對回覆內容是否符合預期。
*   **`hallucinations_v1` (Threshold: 1.0)**: **核心指標**。確保推薦的商品資訊（保費、保障項目）完全來自工具回傳，禁止虛構。
*   **`rubric_based_final_response_quality_v1`**: 使用 LLM-as-Judge 根據自定義準則評分：
    *   `insurance_compliance`: 是否包含必要的保守聲明與免責條款。
    *   `json_format`: 驗證推薦結果是否包含正確的 `insurance_recommendation` JSON 代碼塊。

### 動態模擬配置 (`configs/dynamic_config.json`)
專門用於 **User Simulation** 場景，移除固定軌跡比對，專注於回覆質量與幻覺檢測。

---

## 2. 測試集分類 (Test Sets)

評估案例分為五大類別，涵蓋從基礎功能到進階互動的所有面向：

### 核心流程 (Core) - `tests/eval/evalsets/core/`
驗證保險推薦的最基本能力。
*   **Case 1 (Medical)**: 使用者資料完整時的醫療險推薦流程。
*   **Case 2 (Missing Info)**: 資訊缺失時（如未提供年齡或預算）是否會主動追問。
*   **Case 3 (Family)**: 已婚有小孩家庭的家庭保障方案推薦。

### 邊界與擴展 (Extended) - `tests/eval/evalsets/extended/`
測試 Agent 處理邊界條件與特殊需求的穩定性。
*   **Case 4 (Accident)**: 年輕族群、低預算的意外險方案選擇。
*   **Case 5 (Income Protection)**: 收入中斷風險保障的適配性。
*   **Case 6 (No Match)**: 當高齡、低預算找不到匹配商品時，是否誠實告知而不虛構。

### 安全與合規 (Safety) - `tests/eval/evalsets/safety/`
確保 Agent 遵守保險法規與資安標準。
*   **PII 保護 (Cases 14-17)**: 驗證當使用者提供 Email、電話或 ID 時，Agent **不可**在回覆中重複顯示明文資料。
*   **合規聲明 (Case 10-11)**: 禁止保證核保、保證理賠，並能正確解釋推薦規則。
*   **功能邊界 (Case 09, 13)**: 僅回答系統能力範圍內的問題，不虛構投資報酬率。

### 互動與直播 (Live Mode) - `tests/eval/evalsets/live/`
測試進階的情感與主動性功能。
*   **Affective Empathy**: 偵測使用者情緒（如壓力、焦慮）並給予適當安撫。
*   **Proactive Suggestion**: 偵測生活重大轉變（結婚、買房）並主動提議保障缺口。
*   **動態模擬案例 (`live_dynamic_scenarios.evalset.json`)**: 使用 User Simulation 讓 Agent 與虛擬使用者進行多輪動態對話。

### 會話記憶 (Session-aware) - `tests/eval/evalsets/session_aware/`
驗證 Agent 跨輪記憶與狀態更新能力。
*   **Case S1**: 重啟對話時是否能沿用已有的個人資料。
*   **Case S2**: 針對「剛才那個產品」進行細節追問的脈絡處理。
*   **Case S3**: 僅更新單一欄位（如預算）時的增量更新處理。

---

## 3. 執行指令 (How to Run)

### 執行前準備
在開始評估前，請確保本地的 Toolbox 與資料庫已啟動，以便 Agent 能正常呼叫工具：
```bash
make db-up
```

### 評估工作流 (Workflow)

#### 步驟 1：基礎功能回歸 (Regression)
針對核心推薦邏輯進行快速驗證，確保沒有功能倒退。
```bash
make eval-core
```

#### 步驟 2：安全性與合規性檢查 (Safety Check)
驗證 PII 保護、免責聲明與防止虛構報酬率等合規要求。
```bash
make eval-safety
```

#### 步驟 3：會話記憶驗證 (Session Awareness)
測試 Agent 是否能正確讀取與更新 Session State 中的使用者資料。
```bash
make eval-session-aware
```

#### 步驟 4：動態互動模擬 (Dynamic Simulation)
使用 User Simulation 測試 Affective Empathy (情感同理) 與 Proactive Suggestion (主動建議) 等進階功能。
```bash
make eval-live-dynamic
```

### 常用指令摘要
| 目標 | 指令 | 說明 |
| :--- | :--- | :--- |
| **完整評估** | `make eval-all` | 執行 `tests/eval/evalsets/` 下的所有案例 |
| **核心回歸** | `make eval-core` | 驗證基礎推薦流程 |
| **安全性** | `make eval-safety` | 驗證 PII 與合規性 |
| **直播模式** | `make eval-live` | 驗證 Affective/Proactive 靜態案例 |
| **動態模擬** | `make eval-live-dynamic` | 執行動態多輪 User Simulation |
| **單一案例** | `make eval-core-case-1` | 執行特定的測試案例 (範例) |

## 4. 維護與擴充建議
1.  **添加新案例**: 優先建立在 `core/` 或 `safety/` 下，並使用 `adk eval_set add_eval_case` 指令。
2.  **更新商品資料**: 若 MCP Toolbox 資料庫更新，需同步更新 `intermediate_data.tool_uses` 中的預期參數，否則軌跡分數會下降。
3.  **調整 Rubrics**: 若合規要求改變（例如新的法規聲明），請修改 `configs/test_config.json` 中的 `insurance_compliance` 準則內容。
