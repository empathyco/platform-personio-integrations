terraform {
  backend "gcs" {
    bucket = "personio-integrations-xxxxxx"
    prefix = "googleworkspace"
  }
  required_providers {
    googleworkspace = {
      source  = "hashicorp/googleworkspace"
      version = "0.5.1"
    }
  }
  required_version = "1.0.11"
}

provider "googleworkspace" {
  credentials             = "/var/secrets/googleworkspace-sa/key.json"
  customer_id             = "C12abcdef"
  impersonated_user_email = "user-service-account@company.com"
  oauth_scopes = [
    "https://www.googleapis.com/auth/admin.directory.user",
    "https://www.googleapis.com/auth/admin.directory.group",
    "https://www.googleapis.com/auth/admin.directory.userschema",
    "https://www.googleapis.com/auth/admin.directory.orgunit",
    "https://www.googleapis.com/auth/admin.directory.domain"
  ]
}