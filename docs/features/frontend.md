# 前端設計與實作 (Frontend)

本文件介紹專案的前端架構設計與核心功能實作細節。前端採用現代化的 React 技術棧，專為即時 AI 互動優化。

## 1. 核心架構
- **框架**：Next.js 15 (App Router)。
- **身份驗證**：使用 `Next-Auth` (Auth.js) 處理登入流，並透過 `middleware.ts` 保護受限路由。
- **樣式**：純 CSS (Vanilla CSS)，並使用 CSS 變數 (CSS custom properties) 統一管理全域色系（如 `--bg`、`--accent`、`--ink`）與圓角陰影。
- **類型檢查**：TypeScript。

## 2. 即時互動與多模態 Hooks
為支援 Gemini Multimodal Live API，前端封裝了多個自定義 Hook：
- **`useAudioCapture`**：管理麥克風串流，支援音訊採樣與編碼。
- **`useAudioPlayback`**：處理後端回傳的音訊二進位流，管理播放佇列與緩衝。
- **`useCameraCapture`**：擷取視訊鏡頭畫面，定時發送影像幀給 Agent。
- **`useScreenCapture`**：支援螢幕分享功能，讓 Agent 能「看見」使用者的桌面內容。
- **`useLiveAgent`**：核心 WebSocket 邏輯，協調音訊、影像與文字的傳輸。

## 3. UI 元件庫
- **`WaveformVisualizer`**：音訊視覺化元件，將錄製與播放中的音訊轉為動態波形，提升互動感。
- **`InsuranceCard`**：結構化展示保單資訊，包含產品亮點、預算符合度（Budget Fit）標籤。
- **`StateTree`**：開發者工具元件，視覺化呈現 Agent 的內部狀態轉換與 PII 偵測結果。
- **`TimelineNodes`**：以時間軸形式展示對話軌跡與工具執行歷史。

## 4. 狀態管理
- **Session Storage**：暫存對話歷史與使用者偏好。
- **React Context**：用於全局狀態（如目前登入使用者、Live 模式切換）。

## 5. 開發與部署
- **本地執行**：`make ui-dev`。
- **生產建置**：`make ui-build`。
- **環境變數**：`NEXT_PUBLIC_FASTAPI_BASE_URL` 指向後端 API 地址。
