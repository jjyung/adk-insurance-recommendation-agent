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

# -------------------------------------------------------------------------
# Secrets for Application
# -------------------------------------------------------------------------
resource "google_secret_manager_secret" "audit_hash_salt" {
  secret_id = "${var.project_name}-audit-hash-salt-${var.environment}"
  project   = var.project_id
  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

resource "random_id" "audit_salt" {
  byte_length = 16
}

resource "google_secret_manager_secret_version" "audit_hash_salt_version" {
  secret      = google_secret_manager_secret.audit_hash_salt.id
  secret_data = random_id.audit_salt.hex
}

resource "random_password" "nextauth_secret" {
  length  = 32
  special = true
}

resource "google_secret_manager_secret" "nextauth_secret" {
  secret_id = "${var.project_name}-nextauth-secret-${var.environment}"
  project   = var.project_id
  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "nextauth_secret_version" {
  secret      = google_secret_manager_secret.nextauth_secret.id
  secret_data = random_password.nextauth_secret.result
}

resource "google_secret_manager_secret_iam_member" "app_sa_salt_accessor" {
  secret_id = google_secret_manager_secret.audit_hash_salt.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "app_sa_nextauth_secret_accessor" {
  secret_id = google_secret_manager_secret.nextauth_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app_sa.email}"
}

# -------------------------------------------------------------------------
# Cloud Run Service (Backend + Toolbox)
# -------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "backend" {
  name     = "${var.project_name}-backend-${var.environment}"
  location = var.region
  project  = var.project_id

  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.app_sa.email

    vpc_access {
      network_interfaces {
        network = "default"
      }
    }
    # Cloud SQL Connection
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }

    # Backend Container
    containers {
      name  = "backend"
      image = var.backend_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1024Mi"
        }
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GOOGLE_CLOUD_LOCATION"
        value = var.region
      }
      env {
        name  = "TOOLBOX_SERVER_URL"
        value = "http://localhost:8081"
      }
      env {
        name  = "ADK_APP_NAME"
        value = var.app_name
      }
      env {
        name  = "AUDIT_LOG_ENABLED"
        value = var.enable_audit_log
      }
      env {
        name  = "PII_REDACTION_ENABLED"
        value = var.enable_pii_redaction
      }
      env {
        name  = "ENABLE_CLOUD_TRACING"
        value = var.enable_telemetry
      }
      env {
        name  = "ENABLE_CLOUD_LOGGING"
        value = var.enable_telemetry
      }
      env {
        name  = "MODEL_NAME"
        value = var.model_name
      }
      env {
        name  = "LIVE_MODEL_NAME"
        value = var.live_model_name
      }
      env {
        name  = "OTEL_SERVICE_NAME"
        value = "${var.project_name}-backend-${var.environment}"
      }

      env {
        name  = "GOOGLE_GENAI_USE_VERTEXAI"
        value = "1"
      }
      env {
        name = "AUDIT_HASH_SALT"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.audit_hash_salt.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "AUDIT_DB_PATH"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    # Toolbox Sidecar Container
    containers {
      name  = "toolbox"
      image = var.toolbox_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GOOGLE_CLOUD_LOCATION"
        value = var.region
      }
      env {
        name  = "GOOGLE_GENAI_USE_VERTEXAI"
        value = "1"
      }
      env {
        name  = "DB_INSTANCE_NAME"
        value = google_sql_database_instance.main.name
      }
      env {
        name  = "DB_USER"
        value = google_sql_user.db_user.name
      }
      env {
        name  = "DB_NAME"
        value = google_sql_database.insurance_db.name
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_password.secret_id
            version = "latest"
          }
        }
      }

      args = ["-a", "0.0.0.0", "-p", "8081", "--config", "/db/tools.cloud.yaml"]

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }
  }

  depends_on = [
    google_project_service.services,
    google_secret_manager_secret_version.database_url_version,
    google_secret_manager_secret_version.audit_hash_salt_version,
    google_secret_manager_secret_iam_member.app_sa_db_url_accessor
  ]

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].containers[1].image,
      client,
      client_version,
    ]
  }
}

# Allow unauthenticated access to the backend (for demo/testing, adjust for prod)
resource "google_cloud_run_service_iam_member" "backend_public" {
  project  = var.project_id
  location = var.region
  service  = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# -------------------------------------------------------------------------
# Cloud Run Job (Database Migration)
# -------------------------------------------------------------------------
resource "google_cloud_run_v2_job" "db_migration" {
  name     = "${var.project_name}-db-migration-${var.environment}"
  location = var.region
  project  = var.project_id

  deletion_protection = false

  template {
    template {
      service_account = google_service_account.app_sa.email

      vpc_access {
        network_interfaces {
          network = "default"
        }
      }

      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.main.connection_name]
        }
      }

      containers {
        image = var.backend_image

        command = ["sh", "-c", "uv run python scripts/seed_user.py && uv run python scripts/ingest_faq_embeddings.py"]

        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = var.project_id
        }
        env {
          name  = "GOOGLE_CLOUD_LOCATION"
          value = var.region
        }
        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.database_url.secret_id
              version = "latest"
            }
          }
        }
        env {
          name = "ADK_SESSION_DB_URI"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.database_url.secret_id
              version = "latest"
            }
          }
        }

        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }
    }
  }

  depends_on = [
    google_project_service.services,
    google_secret_manager_secret_version.database_url_version,
    google_sql_database_instance.main
  ]

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
    ]
  }
}

# -------------------------------------------------------------------------
# Cloud Run Service (Frontend)
# -------------------------------------------------------------------------

locals {
  frontend_url = "https://${var.project_name}-frontend-${var.environment}-${data.google_project.project.number}.${var.region}.run.app"
}

resource "google_cloud_run_v2_service" "frontend" {
  name     = "${var.project_name}-frontend-${var.environment}"
  location = var.region
  project  = var.project_id

  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.app_sa.email

    containers {
      image = var.frontend_image

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
      env {
        name  = "NEXT_PUBLIC_FASTAPI_BASE_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
      env {
        name  = "FASTAPI_BASE_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
      env {
        name  = "NEXT_PUBLIC_APP_NAME"
        value = var.app_name
      }
      env {
        name = "NEXTAUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.nextauth_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "NEXTAUTH_URL"
        value = local.frontend_url
      }
    }
  }

  depends_on = [
    google_project_service.services,
    google_secret_manager_secret_version.nextauth_secret_version,
    google_secret_manager_secret_iam_member.app_sa_nextauth_secret_accessor
  ]

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }
}

# Allow unauthenticated access to the frontend
resource "google_cloud_run_service_iam_member" "frontend_public" {
  project  = var.project_id
  location = var.region
  service  = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
