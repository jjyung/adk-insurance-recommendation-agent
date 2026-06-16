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

module "agent_infrastructure" {
  source = "../modules/agent_infrastructure"

  project_id           = var.project_id
  project_name         = var.project_name
  environment          = "prod"
  region               = var.region
  model_name           = var.model_name
  live_model_name      = var.live_model_name
  backend_image        = var.backend_image
  toolbox_image        = var.toolbox_image
  frontend_image       = var.frontend_image
  app_name             = var.app_name
  enable_telemetry     = var.enable_telemetry
  enable_audit_log     = var.enable_audit_log
  enable_pii_redaction = var.enable_pii_redaction
  
  # Production specific overrides (High Availability)
  db_tier                = "db-custom-2-7680"
  db_deletion_protection = true
}
