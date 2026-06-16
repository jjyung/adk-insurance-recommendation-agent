# CI/CD Deployment Plan: agents-cli Standard Design (Technical Specification)

## Objective
遵循 `agents-cli` 的 `infra cicd` 設計原則，並根據現有 `deployment/terraform/dev/` 的資源配置，實作具備環境隔離、工作負載身分同盟 (Workload Identity Federation, WIF) 與自動化晉升機制的多環境 CI/CD 流程。

## 部署架構確認 (Technical Stack)
根據 Terraform 原始碼分析，本專案的部署方式如下：
- **運算平台 (Compute)**: **Cloud Run v2**。
  - **Backend**: 包含主程式與 **Toolbox Sidecar** 雙容器架構。
  - **Frontend**: 獨立的 Next.js Cloud Run 服務。
- **資料層 (Data)**: **Cloud SQL (PostgreSQL 15)**。
- **金鑰管理 (Secrets)**: **Secret Manager** (儲存 DB URL, Password, Audit Salt, NextAuth Secret)。
- **監測與遙測 (Telemetry)**: **BigQuery** 整合 **Cloud Logging Bucket** 與 **Linked Dataset**，實現長期日誌保存與分析。

## agents-cli 設計原則應用
1.  **環境隔離 (Tiered Environments)**：
    *   **Dev**：單一專案手動/觸發部署 (現有)。
    *   **Staging**：合併至 `main` 時部署至獨立專案，執行自動化 Eval。
    *   **Prod**：手動核准後晉升 Image 標籤並部署至生產專案。
2.  **安全性 (WIF & IAM)**：
    *   使用 WIF 取代金鑰檔，實現 Cloud Build 到各環境的無金鑰存取。
    *   `cicd_runner_sa` 具備各專案的資源管理權限。
3.  **基礎設施模組化**：
    *   將 `dev/` 中的邏輯（含 Sidecar 配置、SQL 連結、Telemetry Sink）抽離為 `modules/agent_infrastructure/`。

## Proposed Solution (Pipelines)

### 1. PR Checks (`pr_checks.yaml`)
- **功能**: 代碼品質檢查。
- **步驟**: `make lint` -> `make test` -> `terraform plan` (對 Staging/Prod 預覽)。

### 2. Staging Deployment (`staging.yaml`)
- **功能**: 自動部署至 Staging 並驗證。
- **步驟**:
  1. **Build & Push**: 同時建置 **Backend**, **Toolbox**, **Frontend** 三個映像檔。
  2. **Terraform Apply**: 使用模組化腳本更新 Staging 資源。
  3. **App Deploy**: 更新 Cloud Run 服務指向新 Image。
  4. **Post-Deploy**: 執行 `make eval-all` 與 `make gcp-db-setup` (Staging 版)。

### 3. Production Release (`deploy-to-prod.yaml`)
- **功能**: 生產環境穩定發布。
- **步驟**:
  1. **Manual Approval**: 暫停流程等待核准。
  2. **Image Promotion**: 將 Staging 映像檔重新標記 (Retag) 為 `prod-latest`。
  3. **Terraform Apply**: 更新 Production 環境，確保高可用性與安全設定（如資料庫 `deletion_protection = true`）。

## Implementation Steps

1.  **Terraform 模組化重構**:
    - 建立 `deployment/terraform/modules/agent_infrastructure/`。
    - 確保 `service.tf` 中的 Sidecar 配置與環境變數可透過變數注入。
2.  **更新 Makefile 支援多環境**:
    - 調整 `build-push` 支援不同專案與 Tag。
    - 擴展 `tf-apply` 支援 `TF_DIR` 參數。
3.  **實作 Cloud Build Pipelines**:
    - 撰寫 `pr_checks.yaml`, `staging.yaml`, `deploy-to-prod.yaml`。
4.  **產出 WIF 設定指南**:
    - 說明如何建立 GitHub/Cloud Build WIF Pool 並授予 `roles/iam.workloadIdentityUser`。

## Verification & Testing
- 測試 Cloud Build 是否能正確建置包含 Sidecar 的多容器 Backend。
- 驗證 Staging 部署後，Telemetry Log Sink 是否能正確將日誌導向新的 Logging Bucket。
- 確認 Production 的 Secret Manager 版本能隨 Terraform Apply 正確更新與綁定。
