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
  value       = google_service_account.app_sa.email
}

output "logs_bucket_name" {
  description = "Logs storage bucket name"
  value       = google_storage_bucket.logs_data_bucket.name
}

output "db_instance_connection_name" {
  description = "The connection name of the Cloud SQL instance"
  value       = google_sql_database_instance.main.connection_name
}

output "db_name" {
  description = "The name of the database"
  value       = google_sql_database.insurance_db.name
}

output "db_user" {
  description = "The database user"
  value       = google_sql_user.db_user.name
}

output "db_password" {
  description = "The database password (randomly generated)"
  value       = random_password.db_password.result
  sensitive   = true
}

output "backend_uri" {
  value       = google_cloud_run_v2_service.backend.uri
  description = "The URI of the deployed Backend Cloud Run service"
}

output "backend_service_name" {
  value       = google_cloud_run_v2_service.backend.name
  description = "The name of the deployed Backend Cloud Run service"
}

output "frontend_uri" {
  value       = google_cloud_run_v2_service.frontend.uri
  description = "The URI of the deployed Frontend Cloud Run service"
}

output "telemetry_dataset_id" {
  description = "BigQuery dataset ID for telemetry data"
  value       = google_bigquery_dataset.telemetry_dataset.dataset_id
}

output "db_migration_job_name" {
  value       = google_cloud_run_v2_job.db_migration.name
  description = "The name of the database migration Cloud Run Job"
}
