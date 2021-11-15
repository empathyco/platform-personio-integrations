

terraform {
  required_providers {
    googleworkspace = {
      source  = "hashicorp/googleworkspace"
      version = "0.5.1"
    }
  }
  required_version = "1.0.11"
}

resource "googleworkspace_user" "this" {
  primary_email = var.primary_email
  password      = var.password != "" ? var.password : null
  name {
    family_name = var.family_name
    given_name  = var.given_name
  }
  aliases = var.aliases
  organizations {
    name    = var.organization_name
    primary = var.organization_primary
    title   = var.organization_title
    type    = var.organization_type
  }
  recovery_email = var.recovery_email
  recovery_phone = var.recovery_phone
  suspended      = var.suspended
  org_unit_path  = var.org_unit_path
  is_admin       = var.is_admin
}

resource "googleworkspace_group_member" "this" {
  for_each = toset(var.group_ids)
  group_id = each.key
  email    = googleworkspace_user.this.primary_email
  role     = "MEMBER"
}