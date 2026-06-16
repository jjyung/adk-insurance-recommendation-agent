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

# Generate a random suffix for the database instance name
resource "random_id" "db_name_suffix" {
  byte_length = 4
}

# Generate a secure random password for the database
resource "random_password" "db_password" {
  length  = 16
  special = false
}

# Cloud SQL Instance
resource "google_sql_database_instance" "main" {
  name             = "${var.project_name}-db-${var.environment}-${random_id.db_name_suffix.hex}"
  project          = var.project_id
  region           = var.region
  database_version = "POSTGRES_15"

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled = true
    }
  }

  deletion_protection = var.db_deletion_protection
  depends_on          = [google_project_service.services]
}

# Database
resource "google_sql_database" "insurance_db" {
  name     = "insurance"
  instance = google_sql_database_instance.main.name
  project  = var.project_id
}

# Database User
resource "google_sql_user" "db_user" {
  name     = "user"
  instance = google_sql_database_instance.main.name
  project  = var.project_id
  password = random_password.db_password.result
}

# Store Database URL in Secret Manager
resource "google_secret_manager_secret" "database_url" {
  secret_id = "${var.project_name}-db-url-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "database_url_version" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql+asyncpg://${google_sql_user.db_user.name}:${random_password.db_password.result}@/${google_sql_database.insurance_db.name}?host=/cloudsql/${google_sql_database_instance.main.connection_name}"
}

# Store Database Password in Secret Manager
resource "google_secret_manager_secret" "database_password" {
  secret_id = "${var.project_name}-db-password-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "database_password_version" {
  secret      = google_secret_manager_secret.database_password.id
  secret_data = random_password.db_password.result
}

# Grant the app_sa access to the database credentials
resource "google_secret_manager_secret_iam_member" "app_sa_db_url_accessor" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "app_sa_db_pass_accessor" {
  secret_id = google_secret_manager_secret.database_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app_sa.email}"
}
