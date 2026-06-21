# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

output "app_service_account_email" {
  description = "Application service account email"
  value       = module.agent_infrastructure.app_service_account_email
}

output "logs_bucket_name" {
  description = "Logs storage bucket name"
  value       = module.agent_infrastructure.logs_bucket_name
}

output "db_instance_connection_name" {
  description = "The connection name of the Cloud SQL instance"
  value       = module.agent_infrastructure.db_instance_connection_name
}

output "db_name" {
  description = "The name of the database"
  value       = module.agent_infrastructure.db_name
}

output "db_user" {
  description = "The database user"
  value       = module.agent_infrastructure.db_user
}

output "db_password" {
  description = "The database password (randomly generated). Use 'terraform output -raw db_password' to view."
  value       = module.agent_infrastructure.db_password
  sensitive   = true
}

output "backend_service_name" {
  value       = module.agent_infrastructure.backend_service_name
  description = "The name of the deployed Backend Cloud Run service"
}

output "backend_url" {
  value       = module.agent_infrastructure.backend_uri
  description = "The URL of the deployed Backend Cloud Run service"
}

output "frontend_url" {
  value       = module.agent_infrastructure.frontend_uri
  description = "The URL of the deployed Frontend Cloud Run service"
}

output "db_migration_job_name" {
  value       = module.agent_infrastructure.db_migration_job_name
  description = "The name of the database migration Cloud Run Job"
}

output "db_initialization_instructions" {
  description = "Instructions to initialize the Cloud SQL database"
  value       = <<-EOT
    ====================================================================
    🚀 Cloud SQL 執行個體已成功佈署！
    ====================================================================

    🔗 連線名稱: ${module.agent_infrastructure.db_instance_connection_name}
    👤 資料庫用戶: ${module.agent_infrastructure.db_user}
    🔑 資料庫密碼: (已隱藏為敏感資訊，請透過以下指令取得)
       make tf-db-password
    🗄️ 資料庫名稱: ${module.agent_infrastructure.db_name}

    ✅ 若要初始化資料庫 Schema 並匯入初始資料 (Seed Data)，請執行：
    make gcp-db-setup GCP_PROJECT_ID=${var.project_id}

    ✅ 測試服務: 請執行： ${module.agent_infrastructure.frontend_uri}
    使用者登入資訊：
    - 帳號: testuser
    - 密碼: password123

    ====================================================================
  EOT
}
