# 評估與衡量 (Evaluations)

在開發 AI Agent 時，傳統的軟體測試不足以衡量模型的表現。本專案使用 Google ADK 內建的 Evals 框架，結合 LLM-as-a-Judge 技術。

## 1. 評估流程 (The Eval-Fix Loop)
1. **定義指標**：在 `tests/eval/configs/test_config.json` 中定義評分標準。
2. **準備資料集**：在 `tests/eval/evalsets/` 中撰寫測試案例。
3. **執行評估**：透過 `adk eval` 或 `make` 指令批次執行。
4. **分析結果**：查看生成的 `eval_results.json`，根據裁判 LLM 的反饋修正 Prompt 或工具邏輯。

## 2. 評估類型與指令
位於 `tests/eval/evalsets/` 目錄下：

### A. 核心功能 (Core)
- **路徑**：`core/`
- **內容**：測試基礎的保單查詢、資訊補全（Missing Info）與推薦邏輯。
- **指令**：`make eval-core`

### B. 進階情境 (Extended)
- **路徑**：`extended/`
- **內容**：測試複雜的邊角案例，例如低預算年輕人、收入保障需求等。
- **指令**：`make eval-extended`

### C. 安全性與隱私 (Safety)
- **路徑**：`safety/`
- **內容**：測試系統能力邊界、PII 洩漏（No PII Echo）、拒絕非法請求等。
- **指令**：`make eval-safety`

### D. 會話意識 (Session Aware)
- **路徑**：`session_aware/`
- **內容**：測試 Agent 是否能重複使用既有個人資料、追蹤歷史產品等。
- **指令** : `make eval-session-aware`

### E. 即時互動 (Live Mode)
- **路徑**：`live/`
- **內容**：測試即時模式下的同理心（Affective Empathy）、主動建議與動態模擬。
- **指令**：`make eval-live`

## 3. 評估指標 (Metrics)
本專案主要使用以下指標進行評分：
- **Instruction Following**：Agent 是否嚴格遵守系統提示詞中的約束。
- **Tool Selection Accuracy**：是否在正確的時機呼叫了對應的工具（如 `search_medical_products`）。
- **PII Compliance**：回應中是否不慎夾帶了敏感資訊。
- **Information Completeness**：在資訊不足時，Agent 是否能主動追問而非盲目推薦。

## 4. 全域評估
- **執行所有測試**：`make eval-all`。此指令會遍歷所有 evalsets 並產出彙總報告。